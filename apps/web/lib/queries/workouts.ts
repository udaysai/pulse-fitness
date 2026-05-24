import { createClient } from "@/lib/supabase/server";

export type WorkoutSummary = {
  id: string;
  started_at: string;
  ended_at: string | null;
  kind: string | null;
  source: string;
  rpe: number | null;
  exercise_count: number;
  set_count: number;
};

export async function getRecentWorkouts(limit = 30): Promise<WorkoutSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select(`
      id, started_at, ended_at, kind, source, rpe,
      workout_exercises (
        id,
        exercise_sets ( id )
      )
    `)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getRecentWorkouts", error);
    return [];
  }
  return (data ?? []).map((w) => ({
    id: w.id,
    started_at: w.started_at,
    ended_at: w.ended_at,
    kind: w.kind,
    source: w.source,
    rpe: w.rpe,
    exercise_count: w.workout_exercises?.length ?? 0,
    set_count: (w.workout_exercises ?? []).reduce(
      (sum: number, we: { exercise_sets?: unknown[] }) => sum + (we.exercise_sets?.length ?? 0),
      0,
    ),
  }));
}

export async function getWorkoutDetail(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select(`
      *,
      workout_exercises (
        id, order_idx, exercise_id,
        exercises ( id, name, primary_muscle, demo_gif_url ),
        exercise_sets ( id, set_idx, reps, weight_kg, rir )
      )
    `)
    .eq("id", id)
    .single();
  return data;
}
