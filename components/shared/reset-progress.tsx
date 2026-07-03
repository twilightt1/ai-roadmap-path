"use client";

import { useState } from "react";
import { RotateCcw, Check } from "lucide-react";
import { useProgress } from "@/lib/progress";

/**
 * Reset progress button — clears all completed topics with a confirm step.
 */
export function ResetProgress() {
  const { reset, hydrated } = useProgress();
  const [confirming, setConfirming] = useState(false);

  if (!hydrated) return null;

  if (confirming) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Xóa toàn bộ?</span>
        <button
          type="button"
          onClick={() => {
            reset();
            setConfirming(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-mono font-semibold text-rose-400 transition-colors hover:bg-rose-500/15"
        >
          <Check className="h-3.5 w-3.5" /> Có, xóa
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-3 py-1.5 text-xs font-mono font-semibold text-muted-foreground transition-colors hover:bg-foreground/10"
        >
          Hủy
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-3 py-1.5 text-xs font-mono font-semibold text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
    >
      <RotateCcw className="h-3.5 w-3.5" /> Xóa tiến độ
    </button>
  );
}
