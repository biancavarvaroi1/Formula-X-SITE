-- =====================================================================
-- FORMULA X — SUPABASE MASTER V28
-- UN SINGUR COD pentru configurația curentă a site-ului Formula X
--
-- CE FACE:
-- - păstrează datele existente;
-- - normalizează tabelele și politicile RLS;
-- - configurează conturile elevilor + progres + camera de studiu + jurnal;
-- - configurează portalul profesorilor;
-- - include Logică + Niță Daniela Georgiana;
-- - include mesaje elevi, gestionare elevi, grupe, calendar și activitate admin;
-- - include analytics page_views;
-- - creează RPC-ul get_my_staff_profile() folosit de portalul V27+.
--
-- IMPORTANT:
-- 1) Rulează TOT fișierul într-un singur New query în Supabase SQL Editor.
-- 2) NU mai rula după aceea vechile coduri V15/V16/V22/V25/V27.
-- 3) Codul NU șterge elevii, conturile sau progresul existent.
-- =====================================================================

begin;

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- =====================================================================
-- A. CONTURILE ELEVILOR / PROGRESUL
-- =====================================================================

-- 1. PROFIL ELEV
create table if not exists public.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    name text,
    bac_year integer,
    profile text,
    specialization text,
    optional_subject text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles
    add column if not exists name text,
    add column if not exists bac_year integer,
    add column if not exists profile text,
    add column if not exists specialization text,
    add column if not exists optional_subject text,
    add column if not exists created_at timestamptz not null default now(),
    add column if not exists updated_at timestamptz not null default now();

-- 2. PROGRES PE TEST
create table if not exists public.test_progress (
    user_id uuid not null references auth.users(id) on delete cascade,
    test_id text not null,
    completed boolean not null default false,
    last_grade numeric(4,2),
    best_grade numeric(4,2),
    completed_at timestamptz,
    updated_at timestamptz not null default now(),
    difficulty_tags text[] not null default '{}',
    personal_note text,
    needs_review boolean not null default false,
    perceived_difficulty smallint,
    reflection_updated_at timestamptz,
    primary key (user_id, test_id)
);

alter table public.test_progress
    add column if not exists completed boolean not null default false,
    add column if not exists last_grade numeric(4,2),
    add column if not exists best_grade numeric(4,2),
    add column if not exists completed_at timestamptz,
    add column if not exists updated_at timestamptz not null default now(),
    add column if not exists difficulty_tags text[] not null default '{}',
    add column if not exists personal_note text,
    add column if not exists needs_review boolean not null default false,
    add column if not exists perceived_difficulty smallint,
    add column if not exists reflection_updated_at timestamptz;

create unique index if not exists test_progress_user_test_uidx
    on public.test_progress(user_id, test_id);

alter table public.test_progress
drop constraint if exists test_progress_perceived_difficulty_check;

alter table public.test_progress
add constraint test_progress_perceived_difficulty_check
check (
    perceived_difficulty is null
    or perceived_difficulty between 1 and 5
);

-- 3. ÎNCERCĂRI / NOTE
create table if not exists public.test_attempts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    test_id text not null,
    grade numeric(4,2) not null,
    completed_at timestamptz not null default now(),
    score_points numeric(5,2),
    duration_seconds integer,
    study_room boolean not null default false
);

alter table public.test_attempts
    add column if not exists score_points numeric(5,2),
    add column if not exists duration_seconds integer,
    add column if not exists study_room boolean not null default false;

alter table public.test_attempts
drop constraint if exists test_attempts_score_points_check;

alter table public.test_attempts
add constraint test_attempts_score_points_check
check (
    score_points is null
    or (score_points >= 10 and score_points <= 100)
);

alter table public.test_attempts
drop constraint if exists test_attempts_duration_seconds_check;

alter table public.test_attempts
add constraint test_attempts_duration_seconds_check
check (
    duration_seconds is null
    or (duration_seconds >= 0 and duration_seconds <= 10800)
);

create index if not exists test_attempts_user_idx
    on public.test_attempts(user_id);

create index if not exists test_attempts_user_completed_idx
    on public.test_attempts(user_id, completed_at);

create index if not exists test_attempts_test_idx
    on public.test_attempts(test_id);

-- 4. OBIECTIV SĂPTĂMÂNAL
create table if not exists public.goals (
    user_id uuid primary key references auth.users(id) on delete cascade,
    weekly_target integer not null default 3,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.goals
    add column if not exists weekly_target integer not null default 3,
    add column if not exists created_at timestamptz not null default now(),
    add column if not exists updated_at timestamptz not null default now();

alter table public.goals
drop constraint if exists goals_weekly_target_check;

alter table public.goals
add constraint goals_weekly_target_check
check (weekly_target between 1 and 50);

-- =====================================================================
-- B. STAFF / PROFESORI
-- =====================================================================

create table if not exists public.staff_accounts (
    user_id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null,
    role text not null,
    subject text,
    created_at timestamptz not null default now()
);

alter table public.staff_accounts
drop constraint if exists staff_role_check;

alter table public.staff_accounts
add constraint staff_role_check
check (role in ('mentor','admin'));

alter table public.staff_accounts
drop constraint if exists staff_subject_check;

alter table public.staff_accounts
add constraint staff_subject_check
check (
    subject is null
    or subject in (
        'romana',
        'matematica',
        'biologie',
        'chimie',
        'fizica',
        'geografie',
        'logica'
    )
);

alter table public.staff_accounts
drop constraint if exists staff_role_subject_check;

alter table public.staff_accounts
add constraint staff_role_subject_check
check (
    (role = 'admin' and subject is null)
    or
    (role = 'mentor' and subject is not null)
);

-- Helper ADMIN
create or replace function private.is_staff_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.staff_accounts s
        where s.user_id = (select auth.uid())
          and s.role = 'admin'
    );
$$;

revoke all on function private.is_staff_admin() from public, anon;
grant execute on function private.is_staff_admin() to authenticated;

-- Helper MATERIE
create or replace function private.can_manage_subject(p_subject text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.staff_accounts s
        where s.user_id = (select auth.uid())
          and (
              s.role = 'admin'
              or (s.role = 'mentor' and s.subject = p_subject)
          )
    );
$$;

revoke all on function private.can_manage_subject(text) from public, anon;
grant execute on function private.can_manage_subject(text) to authenticated;

-- RPC robust pentru loginul profesorilor
create or replace function public.get_my_staff_profile()
returns table (
    user_id uuid,
    display_name text,
    role text,
    subject text
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        s.user_id,
        s.display_name,
        s.role,
        s.subject
    from public.staff_accounts s
    where s.user_id = (select auth.uid())
    limit 1;
$$;

revoke all on function public.get_my_staff_profile() from public, anon;
grant execute on function public.get_my_staff_profile() to authenticated;

-- =====================================================================
-- C. ÎNSCRIERI / ELEVI AI PROFESORILOR
-- =====================================================================

create table if not exists public.enrollments (
    id uuid primary key default gen_random_uuid(),
    student_id uuid references auth.users(id) on delete set null,
    full_name text not null,
    email text not null,
    phone text,
    subject text not null,
    level text,
    status text not null default 'nou',
    source text not null default 'site',
    student_message text,
    desired_grade text,
    teacher_note text,
    archived_at timestamptz,
    request_type text not null default 'inscriere',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.enrollments
    add column if not exists student_id uuid references auth.users(id) on delete set null,
    add column if not exists phone text,
    add column if not exists level text,
    add column if not exists status text not null default 'nou',
    add column if not exists source text not null default 'site',
    add column if not exists student_message text,
    add column if not exists desired_grade text,
    add column if not exists teacher_note text,
    add column if not exists archived_at timestamptz,
    add column if not exists request_type text not null default 'inscriere',
    add column if not exists created_at timestamptz not null default now(),
    add column if not exists updated_at timestamptz not null default now();

alter table public.enrollments
drop constraint if exists enrollments_subject_check;

alter table public.enrollments
add constraint enrollments_subject_check
check (
    subject in (
        'romana',
        'matematica',
        'biologie',
        'chimie',
        'fizica',
        'geografie',
        'logica'
    )
);

alter table public.enrollments
drop constraint if exists enrollments_status_check;

alter table public.enrollments
add constraint enrollments_status_check
check (status in ('nou','activ','inactiv'));

alter table public.enrollments
drop constraint if exists enrollments_request_type_check;

alter table public.enrollments
add constraint enrollments_request_type_check
check (request_type in ('inscriere','sedinta_gratuita','manual'));

alter table public.enrollments
drop constraint if exists enrollments_name_check;

alter table public.enrollments
add constraint enrollments_name_check
check (char_length(trim(full_name)) >= 2);

alter table public.enrollments
drop constraint if exists enrollments_email_check;

alter table public.enrollments
add constraint enrollments_email_check
check (char_length(trim(email)) >= 3);

create index if not exists enrollments_subject_idx
    on public.enrollments(subject);

create index if not exists enrollments_status_idx
    on public.enrollments(status);

create index if not exists enrollments_created_at_idx
    on public.enrollments(created_at desc);

create index if not exists enrollments_subject_status_idx
    on public.enrollments(subject,status);

create index if not exists enrollments_archived_at_idx
    on public.enrollments(archived_at);

create index if not exists enrollments_subject_archived_idx
    on public.enrollments(subject,archived_at);

create or replace function private.update_enrollment_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trigger_update_enrollment_timestamp
on public.enrollments;

create trigger trigger_update_enrollment_timestamp
before update on public.enrollments
for each row
execute function private.update_enrollment_timestamp();

-- =====================================================================
-- D. GRUPE
-- =====================================================================

create table if not exists public.teacher_groups (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    subject text not null,
    name text not null,
    weekday smallint,
    start_time time,
    end_time time,
    notes text,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.teacher_groups
    add column if not exists subject text,
    add column if not exists name text,
    add column if not exists weekday smallint,
    add column if not exists start_time time,
    add column if not exists end_time time,
    add column if not exists notes text,
    add column if not exists active boolean not null default true,
    add column if not exists created_at timestamptz not null default now(),
    add column if not exists updated_at timestamptz not null default now();

alter table public.teacher_groups
drop constraint if exists teacher_groups_subject_check;

alter table public.teacher_groups
add constraint teacher_groups_subject_check
check (
    subject in (
        'romana',
        'matematica',
        'biologie',
        'chimie',
        'fizica',
        'geografie',
        'logica'
    )
);

alter table public.teacher_groups
drop constraint if exists teacher_groups_weekday_check;

alter table public.teacher_groups
add constraint teacher_groups_weekday_check
check (weekday is null or weekday between 1 and 7);

alter table public.teacher_groups
drop constraint if exists teacher_groups_time_check;

alter table public.teacher_groups
add constraint teacher_groups_time_check
check (
    end_time is null
    or start_time is null
    or end_time > start_time
);

create index if not exists teacher_groups_owner_idx
    on public.teacher_groups(owner_id);

create index if not exists teacher_groups_subject_idx
    on public.teacher_groups(subject);

create unique index if not exists teacher_groups_owner_name_unique
    on public.teacher_groups(owner_id, lower(name));

create or replace function private.update_row_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trigger_teacher_groups_updated_at
on public.teacher_groups;

create trigger trigger_teacher_groups_updated_at
before update on public.teacher_groups
for each row
execute function private.update_row_timestamp();

create or replace function private.can_manage_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.teacher_groups g
        where g.id = p_group_id
          and (
              g.owner_id = (select auth.uid())
              or (select private.is_staff_admin())
          )
    );
$$;

revoke all on function private.can_manage_group(uuid) from public, anon;
grant execute on function private.can_manage_group(uuid) to authenticated;

-- =====================================================================
-- E. MEMBRII GRUPELOR
-- =====================================================================

create table if not exists public.group_members (
    group_id uuid not null references public.teacher_groups(id) on delete cascade,
    enrollment_id uuid not null references public.enrollments(id) on delete cascade,
    added_at timestamptz not null default now(),
    primary key (group_id,enrollment_id)
);

create index if not exists group_members_enrollment_idx
    on public.group_members(enrollment_id);

create or replace function private.can_assign_enrollment_to_group(
    p_group_id uuid,
    p_enrollment_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.teacher_groups g
        join public.enrollments e
          on e.id = p_enrollment_id
        where g.id = p_group_id
          and g.subject = e.subject
          and (
              g.owner_id = (select auth.uid())
              or (select private.is_staff_admin())
          )
    );
$$;

revoke all on function private.can_assign_enrollment_to_group(uuid,uuid)
from public, anon;

grant execute on function private.can_assign_enrollment_to_group(uuid,uuid)
to authenticated;

-- =====================================================================
-- F. CALENDAR / ȘEDINȚE
-- =====================================================================

create table if not exists public.teacher_sessions (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    subject text not null,
    group_id uuid references public.teacher_groups(id) on delete cascade,
    enrollment_id uuid references public.enrollments(id) on delete cascade,
    title text not null,
    session_date date not null,
    start_time time not null,
    end_time time,
    meeting_url text,
    notes text,
    status text not null default 'programata',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.teacher_sessions
    add column if not exists subject text,
    add column if not exists group_id uuid references public.teacher_groups(id) on delete cascade,
    add column if not exists enrollment_id uuid references public.enrollments(id) on delete cascade,
    add column if not exists title text,
    add column if not exists session_date date,
    add column if not exists start_time time,
    add column if not exists end_time time,
    add column if not exists meeting_url text,
    add column if not exists notes text,
    add column if not exists status text not null default 'programata',
    add column if not exists created_at timestamptz not null default now(),
    add column if not exists updated_at timestamptz not null default now();

alter table public.teacher_sessions
drop constraint if exists teacher_sessions_subject_check;

alter table public.teacher_sessions
add constraint teacher_sessions_subject_check
check (
    subject in (
        'romana',
        'matematica',
        'biologie',
        'chimie',
        'fizica',
        'geografie',
        'logica'
    )
);

alter table public.teacher_sessions
drop constraint if exists teacher_sessions_status_check;

alter table public.teacher_sessions
add constraint teacher_sessions_status_check
check (status in ('programata','finalizata','anulata'));

alter table public.teacher_sessions
drop constraint if exists teacher_sessions_target_check;

alter table public.teacher_sessions
add constraint teacher_sessions_target_check
check (num_nonnulls(group_id,enrollment_id) = 1);

alter table public.teacher_sessions
drop constraint if exists teacher_sessions_time_check;

alter table public.teacher_sessions
add constraint teacher_sessions_time_check
check (end_time is null or end_time > start_time);

create index if not exists teacher_sessions_owner_date_idx
    on public.teacher_sessions(owner_id,session_date);

create index if not exists teacher_sessions_subject_date_idx
    on public.teacher_sessions(subject,session_date);

drop trigger if exists trigger_teacher_sessions_updated_at
on public.teacher_sessions;

create trigger trigger_teacher_sessions_updated_at
before update on public.teacher_sessions
for each row
execute function private.update_row_timestamp();

create or replace function private.valid_session_target(
    p_subject text,
    p_group_id uuid,
    p_enrollment_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select
        case
            when p_group_id is not null then exists (
                select 1
                from public.teacher_groups g
                where g.id = p_group_id
                  and g.subject = p_subject
            )
            when p_enrollment_id is not null then exists (
                select 1
                from public.enrollments e
                where e.id = p_enrollment_id
                  and e.subject = p_subject
            )
            else false
        end;
$$;

revoke all on function private.valid_session_target(text,uuid,uuid)
from public, anon;

grant execute on function private.valid_session_target(text,uuid,uuid)
to authenticated;

-- =====================================================================
-- G. JURNAL ACTIVITATE PROFESORI
-- =====================================================================

create table if not exists public.teacher_activity (
    id bigint generated by default as identity primary key,
    actor_id uuid not null references auth.users(id) on delete cascade,
    subject text not null,
    action text not null,
    entity_type text not null,
    entity_id text,
    details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

alter table public.teacher_activity
drop constraint if exists teacher_activity_subject_check;

alter table public.teacher_activity
add constraint teacher_activity_subject_check
check (
    subject in (
        'romana',
        'matematica',
        'biologie',
        'chimie',
        'fizica',
        'geografie',
        'logica'
    )
);

create index if not exists teacher_activity_created_idx
    on public.teacher_activity(created_at desc);

create index if not exists teacher_activity_subject_idx
    on public.teacher_activity(subject);

-- =====================================================================
-- H. ANALYTICS
-- =====================================================================

create table if not exists public.page_views (
    id uuid primary key default gen_random_uuid(),
    page_key text not null,
    viewed_at timestamptz not null default now()
);

alter table public.page_views
drop constraint if exists page_views_page_key_check;

alter table public.page_views
add constraint page_views_page_key_check
check (
    page_key in (
        'acasa',
        'romana',
        'mate',
        'bio',
        'fizica',
        'chimie',
        'geo',
        'logica',
        'teste',
        'camera-studiu',
        'cont',
        'profesori'
    )
);

create index if not exists page_views_viewed_at_idx
    on public.page_views(viewed_at desc);

create index if not exists page_views_page_key_idx
    on public.page_views(page_key);

create or replace function public.get_page_view_stats(p_days integer default 30)
returns table (
    view_date date,
    page_key text,
    views bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null
       or not exists (
           select 1
           from public.staff_accounts s
           where s.user_id = auth.uid()
             and s.role = 'admin'
       )
    then
        raise exception 'not authorized';
    end if;

    return query
    select
        (pv.viewed_at at time zone 'Europe/Bucharest')::date as view_date,
        pv.page_key,
        count(*)::bigint as views
    from public.page_views pv
    where pv.viewed_at >= now()
          - make_interval(days => greatest(1,least(coalesce(p_days,30),365)))
    group by 1,2
    order by 1 desc,3 desc;
end;
$$;

revoke all on function public.get_page_view_stats(integer)
from public, anon;

grant execute on function public.get_page_view_stats(integer)
to authenticated;

create or replace function public.cleanup_page_views(p_months integer default 24)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    deleted_count bigint;
begin
    delete from public.page_views
    where viewed_at <
          now() - make_interval(
              months => greatest(1,least(coalesce(p_months,24),120))
          );

    get diagnostics deleted_count = row_count;
    return deleted_count;
end;
$$;

revoke all on function public.cleanup_page_views(integer)
from public, anon, authenticated;

-- =====================================================================
-- I. CURĂȚĂM TOATE POLITICILE VECHI DE PE TABELELE FORMULA X
--    ȘI LE RECREĂM O SINGURĂ DATĂ, CORECT.
-- =====================================================================

do $$
declare
    r record;
begin
    for r in
        select schemaname,tablename,policyname
        from pg_policies
        where schemaname = 'public'
          and tablename in (
              'profiles',
              'test_progress',
              'test_attempts',
              'goals',
              'staff_accounts',
              'enrollments',
              'teacher_groups',
              'group_members',
              'teacher_sessions',
              'teacher_activity',
              'page_views'
          )
    loop
        execute format(
            'drop policy if exists %I on %I.%I',
            r.policyname,
            r.schemaname,
            r.tablename
        );
    end loop;
end
$$;

-- =====================================================================
-- J. RLS + GRANTURI — ELEVI
-- =====================================================================

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select,insert,update on table public.profiles to authenticated;

create policy "profiles_select_own"
on public.profiles
for select to authenticated
using (user_id = (select auth.uid()));

create policy "profiles_insert_own"
on public.profiles
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "profiles_update_own"
on public.profiles
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));


alter table public.test_progress enable row level security;
revoke all on table public.test_progress from anon, authenticated;
grant select,insert,update on table public.test_progress to authenticated;

create policy "test_progress_select_own"
on public.test_progress
for select to authenticated
using (user_id = (select auth.uid()));

create policy "test_progress_insert_own"
on public.test_progress
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "test_progress_update_own"
on public.test_progress
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));


alter table public.test_attempts enable row level security;
revoke all on table public.test_attempts from anon, authenticated;
grant select,insert on table public.test_attempts to authenticated;

create policy "test_attempts_select_own"
on public.test_attempts
for select to authenticated
using (user_id = (select auth.uid()));

create policy "test_attempts_insert_own"
on public.test_attempts
for insert to authenticated
with check (user_id = (select auth.uid()));


alter table public.goals enable row level security;
revoke all on table public.goals from anon, authenticated;
grant select,insert,update on table public.goals to authenticated;

create policy "goals_select_own"
on public.goals
for select to authenticated
using (user_id = (select auth.uid()));

create policy "goals_insert_own"
on public.goals
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "goals_update_own"
on public.goals
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- =====================================================================
-- K. RLS + GRANTURI — STAFF
-- =====================================================================

alter table public.staff_accounts enable row level security;
revoke all on table public.staff_accounts from anon, authenticated;
grant select on table public.staff_accounts to authenticated;

create policy "staff_read_own_account"
on public.staff_accounts
for select to authenticated
using (
    user_id = (select auth.uid())
    or (select private.is_staff_admin())
);

-- =====================================================================
-- L. RLS + GRANTURI — ÎNSCRIERI
-- =====================================================================

alter table public.enrollments enable row level security;
revoke all on table public.enrollments from anon, authenticated;

-- Formular public
grant insert (
    full_name,
    email,
    phone,
    subject,
    level,
    student_message,
    desired_grade,
    request_type
)
on public.enrollments
to anon;

-- Formular public pentru utilizatori logați + operațiuni profesori
grant insert (
    full_name,
    email,
    phone,
    subject,
    level,
    status,
    source,
    student_message,
    desired_grade,
    teacher_note,
    archived_at,
    request_type
)
on public.enrollments
to authenticated;

grant select on public.enrollments to authenticated;

grant update (
    full_name,
    email,
    phone,
    level,
    status,
    student_message,
    desired_grade,
    teacher_note,
    archived_at
)
on public.enrollments
to authenticated;

create policy "public_submit_enrollment"
on public.enrollments
for insert
to anon, authenticated
with check (
    status = 'nou'
    and source = 'site'
    and request_type in ('inscriere','sedinta_gratuita')
    and subject in (
        'romana',
        'matematica',
        'biologie',
        'chimie',
        'fizica',
        'geografie',
        'logica'
    )
    and char_length(trim(full_name)) >= 2
    and char_length(trim(email)) >= 3
);

create policy "staff_insert_enrollment"
on public.enrollments
for insert
to authenticated
with check (
    source = 'mentor'
    and request_type = 'manual'
    and (select private.can_manage_subject(subject))
    and char_length(trim(full_name)) >= 2
    and char_length(trim(email)) >= 3
);

create policy "staff_select_enrollments"
on public.enrollments
for select
to authenticated
using (
    (select private.can_manage_subject(subject))
);

create policy "staff_update_enrollments"
on public.enrollments
for update
to authenticated
using (
    (select private.can_manage_subject(subject))
)
with check (
    (select private.can_manage_subject(subject))
);

-- =====================================================================
-- M. RLS + GRANTURI — GRUPE
-- =====================================================================

alter table public.teacher_groups enable row level security;
revoke all on table public.teacher_groups from anon, authenticated;
grant select,insert,update,delete on public.teacher_groups to authenticated;

create policy "teacher_groups_select"
on public.teacher_groups
for select to authenticated
using (
    owner_id = (select auth.uid())
    or (select private.is_staff_admin())
);

create policy "teacher_groups_insert"
on public.teacher_groups
for insert to authenticated
with check (
    owner_id = (select auth.uid())
    and (select private.can_manage_subject(subject))
);

create policy "teacher_groups_update"
on public.teacher_groups
for update to authenticated
using (
    owner_id = (select auth.uid())
    or (select private.is_staff_admin())
)
with check (
    (
        owner_id = (select auth.uid())
        and (select private.can_manage_subject(subject))
    )
    or (select private.is_staff_admin())
);

create policy "teacher_groups_delete"
on public.teacher_groups
for delete to authenticated
using (
    owner_id = (select auth.uid())
    or (select private.is_staff_admin())
);

-- =====================================================================
-- N. RLS + GRANTURI — MEMBRI GRUPE
-- =====================================================================

alter table public.group_members enable row level security;
revoke all on table public.group_members from anon, authenticated;
grant select,insert,delete on public.group_members to authenticated;

create policy "group_members_select"
on public.group_members
for select to authenticated
using (
    (select private.can_manage_group(group_id))
);

create policy "group_members_insert"
on public.group_members
for insert to authenticated
with check (
    (
        select private.can_assign_enrollment_to_group(
            group_id,
            enrollment_id
        )
    )
);

create policy "group_members_delete"
on public.group_members
for delete to authenticated
using (
    (select private.can_manage_group(group_id))
);

-- =====================================================================
-- O. RLS + GRANTURI — CALENDAR
-- =====================================================================

alter table public.teacher_sessions enable row level security;
revoke all on table public.teacher_sessions from anon, authenticated;
grant select,insert,update,delete on public.teacher_sessions to authenticated;

create policy "teacher_sessions_select"
on public.teacher_sessions
for select to authenticated
using (
    owner_id = (select auth.uid())
    or (select private.is_staff_admin())
);

create policy "teacher_sessions_insert"
on public.teacher_sessions
for insert to authenticated
with check (
    owner_id = (select auth.uid())
    and (select private.can_manage_subject(subject))
    and (
        select private.valid_session_target(
            subject,
            group_id,
            enrollment_id
        )
    )
);

create policy "teacher_sessions_update"
on public.teacher_sessions
for update to authenticated
using (
    owner_id = (select auth.uid())
    or (select private.is_staff_admin())
)
with check (
    (
        owner_id = (select auth.uid())
        and (select private.can_manage_subject(subject))
        and (
            select private.valid_session_target(
                subject,
                group_id,
                enrollment_id
            )
        )
    )
    or (select private.is_staff_admin())
);

create policy "teacher_sessions_delete"
on public.teacher_sessions
for delete to authenticated
using (
    owner_id = (select auth.uid())
    or (select private.is_staff_admin())
);

-- =====================================================================
-- P. RLS + GRANTURI — ACTIVITATE PROFESORI
-- =====================================================================

alter table public.teacher_activity enable row level security;
revoke all on table public.teacher_activity from anon, authenticated;
grant select,insert on public.teacher_activity to authenticated;

create policy "teacher_activity_select"
on public.teacher_activity
for select to authenticated
using (
    actor_id = (select auth.uid())
    or (select private.is_staff_admin())
);

create policy "teacher_activity_insert"
on public.teacher_activity
for insert to authenticated
with check (
    actor_id = (select auth.uid())
    and (select private.can_manage_subject(subject))
);

-- =====================================================================
-- Q. RLS + GRANTURI — ANALYTICS
-- =====================================================================

alter table public.page_views enable row level security;
revoke all on public.page_views from anon, authenticated;
grant insert on public.page_views to anon, authenticated;

create policy "anonymous_page_view_insert"
on public.page_views
for insert
to anon, authenticated
with check (
    page_key in (
        'acasa',
        'romana',
        'mate',
        'bio',
        'fizica',
        'chimie',
        'geo',
        'logica',
        'teste',
        'camera-studiu',
        'cont',
        'profesori'
    )
);

-- =====================================================================
-- R. CONTURILE PROFESORILOR / ADMINULUI
--    Sunt legate automat DOAR dacă emailul există deja în Authentication.
-- =====================================================================

with expected_staff(email,display_name,role,subject) as (
    values
        ('steleagabriela02@gmail.com','Stelea Aida','mentor','geografie'),
        ('bianca.varvaroi1@gmail.com','Bianca Varvaroi','mentor','romana'),
        ('bengamarius123@gmail.com','Marius Benga','mentor','matematica'),
        ('opriscrisu89@gmail.com','Theodora Opris','mentor','biologie'),
        ('ilariagrigoras27@gmail.com','Ilaria Grigoraș','mentor','chimie'),
        ('ioana26voinea@gmail.com','Ioana Voinea','mentor','fizica'),
        ('danielanita655@gmail.com','Niță Daniela Georgiana','mentor','logica'),
        ('formulax05@gmail.com','Administrator Formula X','admin',null)
)
insert into public.staff_accounts (
    user_id,
    display_name,
    role,
    subject
)
select
    u.id,
    e.display_name,
    e.role,
    e.subject
from expected_staff e
join auth.users u
  on lower(u.email) = lower(e.email)
on conflict (user_id)
do update set
    display_name = excluded.display_name,
    role = excluded.role,
    subject = excluded.subject;

commit;

-- =====================================================================
-- S. VERIFICARE FINALĂ
-- Dacă vezi "OK" la profesorii existenți, configurarea este corectă.
-- Dacă vezi "LIPSEȘTE DIN AUTH", creează acel user în Authentication -> Users.
-- =====================================================================

with expected_staff(email,display_name,role,subject) as (
    values
        ('steleagabriela02@gmail.com','Stelea Aida','mentor','geografie'),
        ('bianca.varvaroi1@gmail.com','Bianca Varvaroi','mentor','romana'),
        ('bengamarius123@gmail.com','Marius Benga','mentor','matematica'),
        ('opriscrisu89@gmail.com','Theodora Opris','mentor','biologie'),
        ('ilariagrigoras27@gmail.com','Ilaria Grigoraș','mentor','chimie'),
        ('ioana26voinea@gmail.com','Ioana Voinea','mentor','fizica'),
        ('danielanita655@gmail.com','Niță Daniela Georgiana','mentor','logica'),
        ('formulax05@gmail.com','Administrator Formula X','admin',null)
)
select
    e.email,
    e.display_name as nume_asteptat,
    e.role as rol_asteptat,
    e.subject as materie_asteptata,
    u.id as auth_user_id,
    u.email_confirmed_at,
    s.display_name as nume_in_staff,
    s.role as rol_in_staff,
    s.subject as materie_in_staff,
    case
        when u.id is null then 'LIPSEȘTE DIN AUTH'
        when s.user_id is null then 'LIPSEȘTE DIN STAFF'
        when s.role <> e.role then 'ROL GREȘIT'
        when coalesce(s.subject,'') <> coalesce(e.subject,'') then 'MATERIE GREȘITĂ'
        else 'OK'
    end as status
from expected_staff e
left join auth.users u
  on lower(u.email) = lower(e.email)
left join public.staff_accounts s
  on s.user_id = u.id
order by
    case when e.role = 'admin' then 2 else 1 end,
    e.display_name;

-- Verificare rapidă a obiectelor principale:
select
    'FORMULA X MASTER V28 INSTALAT' as rezultat,
    (select count(*) from public.staff_accounts) as conturi_staff,
    (select count(*) from public.enrollments) as inscrieri,
    (select count(*) from public.teacher_groups) as grupe,
    (select count(*) from public.teacher_sessions) as sedinte,
    (select count(*) from public.page_views) as page_views;
