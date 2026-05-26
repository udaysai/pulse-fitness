import { createClient } from "@/lib/supabase/server";

export type WorkoutTotals = {
  workouts: number;
  total_sets: number;
  total_volume_kg: number;
  total_minutes: number;
};

/** Sum stats over a date window (inclusive). Safe — returns zeros on any failure. */
export async function getWorkoutStats(sinceISO?: string): Promise<WorkoutTotals> {
  const empty: WorkoutTotals = { workouts: 0, total_sets: 0, total_volume_kg: 0, total_minutes: 0 };
  try {
    const supabase = await createClient();
    let query = supabase
      .from("workouts")
      .select(`
        id, started_at, ended_at,
        workout_exercises (
          exercise_sets ( reps, weight_kg )
        )
      `);
    if (sinceISO) query = query.gte("started_at", sinceISO);

    const { data, error } = await query;
    if (error) {
      console.error("getWorkoutStats", error);
      return empty;
    }
    if (!data) return empty;

    let sets = 0;
    let volume = 0;
    let minutes = 0;
    for (const w of data) {
      if (w.started_at && w.ended_at) {
        minutes += Math.max(0, (new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60000);
      }
      for (const we of (w.workout_exercises as Array<{ exercise_sets: Array<{ reps: number | null; weight_kg: number | null }> }>) ?? []) {
        for (const s of we.exercise_sets ?? []) {
          sets++;
          volume += (s.reps ?? 0) * (s.weight_kg ?? 0);
        }
      }
    }
    return { workouts: data.length, total_sets: sets, total_volume_kg: Math.round(volume), total_minutes: Math.round(minutes) };
  } catch (e) {
    console.error("getWorkoutStats exception", e);
    return empty;
  }
}

/** Workouts grouped by ISO date (YYYY-MM-DD), counts only — for calendar heatmap. */
export async function getWorkoutsByDate(sinceISO: string): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("started_at")
    .gte("started_at", sinceISO);
  const map = new Map<string, number>();
  for (const w of data ?? []) {
    const key = (w.started_at as string).slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}
