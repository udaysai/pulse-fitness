import { createClient } from "@/lib/supabase/server";

export type ExerciseRow = {
  id: string;
  name: string;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string | null;
  level: string | null;
  mechanic: string | null;
  demo_gif_url: string | null;
};

export async function searchExercises(opts: {
  q?: string;
  muscle?: string;
  equipment?: string;
  limit?: number;
}): Promise<ExerciseRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("exercises")
    .select("id, name, primary_muscle, secondary_muscles, equipment, level, mechanic, demo_gif_url")
    .order("name", { ascending: true })
    .limit(opts.limit ?? 50);
  if (opts.q) query = query.ilike("name", `%${opts.q}%`);
  if (opts.muscle) query = query.eq("primary_muscle", opts.muscle);
  if (opts.equipment) query = query.eq("equipment", opts.equipment);
  const { data } = await query;
  return data ?? [];
}
