-- Formula X: înscriere în grupă prin link pentru elevi autentificați
-- Rulează scriptul integral din Supabase SQL Editor.
-- Nu șterge elevi, grupe sau lecții.
BEGIN;

DO $fx$
BEGIN
  IF to_regclass('public.profiles') IS NULL
     OR to_regclass('public.staff_accounts') IS NULL
     OR to_regclass('public.enrollments') IS NULL
     OR to_regclass('public.teacher_groups') IS NULL
     OR to_regclass('public.group_members') IS NULL
     OR to_regprocedure('private.can_manage_group(uuid)') IS NULL
  THEN RAISE EXCEPTION 'Lipsesc tabelele Formula X necesare invitațiilor'; END IF;
END
$fx$;

ALTER TABLE public.teacher_groups
 ADD COLUMN IF NOT EXISTS join_token uuid,
 ADD COLUMN IF NOT EXISTS join_enabled boolean DEFAULT true;

UPDATE public.teacher_groups SET join_token=gen_random_uuid() WHERE join_token IS NULL;
UPDATE public.teacher_groups SET join_enabled=true WHERE join_enabled IS NULL;
ALTER TABLE public.teacher_groups ALTER COLUMN join_token SET DEFAULT gen_random_uuid();
ALTER TABLE public.teacher_groups ALTER COLUMN join_token SET NOT NULL;
ALTER TABLE public.teacher_groups ALTER COLUMN join_enabled SET DEFAULT true;
ALTER TABLE public.teacher_groups ALTER COLUMN join_enabled SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS fx_group_invitation_token_uniq ON public.teacher_groups(join_token);
CREATE INDEX IF NOT EXISTS fx_enrollments_student_subject_lookup
 ON public.enrollments(student_id,subject) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS fx_enrollments_unlinked_email_subject_lookup
 ON public.enrollments(lower(btrim(email)),subject) WHERE student_id IS NULL;

CREATE OR REPLACE FUNCTION public.fx_group_invite_info(p_token uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fx$
DECLARE
  g record;
  is_member boolean:=false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok',false,'code','login_required');
  END IF;

  SELECT tg.id,tg.name,tg.subject,tg.owner_id,sa.display_name
    INTO g
    FROM public.teacher_groups tg
    LEFT JOIN public.staff_accounts sa ON sa.user_id=tg.owner_id
   WHERE tg.join_token=p_token AND tg.active IS TRUE AND tg.join_enabled IS TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'code','invalid_link');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    JOIN public.enrollments en ON en.id=gm.enrollment_id
    WHERE gm.group_id=g.id AND en.student_id=auth.uid()
      AND en.status='activ' AND en.archived_at IS NULL
  ) INTO is_member;

  RETURN jsonb_build_object(
    'ok',true,'group_name',g.name,'subject',g.subject,
    'mentor_name',coalesce(nullif(btrim(g.display_name),''),'Profesor Formula X'),
    'already_member',is_member
  );
END;
$fx$;
REVOKE ALL ON FUNCTION public.fx_group_invite_info(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fx_group_invite_info(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fx_group_invite_join(p_token uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fx$
DECLARE
  g record;
  uid uuid:=auth.uid();
  account_email text;
  email_verified boolean:=false;
  full_name text;
  enrollment_id uuid;
  enrolled_status text;
  enrolled_archived timestamptz;
  already_member boolean:=false;
  reused_enrollment boolean:=false;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok',false,'code','login_required');
  END IF;

  SELECT tg.id,tg.name,tg.subject INTO g
    FROM public.teacher_groups tg
   WHERE tg.join_token=p_token AND tg.active IS TRUE AND tg.join_enabled IS TRUE
   FOR SHARE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'code','invalid_link');
  END IF;

  SELECT u.email,(u.email_confirmed_at IS NOT NULL)
    INTO account_email,email_verified
    FROM auth.users u WHERE u.id=uid;
  IF account_email IS NULL OR btrim(account_email)='' THEN
    RETURN jsonb_build_object('ok',false,'code','email_missing');
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(uid::text||':'||g.subject,0)
  );

  SELECT e.id,e.status,e.archived_at
    INTO enrollment_id,enrolled_status,enrolled_archived
    FROM public.enrollments e
   WHERE e.student_id=uid AND e.subject=g.subject
   ORDER BY (e.archived_at IS NULL) DESC,e.created_at DESC,e.id
   LIMIT 1 FOR UPDATE;

  IF enrollment_id IS NULL AND email_verified THEN
    SELECT e.id,e.status,e.archived_at
      INTO enrollment_id,enrolled_status,enrolled_archived
      FROM public.enrollments e
     WHERE e.student_id IS NULL AND e.subject=g.subject
       AND lower(btrim(e.email))=lower(btrim(account_email))
     ORDER BY (e.archived_at IS NULL) DESC,e.created_at DESC,e.id
     LIMIT 1 FOR UPDATE;
    IF enrollment_id IS NOT NULL THEN reused_enrollment:=true; END IF;
  END IF;

  IF enrollment_id IS NOT NULL
     AND (enrolled_archived IS NOT NULL OR enrolled_status='inactiv') THEN
    RETURN jsonb_build_object('ok',false,'code','enrollment_inactive');
  END IF;

  IF enrollment_id IS NULL THEN
    SELECT p.name INTO full_name
      FROM public.profiles p WHERE p.user_id=uid;

    IF full_name IS NULL OR length(btrim(full_name))<2 THEN
      SELECT coalesce(
        nullif(btrim(u.raw_user_meta_data->>'full_name'),''),
        nullif(btrim(u.raw_user_meta_data->>'name'),'')
      ) INTO full_name FROM auth.users u WHERE u.id=uid;
    END IF;

    IF full_name IS NULL OR length(btrim(full_name))<2 THEN
      full_name:=split_part(account_email,'@',1);
    END IF;
    IF length(btrim(full_name))<2 THEN full_name:='Elev Formula X'; END IF;
    full_name:=left(btrim(full_name),160);

    INSERT INTO public.enrollments
      (student_id,full_name,email,subject,status,source,request_type)
    VALUES
      (uid,full_name,btrim(account_email),g.subject,'activ','site','inscriere')
    RETURNING id INTO enrollment_id;
  ELSE
    UPDATE public.enrollments
       SET student_id=uid,status='activ'
     WHERE id=enrollment_id AND archived_at IS NULL AND status<>'inactiv';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
     WHERE gm.group_id=g.id AND gm.enrollment_id=enrollment_id
  ) INTO already_member;

  INSERT INTO public.group_members(group_id,enrollment_id)
  VALUES(g.id,enrollment_id)
  ON CONFLICT(group_id,enrollment_id) DO NOTHING;

  RETURN jsonb_build_object(
    'ok',true,
    'code',CASE WHEN already_member THEN 'already_member' ELSE 'joined' END,
    'group_name',g.name,'subject',g.subject,
    'enrollment_id',enrollment_id,
    'reused_enrollment',reused_enrollment
  );
END;
$fx$;
REVOKE ALL ON FUNCTION public.fx_group_invite_join(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fx_group_invite_join(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fx_group_invite_rotate(p_group_id uuid)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fx$
DECLARE new_token uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_manage_group(p_group_id) THEN
    RAISE EXCEPTION 'Nu poți schimba linkul acestei grupe' USING ERRCODE='42501';
  END IF;
  UPDATE public.teacher_groups SET join_token=gen_random_uuid()
   WHERE id=p_group_id RETURNING join_token INTO new_token;
  IF new_token IS NULL THEN RAISE EXCEPTION 'Grupa nu există'; END IF;
  RETURN new_token;
END;
$fx$;
REVOKE ALL ON FUNCTION public.fx_group_invite_rotate(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fx_group_invite_rotate(uuid) TO authenticated;

COMMIT;