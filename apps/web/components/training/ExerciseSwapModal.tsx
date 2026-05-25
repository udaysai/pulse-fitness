"use client";

import { useEffect, useState } from "react";
import { Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCENT_HEX } from "@/lib/design/accents";

export type SwapCandidate = {
  id: string;
  name: string;
  primary_muscle: string;
  equipment: string | null;
  demo_gif_url: string | null;
};

type Props = {
  open: boolean;
  currentExerciseId: string;
  currentMuscle?: string;
  onClose: () => void;
  onPick: (ex: SwapCandidate) => void;
};

/**
 * Modal for swapping one exercise for another targeting the same muscle.
 * Auto-filters to the current exercise's primary muscle by default.
 */
export function ExerciseSwapModal({ open, currentExerciseId, currentMuscle, onClose, onPick }: Props) {
  const [q, setQ] = useState("");
  const [muscleFilter, setMuscleFilter] = useState(currentMuscle ?? "");
  const [results, setResults] = useState<SwapCandidate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMuscleFilter(currentMuscle ?? "");
    setQ("");
  }, [open, currentMuscle]);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "30");
        if (q) params.set("q", q);
        if (muscleFilter) params.set("muscle", muscleFilter);
        const r = await fetch(`/api/exercises?${params}`, { signal: ctrl.signal });
        if (r.ok) setResults(((await r.json()).exercises ?? []).filter((x: SwapCandidate) => x.id !== currentExerciseId));
      } catch {}
      setLoading(false);
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [open, q, muscleFilter, currentExerciseId]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[80vh] w-full max-w-md flex-col rounded-t-2xl bg-surface p-4 sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary">Swap exercise</p>
            <h3 className="text-lg font-semibold">Pick a replacement</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-text-tertiary">
            <X className="size-5" />
          </button>
        </div>

        <div className="mb-2 flex items-center gap-2 rounded-full bg-canvas px-3 py-2">
          <Search className="size-4 text-text-tertiary" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search exercises"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-tertiary"
            autoFocus
          />
        </div>

        {currentMuscle && (
          <div className="mb-3 flex items-center gap-1.5 px-1 text-[10px]">
            <span className="text-text-tertiary uppercase tracking-wider">Filter</span>
            <button
              onClick={() => setMuscleFilter(muscleFilter ? "" : currentMuscle)}
              className={cn(
                "rounded-full px-2 py-0.5 text-xs",
                muscleFilter ? "text-white" : "border border-hairline text-text-secondary",
              )}
              style={muscleFilter ? { backgroundColor: ACCENT_HEX.workout } : undefined}
            >
              same muscle ({currentMuscle})
            </button>
            <span className="text-text-tertiary">{muscleFilter ? "" : "showing all"}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {loading && <p className="text-xs text-text-tertiary">Searching…</p>}
          {!loading && results.length === 0 && <p className="text-xs text-text-tertiary">No matches.</p>}
          <div className="flex flex-col gap-1">
            {results.map((ex) => (
              <button
                key={ex.id}
                onClick={() => {
                  onPick(ex);
                  onClose();
                }}
                className="flex items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-raised"
              >
                <div className="size-12 shrink-0 overflow-hidden rounded-md bg-canvas">
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
                <Check className="size-4 text-text-tertiary" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
