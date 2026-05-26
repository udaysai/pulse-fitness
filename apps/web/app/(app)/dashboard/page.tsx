import { redirect } from "next/navigation";
import { Upload, Sparkles, CalendarDays, Dumbbell } from "lucide-react";
import Link from "next/link";
import { MetricCard } from "@/components/ui/MetricCard";
import { RingProgress } from "@/components/ui/RingProgress";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { DayCard, type DailyPlan } from "@/components/plan/DayCard";
import { ACCENT_HEX } from "@/lib/design/accents";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/queries/profile";
import { getRecentMetrics, trend } from "@/lib/queries/metrics";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Allow mock-mode browsing when Supabase isn't configured (for design preview)
  if (!isSupabaseConfigured()) return <MockDashboard />;

  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");
  if (!isProfileComplete(profile)) redirect("/onboarding");

  // Parallelize independent queries to cut dashboard nav latency
  const supabase = await createClient();
  const isoToday = new Date().toISOString().slice(0, 10);
  const [metrics, dailyPlanResult] = await Promise.all([
    getRecentMetrics(14),
    supabase.from("daily_plans").select("plan").eq("date", isoToday).maybeSingle<{ plan: unknown }>(),
  ]);
  const today = metrics.find((m) => m.date === isoToday);
  const dailyPlanRow = dailyPlanResult.data;

  // Detect old-shape plans (pre-prescriptive update) and treat as "no plan"
  // so the user is prompted to regenerate. New shape always has `type` and `why_today`.
  const rawPlan = dailyPlanRow?.plan as Partial<DailyPlan> | null | undefined;
  const todayPlan: DailyPlan | null =
    rawPlan && typeof rawPlan.type === "string" && typeof rawPlan.why_today === "string"
      ? (rawPlan as DailyPlan)
      : null;

  // Compute hero ring progress: today's active calories / 600 (rough default move goal)
  const moveGoal = 600;
  const moveProgress = today?.active_kcal ? Math.min(today.active_kcal / moveGoal, 1) : 0;

  const hasMetrics = metrics.length > 0;
  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "there";
  const greeting = greetingForHour(new Date().getHours());

  return (
    <div className="halo mx-auto max-w-md px-5 pt-8" style={{ ["--halo-color" as string]: ACCENT_HEX.workout }}>
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-text-tertiary">{formatDate()}</p>
          <h1 className="text-2xl font-semibold">
            {greeting}, {displayName}
          </h1>
        </div>
      </header>

      {!hasMetrics ? (
        <section className="mb-8">
          <EmptyState
            icon={Upload}
            title="Import your Apple Health data"
            body="Export from the iPhone Health app, then upload the .zip here. We aggregate to daily metrics — your raw samples never leave the device storage."
            accentHex={ACCENT_HEX.workout}
          >
            <PrimaryButton accent="workout" href="/settings/import">Import now</PrimaryButton>
          </EmptyState>
        </section>
      ) : (
        <>
          <div className="mb-8 flex justify-center">
            <RingProgress progress={moveProgress} accent="workout" size={200} strokeWidth={14}>
              <div className="flex flex-col items-center">
                <span className="metric text-4xl font-semibold">
                  {today?.active_kcal ?? 0}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-text-tertiary">kcal today</span>
              </div>
            </RingProgress>
          </div>

          <section className="mb-8 grid grid-cols-2 gap-3">
            <MetricCard
              label="Steps"
              value={today?.steps ?? 0}
              accent="workout"
              trend={trend(metrics, "steps")}
            />
            <MetricCard
              label="Resting HR"
              value={today?.resting_hr ?? "—"}
              unit="bpm"
              accent="recovery"
              trend={-trend(metrics, "resting_hr")}
            />
            <MetricCard
              label="Sleep"
              value={today?.sleep_minutes ? formatSleep(today.sleep_minutes) : "—"}
              accent="sleep"
              trend={trend(metrics, "sleep_minutes")}
            />
            <MetricCard
              label="HRV"
              value={today?.hrv_ms ?? "—"}
              unit="ms"
              accent="recovery"
              trend={trend(metrics, "hrv_ms")}
            />
          </section>
        </>
      )}

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Today</h2>
          <Link href="/plan" className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary">
            <CalendarDays className="size-3" /> Full week
          </Link>
        </div>

        {todayPlan ? (
          <>
            <DayCard plan={todayPlan} isToday defaultOpen />
            {Array.isArray(todayPlan.exercises) && todayPlan.exercises.length > 0 && (
              <div className="mt-3">
                <PrimaryButton accent="workout" href={`/session/${isoToday}`} className="w-full">
                  <Dumbbell className="size-4" /> Start session
                </PrimaryButton>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={Sparkles}
            title="No plan yet"
            body="Generate a personalized 7-day plan from your goal and activity level. Starts today, ends 6 days from now."
            accentHex={ACCENT_HEX.workout}
          >
            <form action="/api/plans/weekly" method="post">
              <PrimaryButton accent="workout" type="submit">Generate this week's plan</PrimaryButton>
            </form>
          </EmptyState>
        )}
      </section>
    </div>
  );
}

function greetingForHour(h: number) {
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Good night";
}

function formatDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function formatSleep(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

// Used only when Supabase isn't configured — for design preview only
function MockDashboard() {
  return (
    <div className="halo mx-auto max-w-md px-5 pt-8" style={{ ["--halo-color" as string]: ACCENT_HEX.workout }}>
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-wider text-text-tertiary">{formatDate()}</p>
        <h1 className="text-2xl font-semibold">{greetingForHour(new Date().getHours())} (mock)</h1>
      </header>
      <div className="mb-8 flex justify-center">
        <RingProgress progress={0.6} accent="workout" size={200} strokeWidth={14}>
          <div className="flex flex-col items-center">
            <span className="metric text-4xl font-semibold">365</span>
            <span className="text-[11px] uppercase tracking-wider text-text-tertiary">mock data</span>
          </div>
        </RingProgress>
      </div>
      <p className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4 text-center text-xs text-text-secondary">
        Supabase not configured — design preview only. Fill .env.local to see live data.
      </p>
    </div>
  );
}
