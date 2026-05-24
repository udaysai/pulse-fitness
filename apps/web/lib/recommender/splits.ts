/**
 * Pre-defined training splits per (goal, training-days-per-week).
 * The deterministic core picks the right split, then fills in exercises.
 *
 * "muscles" is the list of primary_muscle values to pull from the exercises catalog.
 * Rest days have muscles = [].
 */

export type DayTemplate = {
  focus: string;
  muscles: string[]; // empty = rest day
  setRange: [number, number];
  repRange: string; // "6-8", "8-12", etc.
  restSeconds: number;
  targetRPE: number;
};

export type SplitTemplate = DayTemplate[]; // length 7

type Goal = "fat_loss" | "lean_muscle" | "strength" | "maintenance" | "energy" | "wellness";

const REST: DayTemplate = { focus: "Rest & recover", muscles: [], setRange: [0, 0], repRange: "—", restSeconds: 0, targetRPE: 0 };
const ACTIVE_RECOVERY: DayTemplate = {
  focus: "Active recovery — walk or mobility",
  muscles: [],
  setRange: [0, 0],
  repRange: "—",
  restSeconds: 0,
  targetRPE: 0,
};

// Common day templates (param-tuned later per goal)
const PUSH = (sets: [number, number], reps: string, rpe: number, rest: number): DayTemplate => ({
  focus: "Push — chest, shoulders, triceps",
  muscles: ["chest", "shoulders", "triceps"],
  setRange: sets,
  repRange: reps,
  restSeconds: rest,
  targetRPE: rpe,
});
const PULL = (sets: [number, number], reps: string, rpe: number, rest: number): DayTemplate => ({
  focus: "Pull — back, biceps",
  muscles: ["lats", "middle back", "lower back", "biceps", "traps"],
  setRange: sets,
  repRange: reps,
  restSeconds: rest,
  targetRPE: rpe,
});
const LEGS = (sets: [number, number], reps: string, rpe: number, rest: number): DayTemplate => ({
  focus: "Legs — quads, hamstrings, glutes, calves",
  muscles: ["quadriceps", "hamstrings", "glutes", "calves"],
  setRange: sets,
  repRange: reps,
  restSeconds: rest,
  targetRPE: rpe,
});
const UPPER = (sets: [number, number], reps: string, rpe: number, rest: number): DayTemplate => ({
  focus: "Upper body",
  muscles: ["chest", "shoulders", "lats", "middle back", "triceps", "biceps"],
  setRange: sets,
  repRange: reps,
  restSeconds: rest,
  targetRPE: rpe,
});
const LOWER = (sets: [number, number], reps: string, rpe: number, rest: number): DayTemplate => ({
  focus: "Lower body + core",
  muscles: ["quadriceps", "hamstrings", "glutes", "calves", "abdominals", "lower back"],
  setRange: sets,
  repRange: reps,
  restSeconds: rest,
  targetRPE: rpe,
});
const FULL_BODY = (sets: [number, number], reps: string, rpe: number, rest: number): DayTemplate => ({
  focus: "Full body",
  muscles: ["chest", "lats", "quadriceps", "hamstrings", "shoulders"],
  setRange: sets,
  repRange: reps,
  restSeconds: rest,
  targetRPE: rpe,
});
const CONDITIONING: DayTemplate = {
  focus: "Conditioning — 25–35 min Zone 2",
  muscles: ["cardiovascular"],
  setRange: [1, 1],
  repRange: "25–35 min",
  restSeconds: 0,
  targetRPE: 5,
};

export function pickSplitTemplate(goal: Goal, daysPerWeek: number): SplitTemplate {
  // Clamp 2..6 for sensible splits
  const days = Math.max(2, Math.min(6, daysPerWeek));

  switch (goal) {
    case "strength": {
      // Lower reps, higher RPE, longer rest
      const reps = "3-6", rpe = 8, rest = 180;
      const sets: [number, number] = [4, 6];
      if (days <= 3) return [FULL_BODY(sets, reps, rpe, rest), REST, FULL_BODY(sets, reps, rpe, rest), REST, FULL_BODY(sets, reps, rpe, rest), REST, ACTIVE_RECOVERY];
      if (days === 4) return [UPPER(sets, reps, rpe, rest), LOWER(sets, reps, rpe, rest), REST, UPPER(sets, reps, rpe, rest), LOWER(sets, reps, rpe, rest), REST, ACTIVE_RECOVERY];
      return [PUSH(sets, reps, rpe, rest), PULL(sets, reps, rpe, rest), LEGS(sets, reps, rpe, rest), REST, PUSH(sets, reps, rpe, rest), PULL(sets, reps, rpe, rest), ACTIVE_RECOVERY];
    }
    case "lean_muscle": {
      const reps = "8-12", rpe = 8, rest = 120;
      const sets: [number, number] = [3, 4];
      if (days <= 3) return [UPPER(sets, reps, rpe, rest), LOWER(sets, reps, rpe, rest), REST, FULL_BODY(sets, reps, rpe, rest), REST, ACTIVE_RECOVERY, REST];
      if (days === 4) return [UPPER(sets, reps, rpe, rest), LOWER(sets, reps, rpe, rest), REST, UPPER(sets, reps, rpe, rest), LOWER(sets, reps, rpe, rest), ACTIVE_RECOVERY, REST];
      return [PUSH(sets, reps, rpe, rest), PULL(sets, reps, rpe, rest), LEGS(sets, reps, rpe, rest), REST, UPPER(sets, reps, rpe, rest), LOWER(sets, reps, rpe, rest), ACTIVE_RECOVERY];
    }
    case "fat_loss": {
      const reps = "10-15", rpe = 7, rest = 60;
      const sets: [number, number] = [3, 4];
      if (days <= 3) return [FULL_BODY(sets, reps, rpe, rest), CONDITIONING, FULL_BODY(sets, reps, rpe, rest), CONDITIONING, FULL_BODY(sets, reps, rpe, rest), ACTIVE_RECOVERY, REST];
      if (days === 4) return [UPPER(sets, reps, rpe, rest), LOWER(sets, reps, rpe, rest), CONDITIONING, UPPER(sets, reps, rpe, rest), LOWER(sets, reps, rpe, rest), CONDITIONING, REST];
      return [PUSH(sets, reps, rpe, rest), PULL(sets, reps, rpe, rest), CONDITIONING, LEGS(sets, reps, rpe, rest), UPPER(sets, reps, rpe, rest), CONDITIONING, REST];
    }
    case "maintenance":
    case "wellness": {
      const reps = "8-12", rpe = 7, rest = 90;
      const sets: [number, number] = [3, 3];
      if (days <= 2) return [FULL_BODY(sets, reps, rpe, rest), REST, ACTIVE_RECOVERY, REST, FULL_BODY(sets, reps, rpe, rest), REST, ACTIVE_RECOVERY];
      if (days === 3) return [FULL_BODY(sets, reps, rpe, rest), CONDITIONING, FULL_BODY(sets, reps, rpe, rest), REST, ACTIVE_RECOVERY, FULL_BODY(sets, reps, rpe, rest), REST];
      return [UPPER(sets, reps, rpe, rest), LOWER(sets, reps, rpe, rest), CONDITIONING, REST, UPPER(sets, reps, rpe, rest), LOWER(sets, reps, rpe, rest), ACTIVE_RECOVERY];
    }
    case "energy": {
      // Lots of low-intensity volume, easy strength
      const reps = "10-15", rpe = 6, rest = 75;
      const sets: [number, number] = [2, 3];
      return [FULL_BODY(sets, reps, rpe, rest), CONDITIONING, ACTIVE_RECOVERY, FULL_BODY(sets, reps, rpe, rest), CONDITIONING, ACTIVE_RECOVERY, REST];
    }
  }
}

const FREQ_BY_ACTIVITY: Record<string, number> = {
  sedentary: 2,
  light: 3,
  moderate: 4,
  active: 5,
  very_active: 6,
};

export function defaultDaysPerWeek(activity_level: string | null | undefined): number {
  if (!activity_level) return 3;
  return FREQ_BY_ACTIVITY[activity_level] ?? 3;
}
