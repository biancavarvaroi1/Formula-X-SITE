-- FORMULA X · evidenta privata a platilor, exclusiv pentru profesor
-- Ruleaza integral in Supabase SQL Editor. Nu modifica elevi, grupe sau lectii.
BEGIN;

DO $guard$
BEGIN
  IF to_regclass('public.enrollments') IS NULL OR
     to_regclass('public.teacher_groups') IS NULL OR
     to_regclass('public.group_members') IS NULL OR
     to_regclass('public.staff_accounts') IS NULL THEN
    RAISE EXCEPTION 'Schema portalului Formula X nu este instalata.';
  END IF;
END
$guard$;

CREATE TABLE IF NOT EXISTS public.fx_private_student_payments (
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  month_start date NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  amount_ron numeric(10,2),
  private_note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(teacher_id,enrollment_id,month_start),
  CONSTRAINT fx_payments_first_day CHECK (EXTRACT(DAY FROM month_start)=1),
  CONSTRAINT fx_payments_amount CHECK (amount_ron IS NULL OR (amount_ron >= 0 AND amount_ron <= 100000)),
  CONSTRAINT fx_payments_note_limit CHECK (private_note IS NULL OR length(private_note)<=500)
);
CREATE INDEX IF NOT EXISTS fx_private_student_payments_teacher_month_idx
  ON public.fx_private_student_payments (teacher_id,month_start DESC);

-- Validare in baza de date: doar mentorul caruia ii apartine o grupa
-- ce contine elevul poate consulta sau modifica plata pentru acel elev.
-- Administratorii si alti profesori nu primesc exceptii.
CREATE OR REPLACE FUNCTION private.fx_can_manage_student_payment(
  p_teacher_id uuid, p_enrollment_id uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fx$
  SELECT p_teacher_id IS NOT NULL
    AND p_teacher_id=auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.staff_accounts st
      WHERE st.user_id=auth.uid() AND st.role='mentor'
    )
    AND EXISTS (
      SELECT 1
      FROM public.group_members gm
      JOIN public.teacher_groups tg ON tg.id=gm.group_id
      JOIN public.enrollments e ON e.id=gm.enrollment_id
      JOIN public.staff_accounts st ON st.user_id=tg.owner_id
      WHERE gm.enrollment_id=p_enrollment_id
        AND tg.owner_id=p_teacher_id
        AND st.role='mentor'
        AND st.subject=tg.subject
        AND e.subject=tg.subject
    );
$fx$;
REVOKE ALL ON FUNCTION private.fx_can_manage_student_payment(uuid,uuid)
  FROM PUBLIC,anon,authenticated;

ALTER TABLE public.fx_private_student_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_private_student_payments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.fx_private_student_payments FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.fx_private_student_payments TO authenticated;

DROP POLICY IF EXISTS fx_payment_read_teacher ON public.fx_private_student_payments;
CREATE POLICY fx_payment_read_teacher ON public.fx_private_student_payments
FOR SELECT TO authenticated
USING (private.fx_can_manage_student_payment(teacher_id,enrollment_id));

DROP POLICY IF EXISTS fx_payment_add_teacher ON public.fx_private_student_payments;
CREATE POLICY fx_payment_add_teacher ON public.fx_private_student_payments
FOR INSERT TO authenticated
WITH CHECK (private.fx_can_manage_student_payment(teacher_id,enrollment_id));

DROP POLICY IF EXISTS fx_payment_edit_teacher ON public.fx_private_student_payments;
CREATE POLICY fx_payment_edit_teacher ON public.fx_private_student_payments
FOR UPDATE TO authenticated
USING (private.fx_can_manage_student_payment(teacher_id,enrollment_id))
WITH CHECK (private.fx_can_manage_student_payment(teacher_id,enrollment_id));

DROP POLICY IF EXISTS fx_payment_delete_teacher ON public.fx_private_student_payments;
CREATE POLICY fx_payment_delete_teacher ON public.fx_private_student_payments
FOR DELETE TO authenticated
USING (private.fx_can_manage_student_payment(teacher_id,enrollment_id));

-- Nu se ofera elevilor sau altor profesori acces la tabel.
COMMENT ON TABLE public.fx_private_student_payments IS
'Registru intern manual per profesor, elev si luna; nu reprezinta dovada fiscala sau procesare de plati.';

COMMIT;