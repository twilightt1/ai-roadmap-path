"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Brain, Check, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DiagnosticQuestion } from "@/lib/diagnostic-assessment-types";
import { scoreDiagnosticAssessment } from "@/lib/learning-loop";
import { useLearningProfile } from "@/lib/use-learning-profile";

export function DiagnosticAssessmentClient({
  version,
  questions,
}: {
  version: string;
  questions: DiagnosticQuestion[];
}) {
  const { profile, hydrated, recordDiagnostic } = useLearningProfile();
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const allAnswered = answers.every((answer) => answer !== null);
  const result = useMemo(
    () => submitted ? scoreDiagnosticAssessment(version, questions, answers) : null,
    [answers, questions, submitted, version]
  );

  const submit = () => {
    if (!allAnswered || !hydrated || submitted) return;
    const next = scoreDiagnosticAssessment(version, questions, answers);
    recordDiagnostic(next);
    setSubmitted(true);
  };

  const retry = () => {
    setAnswers(questions.map(() => null));
    setSubmitted(false);
  };

  return (
    <div className="space-y-6">
      {profile.diagnostic.value && !submitted && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3 text-sm text-muted-foreground">
          Kết quả gần nhất: <strong className="text-foreground">
            {profile.diagnostic.value.score}/{profile.diagnostic.value.total}
          </strong>{" "}
          · hoàn thành {new Date(profile.diagnostic.value.completedAt).toLocaleDateString("vi-VN")}
        </div>
      )}

      <div className="h-2 overflow-hidden rounded-full bg-foreground/10" aria-label="Tiến độ trả lời">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${Math.round(answers.filter((answer) => answer !== null).length / questions.length * 100)}%` }}
        />
      </div>

      <ol className="space-y-4">
        {questions.map((question, questionIndex) => {
          const selected = answers[questionIndex];
          return (
            <li key={question.id} data-testid="diagnostic-question">
              <Card className="p-0">
                <div className="border-b border-border/60 px-5 py-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">
                      Phase {question.phaseNumber}
                    </span>
                    <span>{question.topicTitle}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-foreground/8 text-xs font-bold">
                      {questionIndex + 1}
                    </span>
                    <p className="text-sm font-semibold leading-relaxed text-foreground">{question.prompt}</p>
                  </div>
                </div>

                <div className="space-y-2 p-5">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = selected === optionIndex;
                    const isCorrect = submitted && optionIndex === question.answerIndex;
                    const isWrongSelection = submitted && isSelected && !isCorrect;
                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        data-testid={`diagnostic-option-${questionIndex}-${optionIndex}`}
                        aria-pressed={isSelected}
                        disabled={submitted}
                        onClick={() => setAnswers((current) => current.map((answer, index) =>
                          index === questionIndex ? optionIndex : answer
                        ))}
                        className={`flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left text-sm transition-colors disabled:cursor-default ${
                          isCorrect
                            ? "border-emerald-500/40 bg-emerald-500/[0.06]"
                            : isWrongSelection
                              ? "border-rose-500/40 bg-rose-500/[0.06]"
                              : isSelected
                                ? "border-primary/50 bg-primary/[0.06]"
                                : "border-border bg-foreground/[0.02] hover:border-primary/30"
                        }`}
                      >
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          isCorrect
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : isWrongSelection
                              ? "border-rose-500 bg-rose-500 text-white"
                              : isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border"
                        }`}>
                          {isCorrect ? <Check className="h-3.5 w-3.5" /> : isWrongSelection ? <XCircle className="h-3.5 w-3.5" /> : null}
                        </span>
                        <span className="leading-relaxed text-muted-foreground">{option}</span>
                      </button>
                    );
                  })}

                  {submitted && question.explanation && (
                    <p className="rounded-lg bg-primary/[0.04] px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                      {question.explanation}
                    </p>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ol>

      {result ? (
        <Card data-testid="diagnostic-result" className="border-emerald-500/25 bg-emerald-500/[0.04] p-6 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
          <h2 className="mt-3 text-xl font-bold text-foreground">Đã hoàn thành đánh giá</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kết quả {result.score}/{result.total}. Đây là tín hiệu định hướng, không phải chứng nhận năng lực.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard" className={buttonVariants()}>
              Xem learning loop <ArrowRight className="h-4 w-4" />
            </Link>
            <Button type="button" variant="outline" onClick={retry}>
              <RotateCcw className="h-4 w-4" /> Làm lại
            </Button>
          </div>
        </Card>
      ) : (
        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-4 rounded-xl border border-border bg-background/90 p-4 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Brain className="h-4 w-4 text-primary" />
            {answers.filter((answer) => answer !== null).length}/{questions.length} câu đã trả lời
          </div>
          <Button type="button" onClick={submit} disabled={!allAnswered || !hydrated}>
            Hoàn thành đánh giá
          </Button>
        </div>
      )}
    </div>
  );
}
