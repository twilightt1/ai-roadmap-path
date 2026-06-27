import type { AccentColor, Difficulty } from "./types";

/**
 * Map accent color -> các class Tailwind để dùng cho phase node/card.
 * Trả về cả text/bg/border/glow để component linh hoạt.
 */
export const accentMap: Record<
  AccentColor,
  {
    text: string;
    bg: string;
    bgSoft: string;
    border: string;
    ring: string;
    glow: string;
    gradient: string;
    dot: string;
  }
> = {
  violet: {
    text: "text-violet-300",
    bg: "bg-violet-500",
    bgSoft: "bg-violet-500/10",
    border: "border-violet-500/40",
    ring: "ring-violet-500/40",
    glow: "shadow-[0_0_25px_-6px] shadow-violet-500/50",
    gradient: "from-violet-500 to-purple-600",
    dot: "bg-violet-400",
  },
  cyan: {
    text: "text-cyan-300",
    bg: "bg-cyan-500",
    bgSoft: "bg-cyan-500/10",
    border: "border-cyan-500/40",
    ring: "ring-cyan-500/40",
    glow: "shadow-[0_0_25px_-6px] shadow-cyan-500/50",
    gradient: "from-cyan-500 to-blue-600",
    dot: "bg-cyan-400",
  },
  emerald: {
    text: "text-emerald-300",
    bg: "bg-emerald-500",
    bgSoft: "bg-emerald-500/10",
    border: "border-emerald-500/40",
    ring: "ring-emerald-500/40",
    glow: "shadow-[0_0_25px_-6px] shadow-emerald-500/50",
    gradient: "from-emerald-500 to-teal-600",
    dot: "bg-emerald-400",
  },
  amber: {
    text: "text-amber-300",
    bg: "bg-amber-500",
    bgSoft: "bg-amber-500/10",
    border: "border-amber-500/40",
    ring: "ring-amber-500/40",
    glow: "shadow-[0_0_25px_-6px] shadow-amber-500/50",
    gradient: "from-amber-500 to-orange-600",
    dot: "bg-amber-400",
  },
  rose: {
    text: "text-rose-300",
    bg: "bg-rose-500",
    bgSoft: "bg-rose-500/10",
    border: "border-rose-500/40",
    ring: "ring-rose-500/40",
    glow: "shadow-[0_0_25px_-6px] shadow-rose-500/50",
    gradient: "from-rose-500 to-pink-600",
    dot: "bg-rose-400",
  },
  sky: {
    text: "text-sky-300",
    bg: "bg-sky-500",
    bgSoft: "bg-sky-500/10",
    border: "border-sky-500/40",
    ring: "ring-sky-500/40",
    glow: "shadow-[0_0_25px_-6px] shadow-sky-500/50",
    gradient: "from-sky-500 to-indigo-600",
    dot: "bg-sky-400",
  },
  fuchsia: {
    text: "text-fuchsia-300",
    bg: "bg-fuchsia-500",
    bgSoft: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/40",
    ring: "ring-fuchsia-500/40",
    glow: "shadow-[0_0_25px_-6px] shadow-fuchsia-500/50",
    gradient: "from-fuchsia-500 to-pink-600",
    dot: "bg-fuchsia-400",
  },
};

export const difficultyMap: Record<
  Difficulty,
  { label: string; emoji: string; text: string; bg: string; border: string }
> = {
  easy: {
    label: "Easy",
    emoji: "🟢",
    text: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  medium: {
    label: "Medium",
    emoji: "🟡",
    text: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  hard: {
    label: "Hard",
    emoji: "🔴",
    text: "text-rose-300",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
  },
};

/** Trả về component icon động từ lucide-react theo tên trong data */
export function getPhaseIcon(name: string) {
  return name;
}
