import { describe, expect, it } from "vitest";
import {
  applyProgressItemMutation,
  compareProgressItemMutations,
  createProgressItemMutation,
  deriveProgressSets,
  itemStateKey,
  mergeProgressItemStates,
} from "./progress-item-state";
import type { ProgressItemState } from "./progress-types";

function item(overrides: Partial<ProgressItemState> = {}): ProgressItemState {
  return {
    scope: "lesson",
    itemKey: "phase-1/numpy",
    completed: true,
    clientUpdatedAt: "2026-07-10T10:00:00.000Z",
    mutationId: "00000000-0000-4000-8000-000000000001",
    ...overrides,
  };
}

describe("progress item state", () => {
  it("uses scope and item key as a collision-safe map key", () => {
    expect(itemStateKey("lesson", "phase-1/numpy")).toBe("lesson\u0000phase-1/numpy");
  });

  it("prefers a newer explicit uncheck over an older completion", () => {
    const completed = item();
    const unchecked = item({
      completed: false,
      clientUpdatedAt: "2026-07-10T11:00:00.000Z",
      mutationId: "00000000-0000-4000-8000-000000000002",
    });

    const merged = mergeProgressItemStates(
      new Map([[itemStateKey(unchecked.scope, unchecked.itemKey), unchecked]]),
      new Map([[itemStateKey(completed.scope, completed.itemKey), completed]])
    );

    expect(merged.get(itemStateKey("lesson", "phase-1/numpy"))).toEqual(unchecked);
    expect(deriveProgressSets(merged).completed.has("phase-1/numpy")).toBe(false);
  });

  it("does not let an older offline mutation overwrite a newer mutation", () => {
    const newer = item({
      completed: false,
      clientUpdatedAt: "2026-07-10T12:00:00.000Z",
      mutationId: "00000000-0000-4000-8000-000000000003",
    });
    const older = item({ clientUpdatedAt: "2026-07-10T09:00:00.000Z" });

    expect(compareProgressItemMutations(older, newer)).toBeLessThan(0);
    expect(applyProgressItemMutation(new Map([[itemStateKey(newer.scope, newer.itemKey), newer]]), older))
      .toEqual(new Map([[itemStateKey(newer.scope, newer.itemKey), newer]]));
  });

  it("uses mutation id as a deterministic tie-breaker for equal timestamps", () => {
    const first = item({ mutationId: "00000000-0000-4000-8000-000000000001" });
    const second = item({
      completed: false,
      mutationId: "00000000-0000-4000-8000-000000000002",
    });

    expect(compareProgressItemMutations(first, second)).toBeLessThan(0);
    expect(compareProgressItemMutations(second, first)).toBeGreaterThan(0);
  });

  it("is idempotent when the same mutation is applied twice", () => {
    const mutation = item();
    const once = applyProgressItemMutation(new Map(), mutation);
    const twice = applyProgressItemMutation(once, mutation);

    expect(twice).toEqual(once);
    expect(twice).not.toBe(once);
  });

  it("creates deterministic mutations from injected clock and id sources", () => {
    expect(
      createProgressItemMutation("project_feature", "project-1/0", false, {
        now: () => "2026-07-10T13:00:00.000Z",
        createId: () => "00000000-0000-4000-8000-000000000004",
      })
    ).toEqual({
      scope: "project_feature",
      itemKey: "project-1/0",
      completed: false,
      clientUpdatedAt: "2026-07-10T13:00:00.000Z",
      mutationId: "00000000-0000-4000-8000-000000000004",
    });
  });
});
