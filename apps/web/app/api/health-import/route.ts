import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { HealthImportSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = HealthImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }

  // Idempotency: skip if we've already imported this exact file
  const { data: existing } = await supabase
    .from("health_imports")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("file_hash", parsed.data.file_hash)
    .maybeSingle();

  if (existing?.status === "completed") {
    return NextResponse.json({ ok: true, deduped: true, import_id: existing.id });
  }

  // Record the import
  const { data: imp, error: impErr } = await supabase
    .from("health_imports")
    .insert({
      user_id: user.id,
      source: "apple_health_xml",
      file_hash: parsed.data.file_hash,
      records_imported: parsed.data.records_imported,
      date_range_start: parsed.data.date_range_start,
      date_range_end: parsed.data.date_range_end,
      status: "processing",
    })
    .select("id")
    .single();
  if (impErr || !imp) {
    return NextResponse.json({ error: impErr?.message ?? "import_insert_failed" }, { status: 500 });
  }

  // Upsert daily_metrics in batches
  const BATCH = 500;
  const rows = parsed.data.metrics.map((m) => ({ ...m, user_id: user.id }));
  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("daily_metrics").upsert(batch, { onConflict: "user_id,date" });
    if (error) {
      await supabase
        .from("health_imports")
        .update({ status: "failed", error_message: error.message })
        .eq("id", imp.id);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    upserted += batch.length;
  }

  await supabase
    .from("health_imports")
    .update({ status: "completed", records_imported: upserted })
    .eq("id", imp.id);

  return NextResponse.json({ ok: true, import_id: imp.id, upserted });
}
