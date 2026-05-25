import { cn } from "@/lib/utils";
import { ExerciseDemo } from "@/components/training/ExerciseDemo";

type Props = {
  name: string;
  primaryMuscle: string;
  sets: number;
  reps: string;
  demoGifUrl?: string;
  className?: string;
};

export function ExerciseCard({ name, primaryMuscle, sets, reps, demoGifUrl, className }: Props) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-[var(--radius-card)] bg-surface p-3 border border-hairline",
        className
      )}
    >
      <ExerciseDemo src={demoGifUrl ?? null} alt={`${name} form demo`} className="size-16 rounded-xl" />
      <div className="flex flex-1 flex-col justify-center gap-0.5 min-w-0">
        <div className="truncate text-sm font-semibold">{name}</div>
        <div className="text-[11px] uppercase tracking-wider text-text-tertiary">{primaryMuscle}</div>
      </div>
      <div className="flex flex-col items-end justify-center">
        <div className="metric text-sm font-semibold">
          {sets}×{reps}
        </div>
        <div className="text-[10px] text-text-tertiary">sets × reps</div>
      </div>
    </div>
  );
}
