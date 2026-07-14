import { describe, expect, it } from "vitest";
import {
  createDefaultLearningProfile,
  learningProfileStorageKey,
  mergeLearningProfiles,
  parseDiagnosticResult,
  parseLearningProfile,
  updateDiagnosticResult,
  updateWeeklyTarget,
} from "./learning-profile";

const older = "2026-07-14T01:00:00.000Z";
const newer = "2026-07-14T02:00:00.000Z";

describe("learning profile", () => {
  it("parses a privacy-minimal diagnostic and strips unrelated fields", () => {
    const result = parseDiagnosticResult({
      assessmentVersion: "foundation-v1",
      completedAt: newer,
      score: 1,
      total: 2,
      topicScores: { "phase-1-programming/python-fundamentals": { correct: 1, total: 2 } },
      selectedAnswers: [0, 1],
    });

    expect(result).toEqual({
      assessmentVersion: "foundation-v1",
      completedAt: newer,
      score: 1,
      total: 2,
      topicScores: { "phase-1-programming/python-fundamentals": { correct: 1, total: 2 } },
    });
    expect(result).not.toHaveProperty("selectedAnswers");
  });

  it("rejects inconsistent aggregate scores", () => {
    expect(parseDiagnosticResult({
      assessmentVersion: "foundation-v1",
      completedAt: newer,
      score: 2,
      total: 2,
      topicScores: { topic: { correct: 1, total: 2 } },
    })).toBeNull();
  });

  it("merges weekly and diagnostic fields independently by timestamp", () => {
    const local = updateDiagnosticResult(
      updateWeeklyTarget(createDefaultLearningProfile(), 7, older),
      {
        assessmentVersion: "foundation-v1",
        completedAt: newer,
        score: 1,
        total: 1,
        topicScores: { topic: { correct: 1, total: 1 } },
      },
      newer
    );
    const remote = updateWeeklyTarget(createDefaultLearningProfile(), 5, newer);

    const merged = mergeLearningProfiles(local, remote);
    expect(merged.weeklyGoal.target).toBe(5);
    expect(merged.diagnostic.value?.score).toBe(1);
  });

  it("compares timestamps by instant rather than timezone string order", () => {
    const earlier = updateWeeklyTarget(
      createDefaultLearningProfile(),
      7,
      "2026-07-14T10:00:00+07:00"
    );
    const later = updateWeeklyTarget(
      createDefaultLearningProfile(),
      5,
      "2026-07-14T04:00:00Z"
    );
    expect(mergeLearningProfiles(earlier, later).weeklyGoal.target).toBe(5);
  });

  it("parses only complete versioned documents", () => {
    const profile = updateWeeklyTarget(createDefaultLearningProfile(), 5, newer);
    expect(parseLearningProfile(profile)).toEqual(profile);
    expect(parseLearningProfile({ ...profile, schemaVersion: 2 })).toBeNull();
  });

  it("scopes authenticated local profiles by encoded user id", () => {
    expect(learningProfileStorageKey()).toBe("ai-roadmap:learning-profile:v1");
    expect(learningProfileStorageKey("user/a")).toBe(
      "ai-roadmap:learning-profile:v1:user:user%2Fa"
    );
  });
});
