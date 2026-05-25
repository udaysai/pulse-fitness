import Link from "next/link";
import { Plus, Dumbbell, Bookmark, TrendingUp, Calendar } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ACCENT_HEX } from "@/lib/design/accents";
import { getRecentWorkouts } from "@/lib/queries/workouts";
import { getWorkoutStats } from "@/lib/queries/workout-stats";
import { getMyTemplates } from "@/lib/queries/templates";
import { fmtKg } from "@/lib/training";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const [workouts, weekStats, monthStats, allTimeStats, templates] = await Promise.all([
    getRecentWorkouts(30),
    getWorkoutStats(startOfWeekISO()),
    getWorkoutStats(startOfMonthISO()),
    getWorkoutStats(),
    getMyTemplates(),
  ]);

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Workouts" subtitle="Train. Track. Progress." accentHex={ACCENT_HEX.workout} />

      <div className="space-y-5 px-5 pt-4">
        <PrimaryButton accent="workout" href="/workouts/new" className="w-full">
          <Plus className="size-4" /> Start workout
        </PrimaryButton>
        <Link
          href={`/workouts/new?date=${yesterdayISO()}`}
          className="-mt-3 inline-flex items-center justify-center gap-1 text-xs text-text-secondary hover:text-text-primary"
        >
          or log a past workout (yesterday, etc.)
        </Link>

        {/* Stats */}
        <section>
          <SectionHead icon={TrendingUp}>This week</SectionHead>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Sessions" value={weekStats.workouts.toString()} />
            <Stat label="Sets" value={weekStats.total_sets.toString()} />
            <Stat label="Volume" value={`${fmtKg(weekStats.total_volume_kg)} kg`} />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Stat label="Month" value={`${monthStats.workouts} sessions`} subdued />
            <Stat label="All time" value={`${allTimeStats.workouts} sessions`} subdued />
            <Stat label="All-time vol" value={`${formatBigKg(allTimeStats.total_volume_kg)}`} subdued />
          </div>
        </section>

        {/* Templates */}
        {templates.length > 0 && (
          <section>
            <SectionHead icon={Bookmark}>My routines</SectionHead>
            <ul className="space-y-2">
              {templates.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/workouts/new?template=${t.id}`}
                    className="flex items-center justify-between rounded-[var(--radius-card)] border border-hairline bg-surface p-3 hover:bg-surface-raised"
                  >
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-[11px] text-text-tertiary">
                        {t.exercises.length} exercises · used {t.use_count} times
                      </p>
                    </div>
                    <Plus className="size-4 text-text-secondary" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* History */}
        <section>
          <SectionHead icon={Calendar}>History</SectionHead>
          {workouts.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title="No workouts yet"
              body="Tap Start workout above to log your first session. Browse 873 exercises with demo GIFs."
              accentHex={ACCENT_HEX.workout}
            />
          ) : (
            <ul className="space-y-2">
              {workouts.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/workouts/${w.id}`}
                    className="flex items-center justify-between rounded-[var(--radius-card)] border border-hairline bg-surface p-3 hover:bg-surface-raised"
                  >
                    <div>
                      <p className="text-sm font-semibold">{w.kind ?? "Workout"}</p>
                      <p className="text-[11px] text-text-tertiary">
                        {formatRelativeDate(w.started_at)} · {w.exercise_count} exercises · {w.set_count} sets
                        {w.rpe ? ` · effort ${w.rpe}/10` : ""}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-text-tertiary">{w.source}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function SectionHead({ icon: Icon, children }: { icon: typeof TrendingUp; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 px-1">
      <Icon className="size-3 text-text-tertiary" />
      <h2 className="text-[11px] uppercase tracking-wider text-text-tertiary">{children}</h2>
    </div>
  );
}

function Stat({ label, value, subdued }: { label: string; value: string; subdued?: boolean }) {
  return (
    <div className={`rounded-[var(--radius-card)] border border-hairline ${subdued ? "bg-canvas" : "bg-surface"} p-3 text-center`}>
      <p className="text-[10px] uppercase tracking-wider text-text-tertiary">{label}</p>
      <p className={`metric mt-0.5 text-sm font-semibold ${subdued ? "text-text-secondary" : ""}`}>{value}</p>
    </div>
  );
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function startOfWeekISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonthISO(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatBigKg(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}M kg`;
  if (kg >= 1_000) return `${(kg / 1_000).toFixed(1)}k kg`;
  return `${kg} kg`;
}
