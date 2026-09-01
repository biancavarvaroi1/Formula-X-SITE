-- Formula X V10 — update consolidat Supabase
-- Include Camera de studiu (V9) + Jurnal de pregătire (V10).
-- Poate fi rulat chiar dacă ai rulat deja V8/V9. Este idempotent.

-- 1) Camera de studiu: punctaj + timp efectiv
alter table public.test_attempts
  add column if not exists score_points numeric(5,2),
  add column if not exists duration_seconds integer,
  add column if not exists study_room boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'test_attempts_score_points_check'
      and conrelid = 'public.test_attempts'::regclass
  ) then
    alter table public.test_attempts
      add constraint test_attempts_score_points_check
      check (score_points is null or (score_points >= 10 and score_points <= 100));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'test_attempts_duration_seconds_check'
      and conrelid = 'public.test_attempts'::regclass
  ) then
    alter table public.test_attempts
      add constraint test_attempts_duration_seconds_check
      check (duration_seconds is null or (duration_seconds >= 0 and duration_seconds <= 10800));
  end if;
end $$;

-- 2) Jurnalul personal pentru fiecare variantă
alter table public.test_progress
  add column if not exists difficulty_tags text[] not null default '{}',
  add column if not exists personal_note text,
  add column if not exists needs_review boolean not null default false,
  add column if not exists perceived_difficulty smallint,
  add column if not exists reflection_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'test_progress_perceived_difficulty_check'
      and conrelid = 'public.test_progress'::regclass
  ) then
    alter table public.test_progress
      add constraint test_progress_perceived_difficulty_check
      check (perceived_difficulty is null or perceived_difficulty between 1 and 5);
  end if;
end $$;

-- RLS și politicile existente rămân neschimbate.
-- Fiecare elev continuă să acceseze numai propriul progres.
