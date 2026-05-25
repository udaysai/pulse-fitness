export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-md px-5 pt-8 animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-surface" />
        <div className="h-7 w-48 rounded bg-surface" />
      </div>
      <div className="mx-auto size-[200px] rounded-full bg-surface" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-[var(--radius-card)] bg-surface" />
        <div className="h-20 rounded-[var(--radius-card)] bg-surface" />
        <div className="h-20 rounded-[var(--radius-card)] bg-surface" />
        <div className="h-20 rounded-[var(--radius-card)] bg-surface" />
      </div>
      <div className="h-40 rounded-[var(--radius-card)] bg-surface" />
    </div>
  );
}
