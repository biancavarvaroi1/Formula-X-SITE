-- Formula X | Preînscrieri Bianca | SQL Editor
-- Script aditiv; nu modifică politicile tabelelor existente.
BEGIN;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.staff_accounts WHERE subject='romana' AND lower(btrim(display_name))='bianca varvaroi') <> 1 THEN
  RAISE EXCEPTION 'Trebuie să existe exact un cont staff_accounts pentru Bianca Varvaroi, subject romana';
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.fx_bianca_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 mentor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 160),
 phone text NOT NULL CHECK (phone ~ '^[+]?[0-9]{9,15}$'),
 current_grade numeric(4,2) CHECK (current_grade BETWEEN 1 AND 10),
 difficulties text NOT NULL CHECK (char_length(btrim(difficulties)) BETWEEN 3 AND 2000),
 status text NOT NULL DEFAULT 'noua' CHECK (status IN ('noua','contactata','acceptata','inchisa')),
 group_id uuid REFERENCES public.teacher_groups(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(student_id,mentor_id)
);
ALTER TABLE public.fx_bianca_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fx_bianca_applications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.fx_bianca_applications TO authenticated;
DROP POLICY IF EXISTS fx_bianca_read ON public.fx_bianca_applications;
CREATE POLICY fx_bianca_read ON public.fx_bianca_applications FOR SELECT TO authenticated
 USING (student_id=auth.uid() OR (mentor_id=auth.uid() AND EXISTS (SELECT 1 FROM public.staff_accounts s WHERE s.user_id=auth.uid() AND s.subject='romana')));

CREATE OR REPLACE FUNCTION public.fx_bianca_apply(p_name text,p_phone text,p_grade numeric,p_difficulties text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); mentor uuid; result_id uuid;
BEGIN
 IF uid IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id=uid AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Autentifică-te și confirmă adresa de e-mail.'; END IF;
 IF EXISTS (SELECT 1 FROM public.staff_accounts WHERE user_id=uid) THEN RAISE EXCEPTION 'Formularul este destinat elevilor.'; END IF;
 SELECT user_id INTO STRICT mentor FROM public.staff_accounts WHERE subject='romana' AND lower(btrim(display_name))='bianca varvaroi';
 IF p_name IS NULL OR p_phone IS NULL OR p_difficulties IS NULL THEN RAISE EXCEPTION 'Completează câmpurile obligatorii.'; END IF;
 INSERT INTO public.fx_bianca_applications(student_id,mentor_id,full_name,phone,current_grade,difficulties)
 VALUES(uid,mentor,btrim(p_name),p_phone,p_grade,btrim(p_difficulties))
 ON CONFLICT(student_id,mentor_id) DO NOTHING RETURNING id INTO result_id;
 IF result_id IS NULL THEN RAISE EXCEPTION 'Ai deja o cerere de preînscriere.'; END IF;
 RETURN result_id;
END $$;

CREATE OR REPLACE FUNCTION public.fx_bianca_set_status(p_id uuid,p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_status IS NULL OR p_status NOT IN ('noua','contactata','inchisa') THEN RAISE EXCEPTION 'Status invalid'; END IF;
 UPDATE public.fx_bianca_applications a SET status=p_status,updated_at=now()
 WHERE a.id=p_id AND a.mentor_id=auth.uid() AND a.status<>'acceptata'
 AND EXISTS (SELECT 1 FROM public.staff_accounts s WHERE s.user_id=auth.uid() AND s.subject='romana');
 IF NOT FOUND THEN RAISE EXCEPTION 'Cererea nu poate fi modificată.'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fx_bianca_accept(p_id uuid,p_group uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.fx_bianca_applications%ROWTYPE; g public.teacher_groups%ROWTYPE; eid uuid; old_status text; old_archived timestamptz; account_email text;
BEGIN
 SELECT * INTO a FROM public.fx_bianca_applications WHERE id=p_id AND mentor_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.staff_accounts s WHERE s.user_id=auth.uid() AND s.subject='romana') THEN RAISE EXCEPTION 'Acces nepermis.'; END IF;
 IF a.status='acceptata' OR a.status='inchisa' THEN RAISE EXCEPTION 'Cererea este deja soluționată.'; END IF;
 SELECT * INTO g FROM public.teacher_groups WHERE id=p_group AND owner_id=auth.uid() AND subject='romana' AND active IS TRUE FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Selectează o grupă activă proprie de română.'; END IF;
 SELECT email INTO account_email FROM auth.users WHERE id=a.student_id AND email_confirmed_at IS NOT NULL;
 IF account_email IS NULL THEN RAISE EXCEPTION 'Contul elevului nu are e-mail confirmat.'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(a.student_id::text||':romana',0));
 SELECT e.id,e.status,e.archived_at INTO eid,old_status,old_archived FROM public.enrollments e WHERE e.student_id=a.student_id AND e.subject='romana' ORDER BY (e.archived_at IS NULL) DESC,e.created_at DESC,e.id LIMIT 1 FOR UPDATE;
 IF eid IS NULL THEN
  SELECT e.id,e.status,e.archived_at INTO eid,old_status,old_archived FROM public.enrollments e WHERE e.student_id IS NULL AND e.subject='romana' AND lower(btrim(e.email))=lower(btrim(account_email)) ORDER BY (e.archived_at IS NULL) DESC,e.created_at DESC,e.id LIMIT 1 FOR UPDATE;
 END IF;
 IF eid IS NOT NULL AND (old_archived IS NOT NULL OR old_status='inactiv') THEN RAISE EXCEPTION 'Elevul are o înscriere inactivă/arhivată. Verific-o în portal înainte de acceptare.'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.group_members WHERE group_id=p_group AND enrollment_id=eid) AND (SELECT count(*) FROM public.group_members WHERE group_id=p_group)>=15 THEN RAISE EXCEPTION 'Grupa are deja 15 elevi.'; END IF;
 IF eid IS NULL THEN
  INSERT INTO public.enrollments(student_id,full_name,email,phone,subject,status,source,request_type,student_message)
  VALUES(a.student_id,a.full_name,account_email,a.phone,'romana','activ','site','inscriere',a.difficulties) RETURNING id INTO eid;
 ELSE
  UPDATE public.enrollments SET student_id=a.student_id,status='activ' WHERE id=eid;
 END IF;
 INSERT INTO public.group_members(group_id,enrollment_id) VALUES(p_group,eid) ON CONFLICT(group_id,enrollment_id) DO NOTHING;
 UPDATE public.fx_bianca_applications SET status='acceptata',group_id=p_group,updated_at=now() WHERE id=p_id;
 RETURN eid;
END $$;
REVOKE ALL ON FUNCTION public.fx_bianca_apply(text,text,numeric,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.fx_bianca_set_status(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.fx_bianca_accept(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fx_bianca_apply(text,text,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fx_bianca_set_status(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fx_bianca_accept(uuid,uuid) TO authenticated;
COMMIT;
