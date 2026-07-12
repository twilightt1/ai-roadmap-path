import { describe, expect, it } from "vitest";
import {
  acknowledgeProgressMutations,
  enqueueProgressMutation,
  mergePendingProgressMutations,
} from "./progress-outbox";
import type { ProgressItemState } from "./progress-types";

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
});
