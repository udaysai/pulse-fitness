"use client";

import { useMemo, useState } from "react";
import { Calculator, X } from "lucide-react";
import { platesPerSide, fmtKg } from "@/lib/training";
import { ACCENT_HEX } from "@/lib/design/accents";

type Props = {
  targetKg: number;
  defaultBarKg?: number;
};

const PLATE_COLORS: Record<number, string> = {
  25: "#dc2626", // red
  20: "#1d4ed8", // blue
  15: "#facc15", // yellow
  10: "#10b981", // green
  5: "#0f172a", // dark
  2.5: "#6b7280", // gray
  1.25: "#9ca3af",
  0.5: "#cbd5e1",
};

/** Popover-style plate calculator. Tap the icon next to a weight input to open. */
export function PlateCalculator({ targetKg, defaultBarKg = 20 }: Props) {
  const [open, setOpen] = useState(false);
  const [barKg, setBarKg] = useState(defaultBarKg);

  const load = useMemo(() => platesPerSide(targetKg, barKg), [targetKg, barKg]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Plate calculator"
        type="button"
        className="grid size-7 place-items-center rounded-md bg-canvas text-text-secondary hover:text-text-primary"
      >
        <Calculator className="size-3.5" />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-2xl bg-surface p-5 sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary">Plate calculator</p>
                <h3 className="metric text-2xl font-semibold">
                  {fmtKg(targetKg)} kg
                </h3>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-text-tertiary">
                <X className="size-5" />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-text-tertiary">Bar weight</span>
              <div className="flex rounded-full bg-canvas p-0.5">
                {[20, 15, 10, 7].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBarKg(b)}
                    className="rounded-full px-2.5 py-1 text-xs"
                    style={{
                      backgroundColor: barKg === b ? ACCENT_HEX.workout : "transparent",
                      color: barKg === b ? "white" : "var(--color-text-secondary)",
                    }}
                  >
                    {b} kg
                  </button>
                ))}
              </div>
            </div>

            {load === null ? (
              <p className="text-sm text-text-secondary">Target is below the bar weight.</p>
            ) : (
              <>
                <div className="mb-3 rounded-[var(--radius-card)] bg-canvas p-3 text-center">
                  <div className="mb-2 flex items-center justify-center gap-1">
                    {/* Plates left side */}
                    {load.plates.flatMap((p) =>
                      Array(p.count).fill(0).map((_, i) => (
                        <PlateChip key={`L-${p.plate}-${i}`} kg={p.plate} />
                      )),
                    ).reverse()}
                    {/* Bar */}
                    <div className="mx-1 h-1 w-10 rounded-full bg-text-tertiary" />
                    {/* Plates right side */}
                    {load.plates.flatMap((p) =>
                      Array(p.count).fill(0).map((_, i) => (
                        <PlateChip key={`R-${p.plate}-${i}`} kg={p.plate} />
                      )),
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">
                    {load.plates.length === 0 ? "Bar only" : "Per side:"}{" "}
                    <span className="metric text-text-primary">
                      {load.plates.map((p) => `${p.count} × ${p.plate}`).join(", ")}
                    </span>
                  </p>
                </div>

                {Math.abs(load.achievableKg - targetKg) > 0.01 && (
                  <p className="text-xs text-text-tertiary">
                    Closest possible: <strong>{fmtKg(load.achievableKg)} kg</strong>
                    {load.achievableKg < targetKg && " (need smaller plates for exact)"}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PlateChip({ kg }: { kg: number }) {
  const w = kg >= 20 ? 14 : kg >= 10 ? 11 : kg >= 5 ? 9 : 7;
  const h = kg >= 20 ? 32 : kg >= 10 ? 28 : kg >= 5 ? 22 : 18;
  return (
    <div
      className="rounded-sm"
      style={{ backgroundColor: PLATE_COLORS[kg] ?? "#6b7280", width: w, height: h }}
      title={`${kg} kg`}
    />
  );
}
