-- Instaleaza in Supabase SQL Editor (proiectul Formula X), o singura data.
-- Necesita public.staff_accounts si private.can_manage_subject(text) deja existente.
CREATE TABLE IF NOT EXISTS public.fx_universal_lesson_edits (
 page text PRIMARY KEY,
 subject text NOT NULL,
 patches jsonb NOT NULL DEFAULT '{}'::jsonb,
 revision bigint NOT NULL DEFAULT 1,
 updated_by uuid REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT fx_u_page_valid CHECK(page ~ '^[a-z-]+/[a-z0-9-]+$' AND length(page)<=128 AND subject=split_part(page,'/',1)),
 CONSTRAINT fx_u_patches_valid CHECK(jsonb_typeof(patches)='object' AND octet_length(patches::text)<400000)
);
CREATE OR REPLACE FUNCTION private.fx_editor_can_read(p_page text,p_subject text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r jsonb;
BEGIN
 IF p_page IN ('matematica/progresii','romana/ultima-noapte') THEN RETURN true; END IF;
 IF auth.uid() IS NULL THEN RETURN false; END IF;
 IF private.can_manage_subject(p_subject) THEN RETURN true; END IF;
 IF to_regprocedure('public.fx_open_lesson(text)') IS NULL THEN RETURN false; END IF;
 EXECUTE 'SELECT to_jsonb(public.fx_open_lesson($1))' INTO r USING split_part(p_page,'/',2);
 RETURN COALESCE((r#>>'{access,allowed}')::boolean,false);
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
CREATE OR REPLACE FUNCTION private.fx_editor_touch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 NEW.updated_at=clock_timestamp();NEW.updated_by=auth.uid();
 IF TG_OP='UPDATE' THEN
  IF NEW.page<>OLD.page OR NEW.subject<>OLD.subject THEN RAISE EXCEPTION 'Identificatorul lectiei este nemodificabil'; END IF;
  NEW.revision=OLD.revision+1;
 ELSE NEW.revision=1; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS fx_u_touch ON public.fx_universal_lesson_edits;
CREATE TRIGGER fx_u_touch BEFORE INSERT OR UPDATE ON public.fx_universal_lesson_edits FOR EACH ROW EXECUTE FUNCTION private.fx_editor_touch();
ALTER TABLE public.fx_universal_lesson_edits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fx_universal_lesson_edits FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.fx_universal_lesson_edits TO anon,authenticated;
GRANT INSERT(page,subject,patches),UPDATE(patches) ON public.fx_universal_lesson_edits TO authenticated;
DROP POLICY IF EXISTS fx_u_read ON public.fx_universal_lesson_edits;
CREATE POLICY fx_u_read ON public.fx_universal_lesson_edits FOR SELECT TO anon,authenticated USING(private.fx_editor_can_read(page,subject));
DROP POLICY IF EXISTS fx_u_insert ON public.fx_universal_lesson_edits;
CREATE POLICY fx_u_insert ON public.fx_universal_lesson_edits FOR INSERT TO authenticated WITH CHECK(private.can_manage_subject(subject));
DROP POLICY IF EXISTS fx_u_update ON public.fx_universal_lesson_edits;
CREATE POLICY fx_u_update ON public.fx_universal_lesson_edits FOR UPDATE TO authenticated USING(private.can_manage_subject(subject)) WITH CHECK(private.can_manage_subject(subject));
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('fx-universal-lesson-media','fx-universal-lesson-media',true,8388608,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=EXCLUDED.public,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS fx_u_media_upload ON storage.objects;
CREATE POLICY fx_u_media_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (
bucket_id='fx-universal-lesson-media' AND private.can_manage_subject(split_part(name,'/',1))
AND name ~ '^[a-z-]+/[a-z0-9-]+/[0-9a-f-]+\.(jpg|png|webp)$'
);
-- Editorul din /cursuri/ pentru lecțiile simple, fără a schimba politicile existente pentru elevi.
DO $$
BEGIN
 IF to_regclass('public.fx_lessons') IS NOT NULL AND to_regclass('public.fx_lesson_contents') IS NOT NULL THEN
 EXECUTE 'GRANT UPDATE(title,summary,published,is_demo) ON public.fx_lessons TO authenticated';
 EXECUTE 'GRANT SELECT, UPDATE(body), INSERT(lesson_id,body) ON public.fx_lesson_contents TO authenticated';
 EXECUTE 'DROP POLICY IF EXISTS fx_u_course_meta ON public.fx_lessons';
 EXECUTE 'CREATE POLICY fx_u_course_meta ON public.fx_lessons FOR UPDATE TO authenticated USING(private.can_manage_subject(subject)) WITH CHECK(private.can_manage_subject(subject))';
 EXECUTE 'DROP POLICY IF EXISTS fx_u_course_read ON public.fx_lesson_contents';
 EXECUTE 'CREATE POLICY fx_u_course_read ON public.fx_lesson_contents FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.fx_lessons l WHERE l.id=lesson_id AND private.can_manage_subject(l.subject)))';
 EXECUTE 'DROP POLICY IF EXISTS fx_u_course_update ON public.fx_lesson_contents';
 EXECUTE 'CREATE POLICY fx_u_course_update ON public.fx_lesson_contents FOR UPDATE TO authenticated USING(EXISTS(SELECT 1 FROM public.fx_lessons l WHERE l.id=lesson_id AND private.can_manage_subject(l.subject))) WITH CHECK(EXISTS(SELECT 1 FROM public.fx_lessons l WHERE l.id=lesson_id AND private.can_manage_subject(l.subject)))';
 EXECUTE 'DROP POLICY IF EXISTS fx_u_course_insert ON public.fx_lesson_contents';
 EXECUTE 'CREATE POLICY fx_u_course_insert ON public.fx_lesson_contents FOR INSERT TO authenticated WITH CHECK(EXISTS(SELECT 1 FROM public.fx_lessons l WHERE l.id=lesson_id AND private.can_manage_subject(l.subject)))';
 END IF;
END $$;