"use client";

import { motion } from "framer-motion";
import { ACCENT_HEX, type DomainAccent } from "@/lib/design/accents";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  accent?: DomainAccent;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  variant?: "filled" | "outline";
};

export function PrimaryButton({
  children,
  accent = "workout",
  onClick,
  type = "button",
  disabled,
  className,
  variant = "filled",
}: Props) {
  const accentHex = ACCENT_HEX[accent];

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-card)] px-5 py-3 text-sm font-semibold",
        "transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        variant === "filled"
          ? "text-white"
          : "border border-hairline text-text-primary bg-transparent hover:bg-surface",
        className
      )}
      style={variant === "filled" ? { backgroundColor: accentHex } : undefined}
    >
      {children}
    </motion.button>
  );
}
