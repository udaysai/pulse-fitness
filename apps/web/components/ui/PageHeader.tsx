import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  accentHex?: string;
  className?: string;
};

export function PageHeader({ title, subtitle, accentHex, className }: Props) {
  return (
    <header
      className={cn("halo px-5 pt-8 pb-2", className)}
      style={accentHex ? ({ ["--halo-color" as string]: accentHex } as React.CSSProperties) : undefined}
    >
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
    </header>
  );
}
