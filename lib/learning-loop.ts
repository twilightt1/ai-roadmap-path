import { QUIZ_PASS_THRESHOLD } from "./quiz-types";
import type { DiagnosticQuestion } from "./diagnostic-assessment-types";
import type { DiagnosticResult, LearningProfile } from "./learning-profile";
import { featureKey, topicKey, type StoreState } from "./progress-types";
import type { Phase } from "./types";

export type LearningLoopProgressState = Pick<
  StoreState,
  "completed" | "projectFeatures" | "itemStates" | "quizResults"
>;

export type MasteryConfidence = "low" | "medium" | "high";

export type PhaseMastery = {
  phaseNumber: number;
  phaseSlug: string;
  phaseTitle: string;
  score: number;
  confidence: MasteryConfidence;
  evidence: {
    completedLessons: number;
    totalLessons: number;
    quizTopics: number;
    diagnosticTopics: number;
    signalFamilies: number;
  };
};

export type LearningRecommendation = {
  kind: "lesson" | "project" | "complete";
  reasonCode: "failed_quiz" | "weak_diagnostic" | "next_in_roadmap" | "unfinished_project" | "all_complete";
  title: string;
  description: string;
  href: string;
  phaseSlug: string | null;
  topicKey: string | null;
};

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

export function scoreDiagnosticAssessment(
  version: string,
  questions: readonly DiagnosticQuestion[],
  answers: readonly (number | null)[],
  completedAt = new Date().toISOString()
): DiagnosticResult {
  if (questions.length === 0 || answers.length !== questions.length || answers.some((answer) => answer === null)) {
    throw new Error("Diagnostic assessment is incomplete");
  }

  const topicScores: DiagnosticResult["topicScores"] = {};
  let score = 0;
  questions.forEach((question, index) => {
    const correct = answers[index] === question.answerIndex ? 1 : 0;
    score += correct;
    const previous = topicScores[question.topicKey] ?? { correct: 0, total: 0 };
    topicScores[question.topicKey] = {
      correct: previous.correct + correct,
      total: previous.total + 1,
    };
  });

  return {
    assessmentVersion: version,
    completedAt,
    score,
    total: questions.length,
    topicScores,
  };
}

export function derivePhaseMastery(
  roadmapPhases: readonly Phase[],
  state: LearningLoopProgressState,
  profile: LearningProfile
): PhaseMastery[] {
  const diagnosticScores = profile.diagnostic.value?.topicScores ?? {};

  return roadmapPhases.map((phase) => {
    const completedLessons = phase.topics.filter((topic) =>
      state.completed.has(topicKey(phase.slug, topic.id))
    ).length;
    const lessonRatio = ratio(completedLessons, phase.topics.length);

    const quizRatios = phase.topics.flatMap((topic) => {
      const result = state.quizResults.get(topicKey(phase.slug, topic.id));
      return result && result.total > 0 ? [result.score / result.total] : [];
    });
    const quizRatio = quizRatios.length > 0
      ? quizRatios.reduce((sum, value) => sum + value, 0) / quizRatios.length
      : 0;

    const phaseDiagnosticScores = phase.topics.flatMap((topic) => {
      const result = diagnosticScores[topicKey(phase.slug, topic.id)];
      return result && result.total > 0 ? [result.correct / result.total] : [];
    });
    const diagnosticRatio = phaseDiagnosticScores.length > 0
      ? phaseDiagnosticScores.reduce((sum, value) => sum + value, 0) / phaseDiagnosticScores.length
      : 0;

    const weightedSignals = [
      { available: phase.topics.length > 0, weight: 50, value: lessonRatio },
      { available: quizRatios.length > 0, weight: 30, value: quizRatio },
      { available: phaseDiagnosticScores.length > 0, weight: 20, value: diagnosticRatio },
    ].filter((signal) => signal.available);
    const totalWeight = weightedSignals.reduce((sum, signal) => sum + signal.weight, 0);
    const score = totalWeight === 0
      ? 0
      : Math.round(weightedSignals.reduce((sum, signal) => sum + signal.weight * signal.value, 0) / totalWeight * 100);
    const signalFamilies = [
      completedLessons > 0,
      quizRatios.length > 0,
      phaseDiagnosticScores.length > 0,
    ].filter(Boolean).length;
    const confidence: MasteryConfidence = signalFamilies >= 3 && quizRatios.length >= Math.min(2, phase.topics.length)
      ? "high"
      : signalFamilies >= 2
        ? "medium"
        : "low";

    return {
      phaseNumber: phase.number,
      phaseSlug: phase.slug,
      phaseTitle: phase.title,
      score,
      confidence,
      evidence: {
        completedLessons,
        totalLessons: phase.topics.length,
        quizTopics: quizRatios.length,
        diagnosticTopics: phaseDiagnosticScores.length,
        signalFamilies,
      },
    };
  });
}

function startOfLocalWeek(now: Date): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  return start;
}

export function deriveWeeklyGoalProgress(
  state: LearningLoopProgressState,
  target: number,
  now = new Date()
): { completed: number; target: number; percent: number; weekStart: string; weekEnd: string } {
  const weekStart = startOfLocalWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const completed = [...state.itemStates.values()].filter((item) => {
    if (item.scope !== "lesson" || !item.completed) return false;
    const updatedAt = new Date(item.clientUpdatedAt);
    return updatedAt >= weekStart && updatedAt < weekEnd;
  }).length;

  return {
    completed,
    target,
    percent: Math.min(100, Math.round(ratio(completed, target) * 100)),
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
  };
}

export function recommendNextLearning(
  roadmapPhases: readonly Phase[],
  state: LearningLoopProgressState,
  profile: LearningProfile
): LearningRecommendation {
  const orderedTopics = roadmapPhases.flatMap((phase) =>
    phase.topics.map((topic) => ({ phase, topic, key: topicKey(phase.slug, topic.id) }))
  );

  const failedQuiz = orderedTopics.find(({ key }) => {
    const result = state.quizResults.get(key);
    return !state.completed.has(key) && Boolean(result) && ratio(result!.score, result!.total) < QUIZ_PASS_THRESHOLD;
  });
  if (failedQuiz) {
    return {
      kind: "lesson",
      reasonCode: "failed_quiz",
      title: failedQuiz.topic.title,
      description: "Quiz gần nhất cho thấy chủ đề này cần được củng cố trước khi đi tiếp.",
      href: `/phase/${failedQuiz.phase.slug}/${failedQuiz.topic.id}`,
      phaseSlug: failedQuiz.phase.slug,
      topicKey: failedQuiz.key,
    };
  }

  const diagnosticScores = profile.diagnostic.value?.topicScores ?? {};
  const weakDiagnostic = orderedTopics.find(({ key }) => {
    const result = diagnosticScores[key];
    return !state.completed.has(key) && Boolean(result) && result.correct < result.total;
  });
  if (weakDiagnostic) {
    return {
      kind: "lesson",
      reasonCode: "weak_diagnostic",
      title: weakDiagnostic.topic.title,
      description: "Bài đánh giá nền tảng xác định đây là khoảng trống nên xử lý sớm.",
      href: `/phase/${weakDiagnostic.phase.slug}/${weakDiagnostic.topic.id}`,
      phaseSlug: weakDiagnostic.phase.slug,
      topicKey: weakDiagnostic.key,
    };
  }

  const nextTopic = orderedTopics.find(({ key }) => !state.completed.has(key));
  if (nextTopic) {
    return {
      kind: "lesson",
      reasonCode: "next_in_roadmap",
      title: nextTopic.topic.title,
      description: "Đây là bài chưa hoàn thành tiếp theo theo thứ tự của roadmap.",
      href: `/phase/${nextTopic.phase.slug}/${nextTopic.topic.id}`,
      phaseSlug: nextTopic.phase.slug,
      topicKey: nextTopic.key,
    };
  }

  const unfinishedProject = roadmapPhases.flatMap((phase) =>
    phase.projects.map((project) => ({ phase, project }))
  ).find(({ project }) =>
    project.features.length > 0 && project.features.some((_, index) =>
      !state.projectFeatures.has(featureKey(project.id, index))
    )
  );
  if (unfinishedProject) {
    return {
      kind: "project",
      reasonCode: "unfinished_project",
      title: unfinishedProject.project.title,
      description: "Bạn đã hoàn thành phần bài học; tiếp theo hãy biến kiến thức thành project evidence.",
      href: `/projects/${unfinishedProject.project.id}`,
      phaseSlug: unfinishedProject.phase.slug,
      topicKey: null,
    };
  }

  return {
    kind: "complete",
    reasonCode: "all_complete",
    title: "Đã hoàn thành roadmap hiện tại",
    description: "Không còn bài học hoặc project feature nào đang chờ trong phiên bản nội dung này.",
    href: "/roadmap",
    phaseSlug: null,
    topicKey: null,
  };
}
