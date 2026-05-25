export default function SessionLoading() {
  return (
    <div className="mx-auto max-w-md px-5 pt-6 animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-surface" />
        <div className="h-7 w-56 rounded bg-surface" />
        <div className="h-3 w-72 rounded bg-surface" />
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface" />
      <div className="h-16 rounded-[var(--radius-card)] bg-surface" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="aspect-square w-full rounded-2xl bg-surface" />
          <div className="h-5 w-2/3 rounded bg-surface" />
          <div className="h-24 rounded-[var(--radius-card)] bg-surface" />
        </div>
      ))}
    </div>
  );
}
