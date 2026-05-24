/**
 * Training math: 1RM estimation, volume, plate calculator.
 * Pure functions — no DB, no React.
 */

/**
 * Brzycki 1RM formula. Most accurate in the 1–10 rep range.
 * Returns 0 if reps or weight are invalid.
 */
export function estimate1RM(weight: number, reps: number): number {
  if (!weight || !reps || reps < 1 || reps > 36) return 0;
  if (reps === 1) return weight;
  return weight * (36 / (37 - reps));
}

/** Convert estimated 1RM at given weight back to target reps' weight. */
export function weightFor1RM(oneRm: number, reps: number): number {
  if (reps === 1) return oneRm;
  return (oneRm * (37 - reps)) / 36;
}

/** Workout volume = sum of weight × reps across all sets. */
export function setVolume(sets: Array<{ reps?: number | null; weight_kg?: number | null }>): number {
  return sets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weight_kg ?? 0), 0);
}

/** Best set in a list by estimated 1RM. */
export function topSet<T extends { reps?: number | null; weight_kg?: number | null }>(sets: T[]): T | null {
  let best: T | null = null;
  let bestOneRm = 0;
  for (const s of sets) {
    const oneRm = estimate1RM(s.weight_kg ?? 0, s.reps ?? 0);
    if (oneRm > bestOneRm) {
      bestOneRm = oneRm;
      best = s;
    }
  }
  return best;
}

// ────────────────────── Plate calculator ──────────────────────

export type PlateLoad = { plate: number; count: number };

/** Standard kg plates available in most gyms (per side). */
const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];

/**
 * Compute plates needed PER SIDE for a target loaded barbell weight.
 * Returns null if target < bar weight or can't be achieved with available plates.
 */
export function platesPerSide(targetKg: number, barKg = 20): { plates: PlateLoad[]; achievableKg: number } | null {
  if (targetKg < barKg) return null;
  let remaining = (targetKg - barKg) / 2;
  const loads: PlateLoad[] = [];
  let achievable = barKg;
  for (const p of KG_PLATES) {
    const count = Math.floor(remaining / p);
    if (count > 0) {
      loads.push({ plate: p, count });
      remaining -= count * p;
      achievable += count * p * 2;
    }
  }
  return { plates: loads, achievableKg: achievable };
}

/** Pretty-print plate load like "20 + 5 + 2.5 per side" */
export function plateLoadLabel(load: { plates: PlateLoad[] } | null): string {
  if (!load || load.plates.length === 0) return "bar only";
  return load.plates
    .flatMap((p) => Array(p.count).fill(p.plate))
    .join(" + ") + " /side";
}

/** Format weight nicely (drops trailing zeros). */
export function fmtKg(kg: number): string {
  if (!Number.isFinite(kg)) return "—";
  return Number.isInteger(kg) ? `${kg}` : kg.toFixed(1);
}
