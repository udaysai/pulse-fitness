import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { ACCENT_HEX, type DomainAccent } from "@/lib/design/accents";

type Props = {
  value: number; // -1.0 .. 1.0 (or percentage change as decimal)
  accent: DomainAccent;
};

export function MetricTrendPill({ value, accent }: Props) {
  const accentHex = ACCENT_HEX[accent];
  const Icon = value > 0.02 ? ArrowUp : value < -0.02 ? ArrowDown : ArrowRight;
  const label = `${value > 0 ? "+" : ""}${(value * 100).toFixed(0)}%`;

  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: `${accentHex}1f`, color: accentHex }}
    >
      <Icon className="size-2.5" strokeWidth={2.5} />
      {label}
    </span>
  );
}
