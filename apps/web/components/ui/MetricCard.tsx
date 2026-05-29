import { cn, formatNumber } from "@/lib/utils";
import { ACCENT_HEX, type DomainAccent } from "@/lib/design/accents";
import { MetricTrendPill } from "./MetricTrendPill";

type Props = {
  label: string;
  value: number | string;
  unit?: string;
  accent: DomainAccent;
  trend?: number;
  className?: string;
};

export function MetricCard({ label, value, unit, accent, trend, className }: Props) {
  const accentHex = ACCENT_HEX[accent];
  const displayValue = typeof value === "number" ? formatNumber(value) : value;

  return (
    <div
      className={cn(
        "surface-elevated relative flex flex-col gap-2 overflow-hidden rounded-[var(--radius-card)] bg-surface p-4",
        "border border-hairline transition-transform duration-300 hover:-translate-y-0.5",
        className
      )}
      style={{ borderColor: `${accentHex}24` }}
    >
      {/* accent corner glow */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-16 rounded-full blur-2xl"
        style={{ backgroundColor: `${accentHex}2e` }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
        {trend !== undefined && <MetricTrendPill value={trend} accent={accent} />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="metric text-[24px] font-semibold leading-none">{displayValue}</span>
        {unit && <span className="text-xs text-text-secondary">{unit}</span>}
      </div>
    </div>
  );
}
