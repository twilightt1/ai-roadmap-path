"use client";

import { motion, AnimatePresence } from "motion/react";
import { Check, CheckCircle2, Trophy } from "lucide-react";
import { useProgress } from "@/lib/progress";

/**
 * Feature checklist for a project — shows progress bar and toggleable checkboxes.
 * A project is "done" when all features are checked.
 */
export function FeatureChecklist({
  projectId,
  features,
}: {
  projectId: string;
  features: string[];
}) {
  const { isFeatureDone, toggleFeature, hydrated } = useProgress();
  const total = features.length;
  const doneCount = features.filter((_, i) => isFeatureDone(projectId, i)).length;
  const allDone = doneCount === total;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  return (
    <div data-testid="feature-checklist" className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">Tính năng cần làm</h3>
            <p className="text-[11px] font-mono text-muted-foreground/70">
              {doneCount}/{total} · {percent}%
            </p>
          </div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {allDone && (
            <motion.span
              key="done"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-mono font-semibold text-emerald-400"
            >
              <Trophy className="h-3.5 w-3.5" />
              Đã hoàn thành
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <motion.div
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full ${allDone ? "bg-emerald-500" : "bg-primary"}`}
        />
      </div>

      {/* Feature list */}
      <ul className="space-y-1.5">
        {features.map((f, i) => {
          const done = isFeatureDone(projectId, i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggleFeature(projectId, i)}
                disabled={!hydrated}
                aria-pressed={done}
                className={`group flex w-full items-start gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-all duration-200 disabled:opacity-50 ${
                  done
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border bg-foreground/5 hover:border-primary/30 hover:bg-foreground/10"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border bg-background text-transparent group-hover:border-primary/50"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span
                  className={`text-xs leading-relaxed ${done ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {f}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
