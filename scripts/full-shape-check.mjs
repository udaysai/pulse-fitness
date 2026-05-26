#!/usr/bin/env node
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const today = new Date().toISOString().slice(0, 10);
console.log("Today:", today);

// Get today's daily_plan
const r1 = await fetch(`${URL}/rest/v1/daily_plans?select=*&date=eq.${today}`, { headers });
const dp = await r1.json();
console.log("\n=== Daily plan for today ===");
console.log(JSON.stringify(dp, null, 2));

// Get all weekly_plans
const r2 = await fetch(`${URL}/rest/v1/weekly_plans?select=*`, { headers });
const wp = await r2.json();
console.log("\n=== All weekly_plans (count) ===", wp.length);
wp.forEach((w, i) => {
  console.log(`\n--- Weekly ${i+1} (week ${w.week_start_date}) ---`);
  console.log("  has summary:", typeof w.plan?.summary, "value:", w.plan?.summary?.slice(0, 80));
  console.log("  has days:", Array.isArray(w.plan?.days), "len:", w.plan?.days?.length);
  console.log("  has goal:", w.plan?.goal);
  console.log("  has days_per_week_active:", w.plan?.days_per_week_active);
  console.log("  has total_minutes:", w.plan?.total_minutes);
  if (Array.isArray(w.plan?.days)) {
    w.plan.days.forEach((d, j) => {
      console.log(`    Day ${j+1}: ${d.date} ${d.type} - ${d.focus}`);
      console.log(`      exercises is array: ${Array.isArray(d.exercises)} (len ${d.exercises?.length})`);
      if (Array.isArray(d.exercises)) {
        d.exercises.forEach((e, k) => {
          if (!e.name || !e.exercise_id) console.log(`      ⚠️ ex ${k} missing: name=${e.name} id=${e.exercise_id}`);
        });
      }
    });
  }
});

// Get all daily_plans
const r3 = await fetch(`${URL}/rest/v1/daily_plans?select=date,plan&order=date.asc`, { headers });
const dps = await r3.json();
console.log("\n=== All daily_plans (count) ===", dps.length);
dps.forEach((d) => {
  const p = d.plan;
  const issues = [];
  if (typeof p?.type !== "string") issues.push("type");
  if (typeof p?.why_today !== "string") issues.push("why_today");
  if (!Array.isArray(p?.exercises)) issues.push("exercises");
  if (typeof p?.day_name !== "string") issues.push("day_name");
  console.log(`  ${d.date}: ${p?.type ?? "?"} - ${p?.focus ?? "?"} ${issues.length ? `⚠️ MISSING: ${issues.join(",")}` : "✓"}`);
});
