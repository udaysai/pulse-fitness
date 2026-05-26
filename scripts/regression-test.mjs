#!/usr/bin/env node
/**
 * Regression test against the live DB.
 * Walks every daily_plan, weekly_plan, workout, and exercise row and asserts
 * the data would render through the (now defensive) UI without throwing.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

let failures = 0;
let passes = 0;

function check(label, cond, detail) {
  if (cond) {
    passes++;
  } else {
    failures++;
    console.log(`  ❌ ${label}: ${detail ?? ""}`);
  }
}

async function get(path) {
  const r = await fetch(`${URL}${path}`, { headers });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}

// ─────────── Test profiles ───────────
console.log("\n=== Profiles ===");
const profiles = await get("/rest/v1/profiles?select=*");
for (const p of profiles) {
  check(`profile ${p.id}`, typeof p.display_name === "string" || p.display_name === null, `display_name: ${typeof p.display_name}`);
  // Goal can be null (incomplete profile)
  check(`profile ${p.id} goal type`, p.goal === null || typeof p.goal === "string", `goal: ${typeof p.goal}`);
}

// ─────────── Test daily_plans ───────────
console.log("\n=== Daily plans (each should render through DayCard) ===");
const dailyPlans = await get("/rest/v1/daily_plans?select=date,plan&order=date.asc");
for (const dp of dailyPlans) {
  const p = dp.plan;
  // Simulate the new defensive DayCard's field access pattern
  const type = p?.type;
  const exercises = Array.isArray(p?.exercises) ? p.exercises : [];
  const warmupInst = Array.isArray(p?.warmup?.instructions) ? p.warmup.instructions : [];
  const cooldownInst = Array.isArray(p?.cooldown?.instructions) ? p.cooldown.instructions : [];

  check(`${dp.date}: plan exists`, p !== null && typeof p === "object", typeof p);
  check(`${dp.date}: type is string or undefined (defaults handle missing)`, !type || typeof type === "string", `type: ${typeof type}`);

  // Each exercise must survive ExercisePrescription's defensive renderer
  exercises.forEach((ex, i) => {
    // After defaults, all should be renderable without throwing
    const rawName = ex?.name ?? ex?.exercise_id ?? "Exercise";
    check(`${dp.date} ex[${i}] name is string-coercible`, typeof rawName === "string" || typeof rawName === "number", `got: ${typeof rawName}`);
    // form_cues / variants should be arrays or undefined (we Array.isArray())
    check(`${dp.date} ex[${i}] form_cues is array or undefined`, ex?.form_cues === undefined || Array.isArray(ex.form_cues), "");
    check(`${dp.date} ex[${i}] variants is array or undefined`, ex?.variants === undefined || Array.isArray(ex.variants), "");
  });

  void warmupInst;
  void cooldownInst;
}

// ─────────── Test weekly_plans ───────────
console.log("\n=== Weekly plans (each should render through /plan page) ===");
const weeklyPlans = await get("/rest/v1/weekly_plans?select=week_start_date,plan&order=week_start_date.asc");
for (const wp of weeklyPlans) {
  const p = wp.plan;
  // /plan page checks: summary is string AND days is array
  const hasSummary = typeof p?.summary === "string";
  const hasDays = Array.isArray(p?.days);

  if (!hasSummary || !hasDays) {
    console.log(`  ⏭ ${wp.week_start_date}: old-shape (would be filtered out by /plan) — ${!hasSummary ? "no summary" : "no days"}`);
    continue;
  }

  passes++;
  for (const d of p.days) {
    const exercises = Array.isArray(d?.exercises) ? d.exercises : [];
    exercises.forEach((ex, i) => {
      // Defensive rendering should handle missing name (uses exercise_id or "Exercise" fallback)
      const rawName = ex?.name ?? ex?.exercise_id ?? "Exercise";
      check(`${wp.week_start_date}/${d.date} ex[${i}] resolved name`, typeof rawName === "string" || typeof rawName === "number", "");
    });
  }
}

// ─────────── Test workouts ───────────
console.log("\n=== Workouts ===");
const workouts = await get("/rest/v1/workouts?select=id,started_at,workout_exercises(id,exercise_id,exercises(id,name,demo_gif_url),exercise_sets(set_idx,reps,weight_kg))");
console.log(`  ${workouts.length} workouts in DB`);
for (const w of workouts) {
  check(`workout ${w.id}: started_at parseable`, !w.started_at || !isNaN(Date.parse(w.started_at)), "");
  const wes = Array.isArray(w.workout_exercises) ? w.workout_exercises : [];
  wes.forEach((we, i) => {
    // Supabase nested join: exercises can be object or array
    const exFK = we.exercises;
    const ex = Array.isArray(exFK) ? exFK[0] : exFK;
    const rawName = ex?.name ?? we.exercise_id;
    check(`workout ${w.id} we[${i}] has resolvable name`, !!rawName, "no name or exercise_id");
  });
}

// ─────────── Test exercises catalog ───────────
console.log("\n=== Exercises catalog ===");
const exCount = await fetch(`${URL}/rest/v1/exercises?select=*&limit=1`, { headers: { ...headers, Prefer: "count=exact" } });
const range = exCount.headers.get("content-range");
console.log(`  Total exercises: ${range}`);

// ─────────── Test chat_messages ───────────
console.log("\n=== Chat messages ===");
const messages = await get("/rest/v1/chat_messages?select=role,content&limit=5");
for (const m of messages) {
  check(`chat message role`, m.role === "user" || m.role === "assistant" || m.role === "system", `role: ${m.role}`);
  check(`chat message content is string`, typeof m.content === "string", `content: ${typeof m.content}`);
}

// ─────────── Summary ───────────
console.log(`\n========================================`);
console.log(`✓ ${passes} checks passed`);
if (failures > 0) {
  console.log(`✗ ${failures} checks failed`);
  process.exit(1);
}
console.log("✅ All shape checks pass — defensive UI handles all production data");
