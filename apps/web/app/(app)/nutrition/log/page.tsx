"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ACCENT_HEX } from "@/lib/design/accents";

export default function LogMealPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [f, setF] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eaten_at: new Date().toISOString(),
          name: name.trim(),
          kcal: kcal ? Number(kcal) : null,
          protein_g: p ? Number(p) : null,
          carbs_g: c ? Number(c) : null,
          fat_g: f ? Number(f) : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Save failed");
      }
      router.push("/nutrition");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Log meal" subtitle="What did you eat?" accentHex={ACCENT_HEX.nutrition} />

      <div className="space-y-4 px-5 pt-4">
        <Link href="/nutrition" className="inline-flex items-center gap-1 text-xs text-text-secondary">
          <ArrowLeft className="size-3" /> Nutrition
        </Link>

        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-text-tertiary">Meal name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chicken bowl with rice"
            className="mt-1 w-full rounded-[var(--radius-card)] border border-hairline bg-surface px-3 py-3 text-sm outline-none focus:border-nutrition"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Calories">
            <input
              type="number"
              inputMode="decimal"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              placeholder="650"
              className="metric w-full rounded-[var(--radius-card)] border border-hairline bg-surface px-3 py-3 text-sm outline-none"
            />
          </Field>
          <Field label="Protein (g)">
            <input
              type="number"
              inputMode="decimal"
              value={p}
              onChange={(e) => setP(e.target.value)}
              placeholder="45"
              className="metric w-full rounded-[var(--radius-card)] border border-hairline bg-surface px-3 py-3 text-sm outline-none"
            />
          </Field>
          <Field label="Carbs (g)">
            <input
              type="number"
              inputMode="decimal"
              value={c}
              onChange={(e) => setC(e.target.value)}
              placeholder="70"
              className="metric w-full rounded-[var(--radius-card)] border border-hairline bg-surface px-3 py-3 text-sm outline-none"
            />
          </Field>
          <Field label="Fat (g)">
            <input
              type="number"
              inputMode="decimal"
              value={f}
              onChange={(e) => setF(e.target.value)}
              placeholder="20"
              className="metric w-full rounded-[var(--radius-card)] border border-hairline bg-surface px-3 py-3 text-sm outline-none"
            />
          </Field>
        </div>

        {err && <p className="text-xs text-danger">{err}</p>}

        <PrimaryButton accent="nutrition" className="w-full" onClick={save} disabled={!name.trim() || saving}>
          <Save className="size-4" /> {saving ? "Saving…" : "Save meal"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-text-tertiary">{label}</span>
      {children}
    </label>
  );
}
