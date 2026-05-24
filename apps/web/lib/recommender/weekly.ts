import { createClient } from "@/lib/supabase/server";
import { pickSplitTemplate, defaultDaysPerWeek, type DayTemplate, type SessionType } from "./splits";
import { getExerciseMetadata } from "./exercise-metadata";
import type { Profile } from "@/lib/queries/profile";

export type PrescribedExercise = {
  exercise_id: string;
  name: string;
  primary_muscle: string;
  demo_gif_url: string | null;
  sets: number;
  reps: string;
  rest_seconds: number;
  target_rpe: number;
  why: string;
  form_cues: string[];
  weight_guidance: string;
  variants: string[];
};

export type DailyPlanShape = {
  date: string;
  day_name: string;
  type: SessionType;
  focus: string;
  why_today: string;
  duration_minutes: number;
  warmup: { minutes: number; instructions: string[] } | null;
  exercises: PrescribedExercise[];
  cardio: { minutes: number; mode: string; intensity: string; why: string } | null;
  cooldown: { minutes: number; instructions: string[] } | null;
  notes: string;
};

export type WeeklyPlanShape = {
  week_start: string; // = today
  week_end: string; // today + 6
  goal: string;
  days_per_week_active: number;
  total_minutes: number;
  summary: string;
  days: DailyPlanShape[];
};

const COMPOUND_PRIORITY = new Set([
  "Barbell_Squat", "Barbell_Front_Squat",
  "Conventional_Deadlift", "Sumo_Deadlift", "Romanian_Deadlift", "Trap_Bar_Deadlift",
  "Barbell_Bench_Press", "Incline_Dumbbell_Press", "Dumbbell_Bench_Press",
  "Standing_Military_Press", "Seated_Barbell_Press", "Dumbbell_Shoulder_Press",
  "Pullups", "Pull_Up", "Chin_Up", "Chinups", "Lat_Pulldown",
  "Bent_Over_Barbell_Row", "Pendlay_Row", "T-Bar_Row", "One-Arm_Dumbbell_Row",
  "Barbell_Curl", "Triceps_Pushdown",
]);

export async function generateWeeklyPlan(user_id: string, profile: Profile): Promise<WeeklyPlanShape> {
  const supabase = await createClient();
  const goal = (profile.goal ?? "wellness") as never;
  const dpw = defaultDaysPerWeek(profile.activity_level);
  const template = pickSplitTemplate(goal, dpw);

  // Pull candidate exercises for all muscles we'll need
  const muscleSet = new Set<string>();
  template.forEach((d) => d.muscles.forEach((m) => muscleSet.add(m)));
  const muscles = [...muscleSet];

  type Row = { id: string; name: string; primary_muscle: string; equipment: string | null; level: string | null; demo_gif_url: string | null; mechanic: string | null };
  let exercises: Row[] = [];
  if (muscles.length > 0) {
    const { data } = await supabase
      .from("exercises")
      .select("id, name, primary_muscle, equipment, level, demo_gif_url, mechanic")
      .in("primary_muscle", muscles)
      .in("level", ["beginner", "intermediate"])
      .limit(3000);
    exercises = data ?? [];
  }
  const byMuscle = new Map<string, Row[]>();
  exercises.forEach((e) => {
    const arr = byMuscle.get(e.primary_muscle) ?? [];
    arr.push(e);
    byMuscle.set(e.primary_muscle, arr);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: DailyPlanShape[] = template.map((dayTemplate, i) =>
    buildDay(dayTemplate, addDays(today, i), byMuscle),
  );

  const daysActive = days.filter((d) => d.type === "strength" || d.type === "cardio_zone2" || d.type === "cardio_hiit").length;
  const totalMin = days.reduce((s, d) => s + d.duration_minutes, 0);

  return {
    week_start: today.toISOString().slice(0, 10),
    week_end: addDays(today, 6).toISOString().slice(0, 10),
    goal: profile.goal ?? "wellness",
    days_per_week_active: daysActive,
    total_minutes: totalMin,
    summary: buildWeekSummary(profile.goal ?? "wellness", daysActive, totalMin),
    days,
  };
}

function buildDay(
  d: DayTemplate,
  date: Date,
  byMuscle: Map<string, Array<{ id: string; name: string; primary_muscle: string; equipment: string | null; demo_gif_url: string | null }>>,
): DailyPlanShape {
  const iso = date.toISOString().slice(0, 10);
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

  if (d.type === "rest") {
    return {
      date: iso,
      day_name: dayName,
      type: d.type,
      focus: d.focus,
      why_today: d.whyToday,
      duration_minutes: 0,
      warmup: null,
      exercises: [],
      cardio: null,
      cooldown: null,
      notes: "Sleep early. Hit your protein target. Hydrate.",
    };
  }

  if (d.type === "active_recovery") {
    return {
      date: iso,
      day_name: dayName,
      type: d.type,
      focus: d.focus,
      why_today: d.whyToday,
      duration_minutes: d.cardioMinutes + d.cooldownMinutes,
      warmup: null,
      exercises: [],
      cardio: {
        minutes: d.cardioMinutes,
        mode: "Walk, easy bike, or swim",
        intensity: "Easy — should feel like you could chat through it",
        why: "Active recovery improves blood flow and clears soreness without adding training stress.",
      },
      cooldown: { minutes: d.cooldownMinutes, instructions: ["Light stretching 30s per major muscle", "Hip flexors, chest, and lats are usually tight"] },
      notes: "Don't turn this into a workout. The point is to recover.",
    };
  }

  if (d.type === "cardio_zone2") {
    return {
      date: iso,
      day_name: dayName,
      type: d.type,
      focus: d.focus,
      why_today: d.whyToday,
      duration_minutes: d.warmupMinutes + d.cardioMinutes + d.cooldownMinutes,
      warmup: { minutes: d.warmupMinutes, instructions: ["5 min easy pace to warm up the muscles", "Build to your target heart rate gradually"] },
      exercises: [],
      cardio: {
        minutes: d.cardioMinutes,
        mode: "Bike, brisk walk, slow jog, swim, or rower",
        intensity: "Zone 2 — heart rate ~60–70% of max, conversational pace",
        why: "Zone 2 trains the aerobic system. Builds mitochondrial density (more energy per cell) and fat oxidation. Critical for long-term health and recovery between strength sessions.",
      },
      cooldown: { minutes: d.cooldownMinutes, instructions: ["3–5 min easy pace", "Static stretch hip flexors and calves"] },
      notes: "If you wear a watch, target ~140 bpm or whatever your Zone 2 ceiling is. If not: should be hard enough to feel it but you can talk in full sentences.",
    };
  }

  // STRENGTH SESSION
  const picked = pickExercisesForDay(d, byMuscle);
  const exercises: PrescribedExercise[] = picked.map((row, idx) => {
    const meta = getExerciseMetadata(row.id, row.primary_muscle);
    return {
      exercise_id: row.id,
      name: row.name,
      primary_muscle: row.primary_muscle,
      demo_gif_url: row.demo_gif_url,
      sets: idx === 0 ? d.setRange[1] : d.setRange[0],
      reps: d.repRange,
      rest_seconds: d.restSeconds,
      target_rpe: d.targetRPE,
      why: meta.why,
      form_cues: meta.formCues,
      weight_guidance: meta.weightGuidance,
      variants: meta.variants ?? [],
    };
  });

  // Estimate session duration: warmup + (sets × (rep_time + rest)) + cardio + cooldown
  // Assume 40s per set (work time), so set total time = 40 + rest_seconds
  const totalSets = exercises.reduce((s, e) => s + e.sets, 0);
  const strengthMinutes = Math.round((totalSets * (40 + d.restSeconds)) / 60);
  const duration = d.warmupMinutes + strengthMinutes + d.cardioMinutes + d.cooldownMinutes;

  return {
    date: iso,
    day_name: dayName,
    type: d.type,
    focus: d.focus,
    why_today: d.whyToday,
    duration_minutes: duration,
    warmup: {
      minutes: d.warmupMinutes,
      instructions: [
        "3 min easy bike, rower, or jump rope to raise body temp",
        "2 min dynamic mobility for the muscles you'll train",
        "1 light warm-up set of each main lift (50% of working weight)",
      ],
    },
    exercises,
    cardio:
      d.cardioMinutes > 0
        ? {
            minutes: d.cardioMinutes,
            mode: "Easy bike or incline walk — pick what's available",
            intensity: "Zone 2 — conversational pace",
            why: "Adds calorie burn and aerobic stimulus without interfering with strength gains. Always do cardio AFTER strength on combined days.",
          }
        : null,
    cooldown: {
      minutes: d.cooldownMinutes,
      instructions: ["2 min walk to bring heart rate down", "30s static stretch per muscle you trained"],
    },
    notes: `Effort target: ${d.targetRPE}/10 on your last rep of each set. Stop 1–2 reps short of failure — that's where most growth happens (Schoenfeld 2016).`,
  };
}

function pickExercisesForDay(
  day: DayTemplate,
  byMuscle: Map<string, Array<{ id: string; name: string; primary_muscle: string; equipment: string | null; demo_gif_url: string | null }>>,
) {
  const out: Array<{ id: string; name: string; primary_muscle: string; equipment: string | null; demo_gif_url: string | null }> = [];
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
  // Second pass: cover remaining muscles
  for (const muscle of day.muscles) {
    const candidates = byMuscle.get(muscle) ?? [];
    if (candidates.some((c) => usedIds.has(c.id))) continue;
    const pick = candidates.find((c) => !usedIds.has(c.id)) ?? candidates[0];
    if (pick) {
      out.push(pick);
      usedIds.add(pick.id);
    }
  }

  return out.slice(0, 6);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function buildWeekSummary(goal: string, days: number, totalMin: number): string {
  const goalLabel: Record<string, string> = {
    fat_loss: "lose fat while preserving muscle",
    lean_muscle: "build lean muscle",
    strength: "get stronger",
    maintenance: "maintain what you have",
    energy: "feel more energetic day-to-day",
    wellness: "stay healthy and consistent",
  };
  return `Goal this week: ${goalLabel[goal] ?? goal}. You'll train ${days} of 7 days, ~${Math.round(totalMin / 60)} hours total. Plan starts today.`;
}
