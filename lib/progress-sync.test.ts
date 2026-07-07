import { describe, expect, it } from "vitest";
import { createEmptyProgressState } from "./progress-types";
import { mergeProgressStates } from "./progress-sync";

function stateWith(overrides: Partial<ReturnType<typeof createEmptyProgressState>>) {
  return {
    ...createEmptyProgressState(),
    ...overrides,
  };
}

describe("mergeProgressStates", () => {
  it("unions completed lessons and project features", () => {
    const local = stateWith({
      completed: new Set(["phase-1/a"]),
      projectFeatures: new Set(["p1/0"]),
    });
    const remote = stateWith({
      completed: new Set(["phase-2/b"]),
      projectFeatures: new Set(["p1/1"]),
    });

    const merged = mergeProgressStates(local, remote);

    expect([...merged.completed].sort()).toEqual(["phase-1/a", "phase-2/b"]);
    expect([...merged.projectFeatures].sort()).toEqual(["p1/0", "p1/1"]);
  });

  it("keeps earliest quiz pass time and highest attempts", () => {
    const local = stateWith({
      quizResults: new Map([
        ["phase-1/a", { score: 7, total: 10, passedAt: "2026-01-02T00:00:00.000Z", attempts: 2 }],
      ]),
    });
    const remote = stateWith({
      quizResults: new Map([
        ["phase-1/a", { score: 9, total: 10, passedAt: "2026-01-01T00:00:00.000Z", attempts: 1 }],
      ]),
    });

    const result = mergeProgressStates(local, remote).quizResults.get("phase-1/a");

    expect(result).toEqual({
      score: 9,
      total: 10,
      passedAt: "2026-01-01T00:00:00.000Z",
      attempts: 2,
    });
  });

  it("keeps earliest challenge solved time and highest attempts", () => {
    const local = stateWith({
      challengeResults: new Map([
        ["numpy-1", { solvedAt: "2026-02-02T00:00:00.000Z", attempts: 4, lastPassed: true }],
      ]),
    });
    const remote = stateWith({
      challengeResults: new Map([
        ["numpy-1", { solvedAt: "2026-02-01T00:00:00.000Z", attempts: 2, lastPassed: false }],
      ]),
    });

    const result = mergeProgressStates(local, remote).challengeResults.get("numpy-1");

    expect(result).toEqual({
      solvedAt: "2026-02-01T00:00:00.000Z",
      attempts: 4,
      lastPassed: false,
    });
  });

  it("preserves remote challenge lastPassed on conflict while keeping earliest solved time", () => {
    const local = stateWith({
      challengeResults: new Map([
        ["numpy-1", { solvedAt: "2026-02-01T00:00:00.000Z", attempts: 1, lastPassed: true }],
      ]),
    });
    const remote = stateWith({
      challengeResults: new Map([
        ["numpy-1", { solvedAt: "2026-02-02T00:00:00.000Z", attempts: 2, lastPassed: false }],
      ]),
    });

    const result = mergeProgressStates(local, remote).challengeResults.get("numpy-1");

    expect(result).toEqual({
      solvedAt: "2026-02-01T00:00:00.000Z",
      attempts: 2,
      lastPassed: false,
    });
  });

  it("uses quiz score then total as tie-breakers for equal ratios", () => {
    const local = stateWith({
      quizResults: new Map([
        ["phase-1/a", { score: 1, total: 1, passedAt: "2026-01-01T00:00:00.000Z", attempts: 1 }],
      ]),
    });
    const remote = stateWith({
      quizResults: new Map([
        ["phase-1/a", { score: 10, total: 10, passedAt: "2026-01-02T00:00:00.000Z", attempts: 2 }],
      ]),
    });

    const result = mergeProgressStates(local, remote).quizResults.get("phase-1/a");

    expect(result).toEqual({
      score: 10,
      total: 10,
      passedAt: "2026-01-01T00:00:00.000Z",
      attempts: 2,
    });
  });

  it("keeps remote quiz result as stable fallback when ratio, score, and total tie", () => {
    const local = stateWith({
      quizResults: new Map([
        ["phase-1/a", { score: 8, total: 10, passedAt: "2026-01-01T00:00:00.000Z", attempts: 1 }],
      ]),
    });
    const remote = stateWith({
      quizResults: new Map([
        ["phase-1/a", { score: 8, total: 10, passedAt: "2026-01-02T00:00:00.000Z", attempts: 3 }],
      ]),
    });

    const result = mergeProgressStates(local, remote).quizResults.get("phase-1/a");

    expect(result).toEqual({
      score: 8,
      total: 10,
      passedAt: "2026-01-01T00:00:00.000Z",
      attempts: 3,
    });
  });

  it("keeps earliest startedAt and latest lastVisit", () => {
    const local = stateWith({
      startedAt: "2026-03-01T00:00:00.000Z",
      lastVisit: "2026-03-02T00:00:00.000Z",
    });
    const remote = stateWith({
      startedAt: "2026-02-01T00:00:00.000Z",
      lastVisit: "2026-03-03T00:00:00.000Z",
    });

    const merged = mergeProgressStates(local, remote);

    expect(merged.startedAt).toBe("2026-02-01T00:00:00.000Z");
    expect(merged.lastVisit).toBe("2026-03-03T00:00:00.000Z");
  });
});
