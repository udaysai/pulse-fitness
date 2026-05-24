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
        "relative flex flex-col gap-2 rounded-[var(--radius-card)] bg-surface p-4",
        "border border-hairline transition-colors duration-300",
        className
      )}
      style={{ borderColor: `${accentHex}1f` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
        {trend !== undefined && <MetricTrendPill value={trend} accent={accent} />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="metric text-[22px] font-semibold leading-none">{displayValue}</span>
        {unit && <span className="text-xs text-text-secondary">{unit}</span>}
      </div>
    </div>
  );
}
