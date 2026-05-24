/**
 * Hand-curated prescriptive metadata for the most common exercises.
 * The free-exercise-db catalog (873 rows) gives us GIFs + names; this layer
 * adds research-grounded coaching detail: why, form cues, weight guidance, variants.
 *
 * Fallback for un-curated exercises uses the generic templates at the bottom.
 */

export type ExerciseMetadata = {
  why: string;
  formCues: string[];
  weightGuidance: string;
  variants?: string[]; // exercise IDs in the catalog
};

const META: Record<string, ExerciseMetadata> = {
  // ──────── CHEST ────────
  Barbell_Bench_Press: {
    why: "The most efficient compound for chest mass. High loadability lets you progressively overload week after week.",
    formCues: [
      "Bar lands at lower-chest, not throat",
      "Drive the bar in a straight line up; don't let it drift forward",
      "Feet flat, shoulder blades pulled back and down",
    ],
    weightGuidance: "Start at a weight where rep 8 feels like a hard 8/10 effort. Add 2.5kg when you hit the top of the rep range for all sets.",
    variants: ["Incline_Dumbbell_Press", "Dumbbell_Bench_Press", "Push_Ups"],
  },
  Incline_Dumbbell_Press: {
    why: "Targets the upper chest fibers more than flat bench. Dumbbells let each side move independently — corrects asymmetries.",
    formCues: [
      "Bench at 30° angle (steeper hits front delts instead)",
      "Dumbbells start at upper-chest level, press straight up",
      "Don't slam them together at the top",
    ],
    weightGuidance: "Pick dumbbells where rep 10 is hard. Increase the dumbbells one size (usually 2 kg) when you hit 12 reps for all sets.",
  },
  Push_Ups: {
    why: "Free, scalable, builds chest and triceps. Excellent for warm-up or finishers.",
    formCues: [
      "Body in a straight line from head to heels",
      "Lower chest to within 2 cm of the floor",
      "Elbows ~45° from torso (not flared out)",
    ],
    weightGuidance: "Bodyweight. If 15+ reps feel easy, elevate your feet or add a weight plate on your back.",
  },

  // ──────── BACK ────────
  Bent_Over_Barbell_Row: {
    why: "The bench press of back work. Builds the entire posterior chain — lats, rhomboids, rear delts, spinal erectors.",
    formCues: [
      "Hinge at the hips, torso ~45°",
      "Pull bar to lower chest, squeeze shoulder blades together",
      "Keep lower back flat — never round",
    ],
    weightGuidance: "Use about 60–70% of what you bench press. Form first; if your back rounds, drop the weight.",
    variants: ["One-Arm_Dumbbell_Row", "Pendlay_Row", "T-Bar_Row"],
  },
  Pullups: {
    why: "Best lat builder there is. Builds grip and upper back density.",
    formCues: [
      "Start from a dead hang, arms fully extended",
      "Pull chest to bar, not chin",
      "Squeeze lats at the top, don't shrug",
    ],
    weightGuidance: "Bodyweight. If you can't do 5 yet, use a band or assisted pull-up machine. Add weight via a dip belt once you can hit 12 strict reps.",
    variants: ["Chin_Up", "Lat_Pulldown"],
  },
  Conventional_Deadlift: {
    why: "Most full-body strength per unit time. Builds posterior chain, grip, and core like nothing else.",
    formCues: [
      "Bar over mid-foot at start, almost touching shins",
      "Hips lower than shoulders, chest up",
      "Push the floor away — don't yank the bar",
    ],
    weightGuidance: "Start at a weight where 5 reps is challenging but every rep looks the same. Add 2.5–5kg per week if form holds.",
    variants: ["Romanian_Deadlift", "Sumo_Deadlift", "Trap_Bar_Deadlift"],
  },

  // ──────── LEGS ────────
  Barbell_Squat: {
    why: "King of leg exercises. Largest muscle activation in the lower body, plus serious core demand.",
    formCues: [
      "Bar high on traps (not on neck)",
      "Knees track over toes — don't cave inward",
      "Descend until thighs are at least parallel to floor",
    ],
    weightGuidance: "Pick a weight where rep 5 feels hard. Add 2.5kg per week as long as depth + form hold.",
    variants: ["Barbell_Front_Squat", "Goblet_Squat", "Hack_Squat"],
  },
  Romanian_Deadlift: {
    why: "Best hamstring builder. Lower injury risk than conventional deadlift, easy to progress.",
    formCues: [
      "Slight knee bend, soft knees throughout",
      "Hinge from the hips, push your butt back",
      "Stop when you feel a big stretch in your hamstrings — usually mid-shin",
    ],
    weightGuidance: "Use about 50–60% of your conventional deadlift. The stretch matters more than the weight.",
  },

  // ──────── SHOULDERS ────────
  Standing_Military_Press: {
    why: "Overhead pressing strength carries over to everything. Builds delts and core stability.",
    formCues: [
      "Bar starts at upper chest, elbows in front of bar",
      "Press straight up, head moves forward under the bar at lockout",
      "Glutes and abs tight — don't lean back",
    ],
    weightGuidance: "Start at about 60–65% of your bench. Add 1–2kg/week (smaller jumps than bigger lifts).",
    variants: ["Seated_Barbell_Press", "Dumbbell_Shoulder_Press", "Push_Press"],
  },

  // ──────── ARMS ────────
  Barbell_Curl: {
    why: "Simple, high tension on the biceps. Easy to progressively overload.",
    formCues: [
      "Elbows pinned to your sides",
      "Don't swing — use your biceps, not your hips",
      "Squeeze hard at the top, 1-second pause",
    ],
    weightGuidance: "Pick a weight where rep 10 is hard. Curls are isolation — keep them strict.",
  },
  Triceps_Pushdown: {
    why: "Targets the long head of the triceps, which gives the arm its 'horseshoe' look.",
    formCues: [
      "Elbows glued to sides — only forearms move",
      "Full extension at the bottom, slight pause",
      "Control the negative — 2 second up",
    ],
    weightGuidance: "Pick a weight where you can complete 12 strict reps without flaring elbows.",
  },
};

// Generic fallback by muscle group
const FALLBACK_BY_MUSCLE: Record<string, ExerciseMetadata> = {
  chest: {
    why: "Adds direct volume to the chest, complementing your main pressing lift.",
    formCues: ["Full range of motion", "Control the negative (lowering phase)", "Squeeze the chest at the top"],
    weightGuidance: "Pick a weight where the last 2 reps of each set are hard but doable.",
  },
  lats: {
    why: "Builds the back width that creates a V-taper. Most lifters under-train this.",
    formCues: ["Initiate the pull with your shoulder blades, not your biceps", "Full stretch at the top", "Squeeze in the bottom position"],
    weightGuidance: "Pick a weight where rep 10 feels challenging with strict form.",
  },
  "middle back": {
    why: "Targets rhomboids and mid-traps — fixes posture and adds back thickness.",
    formCues: ["Squeeze shoulder blades together at the top", "Don't shrug", "Slow eccentric"],
    weightGuidance: "Form over weight here. Most people use too much.",
  },
  quadriceps: {
    why: "Direct quad volume helps build size and protect your knees.",
    formCues: ["Full depth or full range", "Control through the bottom", "Drive through your heel"],
    weightGuidance: "Start moderate; quads tolerate volume well — focus on tempo over weight.",
  },
  hamstrings: {
    why: "Strong hamstrings prevent ACL injuries and improve sprint speed.",
    formCues: ["Slow eccentric (3 sec down)", "Feel the stretch", "Don't bounce out of the bottom"],
    weightGuidance: "Hamstrings respond to tempo. Half the weight, double the slowness on the lowering.",
  },
  glutes: {
    why: "Largest muscle in the body. Strong glutes = stable hips, better lifts everywhere.",
    formCues: ["Squeeze glutes at the top, 1-second hold", "Push through mid-foot/heel, not toes", "Keep core braced"],
    weightGuidance: "Glutes love volume. 3–4 sets of 12–15 reps work well.",
  },
  shoulders: {
    why: "Side delts give shoulders their width. Most people need more volume here.",
    formCues: ["Lead with the elbow, not the hand", "Stop at shoulder height — no higher", "Slow eccentric"],
    weightGuidance: "Side delts respond to light weight, high reps. 12–20 reps is the sweet spot.",
  },
  triceps: {
    why: "Triceps are 2/3 of your arm. Direct work makes a noticeable difference.",
    formCues: ["Elbows pinned, don't flare", "Full lockout at the bottom or top", "Slow eccentric"],
    weightGuidance: "Triceps prefer moderate weight, strict form, 8–15 rep range.",
  },
  biceps: {
    why: "Hypertrophy responds to direct work. Even with lots of pulling, isolation helps.",
    formCues: ["No swing — strict form", "Full stretch at the bottom", "Squeeze at the top"],
    weightGuidance: "Light enough to keep strict form. Form > ego here.",
  },
  calves: {
    why: "Stubborn but trainable. Need high volume and frequency.",
    formCues: ["Full stretch at the bottom", "Hold the top contraction for 1 second", "Don't bounce"],
    weightGuidance: "Train calves 2–3 times a week with high reps (15–25). Volume is the secret.",
  },
  abdominals: {
    why: "Core stability transfers to every other lift and protects your spine.",
    formCues: ["Brace, don't suck in", "Slow controlled reps", "Quality over quantity"],
    weightGuidance: "Bodyweight is fine. Add weight when 15+ reps feel easy.",
  },
  "lower back": {
    why: "A strong lower back prevents 80% of gym injuries.",
    formCues: ["Brace your core throughout", "Slow controlled movement", "Stop short of failure"],
    weightGuidance: "Conservative weights. Form is non-negotiable.",
  },
  traps: {
    why: "Builds the yoke. Carries over to deadlift lockout and shoulder stability.",
    formCues: ["Straight up shrug, no rolling", "Pause at the top, 1-second hold", "Don't bend your elbows"],
    weightGuidance: "Heavy is fine for shrugs. Light + slow for face pulls.",
  },
};

export function getExerciseMetadata(exerciseId: string, primaryMuscle: string): ExerciseMetadata {
  return (
    META[exerciseId] ??
    FALLBACK_BY_MUSCLE[primaryMuscle.toLowerCase()] ?? {
      why: "Builds capacity in the targeted muscle group.",
      formCues: ["Full range of motion", "Control the lowering phase", "Stop 1–2 reps short of failure"],
      weightGuidance: "Pick a weight where the last 2 reps are hard but you don't break form.",
    }
  );
}
