"use client";

import { motion } from "framer-motion";
import { ACCENT_HEX, type DomainAccent } from "@/lib/design/accents";
import { clamp } from "@/lib/utils";

type Props = {
  progress: number; // 0..1
  accent: DomainAccent;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
};

export function RingProgress({
  progress,
  accent,
  size = 160,
  strokeWidth = 12,
  children,
}: Props) {
  const accentHex = ACCENT_HEX[accent];
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = clamp(progress, 0, 1);
  const dashOffset = circumference * (1 - clamped);
  const gradId = `ring-grad-${accent}`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentHex} stopOpacity={0.7} />
            <stop offset="100%" stopColor={accentHex} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`${accentHex}1f`}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${accentHex}80)` }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}
