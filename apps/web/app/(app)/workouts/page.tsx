import Link from "next/link";
import { Plus, Dumbbell } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ACCENT_HEX } from "@/lib/design/accents";
import { getRecentWorkouts } from "@/lib/queries/workouts";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const workouts = await getRecentWorkouts(30);

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Workouts"
        subtitle="Your training history."
        accentHex={ACCENT_HEX.workout}
      />
      <div className="space-y-4 px-5 pt-4">
        <Link href="/workouts/new">
          <PrimaryButton accent="workout" className="w-full">
            <Plus className="size-4" /> Log workout
          </PrimaryButton>
        </Link>

        {workouts.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="No workouts yet"
            body="Tap above to log your first workout. Browse the 873-exercise catalog and log sets in seconds."
            accentHex={ACCENT_HEX.workout}
          />
        ) : (
          <ul className="space-y-2">
            {workouts.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/workouts/${w.id}`}
                  className="flex items-center justify-between rounded-[var(--radius-card)] border border-hairline bg-surface p-4 transition-colors hover:bg-surface-raised"
                >
                  <div>
                    <p className="text-sm font-semibold">{w.kind ?? "Workout"}</p>
                    <p className="text-[11px] text-text-tertiary">
                      {formatRelativeDate(w.started_at)} · {w.exercise_count} exercises · {w.set_count} sets
                      {w.rpe ? ` · RPE ${w.rpe}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-text-tertiary">{w.source}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
