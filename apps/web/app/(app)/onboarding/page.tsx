"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ACCENT_HEX, type DomainAccent } from "@/lib/design/accents";
import { cn } from "@/lib/utils";

type Goal = "fat_loss" | "lean_muscle" | "strength" | "maintenance" | "energy" | "wellness";
type Sex = "male" | "female" | "other";
type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";

const GOALS: { id: Goal; label: string; sub: string; accent: DomainAccent }[] = [
  { id: "fat_loss", label: "Lose fat", sub: "Calorie deficit + strength preservation", accent: "workout" },
  { id: "lean_muscle", label: "Build lean muscle", sub: "Hypertrophy with quality calories", accent: "workout" },
  { id: "strength", label: "Get stronger", sub: "Heavier compound lifts, lower volume", accent: "energy" },
  { id: "maintenance", label: "Maintain", sub: "Stay where I am, build consistency", accent: "recovery" },
  { id: "energy", label: "More energy", sub: "Sleep, NEAT, low intensity volume", accent: "energy" },
  { id: "wellness", label: "General wellness", sub: "Mix of cardio, strength, mobility", accent: "nutrition" },
];

const ACTIVITY_LEVELS: { id: Activity; label: string; sub: string }[] = [
  { id: "sedentary", label: "Sedentary", sub: "Desk job, little exercise" },
  { id: "light", label: "Lightly active", sub: "1–3 light sessions/week" },
  { id: "moderate", label: "Moderate", sub: "3–5 sessions/week" },
  { id: "active", label: "Active", sub: "6+ intense sessions/week" },
  { id: "very_active", label: "Very active", sub: "Physical job + daily training" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [dob, setDob] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activity, setActivity] = useState<Activity | null>(null);
  const [injuries, setInjuries] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const STEPS = ["Goal", "About you", "Activity", "Injuries"] as const;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          sex,
          dob: dob || null,
          height_cm: heightCm ? Number(heightCm) : null,
          weight_kg: weightKg ? Number(weightKg) : null,
          activity_level: activity,
          injuries: injuries || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to save");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setSaving(false);
    }
  }

  const accentHex = goal ? ACCENT_HEX[GOALS.find((g) => g.id === goal)!.accent] : ACCENT_HEX.workout;
  const canAdvance = [goal, true, activity, true][step];
  const isLast = step === STEPS.length - 1;

  return (
    <main
      className="halo mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8"
      style={{ ["--halo-color" as string]: accentHex }}
    >
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={cn("h-1 flex-1 rounded-full transition-colors", i <= step ? "" : "bg-hairline")}
            style={{ backgroundColor: i <= step ? accentHex : undefined }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className="flex-1"
        >
          <p className="mb-1 text-[11px] uppercase tracking-wider text-text-tertiary">
            Step {step + 1} of {STEPS.length}
          </p>
          <h1 className="mb-6 text-2xl font-semibold">{STEPS[step]}</h1>

          {step === 0 && (
            <div className="flex flex-col gap-2">
              {GOALS.map((g) => (
                <Option
                  key={g.id}
                  selected={goal === g.id}
                  onClick={() => setGoal(g.id)}
                  title={g.label}
                  sub={g.sub}
                  accent={ACCENT_HEX[g.accent]}
                />
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-xs text-text-secondary">Sex (for calorie + macro math)</p>
                <div className="flex gap-2">
                  {(["male", "female", "other"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSex(s)}
                      className={cn(
                        "flex-1 rounded-[var(--radius-card)] border px-3 py-3 text-sm capitalize",
                        sex === s ? "border-current text-text-primary" : "border-hairline text-text-secondary",
                      )}
                      style={sex === s ? { borderColor: accentHex, color: accentHex } : undefined}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Date of birth">
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full rounded-[var(--radius-card)] border border-hairline bg-surface px-3 py-3 text-sm outline-none focus:border-current"
                  style={{ borderColor: dob ? accentHex : undefined }}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Height (cm)">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="175"
                    className="w-full rounded-[var(--radius-card)] border border-hairline bg-surface px-3 py-3 text-sm outline-none"
                  />
                </Field>
                <Field label="Weight (kg)">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="72"
                    className="w-full rounded-[var(--radius-card)] border border-hairline bg-surface px-3 py-3 text-sm outline-none"
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-2">
              {ACTIVITY_LEVELS.map((a) => (
                <Option
                  key={a.id}
                  selected={activity === a.id}
                  onClick={() => setActivity(a.id)}
                  title={a.label}
                  sub={a.sub}
                  accent={accentHex}
                />
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-3">
              <Field label="Any current injuries or limitations? (optional)">
                <textarea
                  value={injuries}
                  onChange={(e) => setInjuries(e.target.value)}
                  rows={5}
                  placeholder="e.g. lower back tweak when squatting, avoid overhead pressing for now"
                  className="w-full rounded-[var(--radius-card)] border border-hairline bg-surface px-3 py-3 text-sm outline-none resize-none"
                />
              </Field>
              <p className="text-xs text-text-tertiary">
                Used to generate safe workout plans. Stored encrypted. Skip if nothing applies.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {error && <p className="mb-2 text-xs text-danger">{error}</p>}

      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="rounded-[var(--radius-card)] border border-hairline px-4 py-3 text-sm"
          >
            Back
          </button>
        )}
        <PrimaryButton
          accent="workout"
          className="flex-1"
          onClick={() => {
            if (!canAdvance) return;
            if (isLast) save();
            else setStep((s) => s + 1);
          }}
          disabled={!canAdvance || saving}
        >
          {isLast ? (saving ? "Saving…" : "Finish") : "Continue"}
          {!saving && <ArrowRight className="size-4" />}
        </PrimaryButton>
      </div>
    </main>
  );
}

function Option({
  title,
  sub,
  selected,
  onClick,
  accent,
}: {
  title: string;
  sub: string;
  selected: boolean;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-[var(--radius-card)] border bg-surface px-4 py-3 text-left transition-colors",
        selected ? "" : "border-hairline",
      )}
      style={selected ? { borderColor: accent } : undefined}
    >
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-text-secondary">{sub}</p>
      </div>
      {selected && (
        <div className="grid size-6 place-items-center rounded-full" style={{ backgroundColor: accent }}>
          <Check className="size-3.5 text-white" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-text-secondary">{label}</span>
      {children}
    </label>
  );
}
