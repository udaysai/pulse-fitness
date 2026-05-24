import { Apple, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { MetricCard } from "@/components/ui/MetricCard";
import { ACCENT_HEX } from "@/lib/design/accents";

// Mock for the visual until DB is wired
const mock = {
  todayMacros: [
    { label: "Calories", value: 1840, unit: "kcal", accent: "nutrition" as const },
    { label: "Protein", value: 132, unit: "g", accent: "nutrition" as const },
    { label: "Carbs", value: 210, unit: "g", accent: "nutrition" as const },
    { label: "Fat", value: 58, unit: "g", accent: "nutrition" as const },
  ],
};

export default function NutritionPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Nutrition"
        subtitle="Track meals and stay on macros."
        accentHex={ACCENT_HEX.nutrition}
      />
      <div className="px-5 pt-4 space-y-6">
        <section className="grid grid-cols-2 gap-3">
          {mock.todayMacros.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </section>

        <EmptyState
          icon={Apple}
          title="Log your first meal"
          body="Manual logging now; AI meal suggestions coming in Week 3."
          accentHex={ACCENT_HEX.nutrition}
        >
          <PrimaryButton accent="nutrition">
            <Plus className="size-4" /> Add meal
          </PrimaryButton>
        </EmptyState>
      </div>
    </div>
  );
}
