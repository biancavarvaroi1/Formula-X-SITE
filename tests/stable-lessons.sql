-- Run after fixtures/stable-lessons-schema.sql and the universal migration.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
DO $$
DECLARE first jsonb; second jsonb; loaded jsonb; saved jsonb; doc text='{"fx_format":"formula-x-blocks-v1","subject":"romana","blocks":[{"type":"text","text":"Text inițial"}]}';
BEGIN
 first=public.fx_editor_create_lesson('20000000-0000-0000-0000-000000000001','romana','Același titlu','Descriere',doc);
 second=public.fx_editor_create_lesson('20000000-0000-0000-0000-000000000002','romana','Același titlu','Descriere',doc);
 IF first->>'slug'=second->>'slug' THEN RAISE EXCEPTION 'Duplicate titles conflated'; END IF;
 second=public.fx_editor_create_lesson('20000000-0000-0000-0000-000000000001','romana','Același titlu','Descriere',doc);
 IF first IS DISTINCT FROM second THEN RAISE EXCEPTION 'Create retry is not idempotent'; END IF;
 loaded=public.fx_editor_load_lesson(first->>'slug');
 saved=public.fx_editor_save_lesson(first->>'slug','Titlu modificat','Descriere nouă',replace(doc,'Text inițial','Text modificat'),NULL,(loaded->>'revision')::bigint);
 IF (saved->>'revision')::bigint<=(loaded->>'revision')::bigint THEN RAISE EXCEPTION 'Revision did not advance'; END IF;
 BEGIN
  PERFORM public.fx_editor_save_lesson(first->>'slug','Pierdut','',doc,NULL,(loaded->>'revision')::bigint);
  RAISE EXCEPTION 'Stale revision accepted';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 loaded=public.fx_editor_load_lesson(first->>'slug');
 IF loaded->>'title'<>'Titlu modificat' OR loaded->>'summary'<>'Descriere nouă' OR loaded->>'body' NOT LIKE '%Text modificat%' THEN RAISE EXCEPTION 'Atomic save or stale-write rejection failed'; END IF;
 BEGIN
  PERFORM public.fx_editor_save_lesson(first->>'slug','Invalid','',NULL,'[]'::jsonb,(loaded->>'revision')::bigint);
  RAISE EXCEPTION 'Invalid overlay accepted' USING ERRCODE='XX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 IF public.fx_editor_load_lesson(first->>'slug') IS DISTINCT FROM loaded THEN RAISE EXCEPTION 'Failed save changed data'; END IF;
 BEGIN
  PERFORM public.fx_editor_save_lesson(first->>'slug','TRIGGER_FAIL','',doc,NULL,(loaded->>'revision')::bigint);
  RAISE EXCEPTION 'Failed metadata trigger accepted' USING ERRCODE='XX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 IF public.fx_editor_load_lesson(first->>'slug') IS DISTINCT FROM loaded THEN RAISE EXCEPTION 'Body persisted after metadata failure'; END IF;
 BEGIN
  PERFORM public.fx_editor_create_lesson('20000000-0000-0000-0000-000000000003','romana','Invalid','','{"fx_format":"formula-x-blocks-v1"}');
  RAISE EXCEPTION 'NULL validation bypass' USING ERRCODE='XX001';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 BEGIN
  PERFORM public.fx_editor_create_lesson('20000000-0000-0000-0000-000000000004','matematica','Altă materie','','x');
  RAISE EXCEPTION 'Wrong-subject create allowed' USING ERRCODE='XX001';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
-- A teacher from another subject cannot load the private body or save metadata.
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
DO $$ BEGIN
 BEGIN PERFORM public.fx_editor_load_lesson('ultima-noapte');RAISE EXCEPTION 'Cross-subject read' USING ERRCODE='XX001';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.fx_editor_save_lesson('ultima-noapte','Hacked','','x',NULL,1);RAISE EXCEPTION 'Cross-subject save' USING ERRCODE='XX001';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
-- Student role has no teacher RPC access even with a valid authentication JWT.
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
DO $$ BEGIN
 BEGIN PERFORM public.fx_editor_load_lesson('ultima-noapte');RAISE EXCEPTION 'Student read' USING ERRCODE='XX001';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.fx_editor_create_lesson('20000000-0000-0000-0000-000000000005','romana','Hacked','','x');RAISE EXCEPTION 'Student create' USING ERRCODE='XX001';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 IF EXISTS(SELECT 1 FROM public.fx_lesson_contents) THEN RAISE EXCEPTION 'Student direct table leak'; END IF;
END $$;
RESET ROLE;
INSERT INTO public.fx_universal_lesson_edits(page,subject,patches) VALUES('romana/ultima-noapte','romana','{"texts":{"secret":"Private edit"}}');
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.fx_universal_lesson_edits WHERE page='romana/ultima-noapte') THEN RAISE EXCEPTION 'Anonymous private edit leak'; END IF;
 BEGIN PERFORM public.fx_editor_load_lesson('ultima-noapte');RAISE EXCEPTION 'Anonymous RPC' USING ERRCODE='XX001';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT hash FROM public.test_original_access)<>md5(pg_get_functiondef('public.fx_open_lesson(text)'::regprocedure)) THEN RAISE EXCEPTION 'Original student access function was changed'; END IF;
 IF (SELECT count(*) FROM public.fx_lessons WHERE created_by='00000000-0000-0000-0000-000000000001')<>2 THEN RAISE EXCEPTION 'Unexpected duplicate lesson'; END IF;
 IF EXISTS(SELECT 1 FROM public.fx_lessons WHERE created_by IS NOT NULL AND (published OR is_demo)) THEN RAISE EXCEPTION 'New lessons unexpectedly public'; END IF;
END $$;
ROLLBACK;
\echo 'PASS: atomic save, idempotent creation, optimistic locking, NULL validation, teacher subjects, students, anonymous access and original access preservation.'
