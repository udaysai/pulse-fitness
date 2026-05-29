"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Plus, X, Save, Bookmark, Check, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { PlateCalculator } from "@/components/training/PlateCalculator";
import { RestTimer } from "@/components/training/RestTimer";
import { ExerciseDemo } from "@/components/training/ExerciseDemo";
import { ACCENT_HEX } from "@/lib/design/accents";
import { cn } from "@/lib/utils";
import { estimate1RM, fmtKg, topSet } from "@/lib/training";

type Exercise = {
  id: string;
  name: string;
  primary_muscle: string;
  equipment: string | null;
  demo_gif_url: string | null;
};
type SetInput = { reps: string; weight_kg: string; rir: string; done: boolean };
type LastTimeSet = { reps: number | null; weight_kg: number | null };
type PlanItem = {
  exercise: Exercise;
  sets: SetInput[];
  rest_seconds: number;
  lastTime?: { date: string; sets: LastTimeSet[]; top: { reps: number | null; weight_kg: number | null; estimated_1rm: number } | null };
};

export default function NewWorkoutPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-5 pt-8 text-sm text-text-secondary">Loading…</div>}>
      <NewWorkoutInner />
    </Suspense>
  );
}

function NewWorkoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  const editId = searchParams.get("edit");
  const dateParam = searchParams.get("date"); // ?date=YYYY-MM-DD to log a past day
  const isEditing = Boolean(editId);
  const todayISO = new Date().toISOString().slice(0, 10);

  const [workoutDate, setWorkoutDate] = useState(() => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return dateParam;
    return todayISO;
  });
  const [kind, setKind] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Exercise[]>([]);
  const [searching, setSearching] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(!isEditing);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [rpe, setRpe] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeRest, setActiveRest] = useState<{ seconds: number; key: number } | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const startedAtRef = useRef<string>(new Date().toISOString());
  const restKey = useRef(0);

  /** When backdating, use noon on the picked day. When today, keep the real start time. */
  function computeStartedAt(): string {
    if (workoutDate === todayISO) return startedAtRef.current;
    const d = new Date(`${workoutDate}T12:00:00`);
    return d.toISOString();
  }

  // Load existing workout if ?edit=<id>
  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const r = await fetch(`/api/workouts/${editId}`);
        if (!r.ok) throw new Error("Failed to load workout");
        const { workout } = await r.json();
        startedAtRef.current = workout.started_at;
        setWorkoutDate(workout.started_at.slice(0, 10));
        setKind(workout.kind ?? "");
        setRpe(workout.rpe?.toString() ?? "");
        setNotes(workout.notes ?? "");
        type WE = {
          order_idx: number;
          exercise_id: string;
          exercises: { id: string; name: string; primary_muscle: string; equipment: string | null; demo_gif_url: string | null } | null;
          exercise_sets: Array<{ set_idx: number; reps: number | null; weight_kg: number | null; rir: number | null }>;
        };
        const sortedEx: WE[] = [...(workout.workout_exercises ?? [])].sort((a: WE, b: WE) => a.order_idx - b.order_idx);
        setPlan(
          sortedEx.map((we) => ({
            exercise: {
              id: we.exercises?.id ?? we.exercise_id,
              name: we.exercises?.name ?? we.exercise_id,
              primary_muscle: we.exercises?.primary_muscle ?? "",
              equipment: we.exercises?.equipment ?? null,
              demo_gif_url: we.exercises?.demo_gif_url ?? null,
            },
            sets: [...(we.exercise_sets ?? [])]
              .sort((a, b) => a.set_idx - b.set_idx)
              .map((s) => ({
                reps: s.reps?.toString() ?? "",
                weight_kg: s.weight_kg?.toString() ?? "",
                rir: s.rir?.toString() ?? "",
                done: true,
              })),
            rest_seconds: 120,
          })),
        );
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [editId]);

  // Load template if ?template=<id> (TODO: GET endpoint)
  useEffect(() => {
    void templateId;
  }, [templateId]);

  async function handleDelete() {
    if (!editId) return;
    if (!confirm("Delete this workout permanently?")) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/workouts/${editId}`, { method: "DELETE" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(j.error ?? "Delete failed");
        setDeleting(false);
        return;
      }
      router.push("/workouts");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  }

  // Search debounced
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      if (!pickerOpen) return;
      setSearching(true);
      try {
        const url = `/api/exercises?limit=30${query ? `&q=${encodeURIComponent(query)}` : ""}`;
        const r = await fetch(url, { signal: ctrl.signal });
        if (r.ok) setResults((await r.json()).exercises ?? []);
      } catch {}
      setSearching(false);
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, pickerOpen]);

  async function addExercise(ex: Exercise) {
    if (plan.some((p) => p.exercise.id === ex.id)) return;

    // Fetch last-time data so the user sees their previous performance
    const lastRes = await fetch(`/api/exercises/${ex.id}/history`).catch(() => null);
    const lastJson = lastRes && lastRes.ok ? await lastRes.json() : null;
    const lastTime = lastJson?.last
      ? {
          date: lastJson.last.date,
          sets: lastJson.last.sets,
          top: lastJson.last.top_set,
        }
      : undefined;

    // Pre-fill with last time's reps/weight if available
    const prefill: SetInput = lastTime?.sets?.[0]
      ? {
          reps: lastTime.sets[0].reps?.toString() ?? "",
          weight_kg: lastTime.sets[0].weight_kg?.toString() ?? "",
          rir: "",
          done: false,
        }
      : { reps: "", weight_kg: "", rir: "", done: false };

    setPlan((p) => [
      ...p,
      {
        exercise: ex,
        sets: [prefill, { ...prefill, done: false }, { ...prefill, done: false }],
        rest_seconds: 120,
        lastTime,
      },
    ]);
  }

  function updateSet(exIdx: number, sIdx: number, patch: Partial<SetInput>) {
    setPlan((p) => {
      const next = [...p];
      const sets = [...next[exIdx].sets];
      sets[sIdx] = { ...sets[sIdx], ...patch };
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
        sets: [...next[exIdx].sets, { reps: last?.reps ?? "", weight_kg: last?.weight_kg ?? "", rir: "", done: false }],
      };
      return next;
    });
  }

  function removeSet(exIdx: number, sIdx: number) {
    setPlan((p) => {
      const next = [...p];
      next[exIdx] = { ...next[exIdx], sets: next[exIdx].sets.filter((_, i) => i !== sIdx) };
      return next;
    });
  }

  function removeExercise(id: string) {
    setPlan((p) => p.filter((it) => it.exercise.id !== id));
  }

  function markSetDone(exIdx: number, sIdx: number) {
    updateSet(exIdx, sIdx, { done: true });
    restKey.current += 1;
    setActiveRest({ seconds: plan[exIdx].rest_seconds, key: restKey.current });
    try { navigator.vibrate?.(30); } catch {}
  }

  // Live workout totals
  const totals = useMemo(() => {
    let sets = 0;
    const allSetsForOneRm: Array<{ reps: number; weight_kg: number }> = [];
    let volume = 0;
    for (const p of plan) {
      for (const s of p.sets) {
        const reps = Number(s.reps) || 0;
        const w = Number(s.weight_kg) || 0;
        if (reps > 0 || w > 0) {
          sets++;
          volume += reps * w;
          if (reps > 0 && w > 0) allSetsForOneRm.push({ reps, weight_kg: w });
        }
      }
    }
    const best = topSet(allSetsForOneRm);
    const oneRm = best ? estimate1RM(best.weight_kg, best.reps) : 0;
    return { sets, volume: Math.round(volume), best_1rm: Math.round(oneRm) };
  }, [plan]);

  async function save(saveAsTemplate?: { name: string }) {
    setSaving(true);
    try {
      const startedAt = computeStartedAt();
      // For backdated workouts, set ended_at to 45 min after start
      const isBackdate = workoutDate !== todayISO;
      const endedAt = isBackdate
        ? new Date(new Date(startedAt).getTime() + 45 * 60 * 1000).toISOString()
        : new Date().toISOString();
      const body = {
        kind: kind || undefined,
        started_at: startedAt,
        ended_at: endedAt,
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
      const endpoint = isEditing ? `/api/workouts/${editId}` : "/api/workouts";
      const method = isEditing ? "PATCH" : "POST";
      const r = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(j.error ?? "Save failed");
        setSaving(false);
        return;
      }

      if (saveAsTemplate) {
        await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: saveAsTemplate.name,
            exercises: plan.map((p) => ({
              exercise_id: p.exercise.id,
              target_sets: p.sets.length,
              target_reps: p.sets[0]?.reps || "8-12",
              rest_seconds: p.rest_seconds,
            })),
          }),
        });
      }
      router.push("/workouts");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  async function handleSaveTemplate() {
    if (plan.length === 0) return;
    const name = prompt("Name this routine (e.g., 'Push A')");
    if (!name) return;
    setSavingTemplate(true);
    await save({ name });
    setSavingTemplate(false);
  }

  if (loading) {
    return <div className="mx-auto max-w-md px-5 pt-8 text-sm text-text-secondary">Loading workout…</div>;
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title={isEditing ? "Edit workout" : "New workout"}
        subtitle={`${plan.length} exercises · ${totals.sets} sets · ${fmtKg(totals.volume)} kg volume`}
        accentHex={ACCENT_HEX.workout}
      />

      {/* Date + workout name */}
      <div className="mx-5 mt-3 grid grid-cols-[140px_1fr] gap-3">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary">Date</span>
          <input
            type="date"
            value={workoutDate}
            max={todayISO}
            onChange={(e) => setWorkoutDate(e.target.value)}
            className="mt-1 w-full rounded-[var(--radius-card)] border border-hairline bg-surface px-3 py-2.5 text-sm outline-none focus:border-workout"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary">Workout name</span>
          <input
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            placeholder="Push Day, Lower Body…"
            className="mt-1 w-full rounded-[var(--radius-card)] border border-hairline bg-surface px-3 py-2.5 text-sm outline-none focus:border-workout"
          />
        </label>
      </div>
      {workoutDate !== todayISO && (
        <p className="mx-5 mt-2 rounded-md bg-canvas px-3 py-2 text-[11px] text-text-secondary">
          ⏪ Backdating to <span className="text-text-primary">{prettyBackdate(workoutDate)}</span> — this will appear in history as if logged that day.
        </p>
      )}

      {totals.best_1rm > 0 && (
        <div className="mx-5 mt-4 grid grid-cols-3 gap-2 rounded-[var(--radius-card)] border border-hairline bg-surface p-3 text-center">
          <Stat label="Sets" value={totals.sets.toString()} />
          <Stat label="Volume" value={`${fmtKg(totals.volume)} kg`} />
          <Stat label="Est top 1RM" value={`${totals.best_1rm} kg`} />
        </div>
      )}

      <div className="space-y-4 px-5 pt-4 pb-32">
        {/* Picker */}
        <div className="rounded-[var(--radius-card)] border border-hairline bg-surface">
          <button onClick={() => setPickerOpen((o) => !o)} className="flex w-full items-center justify-between p-3">
            <span className="text-sm font-semibold">Add exercise</span>
            <span className="text-[10px] uppercase tracking-wider text-text-tertiary">{pickerOpen ? "Hide" : "Show"}</span>
          </button>
          {pickerOpen && (
            <div className="border-t border-hairline p-3">
              <div className="mb-3 flex items-center gap-2 rounded-full bg-canvas px-3 py-2">
                <Search className="size-4 text-text-tertiary" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search 873 exercises (e.g., bench, squat, row)"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-tertiary"
                />
              </div>
              <div className="max-h-72 space-y-1 overflow-y-auto no-scrollbar">
                {searching && <p className="text-xs text-text-tertiary">Searching…</p>}
                {!searching && results.length === 0 && <p className="text-xs text-text-tertiary">No results.</p>}
                {results.map((ex) => {
                  const added = plan.some((p) => p.exercise.id === ex.id);
                  return (
                    <button
                      key={ex.id}
                      onClick={() => addExercise(ex)}
                      disabled={added}
                      className={cn("flex w-full items-center gap-3 rounded-lg p-2 text-left", added ? "opacity-40" : "hover:bg-surface-raised")}
                    >
                      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-canvas">
                        {ex.demo_gif_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={ex.demo_gif_url} alt="" className="size-full object-cover" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col min-w-0">
                        <span className="truncate text-sm">{ex.name.replace(/_/g, " ")}</span>
                        <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
                          {ex.primary_muscle}
                          {ex.equipment ? ` · ${ex.equipment}` : ""}
                        </span>
                      </div>
                      {added ? <span className="text-[10px] text-text-tertiary">Added</span> : <Plus className="size-4 text-text-secondary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Selected exercises with advanced set logger */}
        {plan.map((item, exIdx) => (
          <ExerciseBlock
            key={item.exercise.id}
            item={item}
            onAddSet={() => addSet(exIdx)}
            onRemoveSet={(sIdx) => removeSet(exIdx, sIdx)}
            onUpdateSet={(sIdx, patch) => updateSet(exIdx, sIdx, patch)}
            onMarkDone={(sIdx) => markSetDone(exIdx, sIdx)}
            onRemove={() => removeExercise(item.exercise.id)}
            onRestChange={(s) =>
              setPlan((p) => {
                const n = [...p];
                n[exIdx] = { ...n[exIdx], rest_seconds: s };
                return n;
              })
            }
          />
        ))}

        {/* Wrap-up */}
        {plan.length > 0 && (
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
                placeholder="How did it feel? Anything to remember next time?"
                className="mt-1 w-full rounded-lg border border-hairline bg-canvas px-3 py-2 text-sm outline-none resize-none"
              />
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <PrimaryButton accent="workout" className="w-full" onClick={() => save()} disabled={plan.length === 0 || saving}>
            <Save className="size-4" /> {saving ? "Saving…" : isEditing ? "Save changes" : "Finish workout"}
          </PrimaryButton>
          {!isEditing && (
            <button
              onClick={handleSaveTemplate}
              disabled={plan.length === 0 || savingTemplate}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-card)] border border-hairline bg-surface px-5 py-3 text-sm font-semibold text-text-secondary hover:text-text-primary disabled:opacity-40"
            >
              <Bookmark className="size-4" /> Save as routine
            </button>
          )}
        </div>

        {isEditing && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-card)] border border-hairline bg-surface px-5 py-3 text-sm font-semibold text-danger hover:bg-canvas disabled:opacity-40"
          >
            {deleting ? "Deleting…" : "Delete this workout"}
          </button>
        )}
      </div>

      {activeRest && (
        <RestTimer
          key={activeRest.key}
          initialSeconds={activeRest.seconds}
          onDismiss={() => setActiveRest(null)}
          onComplete={() => setTimeout(() => setActiveRest(null), 3000)}
        />
      )}
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

function ExerciseBlock({
  item,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onMarkDone,
  onRemove,
  onRestChange,
}: {
  item: PlanItem;
  onAddSet: () => void;
  onRemoveSet: (sIdx: number) => void;
  onUpdateSet: (sIdx: number, patch: Partial<SetInput>) => void;
  onMarkDone: (sIdx: number) => void;
  onRemove: () => void;
  onRestChange: (s: number) => void;
}) {
  const [now] = useState(() => Date.now());
  const lastTime = item.lastTime;
  const lastDate = lastTime?.date ? new Date(lastTime.date) : null;
  const daysAgo = lastDate ? Math.floor((now - lastDate.getTime()) / 86400000) : null;

  return (
    <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-3">
      <div className="mb-2 flex items-center gap-2">
        <ExerciseDemo src={item.exercise.demo_gif_url} alt={`${item.exercise.name} form demo`} className="size-12 rounded-md" />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold">{item.exercise.name.replace(/_/g, " ")}</p>
          <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
            {item.exercise.primary_muscle} <span className="text-text-tertiary">· tap GIF for fullscreen form</span>
          </p>
        </div>
        <button onClick={onRemove} aria-label="Remove">
          <X className="size-4 text-text-tertiary" />
        </button>
      </div>

      {/* Last time reference */}
      {lastTime && lastTime.top && (
        <div className="mb-3 flex items-center gap-1.5 rounded-md bg-canvas px-2.5 py-1.5">
          <Sparkles className="size-3 text-energy" />
          <p className="text-[11px] text-text-secondary">
            <span className="text-text-tertiary">Last time </span>
            {daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`}
            <span className="text-text-tertiary"> · top set </span>
            <span className="metric text-text-primary">
              {lastTime.top.reps} × {lastTime.top.weight_kg} kg
            </span>
            {lastTime.top.estimated_1rm > 0 && (
              <span className="text-text-tertiary"> · est 1RM {Math.round(lastTime.top.estimated_1rm)} kg</span>
            )}
          </p>
        </div>
      )}

      {/* Sets table */}
      <div className="space-y-1">
        <div className="grid grid-cols-[22px_1fr_1fr_36px_36px_22px] items-center gap-2 px-1 text-[10px] uppercase tracking-wider text-text-tertiary">
          <span>#</span>
          <span>Reps</span>
          <span>Kg</span>
          <span>RIR</span>
          <span />
          <span />
        </div>
        {item.sets.map((s, sIdx) => {
          const weight = Number(s.weight_kg) || 0;
          const reps = Number(s.reps) || 0;
          const oneRm = estimate1RM(weight, reps);
          return (
            <div key={sIdx}>
              <div className="grid grid-cols-[22px_1fr_1fr_36px_36px_22px] items-center gap-2">
                <span className="text-xs text-text-tertiary">{sIdx + 1}</span>
                <SetNumberInput value={s.reps} onChange={(v) => onUpdateSet(sIdx, { reps: v })} placeholder={item.lastTime?.sets[sIdx]?.reps?.toString() ?? "8"} />
                <div className="flex items-center gap-1">
                  <SetNumberInput value={s.weight_kg} onChange={(v) => onUpdateSet(sIdx, { weight_kg: v })} placeholder={item.lastTime?.sets[sIdx]?.weight_kg?.toString() ?? "60"} />
                  {weight > 0 && <PlateCalculator targetKg={weight} />}
                </div>
                <SetNumberInput value={s.rir} onChange={(v) => onUpdateSet(sIdx, { rir: v })} placeholder="2" />
                <button
                  onClick={() => onMarkDone(sIdx)}
                  disabled={s.done}
                  aria-label={s.done ? "Done" : "Mark done"}
                  className={cn(
                    "grid size-7 place-items-center rounded-md border",
                    s.done ? "border-nutrition bg-nutrition text-white" : "border-hairline text-text-tertiary hover:border-workout hover:text-workout",
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

      <div className="mt-2 flex items-center justify-between">
        <button onClick={onAddSet} className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary">
          <Plus className="size-3" /> Add set
        </button>
        <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
          <span>Rest</span>
          {[60, 90, 120, 180].map((s) => (
            <button
              key={s}
              onClick={() => onRestChange(s)}
              className={cn(
                "rounded px-1.5 py-0.5",
                item.rest_seconds === s ? "bg-workout text-white" : "hover:text-text-primary",
              )}
            >
              {s < 60 ? `${s}s` : `${Math.round(s / 60)}m`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SetNumberInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
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

function prettyBackdate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diff === 1) return `Yesterday (${weekday} · ${month})`;
  if (diff > 0) return `${diff} days ago (${weekday} · ${month})`;
  return `${weekday} · ${month}`;
}
