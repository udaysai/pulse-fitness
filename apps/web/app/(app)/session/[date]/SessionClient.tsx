"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Plus, X, Save, Sparkles, Repeat2, Settings2, PlusCircle } from "lucide-react";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ExerciseDemo } from "@/components/training/ExerciseDemo";
import { PlateCalculator } from "@/components/training/PlateCalculator";
import { RestTimer } from "@/components/training/RestTimer";
import { ExerciseSwapModal, type SwapCandidate } from "@/components/training/ExerciseSwapModal";
import { ACCENT_HEX } from "@/lib/design/accents";
import { cn } from "@/lib/utils";
import { estimate1RM, fmtKg, topSet } from "@/lib/training";

type LastTime = {
  date: string;
  sets: Array<{ reps: number | null; weight_kg: number | null; rir: number | null }>;
  top_set: { reps: number | null; weight_kg: number | null; estimated_1rm: number } | null;
} | null;

type EnrichedExercise = {
  exercise_id: string;
  name: string;
  primary_muscle: string;
  demo_gif_url: string | null;
  target_sets: number;
  target_reps: string;
  rest_seconds: number;
  target_rpe: number;
  why: string;
  form_cues: string[];
  weight_guidance: string;
  last_time: LastTime;
};

type SetState = { reps: string; weight_kg: string; rir: string; done: boolean };
type ExerciseState = {
  exercise: EnrichedExercise;
  sets: SetState[];
  rest_seconds: number;
};

type Props = {
  date: string;
  plan: {
    day_name: string;
    focus: string;
    why_today: string;
    duration_minutes: number;
  };
  enrichedExercises: EnrichedExercise[];
};

export default function SessionClient({ date, plan, enrichedExercises }: Props) {
  const router = useRouter();
  const startedAtRef = useRef(new Date().toISOString());
  const [state, setState] = useState<ExerciseState[]>(() =>
    enrichedExercises.map((e) => initialStateFor(e)),
  );
  const [activeRest, setActiveRest] = useState<{ seconds: number; key: number } | null>(null);
  const [rpe, setRpe] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [swapIdx, setSwapIdx] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Totals
  const totals = useMemo(() => {
    let sets = 0, volume = 0;
    const all: Array<{ reps: number; weight_kg: number }> = [];
    for (const s of state) {
      for (const x of s.sets) {
        const reps = Number(x.reps) || 0;
        const w = Number(x.weight_kg) || 0;
        if (reps > 0 || w > 0) {
          sets++;
          volume += reps * w;
          if (reps > 0 && w > 0) all.push({ reps, weight_kg: w });
        }
      }
    }
    const best = topSet(all);
    return {
      sets,
      volume: Math.round(volume),
      best_1rm: best ? Math.round(estimate1RM(best.weight_kg, best.reps)) : 0,
    };
  }, [state]);

  const completionPct = useMemo(() => {
    const total = state.reduce((s, e) => s + e.sets.length, 0);
    const done = state.reduce((s, e) => s + e.sets.filter((x) => x.done).length, 0);
    return total > 0 ? done / total : 0;
  }, [state]);

  function updateSet(exIdx: number, setIdx: number, patch: Partial<SetState>) {
    setState((p) => {
      const next = [...p];
      const sets = [...next[exIdx].sets];
      sets[setIdx] = { ...sets[setIdx], ...patch };
      next[exIdx] = { ...next[exIdx], sets };
      return next;
    });
  }

  function addSet(exIdx: number) {
    setState((p) => {
      const next = [...p];
      const last = next[exIdx].sets[next[exIdx].sets.length - 1];
      next[exIdx] = {
        ...next[exIdx],
        sets: [...next[exIdx].sets, { reps: last?.reps ?? "", weight_kg: last?.weight_kg ?? "", rir: "", done: false }],
      };
      return next;
    });
  }

  function removeSet(exIdx: number, setIdx: number) {
    setState((p) => {
      const next = [...p];
      next[exIdx] = { ...next[exIdx], sets: next[exIdx].sets.filter((_, i) => i !== setIdx) };
      return next;
    });
  }

  function markDone(exIdx: number, setIdx: number) {
    updateSet(exIdx, setIdx, { done: true });
    setActiveRest({ seconds: state[exIdx].rest_seconds, key: Date.now() });
    try { navigator.vibrate?.(30); } catch {}
  }

  async function removeExercise(exIdx: number) {
    if (!confirm("Remove this exercise from today's session and your plan?")) return;
    // Optimistically remove locally
    setState((p) => p.filter((_, i) => i !== exIdx));
    // Persist to plan
    await fetch(`/api/plans/daily/${date}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", exercise_index: exIdx }),
    }).catch(() => undefined);
  }

  async function addExercise(candidate: SwapCandidate) {
    const enriched: EnrichedExercise = {
      exercise_id: candidate.id,
      name: candidate.name,
      primary_muscle: candidate.primary_muscle,
      demo_gif_url: candidate.demo_gif_url,
      target_sets: 3,
      target_reps: "8-12",
      rest_seconds: 90,
      target_rpe: 8,
      why: "",
      form_cues: [],
      weight_guidance: "",
      last_time: null,
    };
    try {
      const r = await fetch(`/api/exercises/${candidate.id}/history`);
      if (r.ok) enriched.last_time = (await r.json()).last;
    } catch {}
    setState((p) => [...p, initialStateFor(enriched)]);
    // Persist to the plan so it stays added on refresh
    fetch(`/api/plans/daily/${date}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        add_exercise: {
          exercise_id: candidate.id,
          sets: 3,
          reps: "8-12",
          rest_seconds: 90,
          target_rpe: 8,
        },
      }),
    }).catch(() => undefined);
  }

  async function swapExercise(exIdx: number, candidate: SwapCandidate) {
    const newEnriched: EnrichedExercise = {
      exercise_id: candidate.id,
      name: candidate.name,
      primary_muscle: candidate.primary_muscle,
      demo_gif_url: candidate.demo_gif_url,
      target_sets: state[exIdx].exercise.target_sets,
      target_reps: state[exIdx].exercise.target_reps,
      rest_seconds: state[exIdx].rest_seconds,
      target_rpe: state[exIdx].exercise.target_rpe,
      why: "",
      form_cues: [],
      weight_guidance: "",
      last_time: null,
    };
    // Fetch last-time for the new exercise
    try {
      const r = await fetch(`/api/exercises/${candidate.id}/history`);
      if (r.ok) newEnriched.last_time = (await r.json()).last;
    } catch {}
    setState((p) => {
      const next = [...p];
      next[exIdx] = initialStateFor(newEnriched);
      return next;
    });
    // Persist
    fetch(`/api/plans/daily/${date}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "swap", exercise_index: exIdx, new_exercise_id: candidate.id }),
    }).catch(() => undefined);
  }

  async function finish() {
    const body = {
      kind: plan.focus,
      started_at: startedAtRef.current,
      ended_at: new Date().toISOString(),
      rpe: rpe ? Number(rpe) : undefined,
      notes: notes || undefined,
      exercises: state
        .map((s) => ({
          exercise_id: s.exercise.exercise_id,
          sets: s.sets
            .filter((x) => x.reps || x.weight_kg)
            .map((x) => ({
              reps: x.reps ? Number(x.reps) : undefined,
              weight_kg: x.weight_kg ? Number(x.weight_kg) : undefined,
              rir: x.rir ? Number(x.rir) : undefined,
            })),
        }))
        .filter((e) => e.sets.length > 0),
    };
    if (body.exercises.length === 0) {
      alert("Log at least one set first.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(j.error ?? "Save failed");
        setSaving(false);
        return;
      }
      router.push("/workouts");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md pb-32">
      {/* Header */}
      <div className="px-5 pt-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-text-secondary">
          <ArrowLeft className="size-3" /> Back
        </Link>
        <p className="mt-3 text-[11px] uppercase tracking-wider text-text-tertiary">
          {plan.day_name} · {prettyDate(date)}
        </p>
        <h1 className="text-2xl font-semibold">{plan.focus}</h1>
        <p className="mt-1 text-xs text-text-secondary">{plan.why_today}</p>
      </div>

      {/* Progress + totals */}
      <div className="mx-5 mt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
          <div className="h-full rounded-full bg-workout transition-[width]" style={{ width: `${completionPct * 100}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-[var(--radius-card)] border border-hairline bg-surface p-3 text-center">
          <Stat label="Sets" value={`${totals.sets}`} />
          <Stat label="Volume" value={`${fmtKg(totals.volume)} kg`} />
          <Stat label="Est top 1RM" value={totals.best_1rm ? `${totals.best_1rm} kg` : "—"} />
        </div>
      </div>

      {/* Exercises */}
      <div className="space-y-6 px-5 pt-6">
        {state.map((s, exIdx) => (
          <SessionExerciseCard
            key={`${s.exercise.exercise_id}-${exIdx}`}
            state={s}
            exIdx={exIdx}
            onUpdateSet={updateSet}
            onAddSet={() => addSet(exIdx)}
            onRemoveSet={(sIdx) => removeSet(exIdx, sIdx)}
            onMarkDone={(sIdx) => markDone(exIdx, sIdx)}
            onSwap={() => setSwapIdx(exIdx)}
            onRemove={() => removeExercise(exIdx)}
            onRestChange={(secs) =>
              setState((p) => {
                const next = [...p];
                next[exIdx] = { ...next[exIdx], rest_seconds: secs };
                return next;
              })
            }
          />
        ))}
      </div>

      {/* Add exercise on the fly */}
      <div className="px-5 pt-4">
        <button
          onClick={() => setAddOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-hairline bg-transparent px-5 py-3 text-sm text-text-secondary hover:border-workout hover:text-workout transition-colors"
        >
          <PlusCircle className="size-4" /> Add exercise to this session
        </button>
      </div>

      {/* Wrap-up + finish */}
      <div className="space-y-3 px-5 pt-6">
        <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-3">
          <label className="block mb-3">
            <span className="text-[10px] uppercase tracking-wider text-text-tertiary">Overall effort (1–10)</span>
            <input
              type="number"
              inputMode="decimal"
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              placeholder="7"
              className="metric mt-1 w-20 rounded-md border border-hairline bg-canvas px-2 py-1.5 text-sm outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-text-tertiary">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="How did it feel?"
              className="mt-1 w-full rounded-lg border border-hairline bg-canvas px-3 py-2 text-sm outline-none resize-none"
            />
          </label>
        </div>

        <PrimaryButton accent="workout" className="w-full" onClick={finish} disabled={saving || state.length === 0}>
          <Save className="size-4" /> {saving ? "Saving…" : "Finish session"}
        </PrimaryButton>
      </div>

      {/* Floating rest timer */}
      {activeRest && (
        <RestTimer
          key={activeRest.key}
          initialSeconds={activeRest.seconds}
          onDismiss={() => setActiveRest(null)}
          onComplete={() => setTimeout(() => setActiveRest(null), 3000)}
        />
      )}

      {/* Swap modal */}
      {swapIdx !== null && (
        <ExerciseSwapModal
          open
          currentExerciseId={state[swapIdx].exercise.exercise_id}
          currentMuscle={state[swapIdx].exercise.primary_muscle}
          onClose={() => setSwapIdx(null)}
          onPick={(c) => swapExercise(swapIdx, c)}
        />
      )}

      {/* Add exercise modal — reuses the swap UI with no current exercise */}
      {addOpen && (
        <ExerciseSwapModal
          open
          currentExerciseId=""
          onClose={() => setAddOpen(false)}
          onPick={(c) => addExercise(c)}
        />
      )}
    </div>
  );
}

function initialStateFor(e: EnrichedExercise): ExerciseState {
  const last = e.last_time;
  // Pre-fill each prescribed set with last-time values when available
  const sets: SetState[] = Array.from({ length: e.target_sets }, (_, i) => {
    const lastSet = last?.sets?.[i] ?? last?.sets?.[0];
    return {
      reps: lastSet?.reps?.toString() ?? "",
      weight_kg: lastSet?.weight_kg?.toString() ?? "",
      rir: "",
      done: false,
    };
  });
  return { exercise: e, sets, rest_seconds: e.rest_seconds };
}

function SessionExerciseCard({
  state: s,
  exIdx,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onMarkDone,
  onSwap,
  onRemove,
  onRestChange,
}: {
  state: ExerciseState;
  exIdx: number;
  onUpdateSet: (exIdx: number, setIdx: number, patch: Partial<SetState>) => void;
  onAddSet: () => void;
  onRemoveSet: (setIdx: number) => void;
  onMarkDone: (setIdx: number) => void;
  onSwap: () => void;
  onRemove: () => void;
  onRestChange: (secs: number) => void;
}) {
  const last = s.exercise.last_time;
  const lastDate = last?.date ? new Date(last.date) : null;
  const daysAgo = lastDate ? Math.floor((Date.now() - lastDate.getTime()) / 86400000) : null;

  return (
    <article className="space-y-3">
      {/* Big GIF + name + actions */}
      <div className="space-y-3">
        <ExerciseDemo size="hero" src={s.exercise.demo_gif_url} alt={s.exercise.name} />

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
              Exercise {exIdx + 1} · {s.exercise.primary_muscle}
            </p>
            <h2 className="text-lg font-semibold leading-tight">{s.exercise.name.replace(/_/g, " ")}</h2>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button onClick={onSwap} aria-label="Swap exercise" className="grid size-8 place-items-center rounded-md border border-hairline text-text-secondary hover:text-text-primary" title="Swap exercise">
              <Repeat2 className="size-4" />
            </button>
            <button onClick={onRemove} aria-label="Remove" className="grid size-8 place-items-center rounded-md border border-hairline text-text-secondary hover:text-danger" title="Remove">
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Why / form cues / weight guidance — collapsible */}
      {(s.exercise.why || s.exercise.form_cues.length > 0 || s.exercise.weight_guidance) && (
        <details className="rounded-[var(--radius-card)] border border-hairline bg-surface">
          <summary className="flex cursor-pointer items-center gap-1.5 p-3 text-[11px] uppercase tracking-wider text-text-secondary list-none">
            <Settings2 className="size-3" />
            <span>Form & technique</span>
          </summary>
          <div className="space-y-3 border-t border-hairline px-3 pb-3 pt-3 text-xs">
            {s.exercise.why && <Block label="Why" body={s.exercise.why} accent={ACCENT_HEX.workout} />}
            {s.exercise.form_cues.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: ACCENT_HEX.recovery }}>Form</p>
                <ul className="space-y-0.5">
                  {s.exercise.form_cues.map((c, i) => (
                    <li key={i} className="flex gap-2 text-text-primary">
                      <span className="text-text-tertiary">›</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {s.exercise.weight_guidance && (
              <Block label="Weight to start" body={s.exercise.weight_guidance} accent={ACCENT_HEX.energy} />
            )}
          </div>
        </details>
      )}

      {/* Last time reference */}
      {last && last.top_set && (
        <div className="flex items-center gap-1.5 rounded-md bg-canvas px-3 py-2">
          <Sparkles className="size-3 text-energy" />
          <p className="text-[11px] text-text-secondary">
            <span className="text-text-tertiary">Last time </span>
            {daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`}
            <span className="text-text-tertiary"> · top set </span>
            <span className="metric text-text-primary">
              {last.top_set.reps} × {last.top_set.weight_kg} kg
            </span>
            {last.top_set.estimated_1rm > 0 && (
              <span className="text-text-tertiary"> · est 1RM {Math.round(last.top_set.estimated_1rm)} kg</span>
            )}
          </p>
        </div>
      )}

      {/* Prescribed sets — pre-filled */}
      <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-3">
        <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-text-tertiary">
          <span>Target: {s.exercise.target_sets} × {s.exercise.target_reps} · effort {s.exercise.target_rpe}/10</span>
          <div className="flex items-center gap-1">
            <span>Rest</span>
            {[60, 90, 120, 180].map((sec) => (
              <button
                key={sec}
                onClick={() => onRestChange(sec)}
                className={cn(
                  "rounded px-1.5 py-0.5",
                  s.rest_seconds === sec ? "bg-workout text-white" : "hover:text-text-primary",
                )}
              >
                {sec < 60 ? `${sec}s` : `${Math.round(sec / 60)}m`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[22px_1fr_1fr_36px_36px_22px] items-center gap-2 px-1 text-[10px] uppercase tracking-wider text-text-tertiary">
          <span>#</span>
          <span>Reps</span>
          <span>Kg</span>
          <span>RIR</span>
          <span />
          <span />
        </div>

        <div className="mt-1 space-y-1">
          {s.sets.map((set, sIdx) => {
            const w = Number(set.weight_kg) || 0;
            const reps = Number(set.reps) || 0;
            const oneRm = estimate1RM(w, reps);
            return (
              <div key={sIdx}>
                <div className="grid grid-cols-[22px_1fr_1fr_36px_36px_22px] items-center gap-2">
                  <span className="text-xs text-text-tertiary">{sIdx + 1}</span>
                  <NumberInput
                    value={set.reps}
                    onChange={(v) => onUpdateSet(exIdx, sIdx, { reps: v })}
                    placeholder={last?.sets[sIdx]?.reps?.toString() ?? "8"}
                  />
                  <div className="flex items-center gap-1">
                    <NumberInput
                      value={set.weight_kg}
                      onChange={(v) => onUpdateSet(exIdx, sIdx, { weight_kg: v })}
                      placeholder={last?.sets[sIdx]?.weight_kg?.toString() ?? "60"}
                    />
                    {w > 0 && <PlateCalculator targetKg={w} />}
                  </div>
                  <NumberInput value={set.rir} onChange={(v) => onUpdateSet(exIdx, sIdx, { rir: v })} placeholder="2" />
                  <button
                    onClick={() => onMarkDone(sIdx)}
                    disabled={set.done}
                    aria-label={set.done ? "Done" : "Mark done"}
                    className={cn(
                      "grid size-7 place-items-center rounded-md border",
                      set.done ? "border-nutrition bg-nutrition text-white" : "border-hairline text-text-tertiary hover:border-workout hover:text-workout",
                    )}
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button onClick={() => onRemoveSet(sIdx)} aria-label="Remove set" className="text-text-tertiary">
                    <X className="size-3" />
                  </button>
                </div>
                {oneRm > 0 && (
                  <p className="metric ml-7 text-[10px] text-text-tertiary">est 1RM {Math.round(oneRm)} kg</p>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={onAddSet} className="mt-2 flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary">
          <Plus className="size-3" /> Add set
        </button>
      </div>
    </article>
  );
}

function Block({ label, body, accent }: { label: string; body: string; accent: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] uppercase tracking-wider" style={{ color: accent }}>{label}</p>
      <p className="text-text-primary leading-relaxed">{body}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-text-tertiary">{label}</p>
      <p className="metric mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function NumberInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="metric w-full rounded-md border border-hairline bg-canvas px-2 py-1.5 text-sm outline-none focus:border-workout"
    />
  );
}

function prettyDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
