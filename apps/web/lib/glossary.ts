/**
 * Glossary of fitness terms used throughout the app.
 * Every abbreviation is paired with its full term + a 1-sentence plain-English explainer.
 * UI uses <Term term="rpe"> to render with a tooltip + expanded form on first use.
 */

export type GlossaryEntry = {
  abbr: string;
  full: string;
  short: string; // 1-sentence explainer
  detail?: string; // longer explainer for /plan footer or info icon
};

export const GLOSSARY: Record<string, GlossaryEntry> = {
  rpe: {
    abbr: "RPE",
    full: "Rate of Perceived Exertion",
    short: "How hard a set felt, on a 1–10 scale. 10 = couldn't do another rep.",
    detail:
      "RPE 6 = warm-up feel · RPE 7 = comfortable, 3 reps left in the tank · RPE 8 = challenging, 2 reps left · RPE 9 = grindy, 1 rep left · RPE 10 = maximum effort. Most working sets should land 7–9.",
  },
  rir: {
    abbr: "RIR",
    full: "Reps in Reserve",
    short: "How many more reps you could have done before failure.",
    detail: "RIR is RPE inverted. RIR 2 ≈ RPE 8. RIR 0 = took the set to failure.",
  },
  "1rm": {
    abbr: "1RM",
    full: "One-Rep Max",
    short: "The heaviest weight you can lift once with good form.",
    detail: "Used to set training intensity. e.g. \"80% of 1RM\" = 80% of that max.",
  },
  zone2: {
    abbr: "Zone 2",
    full: "Zone 2 cardio",
    short: "Conversational-pace cardio. You can talk in full sentences.",
    detail:
      "Heart rate ~60–70% of max. Builds aerobic base and mitochondrial density. Doesn't interfere with strength training. Examples: brisk walk, easy bike, slow jog.",
  },
  hiit: {
    abbr: "HIIT",
    full: "High-Intensity Interval Training",
    short: "Short hard efforts (~20–60s) with rest in between.",
    detail:
      "Example: 8 × (30s hard, 90s easy) on a bike. Time-efficient but more fatiguing than Zone 2.",
  },
  doms: {
    abbr: "DOMS",
    full: "Delayed Onset Muscle Soreness",
    short: "Stiffness 24–72h after a hard or unfamiliar workout. Normal.",
  },
  amrap: {
    abbr: "AMRAP",
    full: "As Many Reps As Possible",
    short: "Do the set until you can't do another rep.",
  },
  hrv: {
    abbr: "HRV",
    full: "Heart Rate Variability",
    short: "Beat-to-beat variation in heart rate, in milliseconds. Higher = better recovered.",
  },
  bpm: {
    abbr: "bpm",
    full: "beats per minute",
    short: "Unit for heart rate.",
  },
  tdee: {
    abbr: "TDEE",
    full: "Total Daily Energy Expenditure",
    short: "How many calories you burn in a day (BMR + activity).",
  },
  bmr: {
    abbr: "BMR",
    full: "Basal Metabolic Rate",
    short: "Calories you'd burn lying still all day.",
  },
  compound: {
    abbr: "Compound",
    full: "Compound movement",
    short: "An exercise that uses multiple joints — bench, squat, deadlift, row.",
  },
  isolation: {
    abbr: "Isolation",
    full: "Isolation movement",
    short: "An exercise that uses one joint — bicep curl, leg extension, lateral raise.",
  },
  neat: {
    abbr: "NEAT",
    full: "Non-Exercise Activity Thermogenesis",
    short: "Calories burned from non-workout movement: walking, fidgeting, chores.",
  },
};

export function getTerm(key: string): GlossaryEntry | undefined {
  return GLOSSARY[key.toLowerCase()];
}
