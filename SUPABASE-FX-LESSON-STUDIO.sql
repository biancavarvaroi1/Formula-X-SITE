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
    AND (c.body::jsonb)->>'fx_format'='formula-x-blocks-v1'
 ) THEN
   RAISE EXCEPTION 'Această lecție nu este o lecție Studio; folosește editorul original';
 END IF;
 UPDATE public.fx_lessons SET title=trim(p_title),summary=coalesce(p_summary,'') WHERE id=lesson.id;
 UPDATE public.fx_lesson_contents SET body=p_body WHERE lesson_id=lesson.id;
END;
$$;
REVOKE ALL ON FUNCTION public.fx_studio_update_lesson(text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fx_studio_update_lesson(text,text,text,text) TO authenticated;