import { describe, expect, it } from "vitest";
import {
  parseProgressDocument,
  serializeProgressDocument,
} from "./progress-document";
import { createEmptyProgressState } from "./progress-types";

const mutation = {
  scope: "lesson" as const,
  itemKey: "phase-1/topic-a",
  completed: true,
  clientUpdatedAt: "2026-01-01T00:00:00.000Z",
  mutationId: "00000000-0000-4000-8000-000000000001",
};

const practiceEvent = {
  eventId: "00000000-0000-4000-8000-000000000002",
  challengeId: "numpy-reshape",
  contentVersion: "1",
  origin: "anonymous" as const,
  eventType: "run" as const,
  step: "scaffold" as const,
  hintLevel: null,
  passed: null,
  occurredAt: "2026-01-01T00:00:01.000Z",
};

const pendingMutation = {
  mutation,
  attemptCount: 0,
  nextAttemptAt: mutation.clientUpdatedAt,
  lastErrorCode: null,
};

function validDocument(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 3,
    syncEpoch: 0,
    pendingItemMutations: [pendingMutation],
    pendingPracticeEvents: [practiceEvent],
    itemStates: [mutation],
    quizResults: {
      "phase-1/topic-a": {
        score: 8,
        total: 10,
        passedAt: "2026-01-01T00:00:02.000Z",
        attempts: 1,
      },
    },
    challengeResults: {
      "numpy-reshape": {
        solvedAt: "2026-01-01T00:00:03.000Z",
        attempts: 2,
        lastPassed: true,
      },
    },
    startedAt: "2026-01-01T00:00:00.000Z",
    lastVisit: "2026-01-01T00:00:04.000Z",
    ...overrides,
  };
}

describe("progress documents", () => {
  it("parses a valid V3 document into store state", () => {
    const state = parseProgressDocument(validDocument());

    expect(state?.syncEpoch).toBe(0);
    expect(state?.itemStates.get("lesson\u0000phase-1/topic-a")).toEqual(mutation);
    expect(state?.pendingPracticeEvents).toEqual([practiceEvent]);
    expect(state?.quizResults.get("phase-1/topic-a")).toEqual({
      score: 8,
      total: 10,
      passedAt: "2026-01-01T00:00:02.000Z",
      attempts: 1,
    });
  });

  it.each([
    ["invalid date", validDocument({ startedAt: "not-a-date" })],
    ["invalid mutation UUID", validDocument({ itemStates: [{ ...mutation, mutationId: "not-a-uuid" }] })],
    ["malformed practice event", validDocument({ pendingPracticeEvents: [{ eventId: 1 }] })],
    ["negative epoch", validDocument({ syncEpoch: -1 })],
    ["invalid quiz summary", validDocument({ quizResults: { quiz: { score: "8", total: 10, passedAt: null, attempts: 1 } } })],
    ["invalid challenge summary", validDocument({ challengeResults: { challenge: { solvedAt: null, attempts: -1, lastPassed: true } } })],
  ])("rejects a document with %s", (_reason, document) => {
    expect(parseProgressDocument(document)).toBeNull();
  });

  it("parses valid V2 documents for migration", () => {
    const state = parseProgressDocument(validDocument({ schemaVersion: 2 }));

    expect(state?.completed).toEqual(new Set(["phase-1/topic-a"]));
  });

  it("persists V3 pending mutations with durable retry metadata", () => {
    const entry = {
      mutation,
      attemptCount: 2,
      nextAttemptAt: "2026-07-12T10:00:04.000Z",
      lastErrorCode: "NETWORK_ERROR",
    };
    const state = parseProgressDocument(validDocument({ pendingItemMutations: [entry] }));

    expect(state?.pendingItemMutations).toEqual([entry]);
  });

  it("rejects V3 pending mutations without valid retry metadata", () => {
    expect(
      parseProgressDocument(validDocument({ pendingItemMutations: [{ mutation, attemptCount: -1, nextAttemptAt: "bad", lastErrorCode: 1 }] }))
    ).toBeNull();
  });

  it("serializes a store state as V3 without map or set internals", () => {
    const state = createEmptyProgressState();
    state.syncEpoch = 2;
    state.itemStates.set("lesson\u0000phase-1/topic-a", mutation);
    state.pendingItemMutations = [pendingMutation];
    state.pendingPracticeEvents = [practiceEvent];
    state.quizResults.set("phase-1/topic-a", { score: 8, total: 10, passedAt: null, attempts: 1 });
    state.challengeResults.set("numpy-reshape", { solvedAt: null, attempts: 2, lastPassed: false });

    expect(serializeProgressDocument(state)).toEqual({
      schemaVersion: 3,
      syncEpoch: 2,
      pendingItemMutations: [pendingMutation],
      pendingPracticeEvents: [practiceEvent],
      itemStates: [mutation],
      quizResults: { "phase-1/topic-a": { score: 8, total: 10, passedAt: null, attempts: 1 } },
      challengeResults: { "numpy-reshape": { solvedAt: null, attempts: 2, lastPassed: false } },
      startedAt: null,
      lastVisit: null,
    });
  });
});
