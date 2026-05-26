import { createClient } from "@/lib/supabase/server";
import { estimate1RM, topSet } from "@/lib/training";

export type ExerciseLastTime = {
  workout_id: string;
  date: string;
  sets: Array<{ reps: number | null; weight_kg: number | null; rir: number | null }>;
  top_set: { reps: number | null; weight_kg: number | null; estimated_1rm: number } | null;
  volume_kg: number;
};

export type ExerciseStats = {
  total_workouts: number;
  estimated_1rm: number;
  best_set: { reps: number | null; weight_kg: number | null } | null;
  total_volume_kg: number;
};

/** Look up the most recent time the user did this exercise. Safe — returns null on any failure. */
export async function getLastTimeForExercise(exercise_id: string): Promise<ExerciseLastTime | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("workout_exercises")
      .select(`
        id,
        workout_id,
        exercises ( id ),
        exercise_sets ( reps, weight_kg, rir ),
        workouts!inner ( id, started_at, user_id )
      `)
      .eq("exercise_id", exercise_id)
      .order("started_at", { foreignTable: "workouts", ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("getLastTimeForExercise", error);
      return null;
    }
    if (!data) return null;

    const sets = ((data.exercise_sets as Array<{ reps: number | null; weight_kg: number | null; rir: number | null }>) ?? []).map((s) => ({
      reps: s.reps,
      weight_kg: s.weight_kg,
      rir: s.rir,
    }));
    const ts = topSet(sets);
    // Supabase returns joined rows as arrays even with !inner; pick the first.
    const workoutsField = data.workouts as { id: string; started_at: string } | Array<{ id: string; started_at: string }>;
    const workout = Array.isArray(workoutsField) ? workoutsField[0] : workoutsField;
    if (!workout) return null;

    return {
      workout_id: workout.id,
      date: workout.started_at,
      sets,
      top_set: ts ? { reps: ts.reps, weight_kg: ts.weight_kg, estimated_1rm: estimate1RM(ts.weight_kg ?? 0, ts.reps ?? 0) } : null,
      volume_kg: sets.reduce((s, x) => s + (x.reps ?? 0) * (x.weight_kg ?? 0), 0),
    };
  } catch (e) {
    console.error("getLastTimeForExercise exception", e);
    return null;
  }
}

/** All-time stats for one exercise: best set, est 1RM, total volume, count. */
export async function getExerciseStats(exercise_id: string): Promise<ExerciseStats> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_exercises")
    .select(`
      id,
      workouts!inner ( id ),
      exercise_sets ( reps, weight_kg )
    `)
    .eq("exercise_id", exercise_id);

  if (!data) return { total_workouts: 0, estimated_1rm: 0, best_set: null, total_volume_kg: 0 };

  const workoutIds = new Set(
    data.map((row) => {
      const w = row.workouts as { id: string } | Array<{ id: string }>;
      return Array.isArray(w) ? w[0]?.id : w?.id;
    }).filter(Boolean),
  );
  const allSets: Array<{ reps: number | null; weight_kg: number | null }> = data.flatMap(
    (row) => (row.exercise_sets as Array<{ reps: number | null; weight_kg: number | null }>) ?? [],
  );
  const best = topSet(allSets);
  return {
    total_workouts: workoutIds.size,
    estimated_1rm: best ? estimate1RM(best.weight_kg ?? 0, best.reps ?? 0) : 0,
    best_set: best,
    total_volume_kg: allSets.reduce((s, x) => s + (x.reps ?? 0) * (x.weight_kg ?? 0), 0),
  };
}

/** Time-series of top-set 1RM per workout for charting. */
export async function getExerciseProgress(exercise_id: string, limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_exercises")
    .select(`
      id,
      exercise_sets ( reps, weight_kg ),
      workouts!inner ( started_at )
    `)
    .eq("exercise_id", exercise_id)
    .order("started_at", { foreignTable: "workouts", ascending: false })
    .limit(limit);

  return (data ?? [])
    .map((row) => {
      const sets = (row.exercise_sets as Array<{ reps: number | null; weight_kg: number | null }>) ?? [];
      const best = topSet(sets);
      const w = row.workouts as { started_at: string } | Array<{ started_at: string }>;
      const workout = Array.isArray(w) ? w[0] : w;
      return {
        date: workout?.started_at ?? "",
        estimated_1rm: best ? estimate1RM(best.weight_kg ?? 0, best.reps ?? 0) : 0,
        top_reps: best?.reps ?? null,
        top_weight_kg: best?.weight_kg ?? null,
      };
    })
    .reverse(); // oldest → newest for charts
}
