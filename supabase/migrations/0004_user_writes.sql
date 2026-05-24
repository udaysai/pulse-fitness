-- =============================================================================
-- Allow authenticated users to write their own data.
-- Needed for self-service Apple Health import + manual workout/meal logging.
-- =============================================================================

-- profiles: allow user to insert (in case the trigger missed) + already has UPDATE
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- daily_metrics: user can insert + update their own days
create policy "metrics_insert_own" on public.daily_metrics
  for insert with check (auth.uid() = user_id);
create policy "metrics_update_own" on public.daily_metrics
  for update using (auth.uid() = user_id);
create policy "metrics_delete_own" on public.daily_metrics
  for delete using (auth.uid() = user_id);

-- health_imports: allow user to update (status transitions) + delete (cleanup)
create policy "imports_update_own" on public.health_imports
  for update using (auth.uid() = user_id);
create policy "imports_delete_own" on public.health_imports
  for delete using (auth.uid() = user_id);

-- user_consents: insert handled by existing "consents_modify_own" (FOR ALL)
-- workouts: covered by existing "workouts_modify_own" (FOR ALL)
-- meal_logs: covered by existing "meals_modify_own" (FOR ALL)
-- chat_threads/messages: covered by existing "_modify_own" (FOR ALL)
-- weekly_plans/daily_plans: covered by existing "_modify_own" (FOR ALL)

-- Indexes that pay off as data grows
create index if not exists daily_plans_date_idx on public.daily_plans(user_id, date);
create index if not exists weekly_plans_week_idx on public.weekly_plans(user_id, week_start_date desc);
