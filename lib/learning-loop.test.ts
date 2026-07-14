import { describe, expect, it } from "vitest";
import { createDefaultLearningProfile, updateDiagnosticResult } from "./learning-profile";
import {
  derivePhaseMastery,
  deriveWeeklyGoalProgress,
  recommendNextLearning,
  scoreDiagnosticAssessment,
} from "./learning-loop";
import { createEmptyProgressState, topicKey } from "./progress-types";
import type { Phase } from "./types";

const phases: Phase[] = [
  {
    number: 1,
    slug: "phase-1",
    title: "Programming",
    icon: "Code",
    goal: "",
    summary: "",
    accent: "cyan",
    topics: [
      { id: "python", code: "1.1", title: "Python", items: [] },
      { id: "async", code: "1.2", title: "Async", items: [] },
    ],
    projects: [{
      id: "project-1",
      title: "Project 1",
      difficulty: "easy",
      description: "",
      features: ["feature"],
      stack: [],
      phase: 1,
    }],
  },
];

describe("P1 learning loop", () => {
  it("scores the diagnostic without returning selected answers", () => {
    const result = scoreDiagnosticAssessment("foundation-v1", [
      {
        id: "q1",
        topicKey: "phase-1/python",
        phaseNumber: 1,
        phaseSlug: "phase-1",
        phaseTitle: "Programming",
        topicId: "python",
        topicTitle: "Python",
        prompt: "Question",
        options: ["A", "B"],
        answerIndex: 1,
      },
    ], [1], "2026-07-14T12:00:00.000Z");
    expect(result.score).toBe(1);
    expect(result.topicScores["phase-1/python"]).toEqual({ correct: 1, total: 1 });
    expect(result).not.toHaveProperty("answers");
  });

  it("prioritizes a failed quiz over roadmap order", () => {
    const state = createEmptyProgressState();
    state.quizResults.set(topicKey("phase-1", "async"), {
      score: 1,
      total: 3,
      passedAt: null,
      attempts: 1,
    });
    expect(recommendNextLearning(phases, state, createDefaultLearningProfile())).toMatchObject({
      reasonCode: "failed_quiz",
      title: "Async",
    });
  });

  it("uses weak diagnostic evidence before the first generic incomplete topic", () => {
    const state = createEmptyProgressState();
    const profile = updateDiagnosticResult(createDefaultLearningProfile(), {
      assessmentVersion: "foundation-v1",
      completedAt: "2026-07-14T12:00:00.000Z",
      score: 0,
      total: 1,
      topicScores: { "phase-1/async": { correct: 0, total: 1 } },
    }, "2026-07-14T12:00:00.000Z");
    expect(recommendNextLearning(phases, state, profile)).toMatchObject({
      reasonCode: "weak_diagnostic",
      title: "Async",
    });
  });

  it("derives mastery and separates score from evidence confidence", () => {
    const state = createEmptyProgressState();
    state.completed.add("phase-1/python");
    const mastery = derivePhaseMastery(phases, state, createDefaultLearningProfile())[0];
    expect(mastery.score).toBe(50);
    expect(mastery.confidence).toBe("low");
  });

  it("counts only current completed lesson mutations inside the local week", () => {
    const state = createEmptyProgressState();
    state.itemStates.set("lesson\u0000phase-1/python", {
      scope: "lesson",
      itemKey: "phase-1/python",
      completed: true,
      clientUpdatedAt: "2026-07-14T10:00:00.000Z",
      mutationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    state.itemStates.set("lesson\u0000phase-1/async", {
      scope: "lesson",
      itemKey: "phase-1/async",
      completed: false,
      clientUpdatedAt: "2026-07-15T10:00:00.000Z",
      mutationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
    expect(deriveWeeklyGoalProgress(state, 3, new Date("2026-07-16T12:00:00+07:00"))).toMatchObject({
      completed: 1,
      target: 3,
      percent: 33,
    });
  });
});
