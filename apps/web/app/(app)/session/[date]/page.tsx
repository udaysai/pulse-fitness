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
  date: string;
  day_name: string;
  type: string;
  focus: string;
  why_today: string;
  duration_minutes: number;
  warmup: { minutes: number; instructions: string[] } | null;
  exercises: Array<{
    exercise_id: string;
    sets: number;
    reps: string;
    rest_seconds: number;
    target_rpe: number;
    why?: string;
    form_cues?: string[];
    weight_guidance?: string;
  }>;
  cardio: { minutes: number; mode: string; intensity: string; why: string } | null;
  cooldown: { minutes: number; instructions: string[] } | null;
  notes: string;
};

export default async function SessionPage({ params }: Props) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("daily_plans")
    .select("plan")
    .eq("date", date)
    .maybeSingle<{ plan: DayPlan }>();

  if (!row?.plan || !row.plan.type) {
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
  const isRestOrCardio = plan.type === "rest" || plan.type === "active_recovery" || plan.type === "cardio_zone2" || plan.type === "cardio_hiit";

  if (isRestOrCardio || plan.exercises.length === 0) {
    return (
      <div className="mx-auto max-w-md px-5 pt-6 pb-24">
        <Link href="/plan" className="inline-flex items-center gap-1 text-xs text-text-secondary">
          <ArrowLeft className="size-3" /> Plan
        </Link>
        <div className="mt-6 rounded-[var(--radius-card)] border border-hairline bg-surface p-6 text-center">
          <p className="text-[11px] uppercase tracking-wider text-text-tertiary">{plan.day_name}</p>
          <h1 className="mt-1 text-2xl font-semibold">{plan.focus}</h1>
          <p className="mt-3 text-sm text-text-secondary">{plan.why_today}</p>
          {plan.cardio && (
            <p className="mt-4 text-sm text-text-primary">
              {plan.cardio.mode}<br />
              <span className="text-text-secondary">{plan.cardio.intensity}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Resolve exercise rows + last-time per exercise (parallel)
  const ids = plan.exercises.map((e) => e.exercise_id);
  const [{ data: exRows }, lastTimes] = await Promise.all([
    supabase.from("exercises").select("id, name, primary_muscle, equipment, demo_gif_url").in("id", ids),
    Promise.all(ids.map((id) => getLastTimeForExercise(id))),
  ]);
  const exMap = new Map((exRows ?? []).map((r) => [r.id, r]));

  const enriched = plan.exercises.map((p, i) => {
    const row = exMap.get(p.exercise_id);
    const last = lastTimes[i];
    return {
      exercise_id: p.exercise_id,
      name: row?.name ?? p.exercise_id,
      primary_muscle: row?.primary_muscle ?? "",
      demo_gif_url: row?.demo_gif_url ?? null,
      target_sets: p.sets,
      target_reps: p.reps,
      rest_seconds: p.rest_seconds,
      target_rpe: p.target_rpe,
      why: p.why ?? "",
      form_cues: p.form_cues ?? [],
      weight_guidance: p.weight_guidance ?? "",
      last_time: last,
    };
  });

  return <SessionClient date={date} plan={plan} enrichedExercises={enriched} />;
}
