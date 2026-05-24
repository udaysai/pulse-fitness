"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Plus, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCENT_HEX } from "@/lib/design/accents";

type Props = {
  initialSeconds: number;
  onComplete?: () => void;
  onDismiss?: () => void;
};

/** Floating rest timer that auto-starts. Vibrates and beeps at 0. */
export function RestTimer({ initialSeconds, onComplete, onDismiss }: Props) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(true);
  const total = useRef(initialSeconds);
  const fired = useRef(false);

  useEffect(() => {
    if (!running) return;
    if (seconds <= 0) {
      if (!fired.current) {
        fired.current = true;
        // Haptic feedback (works on Android; iOS PWA support is limited)
        try { navigator.vibrate?.([200, 100, 200]); } catch {}
        onComplete?.();
      }
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, running, onComplete]);

  const pct = total.current > 0 ? Math.max(0, Math.min(seconds / total.current, 1)) : 0;
  const past = seconds <= 0;

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 mx-auto max-w-md px-4">
      <div
        className={cn(
          "flex items-center gap-3 rounded-full border bg-surface px-3 py-2 shadow-lg backdrop-blur-xl",
          past ? "border-nutrition" : "border-hairline",
        )}
      >
        {/* Mini progress ring */}
        <div className="relative size-9 shrink-0">
          <svg viewBox="0 0 36 36" className="-rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke={`${ACCENT_HEX.workout}26`} strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke={past ? ACCENT_HEX.nutrition : ACCENT_HEX.workout}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 15}
              strokeDashoffset={2 * Math.PI * 15 * (1 - pct)}
              style={{ transition: "stroke-dashoffset 0.5s linear" }}
            />
          </svg>
        </div>

        <div className="flex flex-1 flex-col">
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
            {past ? "Rest's up — back to it" : "Rest"}
          </span>
          <span className="metric text-sm font-semibold">{formatSeconds(Math.max(0, seconds))}</span>
        </div>

        <button onClick={() => setSeconds((s) => s + 15)} aria-label="+15s" className="rounded-full bg-canvas p-1.5 text-text-secondary">
          <Plus className="size-3" />
        </button>
        <button onClick={() => setSeconds((s) => Math.max(0, s - 15))} aria-label="-15s" className="rounded-full bg-canvas p-1.5 text-text-secondary">
          <Minus className="size-3" />
        </button>
        <button onClick={() => setRunning((r) => !r)} aria-label={running ? "Pause" : "Resume"} className="rounded-full bg-canvas p-1.5 text-text-secondary">
          {running ? <Pause className="size-3" /> : <Play className="size-3" />}
        </button>
        <button onClick={onDismiss} aria-label="Dismiss" className="rounded-full bg-canvas p-1.5 text-text-secondary">
          <X className="size-3" />
        </button>
      </div>
    </div>
  );
}

function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
