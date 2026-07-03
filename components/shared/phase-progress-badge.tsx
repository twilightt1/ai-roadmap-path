"use client";

import { ProgressRing } from "./progress-ring";
import { useProgress } from "@/lib/progress";

/**
 * Phase progress ring — small badge showing the phase's % completion.
 * Used on phase cards and roadmap page.
 */
export function PhaseProgressBadge({
  phaseSlug,
  size = 32,
}: {
  phaseSlug: string;
  size?: number;
}) {
  const { stats, hydrated } = useProgress();
  const phase = stats.phaseProgress.find((p) => p.slug === phaseSlug);
  if (!hydrated || !phase || phase.total === 0) return null;

  return (
    <ProgressRing
      value={phase.percent}
      size={size}
      strokeWidth={3}
      showLabel
      labelClassName="text-[9px] font-bold"
    />
  );
}
