import Link from "next/link";
import { CalendarDays, Clock, Coffee, Dumbbell, Heart, PlayCircle, Wind } from "lucide-react";
import { ExercisePrescription, type PrescribedExercise } from "./ExercisePrescription";
import { Term } from "@/components/ui/Term";
import { ACCENT_HEX } from "@/lib/design/accents";

export type DailyPlan = {
  date: string;
  day_name: string;
  type: "strength" | "cardio_zone2" | "cardio_hiit" | "active_recovery" | "rest";
  focus: string;
  why_today: string;
  duration_minutes: number;
  warmup: { minutes: number; instructions: string[] } | null;
  exercises: PrescribedExercise[];
  cardio: { minutes: number; mode: string; intensity: string; why: string } | null;
  cooldown: { minutes: number; instructions: string[] } | null;
  notes: string;
};

export function DayCard({
  plan,
  isToday,
  defaultOpen = false,
}: {
  plan: DailyPlan;
  isToday: boolean;
  defaultOpen?: boolean;
}) {
  const accent = accentForType(plan.type);
  const Icon = iconForType(plan.type);
  const date = new Date(plan.date);
  const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <details
      open={defaultOpen}
      className="group rounded-[var(--radius-card)] border bg-surface overflow-hidden"
      style={{ borderColor: isToday ? accent : "var(--color-hairline)" }}
    >
      <summary className="flex cursor-pointer items-center gap-3 p-4 list-none">
        <div
          className="grid size-10 shrink-0 place-items-center rounded-xl"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          <Icon className="size-5" />
        </div>
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{plan.day_name}</p>
            {isToday && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white"
                style={{ backgroundColor: accent }}
              >
                Today
              </span>
            )}
            <span className="text-[11px] text-text-tertiary">{dateLabel}</span>
          </div>
          <p className="truncate text-xs text-text-secondary">{plan.focus}</p>
        </div>
        {plan.duration_minutes > 0 && (
          <span className="metric flex items-center gap-1 text-xs text-text-tertiary">
            <Clock className="size-3" />
            {plan.duration_minutes} min
          </span>
        )}
      </summary>

      <div className="space-y-5 border-t border-hairline px-4 py-4">
        {/* Why today */}
        <Block icon={CalendarDays} label="Why today" accent={accent}>
          <p className="text-sm text-text-primary leading-relaxed">{plan.why_today}</p>
        </Block>

        {/* Rest day */}
        {plan.type === "rest" && (
          <Block icon={Coffee} label="What to do" accent={accent}>
            <p className="text-sm leading-relaxed">{plan.notes}</p>
          </Block>
        )}

        {/* Warm-up */}
        {plan.warmup && (
          <Block icon={Wind} label={`Warm-up · ${plan.warmup.minutes} min`} accent={ACCENT_HEX.recovery}>
            <ul className="space-y-1">
              {plan.warmup.instructions.map((line, i) => (
                <li key={i} className="flex gap-2 text-sm text-text-primary">
                  <span className="text-text-tertiary">·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {/* Strength block */}
        {plan.exercises.length > 0 && (
          <Block icon={Dumbbell} label="Strength block" accent={accent}>
            <Link
              href={`/session/${plan.date}`}
              className="mb-3 flex items-center justify-center gap-2 rounded-[var(--radius-card)] px-5 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              <PlayCircle className="size-4" /> Start session
            </Link>
            <div className="flex flex-col gap-2">
              {plan.exercises.map((ex, i) => (
                <ExercisePrescription key={ex.exercise_id} exercise={ex} index={i} />
              ))}
            </div>
          </Block>
        )}

        {/* Cardio */}
        {plan.cardio && (
          <Block icon={Heart} label={`Cardio · ${plan.cardio.minutes} min`} accent={ACCENT_HEX.workout}>
            <div className="rounded-[var(--radius-card)] bg-canvas p-3 space-y-2 text-sm">
              <p>
                <span className="text-text-tertiary">Mode: </span>
                <span>{plan.cardio.mode}</span>
              </p>
              <p>
                <span className="text-text-tertiary">Intensity: </span>
                <span>{plan.cardio.intensity}</span>
              </p>
              <p className="text-xs text-text-secondary leading-relaxed">
                <span className="text-text-tertiary">Why: </span>
                {plan.cardio.why}
              </p>
            </div>
          </Block>
        )}

        {/* Cooldown */}
        {plan.cooldown && (
          <Block icon={Wind} label={`Cooldown · ${plan.cooldown.minutes} min`} accent={ACCENT_HEX.recovery}>
            <ul className="space-y-1">
              {plan.cooldown.instructions.map((line, i) => (
                <li key={i} className="flex gap-2 text-sm text-text-primary">
                  <span className="text-text-tertiary">·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {/* Coach notes */}
        {plan.notes && plan.type !== "rest" && (
          <p className="rounded-[var(--radius-card)] border border-hairline bg-canvas p-3 text-xs text-text-secondary leading-relaxed">
            <strong className="text-text-primary">Coach note: </strong>{plan.notes}
          </p>
        )}
      </div>
    </details>
  );
}

function Block({
  icon: Icon,
  label,
  accent,
  children,
}: {
  icon: typeof CalendarDays;
  label: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className="size-3" style={{ color: accent }} strokeWidth={2.5} />
        <span className="text-[10px] uppercase tracking-wider" style={{ color: accent }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function accentForType(type: DailyPlan["type"]): string {
  switch (type) {
    case "strength": return ACCENT_HEX.workout;
    case "cardio_zone2":
    case "cardio_hiit": return ACCENT_HEX.energy;
    case "active_recovery": return ACCENT_HEX.recovery;
    case "rest": return ACCENT_HEX.sleep;
  }
}

function iconForType(type: DailyPlan["type"]) {
  switch (type) {
    case "strength": return Dumbbell;
    case "cardio_zone2":
    case "cardio_hiit": return Heart;
    case "active_recovery": return Wind;
    case "rest": return Coffee;
  }
}
