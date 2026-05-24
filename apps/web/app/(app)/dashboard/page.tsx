import { MetricCard } from "@/components/ui/MetricCard";
import { RingProgress } from "@/components/ui/RingProgress";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ExerciseCard } from "@/components/ui/ExerciseCard";

// Mock data — replaced by real DB reads in Week 2
const mock = {
  user: { name: "Uday" },
  rings: { move: 0.72, train: 0.45, recover: 0.88 },
  metrics: [
    { label: "Steps", value: 8421, unit: "", accent: "workout" as const, trend: 0.12 },
    { label: "Resting HR", value: 58, unit: "bpm", accent: "recovery" as const, trend: -0.04 },
    { label: "Sleep", value: "7h 24m", accent: "sleep" as const, trend: 0.08 },
    { label: "HRV", value: 64, unit: "ms", accent: "recovery" as const, trend: 0.15 },
  ],
  todayPlan: {
    focus: "Push Day — Chest & Triceps",
    exercises: [
      { name: "Barbell Bench Press", primaryMuscle: "Chest", sets: 4, reps: "6-8" },
      { name: "Incline Dumbbell Press", primaryMuscle: "Chest", sets: 3, reps: "8-10" },
      { name: "Overhead Press", primaryMuscle: "Shoulders", sets: 3, reps: "8-10" },
      { name: "Tricep Pushdown", primaryMuscle: "Triceps", sets: 3, reps: "10-12" },
    ],
  },
};

export default function DashboardPage() {
  const greeting = greetingForHour(new Date().getHours());

  return (
    <div className="halo mx-auto max-w-md px-5 pt-8" style={{ ["--halo-color" as string]: "#e85d4a" }}>
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-text-tertiary">{formatDate()}</p>
          <h1 className="text-2xl font-semibold">
            {greeting}, {mock.user.name}
          </h1>
        </div>
      </header>

      {/* Hero rings */}
      <div className="mb-8 flex justify-center">
        <RingProgress progress={mock.rings.move} accent="workout" size={200} strokeWidth={14}>
          <div className="flex flex-col items-center">
            <span className="metric text-4xl font-semibold">{Math.round(mock.rings.move * 100)}%</span>
            <span className="text-[11px] uppercase tracking-wider text-text-tertiary">Today's load</span>
          </div>
        </RingProgress>
      </div>

      {/* Mini rings row */}
      <div className="mb-8 flex items-center justify-center gap-6">
        <SmallRing label="Move" progress={mock.rings.move} accent="workout" />
        <SmallRing label="Train" progress={mock.rings.train} accent="nutrition" />
        <SmallRing label="Recover" progress={mock.rings.recover} accent="recovery" />
      </div>

      {/* Metric grid */}
      <section className="mb-8 grid grid-cols-2 gap-3">
        {mock.metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </section>

      {/* Today's plan */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Today's plan</h2>
          <span className="text-[11px] uppercase tracking-wider text-text-tertiary">~45 min</span>
        </div>
        <div className="mb-3 rounded-[var(--radius-card)] border border-hairline bg-surface p-4">
          <p className="text-sm font-semibold">{mock.todayPlan.focus}</p>
          <p className="mt-1 text-xs text-text-secondary">
            Personalized based on your last 7 days of training + recovery.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {mock.todayPlan.exercises.map((ex) => (
            <ExerciseCard key={ex.name} {...ex} />
          ))}
        </div>
        <div className="mt-4">
          <PrimaryButton accent="workout" className="w-full">
            Start workout
          </PrimaryButton>
        </div>
      </section>
    </div>
  );
}

function SmallRing({
  label,
  progress,
  accent,
}: {
  label: string;
  progress: number;
  accent: "workout" | "nutrition" | "recovery" | "sleep" | "energy";
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <RingProgress progress={progress} accent={accent} size={64} strokeWidth={6}>
        <span className="metric text-xs font-semibold">{Math.round(progress * 100)}</span>
      </RingProgress>
      <span className="text-[10px] uppercase tracking-wider text-text-tertiary">{label}</span>
    </div>
  );
}

function greetingForHour(h: number) {
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Good night";
}

function formatDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}
