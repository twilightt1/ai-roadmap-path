"use client";

import { useEffect, useRef, useState } from "react";
import type { LearnerSafePracticeLadder } from "@/lib/practice-ladder-types";
import { CodeExercise } from "./code-exercise";
import { emitPlatformEvent } from "@/lib/observability/client";
import { useProgress } from "@/lib/progress";

export function PracticeLadderPanel({ ladder }: { ladder: LearnerSafePracticeLadder }) {
  const { recordPracticeEvent } = useProgress();
  const [recallAnswer, setRecallAnswer] = useState<number | null>(null);
  const [showExample, setShowExample] = useState(false);
  const [openHints, setOpenHints] = useState<Set<number>>(new Set());
  const [scaffoldPassed, setScaffoldPassed] = useState(false);
  const [transferPassed, setTransferPassed] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    recordPracticeEvent({
      challengeId: ladder.challengeId,
      contentVersion: ladder.contentVersion,
      eventType: "challenge_started",
      step: "recall",
    });
    emitPlatformEvent({ name: "practice.step", outcome: "started", metadata: { status: "recall" } });
  }, [ladder.challengeId, ladder.contentVersion, recordPracticeEvent]);

  return (
    <section className="space-y-4 rounded-xl border border-primary/25 bg-primary/[0.03] p-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Practice Ladder</p>
        <h2 className="mt-1 text-base font-semibold">Luyện từng bước trước khi tự giải</h2>
      </div>

      <div className="rounded-lg border border-border/60 bg-card/30 p-3">
        <h3 className="text-sm font-semibold">1. Recall</h3>
        <p className="mt-1 text-sm text-muted-foreground">{ladder.recall.prompt}</p>
        <div className="mt-2 space-y-1">
          {ladder.recall.options.map((option, index) => (
            <button
              key={option}
              onClick={() => {
                setRecallAnswer(index);
                recordPracticeEvent({
                  challengeId: ladder.challengeId,
                  contentVersion: ladder.contentVersion,
                  eventType: "step_completed",
                  step: "recall",
                  passed: index === ladder.recall.correctOption,
                });
                emitPlatformEvent({
                  name: "practice.step",
                  outcome: "completed",
                  metadata: { status: "recall", reason: index === ladder.recall.correctOption ? "passed" : "not-passed" },
                });
              }}
              aria-pressed={recallAnswer === index}
              className="block w-full rounded border border-border/60 px-2 py-1.5 text-left text-xs hover:border-primary/50"
            >
              {option}
            </button>
          ))}
        </div>
        {recallAnswer !== null && (
          <p className={`mt-2 text-xs ${recallAnswer === ladder.recall.correctOption ? "text-emerald-400" : "text-amber-400"}`}>
            {ladder.recall.explanation}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-card/30 p-3">
        <h3 className="text-sm font-semibold">2. Worked example</h3>
        <p className="mt-1 text-sm text-muted-foreground">{ladder.workedExample.prompt}</p>
        <button onClick={() => setShowExample(!showExample)} className="mt-2 text-xs font-medium text-primary">
          {showExample ? "Ẩn lời giải thích" : "Xem ví dụ và giải thích"}
        </button>
        {showExample && <><pre className="mt-2 overflow-x-auto rounded bg-foreground/[0.05] p-2 text-xs"><code>{ladder.workedExample.code}</code></pre><p className="mt-2 text-xs text-muted-foreground">{ladder.workedExample.explanation}</p></>}
      </div>

      <CodeExercise
        step={ladder.scaffold}
        title={`3. Scaffolded exercise${scaffoldPassed ? " — Đã hoàn thành" : ""}`}
        onPassed={() => {
          setScaffoldPassed(true);
          recordPracticeEvent({ challengeId: ladder.challengeId, contentVersion: ladder.contentVersion, eventType: "step_completed", step: "scaffold", passed: true });
        }}
      />

      <div className="rounded-lg border border-border/60 bg-card/30 p-3">
        <h3 className="text-sm font-semibold">4. Gợi ý theo tầng</h3>
        <p className="mt-1 text-xs text-muted-foreground">Chỉ mở mức hỗ trợ bạn cần; Hint 3 sẽ được tính là guided completion.</p>
        <div className="mt-2 space-y-2">
          {ladder.hints.map((hint) => (
            <div key={hint.level}>
              <button
                onClick={() => setOpenHints((current) => {
                  const next = new Set(current);
                  if (next.has(hint.level)) next.delete(hint.level); else {
                    next.add(hint.level);
                    recordPracticeEvent({
                      challengeId: ladder.challengeId,
                      contentVersion: ladder.contentVersion,
                      eventType: "hint_opened",
                      step: "independent_challenge",
                      hintLevel: hint.level,
                    });
                  }
                  return next;
                })}
                aria-expanded={openHints.has(hint.level)}
                className="text-xs font-medium text-primary"
              >
                Hint {hint.level}: {hint.title}
              </button>
              {openHints.has(hint.level) && <p className="mt-1 text-xs text-muted-foreground">{hint.content}</p>}
            </div>
          ))}
        </div>
      </div>

      <CodeExercise
        step={ladder.transfer}
        title={`5. Transfer exercise${transferPassed ? " — Đã hoàn thành" : ""}`}
        onPassed={() => {
          setTransferPassed(true);
          recordPracticeEvent({ challengeId: ladder.challengeId, contentVersion: ladder.contentVersion, eventType: "transfer_passed", step: "transfer", passed: true });
        }}
      />
    </section>
  );
}
