#!/usr/bin/env node
/**
 * Seed `public.exercises` from yuhonas/free-exercise-db (MIT, ~800 exercises).
 *
 * Uses GitHub raw URLs for demo GIFs (no Supabase Storage upload needed for MVP).
 * Requires service-role key to bypass RLS.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-exercises.mjs
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const SOURCE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

console.log("→ Fetching exercise database from yuhonas/free-exercise-db…");
const res = await fetch(SOURCE);
if (!res.ok) {
  console.error("Failed to fetch:", res.status);
  process.exit(2);
}
const exercises = await res.json();
console.log(`✓ Got ${exercises.length} exercises`);

// Map to our schema
const rows = exercises.map((e) => {
  const primaryMuscle = (e.primaryMuscles?.[0] ?? "unspecified").toLowerCase();
  // The first image (e.images[0]) is the starting position. If there's a second,
  // it's the ending position. Showing the first is a fine static demo for MVP.
  const demoUrl = e.images?.[0] ? `${IMAGE_BASE}/${e.images[0]}` : null;
  return {
    id: e.id,
    name: e.name,
    primary_muscle: primaryMuscle,
    secondary_muscles: (e.secondaryMuscles ?? []).map((m) => m.toLowerCase()),
    equipment: e.equipment ?? null,
    level: e.level ?? null,
    mechanic: e.mechanic ?? null,
    force: e.force ?? null,
    category: e.category ?? null,
    instructions: e.instructions ?? [],
    demo_gif_url: demoUrl,
    youtube_search_query: `${e.name} proper form tutorial`,
  };
});

// Validate levels match our CHECK constraint
const validLevels = new Set(["beginner", "intermediate", "expert"]);
const validMechanic = new Set(["compound", "isolation"]);
const validForce = new Set(["push", "pull", "static"]);
rows.forEach((r) => {
  if (r.level && !validLevels.has(r.level)) r.level = null;
  if (r.mechanic && !validMechanic.has(r.mechanic)) r.mechanic = null;
  if (r.force && !validForce.has(r.force)) r.force = null;
});

// Upsert in batches via PostgREST (handles up to ~1000 rows per request)
const BATCH_SIZE = 200;
console.log(`→ Upserting in batches of ${BATCH_SIZE}…`);

let total = 0;
for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  const batch = rows.slice(i, i + BATCH_SIZE);
  const r = await fetch(`${URL}/rest/v1/exercises?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(batch),
  });

  if (!r.ok) {
    const errText = await r.text();
    console.error(`✗ Batch ${i}-${i + batch.length} failed:`, r.status, errText.slice(0, 200));
    process.exit(3);
  }
  total += batch.length;
  console.log(`  ✓ ${total}/${rows.length}`);
}

// Verify
const check = await fetch(`${URL}/rest/v1/exercises?select=count`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: "count=exact" },
});
const countHeader = check.headers.get("content-range");
console.log(`\n📊 Total rows in DB: ${countHeader}`);
console.log("✅ Exercise catalog seeded.");
