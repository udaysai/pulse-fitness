import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ACCENT_HEX } from "@/lib/design/accents";
import { getWorkoutDetail } from "@/lib/queries/workouts";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function WorkoutDetailPage({ params }: Props) {
  const { id } = await params;
  const w = await getWorkoutDetail(id);
  if (!w) notFound();

  const sortedExercises = [...(w.workout_exercises ?? [])].sort(
    (a: { order_idx: number }, b: { order_idx: number }) => a.order_idx - b.order_idx,
  );

  return (
    <div className="mx-auto max-w-md px-5 pt-6">
      <Link href="/workouts" className="mb-4 inline-flex items-center gap-1 text-xs text-text-secondary">
        <ArrowLeft className="size-3" /> All workouts
      </Link>

      <header className="halo mb-6" style={{ ["--halo-color" as string]: ACCENT_HEX.workout }}>
        <p className="text-[11px] uppercase tracking-wider text-text-tertiary">
          {new Date(w.started_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-2xl font-semibold">{w.kind ?? "Workout"}</h1>
        <p className="mt-1 text-xs text-text-secondary">
          {sortedExercises.length} exercises
          {w.rpe ? ` · RPE ${w.rpe}` : ""}
          {w.ended_at
            ? ` · ${Math.round((new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60000)} min`
            : ""}
        </p>
      </header>

      <div className="space-y-3">
        {sortedExercises.map((we) => (
          <div key={we.id} className="rounded-[var(--radius-card)] border border-hairline bg-surface p-3">
            <div className="mb-2 flex items-center gap-3">
              <div className="size-10 shrink-0 overflow-hidden rounded-md bg-canvas">
                {we.exercises?.demo_gif_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={we.exercises.demo_gif_url} alt="" className="size-full object-cover" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">{we.exercises?.name ?? we.exercise_id}</p>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                  {we.exercises?.primary_muscle}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="grid grid-cols-[24px_1fr_1fr_1fr] gap-2 px-1 text-[10px] uppercase tracking-wider text-text-tertiary">
                <span>#</span>
                <span>Reps</span>
                <span>Weight</span>
                <span>RIR</span>
              </div>
              {[...(we.exercise_sets ?? [])]
                .sort((a: { set_idx: number }, b: { set_idx: number }) => a.set_idx - b.set_idx)
                .map((s) => (
                  <div key={s.id} className="grid grid-cols-[24px_1fr_1fr_1fr] gap-2 text-sm">
                    <span className="text-text-tertiary">{s.set_idx + 1}</span>
                    <span className="metric">{s.reps ?? "—"}</span>
                    <span className="metric">{s.weight_kg ? `${s.weight_kg} kg` : "—"}</span>
                    <span className="metric">{s.rir ?? "—"}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
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
