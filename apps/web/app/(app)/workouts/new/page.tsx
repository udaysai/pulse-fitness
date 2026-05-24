"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, X, Save, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ACCENT_HEX } from "@/lib/design/accents";
import { cn } from "@/lib/utils";

type Exercise = { id: string; name: string; primary_muscle: string; equipment: string | null; demo_gif_url: string | null };
type SetRow = { reps: string; weight_kg: string; rir: string };
type PlanItem = { exercise: Exercise; sets: SetRow[] };

export default function NewWorkoutPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [rpe, setRpe] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(true);
  const startedAtRef = useRef<string>(new Date().toISOString());

  // Search debounce
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      if (!pickerOpen) return;
      setLoading(true);
      try {
        const url = `/api/exercises?limit=30${query ? `&q=${encodeURIComponent(query)}` : ""}`;
        const r = await fetch(url, { signal: ctrl.signal });
        if (r.ok) {
          const j = await r.json();
          setResults(j.exercises ?? []);
        }
      } catch {}
      setLoading(false);
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, pickerOpen]);

  function addExercise(ex: Exercise) {
    if (plan.some((p) => p.exercise.id === ex.id)) return;
    setPlan((p) => [...p, { exercise: ex, sets: [{ reps: "", weight_kg: "", rir: "" }] }]);
  }

  function removeExercise(id: string) {
    setPlan((p) => p.filter((it) => it.exercise.id !== id));
  }

  function updateSet(exIdx: number, setIdx: number, patch: Partial<SetRow>) {
    setPlan((p) => {
      const next = [...p];
      const sets = [...next[exIdx].sets];
      sets[setIdx] = { ...sets[setIdx], ...patch };
      next[exIdx] = { ...next[exIdx], sets };
      return next;
    });
  }

  function addSet(exIdx: number) {
    setPlan((p) => {
      const next = [...p];
      const last = next[exIdx].sets[next[exIdx].sets.length - 1];
      next[exIdx] = {
        ...next[exIdx],
        // Inherit last set's values for fast logging
        sets: [...next[exIdx].sets, { reps: last?.reps ?? "", weight_kg: last?.weight_kg ?? "", rir: "" }],
      };
      return next;
    });
  }

  function removeSet(exIdx: number, setIdx: number) {
    setPlan((p) => {
      const next = [...p];
      next[exIdx] = { ...next[exIdx], sets: next[exIdx].sets.filter((_, i) => i !== setIdx) };
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        started_at: startedAtRef.current,
        ended_at: new Date().toISOString(),
        rpe: rpe ? Number(rpe) : undefined,
        notes: notes || undefined,
        exercises: plan
          .filter((p) => p.sets.length > 0)
          .map((p) => ({
            exercise_id: p.exercise.id,
            sets: p.sets
              .filter((s) => s.reps || s.weight_kg)
              .map((s) => ({
                reps: s.reps ? Number(s.reps) : undefined,
                weight_kg: s.weight_kg ? Number(s.weight_kg) : undefined,
                rir: s.rir ? Number(s.rir) : undefined,
              })),
          }))
          .filter((e) => e.sets.length > 0),
      };
      if (body.exercises.length === 0) {
        alert("Add at least one set with reps or weight.");
        setSaving(false);
        return;
      }
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

  const totalSets = useMemo(() => plan.reduce((s, p) => s + p.sets.length, 0), [plan]);

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="New workout" subtitle={`${plan.length} exercises · ${totalSets} sets`} accentHex={ACCENT_HEX.workout} />

      <div className="space-y-4 px-5 pt-4">
        {/* Picker */}
        <div className="rounded-[var(--radius-card)] border border-hairline bg-surface">
          <button
            onClick={() => setPickerOpen((o) => !o)}
            className="flex w-full items-center justify-between p-3"
          >
            <span className="text-sm font-semibold">Add exercise</span>
            <ChevronRight className={cn("size-4 transition-transform", pickerOpen && "rotate-90")} />
          </button>

          {pickerOpen && (
            <div className="border-t border-hairline p-3">
              <div className="mb-3 flex items-center gap-2 rounded-full bg-canvas px-3 py-2">
                <Search className="size-4 text-text-tertiary" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search 873 exercises"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-tertiary"
                />
              </div>

              <div className="max-h-72 space-y-1 overflow-y-auto no-scrollbar">
                {loading && <p className="text-xs text-text-tertiary">Searching…</p>}
                {!loading && results.length === 0 && <p className="text-xs text-text-tertiary">No results.</p>}
                {results.map((ex) => {
                  const added = plan.some((p) => p.exercise.id === ex.id);
                  return (
                    <button
                      key={ex.id}
                      onClick={() => addExercise(ex)}
                      disabled={added}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg p-2 text-left",
                        added ? "opacity-40" : "hover:bg-surface-raised",
                      )}
                    >
                      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-canvas">
                        {ex.demo_gif_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={ex.demo_gif_url} alt="" className="size-full object-cover" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col min-w-0">
                        <span className="truncate text-sm">{ex.name}</span>
                        <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
                          {ex.primary_muscle}
                          {ex.equipment ? ` · ${ex.equipment}` : ""}
                        </span>
                      </div>
                      {added ? (
                        <span className="text-[10px] text-text-tertiary">Added</span>
                      ) : (
                        <Plus className="size-4 text-text-secondary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Selected exercises with set logger */}
        {plan.map((item, exIdx) => (
          <div key={item.exercise.id} className="rounded-[var(--radius-card)] border border-hairline bg-surface p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="size-10 shrink-0 overflow-hidden rounded-md bg-canvas">
                {item.exercise.demo_gif_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.exercise.demo_gif_url} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold">{item.exercise.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary">{item.exercise.primary_muscle}</p>
              </div>
              <button onClick={() => removeExercise(item.exercise.id)} aria-label="Remove">
                <X className="size-4 text-text-tertiary" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="grid grid-cols-[24px_1fr_1fr_1fr_24px] items-center gap-2 px-1 text-[10px] uppercase tracking-wider text-text-tertiary">
                <span>#</span>
                <span>Reps</span>
                <span>Weight (kg)</span>
                <span>RIR</span>
                <span />
              </div>
              {item.sets.map((s, sIdx) => (
                <div key={sIdx} className="grid grid-cols-[24px_1fr_1fr_1fr_24px] items-center gap-2">
                  <span className="text-xs text-text-tertiary">{sIdx + 1}</span>
                  <NumberInput value={s.reps} onChange={(v) => updateSet(exIdx, sIdx, { reps: v })} placeholder="8" />
                  <NumberInput value={s.weight_kg} onChange={(v) => updateSet(exIdx, sIdx, { weight_kg: v })} placeholder="60" />
                  <NumberInput value={s.rir} onChange={(v) => updateSet(exIdx, sIdx, { rir: v })} placeholder="2" />
                  <button onClick={() => removeSet(exIdx, sIdx)} aria-label="Remove set" className="text-text-tertiary">
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => addSet(exIdx)}
              className="mt-2 flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
            >
              <Plus className="size-3" /> Add set
            </button>
          </div>
        ))}

        {/* Wrap-up */}
        {plan.length > 0 && (
          <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-3">
            <div className="mb-3 grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-text-tertiary">Overall RPE (1–10)</span>
                <NumberInput value={rpe} onChange={setRpe} placeholder="7" />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-text-tertiary">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="How did it feel?"
                className="rounded-lg border border-hairline bg-canvas px-3 py-2 text-sm outline-none resize-none"
              />
            </label>
          </div>
        )}

        <PrimaryButton
          accent="workout"
          className="w-full"
          onClick={save}
          disabled={plan.length === 0 || saving}
        >
          <Save className="size-4" /> {saving ? "Saving…" : "Finish workout"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
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
