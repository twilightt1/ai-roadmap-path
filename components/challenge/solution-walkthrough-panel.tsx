"use client";

import { useState } from "react";
import { BookOpenCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChallengeSolutionPayload } from "@/lib/challenge-solution";
import { useProgress } from "@/lib/progress";

export function SolutionWalkthroughPanel({
  challengeId,
  solved,
  submitCount,
}: {
  challengeId: string;
  solved: boolean;
  submitCount: number;
}) {
  const { recordPracticeEvent } = useProgress();
  const unlocked = solved || submitCount >= 3;
  const [payload, setPayload] = useState<ChallengeSolutionPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openWalkthrough() {
    if (!unlocked || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/challenges/${challengeId}/solution`);
      if (!response.ok) throw new Error("Không tải được lời giải. Hãy thử lại.");
      setPayload((await response.json()) as ChallengeSolutionPayload);
      recordPracticeEvent({ challengeId, eventType: "walkthrough_opened", step: "independent_challenge" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  if (!unlocked) {
    return (
      <section className="rounded-xl border border-border/60 bg-card/30 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
          Solution Walkthrough đang khóa
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Giải challenge hoặc submit chưa đúng {Math.max(0, 3 - submitCount)} lần nữa để mở lời giải có hướng dẫn.
        </p>
      </section>
    );
  }

  if (!payload) {
    return (
      <section className="rounded-xl border border-border/60 bg-card/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Solution Walkthrough</h2>
            <p className="mt-1 text-xs text-muted-foreground">Xem cách tiếp cận trước, code tham khảo ở cuối.</p>
          </div>
          <Button onClick={openWalkthrough} disabled={loading} size="sm">
            {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Mở lời giải
          </Button>
        </div>
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      </section>
    );
  }

  const walkthrough = payload.solutionWalkthrough;
  return (
    <section className="space-y-4 rounded-xl border border-border/60 bg-card/30 p-4">
      <h2 className="text-sm font-semibold">Solution Walkthrough</h2>
      {walkthrough && (
        <>
          <div><h3 className="text-xs font-semibold">Approach</h3><p className="mt-1 text-sm text-muted-foreground">{walkthrough.approach}</p></div>
          <div><h3 className="text-xs font-semibold">Các bước</h3><ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">{walkthrough.steps.map((step) => <li key={step}>{step}</li>)}</ol></div>
          {walkthrough.commonMistakes.length > 0 && <div><h3 className="text-xs font-semibold">Lỗi thường gặp</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{walkthrough.commonMistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}</ul></div>}
          {walkthrough.complexity && <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Complexity: </span>{walkthrough.complexity}</p>}
        </>
      )}
      <div><h3 className="text-xs font-semibold">Reference solution</h3><pre className="mt-2 overflow-x-auto rounded-lg bg-foreground/[0.05] p-3 text-xs"><code>{payload.solution}</code></pre></div>
    </section>
  );
}
