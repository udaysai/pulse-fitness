import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { DayCard, type DailyPlan } from "@/components/plan/DayCard";
import { ACCENT_HEX } from "@/lib/design/accents";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/queries/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type WeeklyPlanRow = {
  id: string;
  week_start_date: string;
  generated_at: string;
  plan: {
    week_start: string;
    week_end: string;
    goal: string;
    days_per_week_active: number;
    total_minutes: number;
    summary: string;
    days: DailyPlan[];
  };
};

export default async function PlanPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");
  if (!isProfileComplete(profile)) redirect("/onboarding");

  const supabase = await createClient();
  const { data: latestRaw } = await supabase
    .from("weekly_plans")
    .select("id, week_start_date, generated_at, plan")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Detect old-shape plans and ignore them — old plans lacked summary/days_per_week_active.
  type Loose = { id: string; week_start_date: string; generated_at: string; plan: { summary?: string; days?: unknown[] } };
  const looseLatest = latestRaw as Loose | null;
  const latest: WeeklyPlanRow | null =
    looseLatest &&
    looseLatest.plan &&
    typeof looseLatest.plan.summary === "string" &&
    Array.isArray(looseLatest.plan.days)
      ? (looseLatest as WeeklyPlanRow)
      : null;

  const today = new Date().toISOString().slice(0, 10);

  if (!latest) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title="Your week" subtitle="Personalized 7-day plan." accentHex={ACCENT_HEX.workout} />
        <div className="px-5 pt-4">
          <EmptyState
            icon={Sparkles}
            title="No plan generated yet"
            body="We'll build a 7-day plan from your goal, activity level, and any injuries you mentioned. Starts today."
            accentHex={ACCENT_HEX.workout}
          >
            <form action="/api/plans/weekly" method="post">
              <PrimaryButton accent="workout" type="submit">Generate this week&apos;s plan</PrimaryButton>
            </form>
          </EmptyState>
        </div>
      </div>
    );
  }

  const plan = latest.plan;
  const generatedDate = new Date(latest.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Your week" subtitle={plan.summary} accentHex={ACCENT_HEX.workout} />

      <div className="space-y-4 px-5 pt-4">
        {/* Week stats */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Active days" value={`${plan.days_per_week_active}/7`} />
          <Stat label="Total time" value={`${Math.round(plan.total_minutes / 60)}h ${plan.total_minutes % 60}m`} />
          <Stat label="Goal" value={prettyGoal(plan.goal)} />
        </div>

        {/* Regenerate */}
        <form action="/api/plans/weekly" method="post">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-card)] border border-hairline bg-surface px-4 py-2.5 text-xs text-text-secondary hover:text-text-primary"
          >
            <Sparkles className="size-3" /> Regenerate plan (last generated {generatedDate})
          </button>
        </form>

        {/* Day cards */}
        <div className="flex flex-col gap-2 pt-2">
          {plan.days.map((d) => (
            <DayCard key={d.date} plan={d} isToday={d.date === today} defaultOpen={d.date === today} />
          ))}
        </div>

        {/* Glossary footer */}
        <details className="rounded-[var(--radius-card)] border border-hairline bg-surface p-3 mt-4">
          <summary className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary list-none">
            <CalendarDays className="size-3" />
            <span>Quick glossary — tap to expand</span>
          </summary>
          <div className="mt-3 space-y-2 text-xs">
            <GlossLine term="RPE — Rate of Perceived Exertion" body="How hard a set feels on 1–10. 10 = no more reps. Working sets should land 7–9." />
            <GlossLine term="Zone 2" body="Conversational cardio. Heart rate ~60–70% of max — you can talk in full sentences." />
            <GlossLine term="Compound" body="Multi-joint movement (squat, bench, deadlift, row, press, pull-up). High return per minute." />
            <GlossLine term="Isolation" body="Single-joint (bicep curl, lateral raise, leg extension). For polish, not foundation." />
            <GlossLine term="Active recovery" body="Light movement on a non-training day. Not optional — it speeds up recovery between hard sessions." />
            <GlossLine term="Progressive overload" body="The reason you keep adding weight, reps, or sets over time. Without it, you maintain — never improve." />
          </div>
        </details>

        <Link href="/dashboard">
          <button className="w-full rounded-[var(--radius-card)] border border-hairline bg-surface px-4 py-3 text-sm text-text-secondary">
            ← Back to dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-text-tertiary">{label}</p>
      <p className="metric mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function GlossLine({ term, body }: { term: string; body: string }) {
  return (
    <div>
      <p className="font-semibold text-text-primary">{term}</p>
      <p className="text-text-secondary">{body}</p>
    </div>
  );
}

function prettyGoal(g: string): string {
  return ({ fat_loss: "Fat loss", lean_muscle: "Muscle", strength: "Strength", maintenance: "Maintain", energy: "Energy", wellness: "Wellness" } as Record<string, string>)[g] ?? g;
}
