import { createClient } from "@/lib/supabase/server";

export type TemplateExercise = {
  exercise_id: string;
  target_sets: number;
  target_reps: string;
  target_weight_kg?: number | null;
  rest_seconds?: number | null;
  notes?: string | null;
};

export type WorkoutTemplate = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  exercises: TemplateExercise[];
  use_count: number;
  created_at: string;
  last_used_at: string | null;
};

export async function getMyTemplates(): Promise<WorkoutTemplate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_templates")
    .select("*")
    .order("last_used_at", { ascending: false, nullsFirst: false });
  return (data ?? []) as WorkoutTemplate[];
}

export async function getTemplate(id: string): Promise<WorkoutTemplate | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("workout_templates").select("*").eq("id", id).maybeSingle();
  return (data as WorkoutTemplate) ?? null;
}
