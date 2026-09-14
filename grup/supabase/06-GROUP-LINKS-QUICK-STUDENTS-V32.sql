-- =====================================================================
-- FORMULA X V32 — LINK DIRECT PENTRU GRUPĂ + ADĂUGARE RAPIDĂ ELEVI
-- Rulează o singură dată DUPĂ V31.
--
-- Ce face:
-- 1) fiecare grupă primește un token unic pentru linkul public;
-- 2) elevul se poate înscrie în grupa respectivă doar cu nume + telefon;
-- 3) elevul este adăugat automat în enrollments + group_members;
-- 4) profesorii pot adăuga manual elevi fără email obligatoriu;
-- 5) păstrează RLS; anon NU primește acces direct la tabele.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- A. Emailul devine opțional pentru elevii adăugați manual / prin grupă.
-- Formularele publice clasice Formula X continuă să ceară email prin V30.
-- ---------------------------------------------------------------------
alter table public.enrollments
    alter column email drop not null;

alter table public.enrollments
    drop constraint if exists enrollments_email_check;

alter table public.enrollments
    add constraint enrollments_email_check
    check (email is null or char_length(trim(email)) >= 3);

-- Politicile profesorilor permit acum email NULL, dar păstrează toate
-- celelalte limite: doar source=mentor, request_type=manual și materia sa.
drop policy if exists "staff_insert_enrollment" on public.enrollments;
create policy "staff_insert_enrollment"
on public.enrollments
for insert
to authenticated
with check (
    source = 'mentor'
    and request_type = 'manual'
    and (select private.can_manage_subject(subject))
    and char_length(trim(full_name)) >= 2
    and (email is null or char_length(trim(email)) >= 3)
);

drop policy if exists "fx30_guard_staff_insert_enrollment" on public.enrollments;
create policy "fx30_guard_staff_insert_enrollment"
on public.enrollments as restrictive
for insert
to authenticated
with check (
    source = 'mentor'
    and request_type = 'manual'
    and (select private.can_manage_subject(subject))
    and char_length(trim(full_name)) >= 2
    and (email is null or char_length(trim(email)) >= 3)
);

-- ---------------------------------------------------------------------
-- B. Link unic pe fiecare grupă.
-- UUID v4 = link greu de ghicit. Poate fi regenerat din portal.
-- ---------------------------------------------------------------------
alter table public.teacher_groups
    add column if not exists join_token uuid,
    add column if not exists join_enabled boolean not null default true;

update public.teacher_groups
set join_token = gen_random_uuid()
where join_token is null;

alter table public.teacher_groups
    alter column join_token set default gen_random_uuid(),
    alter column join_token set not null;

create unique index if not exists teacher_groups_join_token_uidx
    on public.teacher_groups(join_token);

-- ---------------------------------------------------------------------
-- C. Limitare simplă server-side pe fiecare grupă.
-- Tokenul este secretul de invitație; dacă ajunge unde nu trebuie,
-- profesorul îl poate regenera din portal.
-- ---------------------------------------------------------------------
create table if not exists private.fx32_group_join_rate (
    group_id uuid not null references public.teacher_groups(id) on delete cascade,
    window_start timestamptz not null,
    attempts integer not null default 0,
    primary key (group_id, window_start)
);

revoke all on table private.fx32_group_join_rate from public, anon, authenticated;

-- Normalizare telefon pentru deduplicarea aceleiași persoane.
create or replace function private.fx32_normalize_phone(p_phone text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
    v text;
begin
    v := regexp_replace(coalesce(p_phone,''), '[^0-9+]', '', 'g');
    if left(v,2)='00' then v := '+' || substr(v,3); end if;
    if v ~ '^0[0-9]{9}$' then v := '+40' || substr(v,2); end if;
    if v ~ '^40[0-9]{9}$' then v := '+' || v; end if;
    return v;
end;
$$;

revoke all on function private.fx32_normalize_phone(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- D. Informațiile publice MINIME despre grupă pentru pagina din link.
-- Nu expune lista elevilor, emailuri sau alte date interne.
-- ---------------------------------------------------------------------
create or replace function public.fx32_group_info(p_token uuid)
returns table (
    group_name text,
    subject text,
    mentor_name text
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        g.name,
        g.subject,
        coalesce(s.display_name,'Profesor Formula X')
    from public.teacher_groups g
    left join public.staff_accounts s on s.user_id = g.owner_id
    where g.join_token = p_token
      and g.join_enabled = true
      and g.active = true
    limit 1;
$$;

revoke all on function public.fx32_group_info(uuid) from public;
grant execute on function public.fx32_group_info(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- E. Înscriere publică prin token.
-- IMPORTANT: anon execută doar funcția; nu are INSERT direct pe tabele.
-- ---------------------------------------------------------------------
create or replace function public.fx32_join_group(
    p_token uuid,
    p_full_name text,
    p_phone text,
    p_website text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_group public.teacher_groups%rowtype;
    v_name text;
    v_phone text;
    v_enrollment_id uuid;
    v_attempts integer;
    v_window timestamptz := date_trunc('hour', now());
begin
    -- Honeypot: câmpul nu este vizibil utilizatorului normal.
    if coalesce(trim(p_website),'') <> '' then
        return jsonb_build_object('ok',false,'code','invalid');
    end if;

    v_name := trim(coalesce(p_full_name,''));
    v_phone := private.fx32_normalize_phone(p_phone);

    if char_length(v_name) < 2 or char_length(v_name) > 120 then
        return jsonb_build_object('ok',false,'code','invalid_name');
    end if;

    if v_phone !~ '^\+?[0-9]{8,15}$' then
        return jsonb_build_object('ok',false,'code','invalid_phone');
    end if;

    select * into v_group
    from public.teacher_groups g
    where g.join_token = p_token
      and g.join_enabled = true
      and g.active = true
    limit 1;

    if not found then
        return jsonb_build_object('ok',false,'code','invalid_link');
    end if;

    -- Serializăm înscrierile aceleiași grupe și limităm abuzul.
    perform pg_advisory_xact_lock(hashtextextended(v_group.id::text, 320026));

    insert into private.fx32_group_join_rate(group_id,window_start,attempts)
    values(v_group.id,v_window,1)
    on conflict (group_id,window_start)
    do update set attempts = private.fx32_group_join_rate.attempts + 1
    returning attempts into v_attempts;

    if v_attempts > 80 then
        return jsonb_build_object('ok',false,'code','rate_limited');
    end if;

    -- Dacă aceeași persoană există deja la aceeași materie (nume + telefon),
    -- reutilizăm fișa, evitând duplicatele. Numele diferite cu același telefon
    -- rămân persoane distincte (ex. frați care folosesc telefonul părintelui).
    select e.id into v_enrollment_id
    from public.enrollments e
    where e.subject = v_group.subject
      and lower(trim(e.full_name)) = lower(v_name)
      and private.fx32_normalize_phone(e.phone) = v_phone
    order by e.created_at desc
    limit 1;

    if v_enrollment_id is null then
        insert into public.enrollments(
            full_name,email,phone,subject,level,status,source,
            student_message,desired_grade,teacher_note,archived_at,
            request_type,created_at,updated_at
        ) values (
            v_name,null,v_phone,v_group.subject,null,'activ','group_link',
            null,null,null,null,'manual',now(),now()
        )
        returning id into v_enrollment_id;
    else
        update public.enrollments
        set archived_at = null,
            status = case when status='inactiv' then 'activ' else status end,
            updated_at = now()
        where id = v_enrollment_id;
    end if;

    insert into public.group_members(group_id,enrollment_id)
    values(v_group.id,v_enrollment_id)
    on conflict (group_id,enrollment_id) do nothing;

    return jsonb_build_object('ok',true);
exception
    when others then
        -- Nu expunem detalii interne ale bazei de date către formularul public.
        return jsonb_build_object('ok',false,'code','service_unavailable');
end;
$$;

revoke all on function public.fx32_join_group(uuid,text,text,text) from public;
grant execute on function public.fx32_join_group(uuid,text,text,text) to anon, authenticated;

commit;

-- Verificare rapidă. Ar trebui să vezi join_token/join_enabled și funcțiile V32.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public'
  and table_name='teacher_groups'
  and column_name in ('join_token','join_enabled')
order by column_name;

select routine_name
from information_schema.routines
where routine_schema='public'
  and routine_name in ('fx32_group_info','fx32_join_group')
order by routine_name;
