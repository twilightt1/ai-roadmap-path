import { describe, expect, it } from "vitest";
import {
  acknowledgeProgressMutations,
  enqueueProgressMutation,
  isRetryDue,
  markProgressMutationFailed,
  mergePendingProgressMutations,
  nextRetryDelayMs,
  selectDueProgressMutations,
} from "./progress-outbox";
import type { ProgressItemState, ProgressOutboxEntry } from "./progress-types";

function mutation(overrides: Partial<ProgressItemState> = {}): ProgressItemState {
  return {
    scope: "lesson",
    itemKey: "phase-1/numpy",
    completed: true,
    clientUpdatedAt: "2026-07-11T10:00:00.000Z",
    mutationId: "00000000-0000-4000-8000-000000000001",
    ...overrides,
  };
}

describe("progress outbox", () => {
  it("replaces an older pending mutation for the same item", () => {
    const older = mutation();
    const newer = mutation({
      completed: false,
      clientUpdatedAt: "2026-07-11T11:00:00.000Z",
      mutationId: "00000000-0000-4000-8000-000000000002",
    });

    expect(enqueueProgressMutation([older], newer)).toEqual([newer]);
  });

  it("keeps mutations for separate progress items", () => {
    const lesson = mutation();
    const feature = mutation({
      scope: "project_feature",
      itemKey: "project-1/0",
      mutationId: "00000000-0000-4000-8000-000000000002",
    });

    expect(enqueueProgressMutation([lesson], feature)).toEqual([lesson, feature]);
  });

  it("merges a received pending outbox without duplicating mutation ids", () => {
    const first = mutation();
    const duplicate = mutation();
    const next = mutation({
      itemKey: "phase-1/pandas",
      mutationId: "00000000-0000-4000-8000-000000000002",
    });

    expect(mergePendingProgressMutations([first], [duplicate, next])).toEqual([first, next]);
  });

  it("removes only acknowledged mutation ids after a successful remote batch", () => {
    const first = mutation();
    const second = mutation({
      itemKey: "phase-1/pandas",
      mutationId: "00000000-0000-4000-8000-000000000002",
    });

    expect(acknowledgeProgressMutations([first, second], [first.mutationId])).toEqual([second]);
  });

  it("uses bounded exponential retry delays", () => {
    expect(nextRetryDelayMs(0)).toBe(1_000);
    expect(nextRetryDelayMs(1)).toBe(2_000);
    expect(nextRetryDelayMs(4)).toBe(16_000);
    expect(nextRetryDelayMs(5)).toBe(30_000);
    expect(nextRetryDelayMs(20)).toBe(60_000);
  });

  it("marks a failed entry with deterministic jittered retry metadata", () => {
    const entry: ProgressOutboxEntry = {
      mutation: mutation(),
      attemptCount: 0,
      nextAttemptAt: "2026-07-12T10:00:00.000Z",
      lastErrorCode: null,
    };

    expect(
      markProgressMutationFailed(entry, "NETWORK_ERROR", "2026-07-12T10:00:00.000Z", () => 0.5)
    ).toEqual({
      ...entry,
      attemptCount: 1,
      nextAttemptAt: "2026-07-12T10:00:01.100Z",
      lastErrorCode: "NETWORK_ERROR",
    });
  });

  it("selects only entries due at the supplied time", () => {
    const due: ProgressOutboxEntry = {
      mutation: mutation(),
      attemptCount: 0,
      nextAttemptAt: "2026-07-12T10:00:01.000Z",
      lastErrorCode: null,
    };
    const later: ProgressOutboxEntry = {
      ...due,
      mutation: mutation({ itemKey: "phase-1/pandas", mutationId: "00000000-0000-4000-8000-000000000002" }),
      nextAttemptAt: "2026-07-12T10:00:03.000Z",
    };

    expect(isRetryDue(due, "2026-07-12T10:00:02.000Z")).toBe(true);
    expect(selectDueProgressMutations([due, later], "2026-07-12T10:00:02.000Z")).toEqual([due]);
  });

  it("replaces a same-item newer entry and resets its retry state", () => {
    const failed: ProgressOutboxEntry = {
      mutation: mutation(),
      attemptCount: 3,
      nextAttemptAt: "2026-07-12T10:00:08.000Z",
      lastErrorCode: "NETWORK_ERROR",
    };
    const newer = mutation({
      completed: false,
      clientUpdatedAt: "2026-07-11T11:00:00.000Z",
      mutationId: "00000000-0000-4000-8000-000000000002",
    });

    expect(enqueueProgressMutation([failed], newer, "2026-07-12T10:00:00.000Z")).toEqual([
      {
        mutation: newer,
        attemptCount: 0,
        nextAttemptAt: "2026-07-12T10:00:00.000Z",
        lastErrorCode: null,
      },
    ]);
  });
});
