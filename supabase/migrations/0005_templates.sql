-- =============================================================================
-- Workout templates (saved routines).
-- User builds a workout once → saves it → re-uses on future days with one tap.
-- =============================================================================

create table public.workout_templates (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  description  text,
  -- Stored as jsonb: array of { exercise_id, target_sets, target_reps, target_weight_kg?, rest_seconds?, notes? }
  exercises    jsonb not null,
  use_count    integer not null default 0,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

create index workout_templates_user_idx on public.workout_templates(user_id, last_used_at desc nulls last);

alter table public.workout_templates enable row level security;
create policy "templates_select_own" on public.workout_templates for select using (auth.uid() = user_id);
create policy "templates_modify_own" on public.workout_templates for all using (auth.uid() = user_id);

-- =============================================================================
-- Body measurements (weight, body fat %, plus optional girths).
-- daily_metrics already has weight_kg + body_fat_pct from Apple Health imports;
-- this table is for manual logs (between imports) and additional girths.
-- =============================================================================

create table public.body_logs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  measured_at   timestamptz not null default now(),
  weight_kg     numeric(5,1),
  body_fat_pct  numeric(4,1),
  chest_cm      numeric(5,1),
  waist_cm      numeric(5,1),
  hips_cm       numeric(5,1),
  thigh_cm      numeric(5,1),
  arm_cm        numeric(5,1),
  notes         text,
  source        text not null default 'manual'
);

create index body_logs_user_idx on public.body_logs(user_id, measured_at desc);

alter table public.body_logs enable row level security;
create policy "body_select_own" on public.body_logs for select using (auth.uid() = user_id);
create policy "body_modify_own" on public.body_logs for all using (auth.uid() = user_id);

-- =============================================================================
-- Faster history queries — used by the "last time" lookup in the logger.
-- =============================================================================
create index if not exists workout_exercises_exercise_idx on public.workout_exercises(exercise_id);
create index if not exists exercise_sets_we_idx on public.exercise_sets(workout_exercise_id);
