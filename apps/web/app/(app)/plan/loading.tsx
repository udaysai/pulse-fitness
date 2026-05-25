export default function PlanLoading() {
  return (
    <div className="mx-auto max-w-md px-5 pt-8 animate-pulse space-y-4">
      <div className="space-y-2">
        <div className="h-7 w-32 rounded bg-surface" />
        <div className="h-3 w-64 rounded bg-surface" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="h-14 rounded-[var(--radius-card)] bg-surface" />
        <div className="h-14 rounded-[var(--radius-card)] bg-surface" />
        <div className="h-14 rounded-[var(--radius-card)] bg-surface" />
      </div>
      <div className="space-y-2 pt-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-16 rounded-[var(--radius-card)] bg-surface" />
        ))}
      </div>
    </div>
  );
}
