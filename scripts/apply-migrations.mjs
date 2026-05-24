#!/usr/bin/env node
/**
 * Apply Supabase migrations directly to a remote Postgres.
 * Avoids needing the right pooler region — connects to the direct DB endpoint.
 *
 * Usage:
 *   DATABASE_URL="postgresql://postgres:PASS@db.<ref>.supabase.co:5432/postgres" \
 *   node scripts/apply-migrations.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "..", "supabase", "migrations");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("ERROR: DATABASE_URL env var required.");
  process.exit(1);
}

async function main() {
  const files = (await fs.readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration(s):`, files);

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("✓ Connected to Postgres");

  // Make sure migrations bookkeeping table exists
  await client.query(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      statements text[],
      name text,
      created_at timestamptz not null default now()
    );
  `);

  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    const { rows } = await client.query(
      "select 1 from supabase_migrations.schema_migrations where version = $1",
      [version],
    );
    if (rows.length > 0) {
      console.log(`↺  ${file} — already applied, skipping`);
      continue;
    }

    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    console.log(`→  ${file} — applying (${sql.length} bytes)`);

    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into supabase_migrations.schema_migrations (version, name) values ($1, $2)",
        [version, file],
      );
      await client.query("commit");
      console.log(`✓  ${file} — done`);
    } catch (err) {
      await client.query("rollback");
      console.error(`✗  ${file} — FAILED:`, err.message);
      throw err;
    }
  }

  // Quick sanity check
  const { rows: tables } = await client.query(`
    select table_name from information_schema.tables
    where table_schema = 'public'
    order by table_name;
  `);
  console.log(`\n📋 public tables (${tables.length}):`);
  tables.forEach((t) => console.log(`  - ${t.table_name}`));

  await client.end();
  console.log("\n✅ All migrations applied successfully.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
