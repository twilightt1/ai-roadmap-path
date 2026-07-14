import { describe, expect, it, vi } from "vitest";
import {
  appendRemotePracticeEvents,
  applyRemoteProgressItemMutations,
  loadAuthoritativeProgressState,
  ProgressEpochConflictError,
  resetAuthoritativeProgress,
} from "./progress-remote";
import type { PracticeEvent } from "./practice-events";
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

    const result = await applyRemoteProgressItemMutations({ rpc } as never, 4, [item]);

    expect(rpc).toHaveBeenCalledWith("apply_progress_item_mutations", {
      expected_epoch: 4,
      mutations: [{ scope: "lesson", item_key: "phase-1/numpy", completed: false, client_updated_at: "2026-07-11T09:00:00.000Z", mutation_id: "00000000-0000-4000-8000-000000000001" }],
    });
    expect(result).toEqual({ epoch: 5, acknowledgedMutationIds: [item.mutationId] });
  });

  it("maps PostgreSQL epoch mismatches to the typed recoverable error", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "P0001", message: "progress epoch mismatch" } });
    await expect(applyRemoteProgressItemMutations({ rpc } as never, 4, [item])).rejects.toBeInstanceOf(ProgressEpochConflictError);
  });

  it("caps mutation RPC batches at 100 entries", async () => {
    const mutations = Array.from({ length: 101 }, (_, index) => ({ ...item, itemKey: `lesson-${index}`, mutationId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}` }));
    const rpc = vi.fn().mockImplementation((_name, input) => Promise.resolve({ data: { epoch: 4, acknowledgedMutationIds: input.mutations.map((mutation: { mutation_id: string }) => mutation.mutation_id) }, error: null }));
    await applyRemoteProgressItemMutations({ rpc } as never, 4, mutations);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls.map(([, input]) => input.mutations).map((batch) => batch.length)).toEqual([100, 1]);
  });

  it("caps practice-event RPC batches at 100 entries and maps conflicts", async () => {
    const events = Array.from({ length: 101 }, (_, index): PracticeEvent => ({ eventId: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, challengeId: `challenge-${index}`, contentVersion: null, origin: "authenticated", eventType: "run", step: null, hintLevel: null, passed: null, occurredAt: "2026-07-11T09:00:00.000Z" }));
    const rpc = vi.fn().mockImplementation((_name, input) => Promise.resolve({ data: { epoch: 4, acknowledgedEventIds: input.events.map((event: { event_id: string }) => event.event_id) }, error: null }));
    await appendRemotePracticeEvents({ rpc } as never, 4, events);
    expect(rpc.mock.calls.map(([, input]) => input.events).map((batch) => batch.length)).toEqual([100, 1]);

    rpc.mockResolvedValueOnce({ data: null, error: { code: "P0001", message: "progress epoch mismatch" } });
    await expect(appendRemotePracticeEvents({ rpc } as never, 4, [events[0]])).rejects.toBeInstanceOf(ProgressEpochConflictError);
  });

  it("skips malformed authoritative item rows", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { sync_epoch: 4 }, error: null });
    const selectItems = vi.fn().mockResolvedValue({ data: [{ ...item, scope: "lesson", item_key: "valid", client_updated_at: "not-a-date", mutation_id: "not-a-uuid" }], error: null });
    const client = { from: vi.fn((table: string) => table === "user_progress_sync" ? { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) } : { select: vi.fn(() => ({ eq: selectItems })) }) };
    const snapshot = await loadAuthoritativeProgressState(client as never, "user-1");
    expect(snapshot.state.itemStates.size).toBe(0);
  });
});
