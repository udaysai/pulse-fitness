"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ACCENT_HEX, type DomainAccent } from "@/lib/design/accents";
import { cn } from "@/lib/utils";

type CommonProps = {
  children: React.ReactNode;
  accent?: DomainAccent;
  disabled?: boolean;
  className?: string;
  variant?: "filled" | "outline";
};

type ButtonProps = CommonProps & {
  href?: undefined;
  onClick?: () => void;
  type?: "button" | "submit";
};

type LinkProps = CommonProps & {
  href: string;
  onClick?: never;
  type?: never;
};

type Props = ButtonProps | LinkProps;

const TAP = { scale: 0.97 };
const SPRING = { type: "spring", stiffness: 600, damping: 30 } as const;

export function PrimaryButton(props: Props) {
  const { children, accent = "workout", disabled, className, variant = "filled" } = props;
  const accentHex = ACCENT_HEX[accent];

  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-card)] px-5 py-3 text-sm font-semibold",
    "transition-[transform,box-shadow,background-color] disabled:opacity-40 disabled:cursor-not-allowed select-none",
    variant === "filled"
      ? "text-white"
      : "border border-hairline text-text-primary bg-transparent hover:bg-surface",
    disabled && "pointer-events-none",
    className,
  );

  const style =
    variant === "filled"
      ? {
          backgroundImage: `linear-gradient(180deg, ${accentHex}, ${accentHex}d9)`,
          boxShadow: `0 6px 20px -8px ${accentHex}, inset 0 1px 0 0 rgb(255 255 255 / 0.18)`,
        }
      : undefined;

  if ("href" in props && props.href) {
    return (
      <motion.div whileTap={TAP} transition={SPRING} className="inline-flex">
        <Link href={props.href} className={classes} style={style} aria-disabled={disabled}>
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={disabled}
      whileTap={TAP}
      transition={SPRING}
      className={classes}
      style={style}
    >
      {children}
    </motion.button>
  );
}
