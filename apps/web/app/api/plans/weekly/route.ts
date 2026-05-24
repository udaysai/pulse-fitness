import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWeeklyPlan } from "@/lib/recommender/weekly";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
  }

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (pErr || !profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 400 });
  }
  if (!profile.goal) {
    return NextResponse.redirect(new URL("/onboarding", req.url), { status: 303 });
  }

  const plan = await generateWeeklyPlan(user.id, profile);

  // Upsert weekly_plans
  const { data: weekly, error: wErr } = await supabase
    .from("weekly_plans")
    .upsert(
      {
        user_id: user.id,
        week_start_date: plan.week_start,
        plan,
        generated_by: "deterministic-v1",
        accepted: true,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,week_start_date" },
    )
    .select("id")
    .single();
  if (wErr || !weekly) {
    return NextResponse.json({ error: wErr?.message ?? "weekly_plan_save_failed" }, { status: 500 });
  }

  // Materialize daily_plans (upsert)
  const dailyRows = plan.days.map((d) => ({
    user_id: user.id,
    date: d.date,
    plan: d,
    parent_weekly_plan_id: weekly.id,
  }));
  const { error: dErr } = await supabase.from("daily_plans").upsert(dailyRows, { onConflict: "user_id,date" });
  if (dErr) {
    return NextResponse.json({ error: dErr.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/dashboard", req.url), { status: 303 });
}

// Also allow GET so a direct visit re-generates (useful for quick testing)
export async function GET(req: Request) {
  return POST(req);
}
