"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Lightbulb,
  CheckCircle2,
  Circle,
  ChevronDown,
} from "lucide-react";
import { ChallengeEditor } from "./challenge-editor";
import {
  CHALLENGE_CATEGORIES,
  type Challenge,
} from "@/lib/challenge-types";
import { useProgress } from "@/lib/progress";
import { MdxContent } from "@/components/roadmap/mdx-content";
import { cn } from "@/lib/utils";
import { BookmarkButton } from "@/components/library/bookmark-button";
import { SolutionWalkthroughPanel } from "./solution-walkthrough-panel";
import { PracticeLadderPanel } from "@/components/practice-ladder/practice-ladder-panel";
import type { LearnerSafePracticeLadder } from "@/lib/practice-ladder-types";

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
  medium: "border-amber-500/30 text-amber-400 bg-amber-500/5",
  hard: "border-rose-500/30 text-rose-400 bg-rose-500/5",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/**
 * Trang detail challenge — layout 2-col lg+ (trái: description + hint,
 * phải: editor + test results). Stacked mobile.
 */
export function ChallengeView({
  challenge,
  ladder,
}: {
  challenge: Challenge;
  ladder: LearnerSafePracticeLadder | null;
}) {
  const { isChallengeSolved, getChallengeResult, recordPracticeEvent, setChallengeResult, hydrated } = useProgress();
  const [showHint, setShowHint] = useState(false);

  const solved = hydrated && isChallengeSolved(challenge.id);
  const attempts = getChallengeResult(challenge.id)?.attempts ?? 0;
  const cat = CHALLENGE_CATEGORIES[challenge.category];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Breadcrumb + back */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/practice"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tất cả challenge
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider",
                cat.color,
                "border-current/20"
              )}
            >
              {cat.label}
            </span>
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider",
                DIFFICULTY_STYLES[challenge.difficulty]
              )}
            >
              {DIFFICULTY_LABELS[challenge.difficulty]}
            </span>
            {solved && (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Đã giải
              </span>
            )}
          </div>
          <BookmarkButton
            targetType="challenge"
            targetSlug={challenge.id}
            label="Lưu challenge"
            savedLabel="Đã lưu challenge"
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {challenge.title}
        </h1>
      </div>

      {/* Main layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,1.1fr)]">
        {/* Left: description + hint */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-card/30 p-5">
            <article className="prose prose-sm prose-invert max-w-none prose-headings:scroll-mt-20 prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-6 prose-h2:text-base prose-h3:text-sm prose-p:text-sm prose-p:leading-relaxed prose-li:text-sm prose-code:rounded prose-code:bg-foreground/10 prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-pre:bg-foreground/[0.03] prose-pre:text-xs">
              <MdxContent source={challenge.description} />
            </article>
          </div>

          {ladder && <PracticeLadderPanel ladder={ladder} />}

          {/* Hint (collapsible) */}
          {!ladder && challenge.hint && (
            <div className="rounded-xl border border-border/60 bg-card/30 p-4">
              <button
                onClick={() => setShowHint(!showHint)}
                className="flex w-full items-center gap-2 text-sm font-medium text-foreground"
              >
                <Lightbulb className="h-4 w-4 text-amber-400" />
                Gợi ý
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 text-muted-foreground transition-transform",
                    showHint && "rotate-180"
                  )}
                />
              </button>
              {showHint && (
                <p className="mt-3 pl-6 text-sm text-muted-foreground">
                  {challenge.hint}
                </p>
              )}
            </div>
          )}

          <SolutionWalkthroughPanel
            challengeId={challenge.id}
            solved={solved}
            submitCount={attempts}
          />

          {/* Status */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {solved ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Bạn đã giải challenge này</span>
              </>
            ) : (
              <>
                <Circle className="h-4 w-4 text-muted-foreground/40" />
                <span>Chưa giải — submit để ghi nhận</span>
              </>
            )}
          </div>
        </div>

        {/* Right: editor + test results */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border/60 bg-card/30 p-4">
            <ChallengeEditor
              starterCode={challenge.starterCode}
              testCases={challenge.testCases}
              persistKey={`ai-roadmap:challenge-code:${challenge.id}`}
              challengeId={challenge.id}
              challengeTitle={challenge.title}
              onRun={() =>
                recordPracticeEvent({
                  challengeId: challenge.id,
                  contentVersion: ladder?.contentVersion ?? null,
                  eventType: "run",
                  step: "independent_challenge",
                })
              }
              onSubmit={({ code, result, passed }) => {
                setChallengeResult(challenge.id, passed, {
                  code,
                  language: "python",
                  testResults: result,
                  submittedAt: new Date().toISOString(),
                  durationSeconds:
                    typeof result.durationMs === "number"
                      ? result.durationMs / 1000
                      : undefined,
                });
                recordPracticeEvent({
                  challengeId: challenge.id,
                  contentVersion: ladder?.contentVersion ?? null,
                  eventType: "submit",
                  step: "independent_challenge",
                  passed,
                });
                if (passed) {
                  recordPracticeEvent({
                    challengeId: challenge.id,
                    contentVersion: ladder?.contentVersion ?? null,
                    eventType: "challenge_passed",
                    step: "independent_challenge",
                    passed: true,
                  });
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
