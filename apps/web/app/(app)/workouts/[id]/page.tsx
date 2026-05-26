import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { ACCENT_HEX } from "@/lib/design/accents";
import { getWorkoutDetail } from "@/lib/queries/workouts";
import { ExerciseDemo } from "@/components/training/ExerciseDemo";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function WorkoutDetailPage({ params }: Props) {
  const { id } = await params;
  const w = await getWorkoutDetail(id);
  if (!w) notFound();

  const sortedExercises = Array.isArray(w.workout_exercises)
    ? [...w.workout_exercises].sort(
        (a: { order_idx?: number }, b: { order_idx?: number }) => (a.order_idx ?? 0) - (b.order_idx ?? 0),
      )
    : [];
  const startedAt = w.started_at ? new Date(w.started_at) : new Date();
  const endedAt = w.ended_at ? new Date(w.ended_at) : null;
  const durationMin = endedAt && w.started_at
    ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000))
    : 0;

  return (
    <div className="mx-auto max-w-md px-5 pt-6 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/workouts" className="inline-flex items-center gap-1 text-xs text-text-secondary">
          <ArrowLeft className="size-3" /> All workouts
        </Link>
        <Link
          href={`/workouts/new?edit=${w.id}`}
          className="inline-flex items-center gap-1 rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
        >
          <Pencil className="size-3" /> Edit
        </Link>
      </div>

      <header className="halo mb-6" style={{ ["--halo-color" as string]: ACCENT_HEX.workout }}>
        <p className="text-[11px] uppercase tracking-wider text-text-tertiary">
          {startedAt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-2xl font-semibold">{w.kind ?? "Workout"}</h1>
        <p className="mt-1 text-xs text-text-secondary">
          {sortedExercises.length} exercises
          {w.rpe ? ` · effort ${w.rpe}/10` : ""}
          {durationMin > 0 ? ` · ${durationMin} min` : ""}
        </p>
      </header>

      <div className="space-y-3">
        {sortedExercises.map((we, idx) => {
          // Supabase nested join can return single object or array; pick the first
          const exFK = we.exercises;
          const exData = Array.isArray(exFK) ? exFK[0] : exFK;
          const rawName = exData?.name ?? we.exercise_id ?? "Exercise";
          const displayName = String(rawName).replace(/_/g, " ");
          const muscle = exData?.primary_muscle ?? "";
          const demoUrl = exData?.demo_gif_url ?? null;
          const sets = Array.isArray(we.exercise_sets)
            ? [...we.exercise_sets].sort((a: { set_idx?: number }, b: { set_idx?: number }) => (a.set_idx ?? 0) - (b.set_idx ?? 0))
            : [];
          return (
            <div key={we.id ?? idx} className="rounded-[var(--radius-card)] border border-hairline bg-surface p-3">
              <div className="mb-2 flex items-center gap-3">
                <ExerciseDemo src={demoUrl} alt={`${displayName} form demo`} className="size-10 rounded-md" />
                <div>
                  <p className="text-sm font-semibold">{displayName}</p>
                  {muscle && (
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary">{muscle}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className="grid grid-cols-[24px_1fr_1fr_1fr] gap-2 px-1 text-[10px] uppercase tracking-wider text-text-tertiary">
                  <span>#</span>
                  <span>Reps</span>
                  <span>Weight</span>
                  <span>RIR</span>
                </div>
                {sets.map((s, sIdx) => (
                  <div key={s.id ?? sIdx} className="grid grid-cols-[24px_1fr_1fr_1fr] gap-2 text-sm">
                    <span className="text-text-tertiary">{(s.set_idx ?? sIdx) + 1}</span>
                    <span className="metric">{s.reps ?? "—"}</span>
                    <span className="metric">{s.weight_kg ? `${s.weight_kg} kg` : "—"}</span>
                    <span className="metric">{s.rir ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {w.notes && (
        <div className="mt-4 rounded-[var(--radius-card)] border border-hairline bg-surface p-3">
          <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">Notes</p>
          <p className="text-sm whitespace-pre-wrap">{w.notes}</p>
        </div>
      )}
    </div>
  );
}
