import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/queries/profile";
import { getLastTimeForExercise } from "@/lib/queries/exercise-history";
import SessionClient from "./SessionClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ date: string }> };

type DayPlan = {
  date?: string;
  day_name?: string;
  type?: string;
  focus?: string;
  why_today?: string;
  duration_minutes?: number;
  warmup?: { minutes?: number; instructions?: string[] } | null;
  exercises?: Array<{
    exercise_id?: string;
    sets?: number;
    reps?: string;
    rest_seconds?: number;
    target_rpe?: number;
    why?: string;
    form_cues?: string[];
    weight_guidance?: string;
  }>;
  cardio?: { minutes?: number; mode?: string; intensity?: string; why?: string } | null;
  cooldown?: { minutes?: number; instructions?: string[] } | null;
  notes?: string;
};

export default async function SessionPage({ params }: Props) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");

  let row: { plan: DayPlan } | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("daily_plans")
      .select("plan")
      .eq("date", date)
      .maybeSingle<{ plan: DayPlan }>();
    row = data;
  } catch (e) {
    console.error("session page load", e);
  }

  if (!row?.plan || typeof row.plan.type !== "string") {
    return (
      <div className="mx-auto max-w-md px-5 pt-8 text-center">
        <Link href="/plan" className="inline-flex items-center gap-1 text-xs text-text-secondary">
          <ArrowLeft className="size-3" /> Plan
        </Link>
        <p className="mt-8 text-sm text-text-secondary">
          No plan for this date. Generate one from the Plan tab.
        </p>
      </div>
    );
  }

  const plan = row.plan;
  const planExercises = Array.isArray(plan.exercises) ? plan.exercises : [];
  const isRestOrCardio =
    plan.type === "rest" ||
    plan.type === "active_recovery" ||
    plan.type === "cardio_zone2" ||
    plan.type === "cardio_hiit";

  if (isRestOrCardio || planExercises.length === 0) {
    return (
      <div className="mx-auto max-w-md px-5 pt-6 pb-24">
        <Link href="/plan" className="inline-flex items-center gap-1 text-xs text-text-secondary">
          <ArrowLeft className="size-3" /> Plan
        </Link>
        <div className="mt-6 rounded-[var(--radius-card)] border border-hairline bg-surface p-6 text-center">
          <p className="text-[11px] uppercase tracking-wider text-text-tertiary">{plan.day_name ?? ""}</p>
          <h1 className="mt-1 text-2xl font-semibold">{plan.focus ?? "Training day"}</h1>
          {plan.why_today && <p className="mt-3 text-sm text-text-secondary">{plan.why_today}</p>}
          {plan.cardio && (plan.cardio.mode || plan.cardio.intensity) && (
            <p className="mt-4 text-sm text-text-primary">
              {plan.cardio.mode ?? ""}
              {plan.cardio.intensity && (
                <>
                  <br />
                  <span className="text-text-secondary">{plan.cardio.intensity}</span>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Resolve exercise rows + last-time per exercise (parallel, defensive)
  const ids = planExercises.map((e) => e?.exercise_id).filter((x): x is string => !!x);

  let exMap = new Map<string, { id: string; name: string; primary_muscle: string; equipment: string | null; demo_gif_url: string | null }>();
  let lastTimes: Awaited<ReturnType<typeof getLastTimeForExercise>>[] = [];
  if (ids.length > 0) {
    try {
      const supabase = await createClient();
      const [{ data: exRows }, lt] = await Promise.all([
        supabase
          .from("exercises")
          .select("id, name, primary_muscle, equipment, demo_gif_url")
          .in("id", ids),
        Promise.all(ids.map((id) => getLastTimeForExercise(id))),
      ]);
      exMap = new Map(
        (exRows ?? []).map((r) => [
          r.id,
          { id: r.id, name: r.name, primary_muscle: r.primary_muscle, equipment: r.equipment ?? null, demo_gif_url: r.demo_gif_url ?? null },
        ]),
      );
      lastTimes = lt;
    } catch (e) {
      console.error("session page enrichment", e);
    }
  }

  const enriched = planExercises.map((p, i) => {
    const exerciseId = p?.exercise_id ?? `unknown-${i}`;
    const rowEx = exMap.get(exerciseId);
    const last = lastTimes[i] ?? null;
    return {
      exercise_id: exerciseId,
      name: rowEx?.name ?? exerciseId,
      primary_muscle: rowEx?.primary_muscle ?? "",
      demo_gif_url: rowEx?.demo_gif_url ?? null,
      target_sets: typeof p?.sets === "number" ? p.sets : 3,
      target_reps: p?.reps ?? "8-12",
      rest_seconds: typeof p?.rest_seconds === "number" ? p.rest_seconds : 90,
      target_rpe: typeof p?.target_rpe === "number" ? p.target_rpe : 8,
      why: p?.why ?? "",
      form_cues: Array.isArray(p?.form_cues) ? p.form_cues : [],
      weight_guidance: p?.weight_guidance ?? "",
      last_time: last,
    };
  });

  const safePlan = {
    day_name: plan.day_name ?? "",
    focus: plan.focus ?? "Training day",
    why_today: plan.why_today ?? "",
    duration_minutes: typeof plan.duration_minutes === "number" ? plan.duration_minutes : 0,
  };

  return <SessionClient date={date} plan={safePlan} enrichedExercises={enriched} />;
}
