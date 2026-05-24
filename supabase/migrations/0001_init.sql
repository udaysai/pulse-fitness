-- =============================================================================
-- Pulse — Initial schema
-- Tables, RLS policies, profile trigger
-- =============================================================================

create extension if not exists "uuid-ossp";

-- ============================================================================
-- profiles (1:1 with auth.users)
-- ============================================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email        text,
  dob          date,
  sex          text check (sex in ('male', 'female', 'other')),
  height_cm    numeric(5,1),
  weight_kg    numeric(5,1),
  goal         text check (goal in ('fat_loss', 'lean_muscle', 'strength', 'maintenance', 'energy', 'wellness')),
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  injuries     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- user_consents (granular per data type)
-- ============================================================================
create table public.user_consents (
  user_id        uuid not null references auth.users(id) on delete cascade,
  data_type      text not null,
  granted        boolean not null default false,
  policy_version text not null,
  granted_at     timestamptz,
  updated_at     timestamptz not null default now(),
  primary key (user_id, data_type)
);

alter table public.user_consents enable row level security;
create policy "consents_select_own" on public.user_consents for select using (auth.uid() = user_id);
create policy "consents_modify_own" on public.user_consents for all using (auth.uid() = user_id);

-- ============================================================================
-- health_imports (audit trail + idempotency for Apple Health XML)
-- ============================================================================
create table public.health_imports (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  uploaded_at        timestamptz not null default now(),
  source             text not null default 'apple_health_xml',
  file_hash          text not null,
  records_imported   integer not null default 0,
  date_range_start   date,
  date_range_end     date,
  status             text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message      text,
  unique (user_id, file_hash)
);

create index health_imports_user_idx on public.health_imports(user_id, uploaded_at desc);

alter table public.health_imports enable row level security;
create policy "imports_select_own" on public.health_imports for select using (auth.uid() = user_id);
create policy "imports_insert_own" on public.health_imports for insert with check (auth.uid() = user_id);

-- ============================================================================
-- daily_metrics (aggregated from Apple Health)
-- ============================================================================
create table public.daily_metrics (
  user_id        uuid not null references auth.users(id) on delete cascade,
  date           date not null,
  steps          integer,
  active_kcal    integer,
  resting_hr     integer,
  hrv_ms         numeric(5,1),
  sleep_minutes  integer,
  vo2_max        numeric(4,1),
  weight_kg      numeric(5,1),
  body_fat_pct   numeric(4,1),
  updated_at     timestamptz not null default now(),
  primary key (user_id, date)
);

create index daily_metrics_date_idx on public.daily_metrics(user_id, date desc);

alter table public.daily_metrics enable row level security;
create policy "metrics_select_own" on public.daily_metrics for select using (auth.uid() = user_id);

-- ============================================================================
-- exercises (catalog, seeded from free-exercise-db)
-- ============================================================================
create table public.exercises (
  id                    text primary key,
  name                  text not null,
  primary_muscle        text not null,
  secondary_muscles     text[] default '{}',
  equipment             text,
  level                 text check (level in ('beginner', 'intermediate', 'expert')),
  mechanic              text check (mechanic in ('compound', 'isolation')),
  force                 text check (force in ('push', 'pull', 'static')),
  category              text,
  instructions          text[] default '{}',
  demo_gif_url          text,
  youtube_search_query  text,
  created_at            timestamptz not null default now()
);

create index exercises_muscle_idx on public.exercises(primary_muscle);
create index exercises_equipment_idx on public.exercises(equipment);

-- Exercises are read-only public catalog
alter table public.exercises enable row level security;
create policy "exercises_select_all" on public.exercises for select using (true);

-- ============================================================================
-- workouts
-- ============================================================================
create table public.workouts (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  started_at        timestamptz not null,
  ended_at          timestamptz,
  kind              text,
  source            text not null default 'manual',
  rpe               integer check (rpe between 1 and 10),
  notes             text,
  external_id       text,
  created_at        timestamptz not null default now(),
  unique (user_id, source, external_id)
);

create index workouts_user_idx on public.workouts(user_id, started_at desc);

alter table public.workouts enable row level security;
create policy "workouts_select_own" on public.workouts for select using (auth.uid() = user_id);
create policy "workouts_modify_own" on public.workouts for all using (auth.uid() = user_id);

create table public.workout_exercises (
  id          uuid primary key default uuid_generate_v4(),
  workout_id  uuid not null references public.workouts(id) on delete cascade,
  exercise_id text not null references public.exercises(id),
  order_idx   integer not null,
  unique (workout_id, order_idx)
);

alter table public.workout_exercises enable row level security;
create policy "we_select_own" on public.workout_exercises for select using (
  exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
);
create policy "we_modify_own" on public.workout_exercises for all using (
  exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
);

create table public.exercise_sets (
  id                   uuid primary key default uuid_generate_v4(),
  workout_exercise_id  uuid not null references public.workout_exercises(id) on delete cascade,
  set_idx              integer not null,
  reps                 integer,
  weight_kg            numeric(6,2),
  rir                  integer,
  unique (workout_exercise_id, set_idx)
);

alter table public.exercise_sets enable row level security;
create policy "sets_select_own" on public.exercise_sets for select using (
  exists (
    select 1 from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = workout_exercise_id and w.user_id = auth.uid()
  )
);
create policy "sets_modify_own" on public.exercise_sets for all using (
  exists (
    select 1 from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = workout_exercise_id and w.user_id = auth.uid()
  )
);

-- ============================================================================
-- nutrition
-- ============================================================================
create table public.foods (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  brand           text,
  kcal_per_100g   numeric(6,2),
  macros          jsonb,
  created_at      timestamptz not null default now()
);

create index foods_name_idx on public.foods using gin (to_tsvector('english', name));

alter table public.foods enable row level security;
create policy "foods_select_all" on public.foods for select using (true);

create table public.meal_logs (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  eaten_at   timestamptz not null,
  name       text not null,
  kcal       numeric(6,2),
  protein_g  numeric(6,2),
  carbs_g    numeric(6,2),
  fat_g      numeric(6,2),
  source     text default 'manual',
  created_at timestamptz not null default now()
);

create index meal_logs_user_idx on public.meal_logs(user_id, eaten_at desc);

alter table public.meal_logs enable row level security;
create policy "meals_select_own" on public.meal_logs for select using (auth.uid() = user_id);
create policy "meals_modify_own" on public.meal_logs for all using (auth.uid() = user_id);

-- ============================================================================
-- AI: chat threads + messages
-- ============================================================================
create table public.chat_threads (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text,
  created_at timestamptz not null default now()
);

alter table public.chat_threads enable row level security;
create policy "threads_select_own" on public.chat_threads for select using (auth.uid() = user_id);
create policy "threads_modify_own" on public.chat_threads for all using (auth.uid() = user_id);

create table public.chat_messages (
  id          uuid primary key default uuid_generate_v4(),
  thread_id   uuid not null references public.chat_threads(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant', 'system')),
  content     text not null,
  tokens_in   integer,
  tokens_out  integer,
  model       text,
  created_at  timestamptz not null default now()
);

create index chat_messages_thread_idx on public.chat_messages(thread_id, created_at);

alter table public.chat_messages enable row level security;
create policy "messages_select_own" on public.chat_messages for select using (
  exists (select 1 from public.chat_threads t where t.id = thread_id and t.user_id = auth.uid())
);
create policy "messages_modify_own" on public.chat_messages for all using (
  exists (select 1 from public.chat_threads t where t.id = thread_id and t.user_id = auth.uid())
);

-- ============================================================================
-- weekly + daily plans
-- ============================================================================
create table public.weekly_plans (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  week_start_date   date not null,
  plan              jsonb not null,
  generated_by      text not null default 'gemini-2.5-flash',
  accepted          boolean not null default false,
  generated_at      timestamptz not null default now(),
  unique (user_id, week_start_date)
);

alter table public.weekly_plans enable row level security;
create policy "weekly_plans_select_own" on public.weekly_plans for select using (auth.uid() = user_id);
create policy "weekly_plans_modify_own" on public.weekly_plans for all using (auth.uid() = user_id);

create table public.daily_plans (
  id                     uuid primary key default uuid_generate_v4(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  date                   date not null,
  plan                   jsonb not null,
  parent_weekly_plan_id  uuid references public.weekly_plans(id) on delete cascade,
  completed_at           timestamptz,
  unique (user_id, date)
);

alter table public.daily_plans enable row level security;
create policy "daily_plans_select_own" on public.daily_plans for select using (auth.uid() = user_id);
create policy "daily_plans_modify_own" on public.daily_plans for all using (auth.uid() = user_id);

-- ============================================================================
-- updated_at trigger
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger metrics_updated_at before update on public.daily_metrics
  for each row execute function public.set_updated_at();
create trigger consents_updated_at before update on public.user_consents
  for each row execute function public.set_updated_at();
