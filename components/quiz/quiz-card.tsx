"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Brain,
  Check,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProgress } from "@/lib/progress";
import { QUIZ_PASS_THRESHOLD, type Quiz } from "@/lib/quiz-types";

/**
 * Quiz cuối bài — trắc nghiệm, tự chấm và lưu kết quả qua progress store.
 * Pass (≥ QUIZ_PASS_THRESHOLD) → tự động mark topic hoàn thành.
 *
 * UI model theo `feature-checklist.tsx`: button options với neutral→emerald swap,
 * animated progress bar, AnimatePresence badge khi pass.
 */
export function QuizCard({
  quiz,
  phaseSlug,
  topicId,
}: {
  quiz: Quiz;
  phaseSlug: string;
  topicId: string;
}) {
  const { setQuizResult, getQuizResult, hydrated } = useProgress();
  const reduceMotion = useReducedMotion();

  const total = quiz.questions.length;
  // answers[i] = index option đã chọn cho câu i, hoặc null nếu chưa chọn.
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => quiz.questions.map(() => null)
  );
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => {
    if (!submitted) return 0;
    return quiz.questions.reduce(
      (acc, q, i) => acc + (answers[i] === q.answerIndex ? 1 : 0),
      0
    );
  }, [submitted, answers, quiz.questions]);

  const percent = total === 0 ? 0 : Math.round((score / total) * 100);
  const passed = submitted && score / total >= QUIZ_PASS_THRESHOLD;
  const allAnswered = answers.every((a) => a !== null);

  const previousResult = hydrated ? getQuizResult(phaseSlug, topicId) : undefined;

  const select = (qi: number, optionIndex: number) => {
    if (submitted) return; // khóa sau khi nộp
    setAnswers((prev) => {
      const next = [...prev];
      next[qi] = optionIndex;
      return next;
    });
  };

  const submit = () => {
    if (!allAnswered || submitted) return;
    setSubmitted(true);
    const finalScore = quiz.questions.reduce(
      (acc, q, i) => acc + (answers[i] === q.answerIndex ? 1 : 0),
      0
    );
    setQuizResult(phaseSlug, topicId, finalScore, total, {
      answers,
      completedAt: new Date().toISOString(),
    });
  };

  const retry = () => {
    setAnswers(quiz.questions.map(() => null));
    setSubmitted(false);
  };

  return (
    <Card className="overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-foreground/[0.02] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-4.5 w-4.5 text-primary" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-foreground">Quiz cuối bài</h2>
            <p className="text-[11px] font-mono text-muted-foreground/70">
              {total} câu · vượt qua ≥ {Math.round(QUIZ_PASS_THRESHOLD * 100)}%
            </p>
          </div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {submitted && (
            <motion.span
              key={passed ? "pass" : "fail"}
              initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduceMotion ? undefined : { scale: 0.6, opacity: 0 }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-mono font-semibold ${
                passed
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-400"
              }`}
            >
              {passed ? (
                <>
                  <Trophy className="h-3.5 w-3.5" />
                  Đã vượt qua
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Thử lại
                </>
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Score summary bar (chỉ hiện sau submit) */}
      <AnimatePresence initial={false}>
        {submitted && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  {score}/{total} đúng · {percent}%
                </span>
                {passed && (
                  <span className="text-[11px] font-mono text-emerald-400">
                    Đã đánh dấu bài này hoàn thành
                  </span>
                )}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <motion.div
                  initial={reduceMotion ? false : { width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className={`h-full rounded-full ${
                    passed ? "bg-emerald-500" : "bg-primary"
                  }`}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Best score (nếu đã làm trước, chưa submit lượt này) */}
      {!submitted && previousResult && (
        <div className="border-b border-border/60 bg-muted/30 px-5 py-2 text-[11px] font-mono text-muted-foreground">
          Lần làm trước: {previousResult.score}/{previousResult.total}
          {previousResult.passedAt && " · đã vượt qua"} · {previousResult.attempts} lần nộp
        </div>
      )}

      {/* Questions */}
      <ol className="divide-y divide-border/60">
        {quiz.questions.map((q, qi) => {
          const selected = answers[qi];
          const isCorrect = submitted && selected === q.answerIndex;
          return (
            <li key={q.id} className="px-5 py-4">
              <div className="mb-3 flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-foreground/8 font-mono text-[10px] font-bold text-muted-foreground">
                  {qi + 1}
                </span>
                <p className="text-sm font-medium leading-relaxed text-foreground">
                  {q.prompt}
                </p>
              </div>

              <ul className="space-y-1.5 pl-7">
                {q.options.map((opt, oi) => {
                  const isSelected = selected === oi;
                  const isAnswer = submitted && oi === q.answerIndex;
                  // Sai khi submit: option được chọn nhưng không phải đáp án
                  const wrongSelected = submitted && isSelected && oi !== q.answerIndex;
                  return (
                    <li key={oi}>
                      <button
                        type="button"
                        onClick={() => select(qi, oi)}
                        disabled={submitted}
                        aria-pressed={isSelected}
                        className={`group flex w-full items-start gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-all duration-200 disabled:cursor-default ${
                          isAnswer
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : wrongSelected
                              ? "border-destructive/40 bg-destructive/5"
                              : isSelected
                                ? "border-primary/40 bg-primary/5"
                                : "border-border bg-foreground/[0.02] hover:border-primary/30 hover:bg-foreground/[0.06]"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                            isAnswer
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : wrongSelected
                                ? "border-destructive bg-destructive text-white"
                                : isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-transparent group-hover:border-primary/50"
                          }`}
                        >
                          {isAnswer ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : wrongSelected ? (
                            <XCircle className="h-3.5 w-3.5" />
                          ) : isSelected ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : null}
                        </span>
                        <span
                          className={`text-xs leading-relaxed ${
                            isAnswer
                              ? "text-foreground"
                              : wrongSelected
                                ? "text-foreground"
                                : isSelected
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                          }`}
                        >
                          {opt}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Explanation sau submit */}
              <AnimatePresence initial={false}>
                {submitted && q.explanation && (
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 ml-7 flex gap-2 rounded-lg border-l-2 border-primary/40 bg-primary/[0.04] py-2 pl-3 pr-2.5">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {q.explanation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Per-question correctness marker */}
              <AnimatePresence initial={false}>
                {submitted && (
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 ml-7 flex items-center gap-1.5 text-[11px] font-mono"
                  >
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Chính xác
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <XCircle className="h-3.5 w-3.5" /> Chưa đúng
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>

      {/* Footer: submit / retry */}
      <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-foreground/[0.02] px-5 py-3.5">
        {!submitted ? (
          <Button
            onClick={submit}
            disabled={!allAnswered || !hydrated}
            size="lg"
            className="px-5"
          >
            Kiểm tra
          </Button>
        ) : (
          <Button onClick={retry} variant="outline" size="lg" className="gap-1.5 px-4">
            <RotateCcw className="h-3.5 w-3.5" />
            Làm lại
          </Button>
        )}
      </div>
    </Card>
  );
}
