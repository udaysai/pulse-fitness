#!/usr/bin/env node
import pg from "pg";

const REF = process.env.SUPABASE_PROJECT_REF;
const PASS = process.env.SUPABASE_DB_PASSWORD;
if (!REF || !PASS) {
  console.error("SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD required");
  process.exit(1);
}

const REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1", "eu-north-1",
  "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
  "ca-central-1", "sa-east-1",
];
const PREFIXES = ["aws-0", "aws-1"];

async function probe(prefix, region) {
  const url = `postgresql://postgres.${REF}:${encodeURIComponent(PASS)}@${prefix}-${region}.pooler.supabase.com:5432/postgres`;
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    await client.query("select 1");
    await client.end();
    return { prefix, region, url, ok: true };
  } catch (e) {
    return { prefix, region, ok: false, err: e.message };
  }
}

const all = [];
for (const prefix of PREFIXES) for (const region of REGIONS) all.push(probe(prefix, region));

const results = await Promise.allSettled(all);
const hits = results
  .filter((r) => r.status === "fulfilled" && r.value.ok)
  .map((r) => r.value);

if (hits.length === 0) {
  console.error("✗ No pooler found.");
  console.error("Sample errors:");
  results.slice(0, 5).forEach((r) => r.status === "fulfilled" && console.error(`  ${r.value.prefix}-${r.value.region}: ${r.value.err}`));
  process.exit(2);
}

for (const h of hits) {
  console.log(`✓ FOUND: ${h.prefix}-${h.region}.pooler.supabase.com`);
  console.log(`POOLER_URL=${h.url}`);
}
