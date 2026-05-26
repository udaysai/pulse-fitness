#!/usr/bin/env node
/**
 * Use service role to peek at real row shapes in production.
 * Shows whether daily_plans / weekly_plans / workouts have the expected fields.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error("env missing"); process.exit(1); }

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function dump(label, path) {
  const r = await fetch(`${URL}${path}`, { headers });
  const body = await r.text();
  console.log(`\n──────────── ${label} (HTTP ${r.status}) ────────────`);
  try { console.log(JSON.stringify(JSON.parse(body).slice ? JSON.parse(body) : JSON.parse(body), null, 2).slice(0, 2000)); }
  catch { console.log(body.slice(0, 500)); }
}

await dump("profiles (all)", "/rest/v1/profiles?select=id,display_name,goal,created_at");
await dump("daily_plans (latest 3)", "/rest/v1/daily_plans?select=date,plan&order=date.desc&limit=3");
await dump("weekly_plans (latest 1)", "/rest/v1/weekly_plans?select=week_start_date,plan&order=week_start_date.desc&limit=1");
await dump("workouts (latest 3)", "/rest/v1/workouts?select=id,started_at,kind,source,workout_exercises(id,exercise_id,exercise_sets(reps,weight_kg))&order=started_at.desc&limit=3");
await dump("workout_templates (all)", "/rest/v1/workout_templates?select=id,name,exercises");
await dump("daily_metrics (latest 3)", "/rest/v1/daily_metrics?select=date,steps,resting_hr&order=date.desc&limit=3");
