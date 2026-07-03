"use client";

import { motion, AnimatePresence } from "motion/react";
import { Check, CheckCircle2 } from "lucide-react";
import { useProgress } from "@/lib/progress";

/**
 * Mark-as-complete toggle button for topic pages.
 * Shows a checkmark when complete, an outline when not.
 */
export function ProgressToggle({
  phaseSlug,
  topicId,
  label = "Đánh dấu hoàn thành",
  doneLabel = "Đã hoàn thành",
}: {
  phaseSlug: string;
  topicId: string;
  label?: string;
  doneLabel?: string;
}) {
  const { isCompleted, toggle, hydrated } = useProgress();
  const done = isCompleted(phaseSlug, topicId);

  return (
    <button
      type="button"
      onClick={() => toggle(phaseSlug, topicId)}
      disabled={!hydrated}
      aria-pressed={done}
      className={`group relative inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-mono font-semibold transition-all duration-200 disabled:opacity-50 ${
        done
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
          : "border-border bg-foreground/5 text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.span
            key="done"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="flex items-center gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            {doneLabel}
          </motion.span>
        ) : (
          <motion.span
            key="todo"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
