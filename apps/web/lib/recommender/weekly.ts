import { createClient } from "@/lib/supabase/server";
import { pickSplitTemplate, defaultDaysPerWeek, type DayTemplate } from "./splits";
import type { Profile } from "@/lib/queries/profile";

export type DailyPlanShape = {
  date: string;
  focus: string;
  notes?: string;
  exercises: Array<{
    exercise_id: string;
    sets: number;
    reps: string;
    rest_seconds: number;
    target_rpe: number;
    notes?: string;
  }>;
};

export type WeeklyPlanShape = {
  week_start: string;
  goal: string;
  days_per_week: number;
  days: DailyPlanShape[];
};

const COMPOUND_PRIORITY = new Set([
  "Barbell_Squat", "Barbell_Deadlift", "Barbell_Bench_Press", "Barbell_Front_Squat",
  "Conventional_Deadlift", "Sumo_Deadlift", "Romanian_Deadlift",
  "Bench_Press_-_Powerlifting", "Standing_Military_Press",
  "Pullups", "Pull_Up", "Chin_Up", "Chinups", "Bent_Over_Barbell_Row", "Barbell_Row",
  "Overhead_Press", "Push_Press",
]);

export async function generateWeeklyPlan(
  user_id: string,
  profile: Profile,
): Promise<WeeklyPlanShape> {
  const supabase = await createClient();
  const goal = profile.goal ?? "wellness";
  const dpw = defaultDaysPerWeek(profile.activity_level);
  const template = pickSplitTemplate(goal as never, dpw);

  // Collect all muscles we'll need exercises for across the week
  const muscleSet = new Set<string>();
  template.forEach((d) => d.muscles.forEach((m) => muscleSet.add(m)));
  const muscles = [...muscleSet].filter((m) => m !== "cardiovascular");

  // Bulk fetch candidate exercises (cheap — one round-trip)
  type ExerciseRow = {
    id: string;
    name: string;
    primary_muscle: string;
    equipment: string | null;
    level: string | null;
    mechanic: string | null;
    force: string | null;
  };
  const { data: exercisesRaw } = await supabase
    .from("exercises")
    .select("id, name, primary_muscle, equipment, level, mechanic, force")
    .in("primary_muscle", muscles)
    .in("level", ["beginner", "intermediate"])
    .limit(2000);
  const exercises: ExerciseRow[] = exercisesRaw ?? [];

  // Group by muscle
  const byMuscle = new Map<string, ExerciseRow[]>();
  exercises.forEach((e) => {
    if (!e.primary_muscle) return;
    const arr = byMuscle.get(e.primary_muscle) ?? [];
    arr.push(e);
    byMuscle.set(e.primary_muscle, arr);
  });

  // Build week
  const monday = startOfWeek(new Date());
  const days: DailyPlanShape[] = template.map((dayTemplate, i) => {
    const date = addDays(monday, i).toISOString().slice(0, 10);
    if (dayTemplate.muscles.length === 0) {
      return {
        date,
        focus: dayTemplate.focus,
        exercises: [],
        notes: "Recovery is when adaptation happens. Walk, stretch, sleep early.",
      };
    }
    if (dayTemplate.muscles[0] === "cardiovascular") {
      return {
        date,
        focus: dayTemplate.focus,
        exercises: [],
        notes: "Zone 2 = conversational pace. Nasal breathing if you can.",
      };
    }
    const picked = pickExercisesForDay(dayTemplate, byMuscle);
    return {
      date,
      focus: dayTemplate.focus,
      exercises: picked.map((ex, idx) => ({
        exercise_id: ex.id,
        sets: idx === 0 ? dayTemplate.setRange[1] : dayTemplate.setRange[0],
        reps: dayTemplate.repRange,
        rest_seconds: dayTemplate.restSeconds,
        target_rpe: dayTemplate.targetRPE,
      })),
    };
  });

  return {
    week_start: monday.toISOString().slice(0, 10),
    goal,
    days_per_week: dpw,
    days,
  };
}

function pickExercisesForDay(
  day: DayTemplate,
  byMuscle: Map<string, Array<{ id: string; name: string; mechanic: string | null; equipment: string | null }>>,
) {
  // 1 exercise per muscle in the focus list, with a compound first when possible
  const out: Array<{ id: string; name: string }> = [];
  const usedIds = new Set<string>();

  // First pass: pick known compounds
  for (const muscle of day.muscles) {
    const candidates = byMuscle.get(muscle) ?? [];
    const compound = candidates.find((c) => COMPOUND_PRIORITY.has(c.id) && !usedIds.has(c.id));
    if (compound) {
      out.push(compound);
      usedIds.add(compound.id);
    }
  }

  // Second pass: cover remaining muscles with any candidate not yet used
  for (const muscle of day.muscles) {
    const candidates = byMuscle.get(muscle) ?? [];
    if (candidates.some((c) => usedIds.has(c.id))) continue; // already have one
    const pick = candidates.find((c) => !usedIds.has(c.id)) ?? candidates[0];
    if (pick) {
      out.push(pick);
      usedIds.add(pick.id);
    }
  }

  // Cap at 6 exercises per session
  return out.slice(0, 6);
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // make Monday=0
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
