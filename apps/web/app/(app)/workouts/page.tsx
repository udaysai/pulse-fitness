import { Dumbbell, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ACCENT_HEX } from "@/lib/design/accents";

export default function WorkoutsPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Workouts"
        subtitle="Your training history and weekly plan."
        accentHex={ACCENT_HEX.workout}
      />
      <div className="px-5 pt-4">
        <EmptyState
          icon={Dumbbell}
          title="No workouts logged yet"
          body="Log a workout manually or import from Apple Health to see your history here."
          accentHex={ACCENT_HEX.workout}
        >
          <PrimaryButton accent="workout">
            <Plus className="size-4" /> Log workout
          </PrimaryButton>
        </EmptyState>
      </div>
    </div>
  );
}
