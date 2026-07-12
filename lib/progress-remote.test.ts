import { describe, expect, it, vi } from "vitest";
import {
  applyRemoteProgressItemMutations,
  loadAuthoritativeProgressState,
  resetAuthoritativeProgress,
} from "./progress-remote";
import type { ProgressItemState } from "./progress-types";

const item: ProgressItemState = {
  scope: "lesson",
  itemKey: "phase-1/numpy",
  completed: false,
  clientUpdatedAt: "2026-07-11T09:00:00.000Z",
  mutationId: "00000000-0000-4000-8000-000000000001",
};

describe("authoritative remote progress", () => {
  it("loads explicit item rows and the current sync epoch", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { sync_epoch: 4 }, error: null });
    const selectItems = vi.fn().mockResolvedValue({
      data: [
        {
          scope: "lesson",
          item_key: "phase-1/numpy",
          completed: false,
          client_updated_at: "2026-07-11T09:00:00.000Z",
          mutation_id: "00000000-0000-4000-8000-000000000001",
        },
      ],
      error: null,
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table === "user_progress_sync") {
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) };
        }
        return { select: vi.fn(() => ({ eq: selectItems })) };
      }),
    };

    const snapshot = await loadAuthoritativeProgressState(client as never, "user-1");

    expect(snapshot.epoch).toBe(4);
    expect(snapshot.state.itemStates.get("lesson\u0000phase-1/numpy")).toEqual(item);
    expect(snapshot.state.completed.has("phase-1/numpy")).toBe(false);
  });

  it("returns the new epoch from an atomic remote reset", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { epoch: 5 }, error: null });

    await expect(resetAuthoritativeProgress({ rpc } as never, 4)).resolves.toBe(5);
    expect(rpc).toHaveBeenCalledWith("reset_learning_progress", { expected_epoch: 4 });
  });

  it("sends explicit mutations and returns acknowledged ids from the RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { epoch: 5, acknowledgedMutationIds: [item.mutationId] },
      error: null,
    });

    const result = await applyRemoteProgressItemMutations(
      { rpc } as never,
      4,
      [item]
    );

    expect(rpc).toHaveBeenCalledWith("apply_progress_item_mutations", {
      expected_epoch: 4,
      mutations: [
        {
          scope: "lesson",
          item_key: "phase-1/numpy",
          completed: false,
          client_updated_at: "2026-07-11T09:00:00.000Z",
          mutation_id: "00000000-0000-4000-8000-000000000001",
        },
      ],
    });
    expect(result).toEqual({ epoch: 5, acknowledgedMutationIds: [item.mutationId] });
  });
});
