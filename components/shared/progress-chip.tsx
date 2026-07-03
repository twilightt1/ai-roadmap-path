"use client";

import { CheckCircle2 } from "lucide-react";
import { useProgress } from "@/lib/progress";

/**
 * Tiny checkmark indicator for a topic row — shows only when the topic is
 * marked complete. Used in topic lists and phase cards.
 */
export function ProgressChip({
  phaseSlug,
  topicId,
  className = "",
}: {
  phaseSlug: string;
  topicId: string;
  className?: string;
}) {
  const { isCompleted, hydrated } = useProgress();
  if (!hydrated) return null;
  if (!isCompleted(phaseSlug, topicId)) return null;

  return (
    <span className={`inline-flex items-center text-emerald-400 ${className}`}>
      <CheckCircle2 className="h-3.5 w-3.5" />
    </span>
  );
}
