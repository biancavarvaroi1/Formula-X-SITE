-- Formula X V8 — Camera de studiu
-- Rulează o singură dată în Supabase > SQL Editor.

alter table public.test_attempts
  add column if not exists score_points numeric(5,2),
  add column if not exists duration_seconds integer,
  add column if not exists study_room boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'test_attempts_score_points_check'
  ) then
    alter table public.test_attempts
      add constraint test_attempts_score_points_check
      check (score_points is null or (score_points >= 10 and score_points <= 100));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'test_attempts_duration_seconds_check'
  ) then
    alter table public.test_attempts
      add constraint test_attempts_duration_seconds_check
      check (duration_seconds is null or (duration_seconds >= 0 and duration_seconds <= 10800));
  end if;
end $$;

-- RLS și politicile existente rămân neschimbate.
-- Utilizatorii autentificați continuă să poată insera/citi doar propriile încercări.
