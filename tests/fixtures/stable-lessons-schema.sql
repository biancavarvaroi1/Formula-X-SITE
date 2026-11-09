-- Disposable contract database for CI, never run against the live project.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA private;
CREATE SCHEMA storage;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth,private TO anon,authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
CREATE TABLE public.staff_accounts(user_id uuid PRIMARY KEY REFERENCES auth.users,role text,subject text);
CREATE FUNCTION private.can_manage_subject(text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.staff_accounts WHERE user_id=auth.uid() AND (role='admin' OR role='mentor' AND subject=$1))
$$;
CREATE TABLE public.fx_lessons(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),slug text UNIQUE NOT NULL,subject text NOT NULL,title text NOT NULL,summary text,published boolean DEFAULT false,is_demo boolean DEFAULT false,created_by uuid REFERENCES auth.users,sort_order int DEFAULT 0,created_at timestamptz DEFAULT now());
CREATE TABLE public.fx_lesson_contents(lesson_id uuid PRIMARY KEY REFERENCES public.fx_lessons,body text);
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.fx_open_lesson(text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce((SELECT jsonb_build_object('slug',l.slug,'subject',l.subject,'format','text',
  'access',jsonb_build_object('allowed',private.can_manage_subject(l.subject) OR l.published AND l.is_demo),
  'body',CASE WHEN private.can_manage_subject(l.subject) OR l.published AND l.is_demo THEN c.body END)
 FROM public.fx_lessons l LEFT JOIN public.fx_lesson_contents c ON c.lesson_id=l.id WHERE l.slug=$1),'{"access":{"allowed":false}}'::jsonb)
$$;
CREATE FUNCTION public.fx_create_lesson(text,text,text,text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN RETURN; END $$;
CREATE FUNCTION public.fx_teacher_lesson_catalog() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION public.fx_set_lesson_enabled(text,boolean) RETURNS void LANGUAGE plpgsql AS $$ BEGIN RETURN; END $$;
INSERT INTO auth.users VALUES('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
INSERT INTO public.staff_accounts VALUES('00000000-0000-0000-0000-000000000001','mentor','romana'),('00000000-0000-0000-0000-000000000002','mentor','matematica');
INSERT INTO public.fx_lessons(id,slug,subject,title,summary) VALUES('10000000-0000-0000-0000-000000000001','ultima-noapte','romana','Ultima noapte','');
INSERT INTO public.fx_lesson_contents VALUES('10000000-0000-0000-0000-000000000001','Material privat');
CREATE TABLE public.test_original_access AS SELECT md5(pg_get_functiondef('public.fx_open_lesson(text)'::regprocedure)) AS hash;

CREATE FUNCTION public.test_reject_title() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.title='TRIGGER_FAIL' THEN RAISE EXCEPTION 'Test rejection after content write'; END IF;RETURN NEW;END $$;
CREATE TRIGGER test_reject_title BEFORE UPDATE ON public.fx_lessons FOR EACH ROW EXECUTE FUNCTION public.test_reject_title();
