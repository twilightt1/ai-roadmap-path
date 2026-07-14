import { describe, expect, it, vi } from "vitest";
import { registerObservabilityAdapter } from "./observability/client";
import { createProgressStore } from "./progress-store";
import { ProgressEpochConflictError } from "./progress-remote";
import { createEmptyProgressState, type ProgressOutboxEntry, type StoreState } from "./progress-types";

const now = "2026-07-12T10:00:00.000Z";
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
function setup() {
  const persisted: StoreState[] = []; const publications: unknown[] = []; let online: (() => void) | undefined;
  const apply = async (_client: never, epoch: number, entries: ProgressOutboxEntry[]) => ({ epoch: epoch + 1, acknowledgedMutationIds: entries.map((entry) => entry.mutation.mutationId) });
  const store = createProgressStore({ loadLocal: () => createEmptyProgressState(), persistLocal: (state) => persisted.push(state), loadRemote: async () => ({ epoch: 0, state: createEmptyProgressState() }), applyRemote: apply, now: () => now, setTimer: () => 1, channel: { publish: (message) => publications.push(message), subscribe: () => () => {} }, addOnlineListener: (listener) => { online = listener; return () => {}; } });
  return { store, persisted, publications, triggerOnline: () => online?.(), apply };
}

describe("progress store", () => {
  it("hydrates anonymous progress and notifies subscribers synchronously", async () => {
    const local = { ...createEmptyProgressState(), completed: new Set(["phase-1/topic-a"]) };
    const notify = vi.fn();
    const store = createProgressStore({
      loadLocal: () => local,
      persistLocal: () => {},
      loadRemote: async () => ({ epoch: 0, state: createEmptyProgressState() }),
      applyRemote: async () => ({ epoch: 0, acknowledgedMutationIds: [] }),
      now: () => now,
      setTimer: () => 1,
    });
    store.subscribe(notify);

    await store.setAuth(null, null);

    expect(store.getState().completed).toEqual(new Set(["phase-1/topic-a"]));
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("persists, queues, and broadcasts an optimistic mutation once", () => {
    const { store, persisted, publications } = setup();
    store.mutate("lesson", "p/a", true);
    expect(store.getState().completed.has("p/a")).toBe(true);
    expect(store.getState().pendingItemMutations).toHaveLength(1);
    expect(persisted).toHaveLength(1);
    expect(publications).toHaveLength(1);
  });

  it("emits outbox queued and applied boundaries without mutation content", async () => {
    const adapter = { captureEvent: vi.fn(), captureError: vi.fn() };
    const unregister = registerObservabilityAdapter(adapter);
    const { store } = setup();

    await store.setAuth({} as never, "learner-id");
    store.mutate("lesson", "p/a", true);
    await Promise.resolve();
    await Promise.resolve();
    unregister();

    expect(adapter.captureEvent).toHaveBeenCalledWith(expect.objectContaining({ name: "progress.outbox", outcome: "queued" }));
    expect(adapter.captureEvent).toHaveBeenCalledWith(expect.objectContaining({ name: "progress.outbox", outcome: "applied" }));
    expect(adapter.captureEvent).not.toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ userId: expect.anything(), itemKey: expect.anything() }) }));
  });

  it("backs off an offline failure and retries when online", async () => {
    const fixture = setup(); let calls = 0;
    const store = createProgressStore({ loadLocal: () => createEmptyProgressState(), persistLocal: () => {}, loadRemote: async () => ({ epoch: 0, state: createEmptyProgressState() }), applyRemote: async (_c, epoch, entries) => { calls += 1; if (calls === 1) throw Object.assign(new Error("offline"), { code: "OFFLINE" }); return { epoch: epoch + 1, acknowledgedMutationIds: entries.map((entry) => entry.mutation.mutationId) }; }, now: () => now, setTimer: () => 1, channel: { publish() {}, subscribe: () => () => {} }, addOnlineListener: (listener) => { fixture.triggerOnline = listener; return () => {}; } });
    await store.setAuth({} as never, "u"); store.mutate("lesson", "p/a", true); await Promise.resolve(); await Promise.resolve();
    expect(store.getState().pendingItemMutations[0]?.attemptCount).toBe(1);
    fixture.triggerOnline(); await Promise.resolve(); await Promise.resolve();
    expect(calls).toBeGreaterThan(1);
  });

  it("retains an online retry signal received while the failed flush is still settling", async () => {
    const firstAttempt = deferred<{ epoch: number; acknowledgedMutationIds: string[] }>();
    let calls = 0;
    let triggerOnline = () => {};
    const store = createProgressStore({
      loadLocal: () => createEmptyProgressState(),
      persistLocal: () => {},
      loadRemote: async () => ({ epoch: 0, state: createEmptyProgressState() }),
      applyRemote: async (_client, epoch, entries) => {
        calls += 1;
        if (calls === 1) return firstAttempt.promise;
        return {
          epoch: epoch + 1,
          acknowledgedMutationIds: entries.map((entry) => entry.mutation.mutationId),
        };
      },
      now: () => now,
      setTimer: () => 1,
      addOnlineListener: (listener) => { triggerOnline = listener; return () => {}; },
    });

    await store.setAuth({} as never, "u");
    store.mutate("lesson", "p/a", true);
    expect(calls).toBe(1);

    triggerOnline();
    firstAttempt.reject(Object.assign(new Error("offline"), { code: "OFFLINE" }));

    await vi.waitFor(() => expect(calls).toBe(2));
    await vi.waitFor(() => expect(store.getState().pendingItemMutations).toHaveLength(0));
  });

  it("reloads, rebases newer local work, and retries an epoch conflict once", async () => {
    const { store } = setup(); let calls = 0;
    const conflictStore = createProgressStore({ loadLocal: () => createEmptyProgressState(), persistLocal: () => {}, loadRemote: async () => ({ epoch: 4, state: createEmptyProgressState() }), applyRemote: async (_c, epoch, entries) => { calls += 1; if (calls === 1) throw new ProgressEpochConflictError(); return { epoch: epoch + 1, acknowledgedMutationIds: entries.map((entry) => entry.mutation.mutationId) }; }, now: () => now, setTimer: () => 1 });
    await conflictStore.setAuth({} as never, "u"); conflictStore.mutate("lesson", "p/a", true); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(calls).toBe(2); expect(conflictStore.getState().syncEpoch).toBe(5); expect(conflictStore.getState().pendingItemMutations).toHaveLength(0); store.destroy();
  });

  it("does not acknowledge an operation after auth changes", async () => {
    const gate = deferred<{ epoch: number; acknowledgedMutationIds: string[] }>();
    const store = createProgressStore({ loadLocal: () => createEmptyProgressState(), persistLocal: () => {}, loadRemote: async () => ({ epoch: 0, state: createEmptyProgressState() }), applyRemote: async () => gate.promise, now: () => now, setTimer: () => 1 });
    await store.setAuth({} as never, "first"); store.mutate("lesson", "p/a", true); await store.setAuth({} as never, "second"); gate.resolve({ epoch: 1, acknowledgedMutationIds: ["ignored"] }); await Promise.resolve();
    expect(store.getState().pendingItemMutations).toHaveLength(0);
  });

  it("flushes a mutation queued while another flush is in flight", async () => {
    const firstApply = deferred<{ epoch: number; acknowledgedMutationIds: string[] }>();
    const batches: string[][] = [];
    const store = createProgressStore({
      loadLocal: () => createEmptyProgressState(),
      persistLocal: () => {},
      loadRemote: async () => ({ epoch: 0, state: createEmptyProgressState() }),
      applyRemote: async (_client, epoch, entries) => {
        const mutationIds = entries.map((entry) => entry.mutation.mutationId);
        batches.push(mutationIds);
        if (batches.length === 1) return firstApply.promise;
        return { epoch: epoch + 1, acknowledgedMutationIds: mutationIds };
      },
      now: () => now,
      setTimer: () => 1,
    });

    await store.setAuth({} as never, "user");
    store.mutate("lesson", "phase/topic-a", true);
    await vi.waitFor(() => expect(batches).toHaveLength(1));

    store.mutate("lesson", "phase/topic-b", true);
    firstApply.resolve({ epoch: 1, acknowledgedMutationIds: batches[0] });

    await vi.waitFor(() => expect(batches).toHaveLength(2));
    expect(store.getState().pendingItemMutations).toHaveLength(0);
  });

  it("preserves a mutation made while same-user hydration is in flight", async () => {
    const remote = deferred<{ epoch: number; state: StoreState }>();
    const appliedMutationIds: string[] = [];
    const store = createProgressStore({
      loadLocal: () => createEmptyProgressState(),
      persistLocal: () => {},
      loadRemote: async () => remote.promise,
      applyRemote: async (_client, epoch, entries) => {
        appliedMutationIds.push(...entries.map((entry) => entry.mutation.mutationId));
        return {
          epoch: epoch + 1,
          acknowledgedMutationIds: entries.map((entry) => entry.mutation.mutationId),
        };
      },
      now: () => now,
      setTimer: () => 1,
    });

    const hydration = store.setAuth({} as never, "user");
    store.mutate("lesson", "phase/topic-a", true);
    expect(store.getState().completed.has("phase/topic-a")).toBe(true);

    remote.resolve({ epoch: 0, state: createEmptyProgressState() });
    await expect(hydration).resolves.toBe(true);

    expect(store.getState().completed.has("phase/topic-a")).toBe(true);
    await vi.waitFor(() => expect(appliedMutationIds).toHaveLength(1));
    await vi.waitFor(() => expect(store.getState().pendingItemMutations).toHaveLength(0));
  });

  it("ignores an older same-user hydration after a newer auth generation starts", async () => {
    const firstLoad = deferred<{ epoch: number; state: StoreState }>();
    const secondLoad = deferred<{ epoch: number; state: StoreState }>();
    let loadCount = 0;
    const store = createProgressStore({
      loadLocal: () => createEmptyProgressState(),
      persistLocal: () => {},
      loadRemote: async () => {
        loadCount += 1;
        return loadCount === 1 ? firstLoad.promise : secondLoad.promise;
      },
      applyRemote: async () => ({ epoch: 0, acknowledgedMutationIds: [] }),
      now: () => now,
      setTimer: () => 1,
    });
    const client = {} as never;

    const firstAuth = store.setAuth(client, "same-user");
    const secondAuth = store.setAuth(client, "same-user");
    firstLoad.resolve({ epoch: 1, state: createEmptyProgressState() });

    await expect(firstAuth).resolves.toBe(false);
    expect(store.getStatus()).toBe("local-only");

    secondLoad.resolve({ epoch: 2, state: createEmptyProgressState() });
    await expect(secondAuth).resolves.toBe(true);
    expect(store.getStatus()).toBe("synced");
    expect(store.getState().syncEpoch).toBe(2);
  });

  it("moves anonymous progress into the authenticated outbox before clearing anonymous storage", async () => {
    let anonymous = createEmptyProgressState();
    const cleared: Array<string | null | undefined> = [];
    const store = createProgressStore({
      loadLocal: (userId) => userId ? createEmptyProgressState() : anonymous,
      persistLocal: (next, userId) => { if (!userId) anonymous = next; },
      clearLocal: (userId) => { cleared.push(userId); },
      loadRemote: async () => ({ epoch: 0, state: createEmptyProgressState() }),
      applyRemote: async (_client, epoch, entries) => ({
        epoch,
        acknowledgedMutationIds: entries.map((entry) => entry.mutation.mutationId),
      }),
      now: () => now,
      setTimer: () => 1,
    });

    await store.setAuth(null, null);
    store.mutate("lesson", "phase-1/anonymous", true);
    await store.setAuth({} as never, "authenticated-user");

    expect(store.getState().completed).toContain("phase-1/anonymous");
    expect(store.getState().itemStates.get("lesson\u0000phase-1/anonymous")?.completed).toBe(true);
    expect(cleared).toContain(undefined);
  });
});
