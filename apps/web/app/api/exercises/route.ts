import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const muscle = searchParams.get("muscle") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? "30"), 100);

  const supabase = await createClient();
  let query = supabase
    .from("exercises")
    .select("id, name, primary_muscle, equipment, demo_gif_url")
    .order("name", { ascending: true })
    .limit(limit);
  if (q) query = query.ilike("name", `%${q}%`);
  if (muscle) query = query.eq("primary_muscle", muscle);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ exercises: data });
}
