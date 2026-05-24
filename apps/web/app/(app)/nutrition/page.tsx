import Link from "next/link";
import { Apple, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { MetricCard } from "@/components/ui/MetricCard";
import { ACCENT_HEX } from "@/lib/design/accents";
import { getCurrentUserAndProfile } from "@/lib/queries/profile";
import { getMealsForDay, totalMacros, targetMacros } from "@/lib/queries/meals";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function NutritionPage() {
  if (!isSupabaseConfigured()) return <FallbackUI />;
  const { profile } = await getCurrentUserAndProfile();
  const today = new Date().toISOString().slice(0, 10);
  const meals = await getMealsForDay(today);
  const totals = totalMacros(meals);
  const targets = profile ? targetMacros(profile) : null;

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Nutrition"
        subtitle="Log meals, hit your macros."
        accentHex={ACCENT_HEX.nutrition}
      />

      <div className="space-y-5 px-5 pt-4">
        {/* Macro grid */}
        <section className="grid grid-cols-2 gap-3">
          <MacroBlock label="Calories" value={Math.round(totals.kcal)} target={targets?.kcal} unit="kcal" />
          <MacroBlock label="Protein" value={Math.round(totals.protein_g)} target={targets?.protein_g} unit="g" />
          <MacroBlock label="Carbs" value={Math.round(totals.carbs_g)} target={targets?.carbs_g} unit="g" />
          <MacroBlock label="Fat" value={Math.round(totals.fat_g)} target={targets?.fat_g} unit="g" />
        </section>

        <Link href="/nutrition/log">
          <PrimaryButton accent="nutrition" className="w-full">
            <Plus className="size-4" /> Add meal
          </PrimaryButton>
        </Link>

        {/* Today's log */}
        {meals.length === 0 ? (
          <EmptyState
            icon={Apple}
            title="No meals logged today"
            body={targets ? "Log meals to track macros against your targets." : "Complete your profile to compute personalized macro targets."}
            accentHex={ACCENT_HEX.nutrition}
          />
        ) : (
          <ul className="space-y-2">
            {meals.map((m) => (
              <li key={m.id} className="rounded-[var(--radius-card)] border border-hairline bg-surface p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{m.name}</p>
                  <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
                    {new Date(m.eaten_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-text-secondary">
                  {m.kcal != null && <>{Math.round(m.kcal)} kcal · </>}
                  {m.protein_g != null && <>P {Math.round(m.protein_g)}g · </>}
                  {m.carbs_g != null && <>C {Math.round(m.carbs_g)}g · </>}
                  {m.fat_g != null && <>F {Math.round(m.fat_g)}g</>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MacroBlock({ label, value, target, unit }: { label: string; value: number; target?: number; unit: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-hairline bg-surface p-4">
      <p className="text-[11px] uppercase tracking-wider text-text-tertiary">{label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="metric text-2xl font-semibold">{value}</span>
        {target !== undefined && (
          <span className="text-xs text-text-secondary">/ {target} {unit}</span>
        )}
        {target === undefined && <span className="text-xs text-text-secondary">{unit}</span>}
      </div>
      {target !== undefined && target > 0 && (
        <div className="mt-2 h-1 rounded-full bg-hairline overflow-hidden">
          <div
            className="h-full rounded-full bg-nutrition transition-[width]"
            style={{ width: `${Math.min((value / target) * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function FallbackUI() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Nutrition" subtitle="Connect Supabase to use." accentHex={ACCENT_HEX.nutrition} />
    </div>
  );
}
