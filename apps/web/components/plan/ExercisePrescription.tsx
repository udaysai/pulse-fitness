import { Clock, Repeat, Target } from "lucide-react";
import { Term } from "@/components/ui/Term";
import { ACCENT_HEX } from "@/lib/design/accents";

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

export function ExercisePrescription({ exercise: e, index }: { exercise: PrescribedExercise; index: number }) {
  const restLabel =
    e.rest_seconds >= 60 ? `${Math.round(e.rest_seconds / 60)} min rest` : `${e.rest_seconds}s rest`;

  return (
    <details className="group rounded-[var(--radius-card)] border border-hairline bg-surface overflow-hidden">
      <summary className="flex cursor-pointer items-center gap-3 p-3 list-none">
        <span className="metric grid size-7 shrink-0 place-items-center rounded-full bg-canvas text-xs font-semibold text-text-secondary">
          {index + 1}
        </span>
        <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-canvas">
          {e.demo_gif_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.demo_gif_url} alt={`${e.name} demo`} className="size-full object-cover" loading="lazy" />
          ) : (
            <div className="size-full bg-gradient-to-br from-surface-raised to-canvas" />
          )}
        </div>
        <div className="flex flex-1 flex-col min-w-0">
          <p className="truncate text-sm font-semibold">{e.name.replace(/_/g, " ")}</p>
          <p className="text-[10px] uppercase tracking-wider text-text-tertiary truncate">
            {e.primary_muscle}
          </p>
          <p className="metric mt-1 text-xs text-text-secondary">
            {e.sets} × {e.reps} · {restLabel} ·{" "}
            <span title={`Rate of Perceived Exertion: ${e.target_rpe}/10`}>{e.target_rpe}/10 effort</span>
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-text-tertiary group-open:hidden">Details</span>
        <span className="text-[10px] uppercase tracking-wider text-text-tertiary hidden group-open:inline">Close</span>
      </summary>

      <div className="border-t border-hairline px-3 pb-3 pt-3 space-y-3">
        <Section title="Why" body={e.why} accentHex={ACCENT_HEX.workout} />

        <Section title="Form" accentHex={ACCENT_HEX.recovery}>
          <ul className="space-y-1">
            {e.form_cues.map((cue, i) => (
              <li key={i} className="flex gap-2 text-xs text-text-primary">
                <span className="text-text-tertiary">›</span>
                <span>{cue}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Weight to start with" body={e.weight_guidance} accentHex={ACCENT_HEX.energy} />

        <Section title="Programming" accentHex={ACCENT_HEX.nutrition}>
          <ul className="space-y-1 text-xs text-text-primary">
            <li className="flex items-center gap-2">
              <Repeat className="size-3 text-text-tertiary" />
              <span>
                <strong>{e.sets} sets</strong> of <strong>{e.reps} reps</strong>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Clock className="size-3 text-text-tertiary" />
              <span>
                <strong>{restLabel}</strong> between sets
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Target className="size-3 text-text-tertiary" />
              <span>
                Last rep should feel <strong>{e.target_rpe}/10</strong> hard (
                <Term term="rpe" variant="first" />)
              </span>
            </li>
          </ul>
        </Section>

        {e.variants.length > 0 && (
          <Section title="No equipment? Variants" accentHex={ACCENT_HEX.sleep}>
            <p className="text-xs text-text-secondary">
              {e.variants.map((v) => v.replace(/_/g, " ")).join(" · ")}
            </p>
          </Section>
        )}
      </div>
    </details>
  );
}

function Section({
  title,
  body,
  children,
  accentHex,
}: {
  title: string;
  body?: string;
  children?: React.ReactNode;
  accentHex: string;
}) {
  return (
    <div>
      <p
        className="mb-1 text-[10px] uppercase tracking-wider"
        style={{ color: accentHex }}
      >
        {title}
      </p>
      {body && <p className="text-xs text-text-primary leading-relaxed">{body}</p>}
      {children}
    </div>
  );
}
