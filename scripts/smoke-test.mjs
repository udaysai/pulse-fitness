#!/usr/bin/env node
/**
 * Smoke test: verify Supabase REST API + anon key work end-to-end (pure fetch, no deps).
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error("NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY required");
  process.exit(1);
}

async function get(path, headers = {}) {
  const r = await fetch(`${url}${path}`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, ...headers },
  });
  return { status: r.status, body: r.status >= 400 ? await r.text() : await r.json() };
}

console.log("→ GET /rest/v1/exercises?select=count");
const ex = await get("/rest/v1/exercises?select=*&limit=1", { Prefer: "count=exact" });
console.log(`  status=${ex.status}`);
console.log(`  body=${typeof ex.body === "string" ? ex.body : JSON.stringify(ex.body).slice(0, 120)}`);

console.log("\n→ GET /rest/v1/profiles?limit=5 (RLS should hide rows from anon)");
const pr = await get("/rest/v1/profiles?select=*&limit=5");
console.log(`  status=${pr.status}`);
console.log(`  body=${typeof pr.body === "string" ? pr.body : JSON.stringify(pr.body)}`);

console.log("\n→ Auth settings probe");
const s = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anon } });
const settings = await s.json();
console.log(`  google_enabled=${!!settings.external?.google}`);
console.log(`  email_enabled=${!!settings.external?.email}`);
console.log(`  site_url=${settings.site_url ?? "n/a"}`);

console.log("\n✅ Smoke test complete.");
