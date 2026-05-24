import { getTerm } from "@/lib/glossary";

type Props = {
  term: string;
  /** "abbr" shows only the abbreviation with a tooltip. "full" shows full term. "first" shows "Full (ABBR)". */
  variant?: "abbr" | "full" | "first";
  className?: string;
};

/**
 * Renders a fitness term with its native HTML <abbr> tooltip.
 * Mobile users get the explanation by long-pressing.
 */
export function Term({ term, variant = "abbr", className }: Props) {
  const entry = getTerm(term);
  if (!entry) return <span className={className}>{term}</span>;

  const label =
    variant === "full"
      ? entry.full
      : variant === "first"
      ? `${entry.full} (${entry.abbr})`
      : entry.abbr;

  return (
    <abbr
      title={`${entry.full} — ${entry.short}`}
      className={`cursor-help underline decoration-dotted decoration-text-tertiary underline-offset-2 ${className ?? ""}`}
    >
      {label}
    </abbr>
  );
}
