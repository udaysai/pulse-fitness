import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  body: string;
  accentHex: string;
  className?: string;
  children?: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, body, accentHex, className, children }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-hairline bg-surface p-8 text-center",
        className
      )}
      style={{ borderColor: `${accentHex}1f` }}
    >
      <div
        className="grid size-12 place-items-center rounded-2xl"
        style={{ backgroundColor: `${accentHex}1a` }}
      >
        <Icon className="size-5" style={{ color: accentHex }} strokeWidth={2} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="max-w-xs text-xs text-text-secondary">{body}</p>
      </div>
      {children}
    </div>
  );
}
