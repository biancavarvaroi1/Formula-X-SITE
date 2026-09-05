-- ============================================================
-- FORMULA X V25 — PORTAL PROFESORI: ELEVI + MESAJE + GRUPE + CALENDAR
-- Rulează O SINGURĂ DATĂ în Supabase -> SQL Editor -> New query -> Run
-- Păstrează datele existente. Nu șterge progresul elevilor.
-- ============================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ------------------------------------------------------------
-- 1. STAFF: adăugăm LOGICA și permitem adminului să vadă echipa
-- ------------------------------------------------------------

alter table public.staff_accounts
drop constraint if exists staff_subject_check;

alter table public.staff_accounts
add constraint staff_subject_check
check (
  subject is null or subject in (
    'romana','matematica','biologie','chimie',
    'fizica','geografie','logica'
  )
);

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

alter table public.staff_accounts enable row level security;
revoke all on table public.staff_accounts from anon, authenticated;
grant select on table public.staff_accounts to authenticated;

drop policy if exists "staff_read_own_account" on public.staff_accounts;
create policy "staff_read_own_account"
on public.staff_accounts
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_staff_admin())
);

-- ------------------------------------------------------------
-- 2. ÎNSCRIERI / ELEVI: mesaj, notițe, arhivare, tip cerere
-- ------------------------------------------------------------

alter table public.enrollments
  add column if not exists student_message text,
  add column if not exists desired_grade text,
  add column if not exists teacher_note text,
  add column if not exists archived_at timestamptz,
  add column if not exists request_type text not null default 'inscriere';

alter table public.enrollments
drop constraint if exists enrollments_subject_check;

alter table public.enrollments
add constraint enrollments_subject_check
check (
  subject in (
    'romana','matematica','biologie','chimie',
    'fizica','geografie','logica'
  )
);

alter table public.enrollments
drop constraint if exists enrollments_request_type_check;

alter table public.enrollments
add constraint enrollments_request_type_check
check (request_type in ('inscriere','sedinta_gratuita','manual'));

create index if not exists enrollments_archived_at_idx
  on public.enrollments(archived_at);

create index if not exists enrollments_subject_archived_idx
  on public.enrollments(subject, archived_at);

alter table public.enrollments enable row level security;

revoke all on table public.enrollments from anon, authenticated;

-- Formular public: doar câmpurile pe care elevul are voie să le trimită.
grant insert (
  full_name,email,phone,subject,level,
  student_message,desired_grade,request_type
) on public.enrollments to anon;

-- Utilizatorii autentificați pot trimite formularul public.
-- Profesorii folosesc aceleași drepturi de coloană, iar RLS decide ce au voie să facă.
grant insert (
  full_name,email,phone,subject,level,status,source,
  student_message,desired_grade,teacher_note,archived_at,request_type
) on public.enrollments to authenticated;

grant select on public.enrollments to authenticated;

grant update (
  full_name,email,phone,level,status,
  student_message,desired_grade,teacher_note,archived_at
) on public.enrollments to authenticated;

drop policy if exists "public_submit_enrollment" on public.enrollments;
create policy "public_submit_enrollment"
on public.enrollments
for insert
to anon, authenticated
with check (
  status = 'nou'
  and source = 'site'
  and request_type in ('inscriere','sedinta_gratuita')
  and subject in (
    'romana','matematica','biologie','chimie',
    'fizica','geografie','logica'
  )
  and char_length(trim(full_name)) >= 2
  and char_length(trim(email)) >= 3
);

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
  and char_length(trim(email)) >= 3
);

drop policy if exists "staff_select_enrollments" on public.enrollments;
create policy "staff_select_enrollments"
on public.enrollments
for select
to authenticated
using ((select private.can_manage_subject(subject)));

drop policy if exists "staff_update_enrollments" on public.enrollments;
create policy "staff_update_enrollments"
on public.enrollments
for update
to authenticated
using ((select private.can_manage_subject(subject)))
with check ((select private.can_manage_subject(subject)));

-- ------------------------------------------------------------
-- 3. GRUPE
-- ------------------------------------------------------------

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
  updated_at timestamptz not null default now(),
  constraint teacher_groups_subject_check check (
    subject in (
      'romana','matematica','biologie','chimie',
      'fizica','geografie','logica'
    )
  ),
  constraint teacher_groups_weekday_check check (
    weekday is null or weekday between 1 and 7
  ),
  constraint teacher_groups_time_check check (
    end_time is null or start_time is null or end_time > start_time
  )
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
for each row execute function private.update_row_timestamp();

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

alter table public.teacher_groups enable row level security;
revoke all on table public.teacher_groups from anon, authenticated;
grant select, insert, update, delete on public.teacher_groups to authenticated;

drop policy if exists "teacher_groups_select" on public.teacher_groups;
create policy "teacher_groups_select"
on public.teacher_groups
for select to authenticated
using (
  owner_id = (select auth.uid())
  or (select private.is_staff_admin())
);

drop policy if exists "teacher_groups_insert" on public.teacher_groups;
create policy "teacher_groups_insert"
on public.teacher_groups
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and (select private.can_manage_subject(subject))
);

drop policy if exists "teacher_groups_update" on public.teacher_groups;
create policy "teacher_groups_update"
on public.teacher_groups
for update to authenticated
using (
  owner_id = (select auth.uid())
  or (select private.is_staff_admin())
)
with check (
  (owner_id = (select auth.uid()) and (select private.can_manage_subject(subject)))
  or (select private.is_staff_admin())
);

drop policy if exists "teacher_groups_delete" on public.teacher_groups;
create policy "teacher_groups_delete"
on public.teacher_groups
for delete to authenticated
using (
  owner_id = (select auth.uid())
  or (select private.is_staff_admin())
);

-- ------------------------------------------------------------
-- 4. MEMBRII GRUPELOR
-- ------------------------------------------------------------

create table if not exists public.group_members (
  group_id uuid not null references public.teacher_groups(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (group_id, enrollment_id)
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
    join public.enrollments e on e.id = p_enrollment_id
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

alter table public.group_members enable row level security;
revoke all on table public.group_members from anon, authenticated;
grant select, insert, delete on public.group_members to authenticated;

drop policy if exists "group_members_select" on public.group_members;
create policy "group_members_select"
on public.group_members
for select to authenticated
using ((select private.can_manage_group(group_id)));

drop policy if exists "group_members_insert" on public.group_members;
create policy "group_members_insert"
on public.group_members
for insert to authenticated
with check (
  (select private.can_assign_enrollment_to_group(group_id, enrollment_id))
);

drop policy if exists "group_members_delete" on public.group_members;
create policy "group_members_delete"
on public.group_members
for delete to authenticated
using ((select private.can_manage_group(group_id)));

-- ------------------------------------------------------------
-- 5. CALENDAR / ȘEDINȚE
-- ------------------------------------------------------------

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
  updated_at timestamptz not null default now(),
  constraint teacher_sessions_subject_check check (
    subject in (
      'romana','matematica','biologie','chimie',
      'fizica','geografie','logica'
    )
  ),
  constraint teacher_sessions_status_check check (
    status in ('programata','finalizata','anulata')
  ),
  constraint teacher_sessions_target_check check (
    num_nonnulls(group_id,enrollment_id) = 1
  ),
  constraint teacher_sessions_time_check check (
    end_time is null or end_time > start_time
  )
);

create index if not exists teacher_sessions_owner_date_idx
  on public.teacher_sessions(owner_id, session_date);

create index if not exists teacher_sessions_subject_date_idx
  on public.teacher_sessions(subject, session_date);

drop trigger if exists trigger_teacher_sessions_updated_at
on public.teacher_sessions;

create trigger trigger_teacher_sessions_updated_at
before update on public.teacher_sessions
for each row execute function private.update_row_timestamp();

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
        select 1 from public.teacher_groups g
        where g.id = p_group_id and g.subject = p_subject
      )
      when p_enrollment_id is not null then exists (
        select 1 from public.enrollments e
        where e.id = p_enrollment_id and e.subject = p_subject
      )
      else false
    end;
$$;

revoke all on function private.valid_session_target(text,uuid,uuid)
from public, anon;
grant execute on function private.valid_session_target(text,uuid,uuid)
to authenticated;

alter table public.teacher_sessions enable row level security;
revoke all on table public.teacher_sessions from anon, authenticated;
grant select, insert, update, delete on public.teacher_sessions to authenticated;

drop policy if exists "teacher_sessions_select" on public.teacher_sessions;
create policy "teacher_sessions_select"
on public.teacher_sessions
for select to authenticated
using (
  owner_id = (select auth.uid())
  or (select private.is_staff_admin())
);

drop policy if exists "teacher_sessions_insert" on public.teacher_sessions;
create policy "teacher_sessions_insert"
on public.teacher_sessions
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and (select private.can_manage_subject(subject))
  and (select private.valid_session_target(subject,group_id,enrollment_id))
);

drop policy if exists "teacher_sessions_update" on public.teacher_sessions;
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
    and (select private.valid_session_target(subject,group_id,enrollment_id))
  )
  or (select private.is_staff_admin())
);

drop policy if exists "teacher_sessions_delete" on public.teacher_sessions;
create policy "teacher_sessions_delete"
on public.teacher_sessions
for delete to authenticated
using (
  owner_id = (select auth.uid())
  or (select private.is_staff_admin())
);

-- ------------------------------------------------------------
-- 6. JURNAL DE ACTIVITATE — administratorul vede ce se întâmplă
-- ------------------------------------------------------------

create table if not exists public.teacher_activity (
  id bigint generated by default as identity primary key,
  actor_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint teacher_activity_subject_check check (
    subject in (
      'romana','matematica','biologie','chimie',
      'fizica','geografie','logica'
    )
  )
);

create index if not exists teacher_activity_created_idx
  on public.teacher_activity(created_at desc);

create index if not exists teacher_activity_subject_idx
  on public.teacher_activity(subject);

alter table public.teacher_activity enable row level security;
revoke all on table public.teacher_activity from anon, authenticated;
grant select, insert on public.teacher_activity to authenticated;

drop policy if exists "teacher_activity_select" on public.teacher_activity;
create policy "teacher_activity_select"
on public.teacher_activity
for select to authenticated
using (
  actor_id = (select auth.uid())
  or (select private.is_staff_admin())
);

drop policy if exists "teacher_activity_insert" on public.teacher_activity;
create policy "teacher_activity_insert"
on public.teacher_activity
for insert to authenticated
with check (
  actor_id = (select auth.uid())
  and (select private.can_manage_subject(subject))
);

-- ------------------------------------------------------------
-- 7. VERIFICARE
-- ------------------------------------------------------------

select
  'Formula X V25 configurat' as rezultat,
  (select count(*) from public.staff_accounts) as conturi_staff,
  (select count(*) from public.enrollments) as elevi_existenti;
