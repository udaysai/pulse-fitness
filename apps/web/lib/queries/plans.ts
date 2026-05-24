import { createClient } from "@/lib/supabase/server";

export type DailyPlan = {
  id: string;
  user_id: string;
  date: string;
  plan: {
    focus: string;
    notes?: string;
    exercises: Array<{
      exercise_id: string;
      sets: number;
      reps: string;
      rest_seconds?: number;
      target_rpe?: number;
      notes?: string;
    }>;
  };
  parent_weekly_plan_id: string | null;
  completed_at: string | null;
};

export async function getTodayPlan(): Promise<DailyPlan | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("daily_plans")
    .select("*")
    .eq("date", today)
    .maybeSingle<DailyPlan>();
  return data;
}

export async function getCurrentWeeklyPlan() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("weekly_plans")
    .select("*")
    .order("week_start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
