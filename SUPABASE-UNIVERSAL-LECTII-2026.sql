-- FORMULA X · INSTALARE UNICĂ PENTRU TOATE LECȚIILE NOI
-- 8 noiembrie 2026 · configurare reutilizabilă, fără SQL la fiecare lecție
-- Rulează o singură dată în Supabase → SQL Editor → New query.
-- Nu adaugă elevi, nu șterge grupe, nu face lecțiile private publice.
-- După instalare: profesor → Studio vizual → Creează/editează;
-- profesor → Acces la lecții → activează/oprește, elevi, grupe, intervale.
-- Lecțiile Luceafărul și Plumb: /profesori/importa-literatura.html după instalare.
-- Acest script presupune că schema principală Formula X (fx_lessons,
-- fx_lesson_contents, fx_create_lesson, fx_open_lesson, fx_teacher_lesson_catalog,
-- fx_set_lesson_enabled și private.can_manage_subject) este deja instalată.
-- Poate fi rulat din nou pentru reparare; nu se rulează pentru fiecare lecție.
BEGIN;
DO $fx$ BEGIN
 IF to_regclass('public.fx_lessons') IS NULL OR to_regclass('public.fx_lesson_contents') IS NULL
 OR to_regprocedure('private.can_manage_subject(text)') IS NULL
 OR to_regprocedure('public.fx_create_lesson(text,text,text,text)') IS NULL
 OR to_regprocedure('public.fx_open_lesson(text)') IS NULL
 OR to_regprocedure('public.fx_teacher_lesson_catalog()') IS NULL
 OR to_regprocedure('public.fx_set_lesson_enabled(text,boolean)') IS NULL
 THEN
   RAISE EXCEPTION 'Schema de baza a lectiilor Formula X lipseste. Instaleaza mai intai migrarea deja folosita de portal (schema FX lessons access); aceasta instalare NU rescrie sistemul de acces existent.';
 END IF;
END $fx$;

-- PASUL 1: editorul universal, politicile pentru profesor și imagini
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
 IF p_page='matematica/progresii' THEN RETURN true; END IF;
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

-- PASUL 2: editarea blocurilor Studio, fără alt SQL pe viitor
-- Formula X · Studio vizual (2026-11-07)
-- Rulează în Supabase SQL Editor doar după verificarea schimbărilor din GitHub.
-- Nu șterge lecții, acces, grupe sau progres.
CREATE OR REPLACE FUNCTION public.fx_studio_update_lesson(
 p_slug text, p_title text, p_summary text, p_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
 lesson record;
 document jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autentificare necesară'; END IF;
 IF p_slug IS NULL OR length(p_slug)>120 OR p_slug !~ '^[a-z0-9-]+$' THEN
   RAISE EXCEPTION 'Identificator de lecție invalid';
 END IF;
 SELECT id,subject INTO lesson
 FROM public.fx_lessons
 WHERE slug=p_slug
 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lecția nu există'; END IF;
 IF NOT private.can_manage_subject(lesson.subject) THEN
   RAISE EXCEPTION 'Nu ai permisiunea să modifici această lecție' USING ERRCODE='42501';
 END IF;
 IF length(trim(coalesce(p_title,'')))<2 OR length(p_title)>190 THEN
   RAISE EXCEPTION 'Titlu invalid';
 END IF;
 IF length(coalesce(p_summary,''))>2000 THEN
   RAISE EXCEPTION 'Descriere prea lungă';
 END IF;
 IF length(coalesce(p_body,''))>175000 THEN
   RAISE EXCEPTION 'Lecția este prea mare';
 END IF;
 BEGIN document=p_body::jsonb;
 EXCEPTION WHEN others THEN RAISE EXCEPTION 'Conținut JSON invalid';
 END;
 IF (document->>'fx_format') IS DISTINCT FROM 'formula-x-blocks-v1'
   OR (document->>'subject') IS DISTINCT FROM lesson.subject
   OR jsonb_typeof(document->'blocks') IS DISTINCT FROM 'array'
   OR jsonb_array_length(document->'blocks') NOT BETWEEN 1 AND 150 THEN
   RAISE EXCEPTION 'Formatul lecției nu este valid';
 END IF;
 -- Nu permitem conversia accidentală a unei lecții vechi sau protejate.
 IF NOT EXISTS(
  SELECT 1 FROM public.fx_lesson_contents c
  WHERE c.lesson_id=lesson.id
    AND c.body LIKE '%"fx_format":"formula-x-blocks-v1"%'
 ) THEN
   RAISE EXCEPTION 'Această lecție nu este o lecție Studio; folosește editorul original';
 END IF;
 UPDATE public.fx_lessons SET title=trim(p_title),summary=coalesce(p_summary,'') WHERE id=lesson.id;
 UPDATE public.fx_lesson_contents SET body=p_body WHERE lesson_id=lesson.id;
END;
$$;
REVOKE ALL ON FUNCTION public.fx_studio_update_lesson(text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fx_studio_update_lesson(text,text,text,text) TO authenticated;

-- PASUL 3 (9 noiembrie): salvare atomică și aceeași versiune pentru toate editoarele.
ALTER TABLE public.fx_lessons ADD COLUMN IF NOT EXISTS editor_revision bigint NOT NULL DEFAULT 1;
ALTER TABLE public.fx_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_lesson_contents ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.fx_lesson_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN NEW.editor_revision=OLD.editor_revision+1; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS fx_lesson_revision ON public.fx_lessons;
CREATE TRIGGER fx_lesson_revision BEFORE UPDATE ON public.fx_lessons
FOR EACH ROW EXECUTE FUNCTION private.fx_lesson_revision();

CREATE OR REPLACE FUNCTION private.fx_content_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.fx_lessons SET editor_revision=editor_revision WHERE id=coalesce(NEW.lesson_id,OLD.lesson_id);
 RETURN coalesce(NEW,OLD);
END $$;
DROP TRIGGER IF EXISTS fx_content_revision ON public.fx_lesson_contents;
CREATE TRIGGER fx_content_revision AFTER INSERT OR UPDATE OR DELETE ON public.fx_lesson_contents
FOR EACH ROW EXECUTE FUNCTION private.fx_content_revision();

CREATE OR REPLACE FUNCTION private.fx_overlay_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.fx_lessons SET editor_revision=editor_revision
 WHERE subject=coalesce(NEW.subject,OLD.subject) AND slug=split_part(coalesce(NEW.page,OLD.page),'/',2);
 RETURN coalesce(NEW,OLD);
END $$;
DROP TRIGGER IF EXISTS fx_overlay_revision ON public.fx_universal_lesson_edits;
CREATE TRIGGER fx_overlay_revision AFTER INSERT OR UPDATE OR DELETE ON public.fx_universal_lesson_edits
FOR EACH ROW EXECUTE FUNCTION private.fx_overlay_revision();

CREATE OR REPLACE FUNCTION private.fx_validate_editor_body(p_body text,p_subject text)
RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE d jsonb; b jsonb;
BEGIN
 IF p_body IS NULL OR length(trim(p_body))=0 OR octet_length(p_body)>400000 THEN
  RAISE EXCEPTION 'Conținut gol sau prea mare (maximum 400 KB)';
 END IF;
 BEGIN d=p_body::jsonb; EXCEPTION WHEN invalid_text_representation THEN RETURN; END;
 IF d->>'fx_format'='formula-x-blocks-v1' THEN
  IF (d->>'subject') IS DISTINCT FROM p_subject OR jsonb_typeof(d->'blocks') IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'Materia sau lista blocurilor nu este validă';
  END IF;
  IF jsonb_array_length(d->'blocks') NOT BETWEEN 1 AND 150 OR octet_length(p_body)>175000 THEN
   RAISE EXCEPTION 'Lecția Studio trebuie să aibă 1–150 de blocuri și maximum 175 KB';
  END IF;
  FOR b IN SELECT value FROM jsonb_array_elements(d->'blocks') LOOP
   IF coalesce(b->>'type','') NOT IN ('heading','text','split','image','callout','steps','cards','quote','quiz','video','divider') THEN
    RAISE EXCEPTION 'Tip de bloc necunoscut';
   END IF;
   IF b->>'type'='quiz' THEN
    IF jsonb_typeof(b->'options') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Variante de răspuns invalide'; END IF;
    IF jsonb_array_length(b->'options')<>4 OR coalesce(b->>'correct','') NOT IN ('0','1','2','3') OR length(trim(coalesce(b->>'question','')))=0 THEN
     RAISE EXCEPTION 'Întrebare sau răspuns corect invalid';
    END IF;
   END IF;
  END LOOP;
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fx_editor_load_lesson(p_slug text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.fx_lessons%ROWTYPE; body text; patches jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autentificare necesară' USING ERRCODE='42501'; END IF;
 SELECT * INTO l FROM public.fx_lessons WHERE slug=p_slug;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lecția nu există'; END IF;
 IF NOT coalesce(private.can_manage_subject(l.subject),false) THEN RAISE EXCEPTION 'Acces profesor refuzat' USING ERRCODE='42501'; END IF;
 SELECT c.body INTO body FROM public.fx_lesson_contents c WHERE c.lesson_id=l.id;
 SELECT e.patches INTO patches FROM public.fx_universal_lesson_edits e WHERE e.page=l.subject||'/'||l.slug;
 RETURN jsonb_build_object('id',l.id,'slug',l.slug,'subject',l.subject,'title',l.title,'summary',l.summary,
  'revision',l.editor_revision,'body',body,'patches',coalesce(patches,'{}'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.fx_editor_create_lesson(p_id uuid,p_subject text,p_title text,p_summary text,p_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.fx_lessons%ROWTYPE; saved_body text; new_slug text;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(private.can_manage_subject(p_subject),false) THEN
  RAISE EXCEPTION 'Acces profesor refuzat' USING ERRCODE='42501';
 END IF;
 IF p_id IS NULL OR length(trim(coalesce(p_title,''))) NOT BETWEEN 2 AND 190 OR length(coalesce(p_summary,''))>2000 THEN
  RAISE EXCEPTION 'Identificator, titlu sau descriere invalidă';
 END IF;
 PERFORM private.fx_validate_editor_body(p_body,p_subject);
 -- Același UUID permite reluarea unei cereri al cărei răspuns s-a pierdut.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,0));
 SELECT * INTO l FROM public.fx_lessons WHERE id=p_id FOR UPDATE;
 IF FOUND THEN
  SELECT body INTO saved_body FROM public.fx_lesson_contents WHERE lesson_id=l.id;
  IF l.created_by IS DISTINCT FROM auth.uid() OR l.subject IS DISTINCT FROM p_subject OR l.title IS DISTINCT FROM trim(p_title) OR l.summary IS DISTINCT FROM coalesce(p_summary,'') OR saved_body IS DISTINCT FROM p_body THEN
   RAISE EXCEPTION 'Identificatorul este deja folosit de o lecție diferită' USING ERRCODE='40001';
  END IF;
 ELSE
  new_slug=trim(both '-' from left(regexp_replace(lower(p_title),'[^a-z0-9]+','-','g'),55))||'-'||replace(p_id::text,'-','');
  INSERT INTO public.fx_lessons(id,slug,subject,title,summary,published,is_demo,created_by)
  VALUES(p_id,new_slug,p_subject,trim(p_title),coalesce(p_summary,''),false,false,auth.uid());
  INSERT INTO public.fx_lesson_contents(lesson_id,body) VALUES(p_id,p_body);
  SELECT * INTO l FROM public.fx_lessons WHERE id=p_id;
 END IF;
 RETURN jsonb_build_object('id',l.id,'slug',l.slug,'subject',l.subject,'revision',l.editor_revision);
END $$;

CREATE OR REPLACE FUNCTION public.fx_editor_save_lesson(
 p_slug text,p_title text,p_summary text,p_body text,p_patches jsonb,p_expected_revision bigint
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.fx_lessons%ROWTYPE; previous_body text; previous_doc jsonb; next_doc jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autentificare necesară' USING ERRCODE='42501'; END IF;
 SELECT * INTO l FROM public.fx_lessons WHERE slug=p_slug FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lecția nu există'; END IF;
 IF NOT coalesce(private.can_manage_subject(l.subject),false) THEN RAISE EXCEPTION 'Acces profesor refuzat' USING ERRCODE='42501'; END IF;
 IF p_expected_revision IS NULL OR p_expected_revision IS DISTINCT FROM l.editor_revision THEN
  RAISE EXCEPTION 'Lecția a fost modificată în altă fereastră' USING ERRCODE='40001';
 END IF;
 IF length(trim(coalesce(p_title,''))) NOT BETWEEN 2 AND 190 OR length(coalesce(p_summary,''))>2000 THEN
  RAISE EXCEPTION 'Titlu sau descriere invalidă';
 END IF;
 IF (p_body IS NULL) = (p_patches IS NULL) THEN RAISE EXCEPTION 'Alege exact un format de salvare'; END IF;
 SELECT c.body INTO previous_body FROM public.fx_lesson_contents c WHERE c.lesson_id=l.id;
 IF p_body IS NOT NULL THEN
  IF previous_body IS NULL THEN RAISE EXCEPTION 'Materialul protejat se editează prin adaptor'; END IF;
  PERFORM private.fx_validate_editor_body(p_body,l.subject);
  BEGIN previous_doc=previous_body::jsonb; EXCEPTION WHEN invalid_text_representation THEN previous_doc=NULL; END;
  BEGIN next_doc=p_body::jsonb; EXCEPTION WHEN invalid_text_representation THEN next_doc=NULL; END;
  IF previous_doc->>'fx_format' IS NOT NULL AND (previous_doc->>'fx_format') IS DISTINCT FROM (next_doc->>'fx_format') THEN
   RAISE EXCEPTION 'Formatul lecției existente trebuie păstrat';
  END IF;
  IF previous_doc ? 'essays' AND (jsonb_typeof(next_doc->'essays') IS DISTINCT FROM 'object' OR next_doc#>'{essays,particularitati}' IS NULL OR next_doc#>'{essays,caracterizare}' IS NULL) THEN
   RAISE EXCEPTION 'Ambele eseuri trebuie păstrate';
  END IF;
  IF previous_doc ? 'quizQuestions' AND (jsonb_typeof(next_doc->'quizQuestions') IS DISTINCT FROM 'array') THEN
   RAISE EXCEPTION 'Chestionarul trebuie păstrat';
  END IF;
  IF jsonb_typeof(previous_doc->'quizQuestions')='array' AND jsonb_array_length(previous_doc->'quizQuestions') IS DISTINCT FROM jsonb_array_length(next_doc->'quizQuestions') THEN
   RAISE EXCEPTION 'Numărul întrebărilor formatului existent trebuie păstrat';
  END IF;
  UPDATE public.fx_lesson_contents SET body=p_body WHERE lesson_id=l.id;
  -- Modelul a fost integrat în body; nu lăsăm vechi suprascrieri să ascundă noua versiune.
  UPDATE public.fx_universal_lesson_edits SET patches=patches-'model'
  WHERE page=l.subject||'/'||l.slug AND patches ? 'model';
 ELSE
  IF previous_body IS NOT NULL THEN RAISE EXCEPTION 'Folosește conținutul principal pentru această lecție'; END IF;
  IF jsonb_typeof(p_patches) IS DISTINCT FROM 'object' OR octet_length(p_patches::text)>399999 THEN RAISE EXCEPTION 'Modificări invalide sau prea mari'; END IF;
  INSERT INTO public.fx_universal_lesson_edits(page,subject,patches) VALUES(l.subject||'/'||l.slug,l.subject,p_patches)
  ON CONFLICT(page) DO UPDATE SET patches=EXCLUDED.patches;
 END IF;
 UPDATE public.fx_lessons SET title=trim(p_title),summary=coalesce(p_summary,'') WHERE id=l.id
 RETURNING * INTO l;
 RETURN jsonb_build_object('id',l.id,'slug',l.slug,'subject',l.subject,'revision',l.editor_revision);
END $$;
REVOKE ALL ON FUNCTION private.fx_lesson_revision(),private.fx_content_revision(),private.fx_overlay_revision(),private.fx_validate_editor_body(text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.fx_editor_load_lesson(text),public.fx_editor_create_lesson(uuid,text,text,text,text),public.fx_editor_save_lesson(text,text,text,text,jsonb,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fx_editor_load_lesson(text),public.fx_editor_create_lesson(uuid,text,text,text,text),public.fx_editor_save_lesson(text,text,text,text,jsonb,bigint) TO authenticated;
NOTIFY pgrst,'reload schema';

COMMIT;

