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
 IF document->>'fx_format'<>'formula-x-blocks-v1'
   OR document->>'subject'<>lesson.subject
   OR jsonb_typeof(document->'blocks')<>'array'
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

COMMIT;
