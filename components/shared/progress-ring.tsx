"use client";

import { motion } from "motion/react";

/**
 * Circular progress ring — SVG-based, theme-aware.
 */
export function ProgressRing({
  value,
  size = 48,
  strokeWidth = 4,
  className = "",
  showLabel = false,
  labelClassName = "",
}: {
  value: number; // 0..100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  labelClassName?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-foreground/10"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      {showLabel && (
        <span
          className={`absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold tabular-nums text-foreground ${labelClassName}`}
        >
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
