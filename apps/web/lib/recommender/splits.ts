/**
 * Pre-defined training splits per (goal, training-days-per-week).
 * Each DayTemplate now includes warm-up, cardio, and duration estimates so
 * the generated plan is prescriptive enough to follow without thinking.
 */

export type SessionType = "strength" | "cardio_zone2" | "cardio_hiit" | "active_recovery" | "rest";

export type DayTemplate = {
  type: SessionType;
  focus: string;
  whyToday: string; // 1-2 sentence explainer
  muscles: string[]; // for strength sessions; empty otherwise
  setRange: [number, number];
  repRange: string;
  restSeconds: number;
  targetRPE: number;
  warmupMinutes: number;
  cardioMinutes: number;
  cooldownMinutes: number;
};

type Goal = "fat_loss" | "lean_muscle" | "strength" | "maintenance" | "energy" | "wellness";

// ─────────── Day templates (param-tuned per goal in pickSplitTemplate) ───────────

const REST = (whyToday: string): DayTemplate => ({
  type: "rest",
  focus: "Rest day",
  whyToday,
  muscles: [],
  setRange: [0, 0],
  repRange: "—",
  restSeconds: 0,
  targetRPE: 0,
  warmupMinutes: 0,
  cardioMinutes: 0,
  cooldownMinutes: 0,
});

const ACTIVE_RECOVERY = (whyToday: string): DayTemplate => ({
  type: "active_recovery",
  focus: "Active recovery — walk + mobility",
  whyToday,
  muscles: [],
  setRange: [0, 0],
  repRange: "—",
  restSeconds: 0,
  targetRPE: 4,
  warmupMinutes: 0,
  cardioMinutes: 25,
  cooldownMinutes: 5,
});

const CARDIO_Z2 = (minutes: number, whyToday: string): DayTemplate => ({
  type: "cardio_zone2",
  focus: `Zone 2 cardio — ${minutes} min`,
  whyToday,
  muscles: [],
  setRange: [0, 0],
  repRange: "—",
  restSeconds: 0,
  targetRPE: 5,
  warmupMinutes: 5,
  cardioMinutes: minutes,
  cooldownMinutes: 5,
});

type StrengthBlockOpts = {
  focus: string;
  muscles: string[];
  sets: [number, number];
  reps: string;
  rpe: number;
  restSeconds: number;
  cardioMin?: number;
  whyToday: string;
};

const STRENGTH = (o: StrengthBlockOpts): DayTemplate => ({
  type: "strength",
  focus: o.focus,
  whyToday: o.whyToday,
  muscles: o.muscles,
  setRange: o.sets,
  repRange: o.reps,
  restSeconds: o.restSeconds,
  targetRPE: o.rpe,
  warmupMinutes: 8,
  cardioMinutes: o.cardioMin ?? 0,
  cooldownMinutes: 5,
});

export function pickSplitTemplate(goal: Goal, daysPerWeek: number): DayTemplate[] {
  const days = Math.max(2, Math.min(6, daysPerWeek));

  switch (goal) {
    case "strength": {
      const reps = "3-6", rpe = 8, rest = 180, sets: [number, number] = [4, 6];
      const FULL = (whyToday: string) =>
        STRENGTH({ focus: "Full body strength", muscles: ["chest", "lats", "quadriceps", "hamstrings", "shoulders"], sets, reps, rpe, restSeconds: rest, whyToday });
      const UPPER = (whyToday: string) =>
        STRENGTH({ focus: "Upper body strength", muscles: ["chest", "shoulders", "lats", "middle back", "triceps", "biceps"], sets, reps, rpe, restSeconds: rest, whyToday });
      const LOWER = (whyToday: string) =>
        STRENGTH({ focus: "Lower body strength", muscles: ["quadriceps", "hamstrings", "glutes", "calves", "lower back"], sets, reps, rpe, restSeconds: rest, whyToday });
      const PUSH = (whyToday: string) =>
        STRENGTH({ focus: "Push — chest, shoulders, triceps", muscles: ["chest", "shoulders", "triceps"], sets, reps, rpe, restSeconds: rest, whyToday });
      const PULL = (whyToday: string) =>
        STRENGTH({ focus: "Pull — back, biceps", muscles: ["lats", "middle back", "biceps", "traps"], sets, reps, rpe, restSeconds: rest, whyToday });
      const LEGS = (whyToday: string) =>
        STRENGTH({ focus: "Legs", muscles: ["quadriceps", "hamstrings", "glutes", "calves"], sets, reps, rpe, restSeconds: rest, whyToday });

      if (days <= 3) return [FULL("Lower reps + higher load → neural adaptation. Quality over quantity today."), REST("Full-body work needs 48h before next session — recovery is when strength is built."), FULL("Same emphasis as session A; force production wins through repetition."), REST("Active rest preserves the CNS for the next heavy lift."), FULL("Third session this week — slightly back off if anything feels stiff."), REST("Big lifts are taxing on the nervous system. Sleep early tonight."), ACTIVE_RECOVERY("A 25-min walk clears soreness and sets up Monday.")];
      if (days === 4) return [UPPER("Open the week with upper-body strength — joints are fresh."), LOWER("Squat or deadlift pattern with full intensity."), REST("Recovery between heavy lower-body sessions is non-negotiable."), UPPER("Mirror Sunday's session — repeated exposure is what drives strength."), LOWER("Hit the lower-body movement pattern not used Monday."), REST("48h before active recovery primes you for next week."), ACTIVE_RECOVERY("Walk + mobility. Don't skip — recovery work is training.")];
      return [PUSH("Open with pressing — fresh shoulders are stronger."), PULL("Balance pushing volume with pulling, or your shoulders will hate you."), LEGS("Big lifts demand big rest after. Eat well today."), REST("Hard week needs at least one full off day."), PUSH("Second exposure to pressing patterns this week."), PULL("Second pulling exposure cements adaptation."), ACTIVE_RECOVERY("End the week with movement, not a couch.")];
    }

    case "lean_muscle": {
      const reps = "8-12", rpe = 8, rest = 120, sets: [number, number] = [3, 4];
      const UPPER = (whyToday: string) =>
        STRENGTH({ focus: "Upper body hypertrophy", muscles: ["chest", "shoulders", "lats", "middle back", "triceps", "biceps"], sets, reps, rpe, restSeconds: rest, whyToday });
      const LOWER = (whyToday: string) =>
        STRENGTH({ focus: "Lower body hypertrophy", muscles: ["quadriceps", "hamstrings", "glutes", "calves"], sets, reps, rpe, restSeconds: rest, whyToday });
      const PUSH = (whyToday: string) =>
        STRENGTH({ focus: "Push — chest, shoulders, triceps", muscles: ["chest", "shoulders", "triceps"], sets, reps, rpe, restSeconds: rest, whyToday });
      const PULL = (whyToday: string) =>
        STRENGTH({ focus: "Pull — back, biceps", muscles: ["lats", "middle back", "biceps", "traps"], sets, reps, rpe, restSeconds: rest, whyToday });
      const LEGS = (whyToday: string) =>
        STRENGTH({ focus: "Legs", muscles: ["quadriceps", "hamstrings", "glutes", "calves"], sets, reps, rpe, restSeconds: rest, whyToday });

      if (days <= 3) return [UPPER("Fresh week, full upper-body volume → max growth signal."), LOWER("Lower body second day balances weekly stimulus."), REST("Hypertrophy needs 48–72h before re-training a muscle (Schoenfeld 2016)."), UPPER("Second exposure — muscle protein synthesis peaks ~48h after the first session."), REST("Recovery day. Eat protein, get 7+h sleep."), ACTIVE_RECOVERY("Walk improves recovery without adding fatigue."), REST("Heading into next week well-recovered.")];
      if (days === 4) return [UPPER("Open the week with upper — shoulders are fresh from rest."), LOWER("Hit the legs hard while you're recovered."), REST("Adaptation happens between sessions, not during."), UPPER("Second upper exposure this week — research-best volume for growth."), LOWER("Second leg session targets the same muscles with different angles."), ACTIVE_RECOVERY("Easy movement clears DOMS and sets up next week."), REST("Sleep is the cheapest hypertrophy tool.")];
      return [PUSH("Push day kicks off the week. 4 chest/shoulder/triceps movements."), PULL("Balance the push with pull — back doubles need this volume."), LEGS("Hit legs while energy is high, before the second push day."), REST("Rest day mid-week prevents overreaching."), UPPER("Mixed upper session targets everything one more time."), LOWER("Second leg session this week — high volume = growth."), ACTIVE_RECOVERY("Light movement closes the week. Protein high today.")];
    }

    case "fat_loss": {
      const reps = "10-15", rpe = 7, rest = 60, sets: [number, number] = [3, 4];
      const FULL = (whyToday: string) =>
        STRENGTH({ focus: "Full body strength (preserve muscle)", muscles: ["chest", "lats", "quadriceps", "hamstrings", "shoulders"], sets, reps, rpe, restSeconds: rest, cardioMin: 10, whyToday });
      const UPPER = (whyToday: string) =>
        STRENGTH({ focus: "Upper body", muscles: ["chest", "shoulders", "lats", "middle back", "triceps", "biceps"], sets, reps, rpe, restSeconds: rest, cardioMin: 10, whyToday });
      const LOWER = (whyToday: string) =>
        STRENGTH({ focus: "Lower body", muscles: ["quadriceps", "hamstrings", "glutes", "calves"], sets, reps, rpe, restSeconds: rest, cardioMin: 10, whyToday });
      const PUSH = (whyToday: string) =>
        STRENGTH({ focus: "Push day", muscles: ["chest", "shoulders", "triceps"], sets, reps, rpe, restSeconds: rest, whyToday });
      const PULL = (whyToday: string) =>
        STRENGTH({ focus: "Pull day", muscles: ["lats", "middle back", "biceps", "traps"], sets, reps, rpe, restSeconds: rest, whyToday });
      const LEGS = (whyToday: string) =>
        STRENGTH({ focus: "Legs", muscles: ["quadriceps", "hamstrings", "glutes", "calves"], sets, reps, rpe, restSeconds: rest, whyToday });

      if (days <= 3) return [FULL("In a deficit, strength preserves muscle. Train heavy enough to keep what you have."), CARDIO_Z2(30, "Zone 2 burns fat directly + improves recovery between strength days."), FULL("Repeated full-body stimulus while in a deficit keeps the body holding muscle."), CARDIO_Z2(30, "Pair with a high-protein day for best results."), FULL("Third strength session. Don't push intensity if you feel beat — volume matters more than RPE during cuts."), ACTIVE_RECOVERY("25-min walk on a low day still burns 150 calories."), REST("Recovery prevents the cortisol spiral that wrecks fat loss.")];
      if (days === 4) return [UPPER("Open the week with upper body — fresh joints handle higher volume."), LOWER("Lower body in a deficit feels hard — keep loads moderate, reps higher."), CARDIO_Z2(35, "Mid-week cardio drives calorie deficit without crushing recovery."), UPPER("Second upper session this week — muscle preservation wins."), LOWER("Second leg session at higher reps preserves muscle without adding excess fatigue."), CARDIO_Z2(35, "End the week with cardio — easy way to extend the deficit."), REST("Off day. Walk if you want, eat protein.")];
      return [PUSH("Push day. Keep rest under 60s to maintain heart rate."), PULL("Pulling movements + a hint of cardio between sets."), CARDIO_Z2(40, "Standalone cardio day — recover for tomorrow's legs."), LEGS("Legs in a deficit can be brutal — back off if needed, but don't skip."), UPPER("Light upper-body day. Higher reps, less weight."), CARDIO_Z2(40, "Final cardio block of the week — calorie deficit wins long-term."), REST("Hardest week. Rest fully today.")];
    }

    case "maintenance":
    case "wellness": {
      const reps = "8-12", rpe = 7, rest = 90, sets: [number, number] = [3, 3];
      const FULL = (whyToday: string) =>
        STRENGTH({ focus: "Full body — minimum effective dose", muscles: ["chest", "lats", "quadriceps", "hamstrings", "shoulders"], sets, reps, rpe, restSeconds: rest, whyToday });
      const UPPER = (whyToday: string) =>
        STRENGTH({ focus: "Upper body", muscles: ["chest", "shoulders", "lats", "biceps", "triceps"], sets, reps, rpe, restSeconds: rest, whyToday });
      const LOWER = (whyToday: string) =>
        STRENGTH({ focus: "Lower body", muscles: ["quadriceps", "hamstrings", "glutes", "calves"], sets, reps, rpe, restSeconds: rest, whyToday });

      if (days <= 2) return [FULL("Two strength days a week is the floor for staying functional and lean."), REST("Recover. Maintenance isn't a grind."), ACTIVE_RECOVERY("Walk or yoga today."), REST("Easy day."), FULL("Second strength session. Same focus — consistency beats intensity."), REST("Off day."), ACTIVE_RECOVERY("Walk + mobility ends the week.")];
      if (days === 3) return [FULL("Maintenance is about consistency. 3 sessions/week hits everything."), CARDIO_Z2(30, "Zone 2 supports cardiovascular health — pairs well with strength."), FULL("Second exposure. Don't skip — habits compound."), REST("Easy day, fully off."), ACTIVE_RECOVERY("Walk + mobility for stiffness."), FULL("Final strength of the week. Stay strong."), REST("Pat yourself on the back. Show up next week.")];
      return [UPPER("Open the week with upper body."), LOWER("Lower body second day."), CARDIO_Z2(30, "Cardiovascular health matters as much as strength."), REST("Off day mid-week."), UPPER("Second upper exposure — frequency drives maintenance."), LOWER("Hit lower body twice. Glutes and quads will thank you."), ACTIVE_RECOVERY("Light walk closes the week.")];
    }

    case "energy": {
      const reps = "10-15", rpe = 6, rest = 75, sets: [number, number] = [2, 3];
      const FULL = (whyToday: string) =>
        STRENGTH({ focus: "Easy full body", muscles: ["chest", "lats", "quadriceps", "shoulders"], sets, reps, rpe, restSeconds: rest, whyToday });
      return [
        FULL("Light strength to wake the body up without crushing it."),
        CARDIO_Z2(30, "Aerobic base = more day-to-day energy. Don't skip."),
        ACTIVE_RECOVERY("Walk + sun = best mood/energy combo."),
        FULL("Second light strength session. Easy weights, focus on feel."),
        CARDIO_Z2(30, "More aerobic work — energy compounds week-over-week."),
        ACTIVE_RECOVERY("Mobility + a walk."),
        REST("Full rest. Sleep early."),
      ];
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
