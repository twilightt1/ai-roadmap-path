import type { SupabaseClient } from "@supabase/supabase-js";
import { capturePlatformError, emitPlatformEvent } from "./observability/client";
import { createProgressItemMutation, deriveProgressSets, mergeProgressItemStates } from "./progress-item-state";
import {
  acknowledgeProgressMutations,
  enqueueProgressMutation,
  markProgressMutationFailed,
  selectDueProgressMutations,
} from "./progress-outbox";
import type { ProgressChannelMessage, ProgressChannelPublication } from "./progress-channel";
import { ProgressEpochConflictError, type RemoteProgressSnapshot } from "./progress-remote";
import { mergeProgressStates } from "./progress-sync";
import { createEmptyProgressState, type ProgressItemScope, type ProgressOutboxEntry, type ProgressSyncStatus, type StoreState } from "./progress-types";

export type ApplyResult = { epoch: number; acknowledgedMutationIds: string[] };
type Channel = { publish(message: ProgressChannelPublication): void; subscribe(listener: (message: ProgressChannelMessage) => void): () => void };

export type ProgressStoreDependencies = {
  loadLocal(userId?: string | null): StoreState;
  persistLocal(state: StoreState, userId?: string | null): void;
  clearLocal?(userId?: string | null): void;
  loadRemote(client: SupabaseClient, userId: string): Promise<RemoteProgressSnapshot>;
  applyRemote(client: SupabaseClient, epoch: number, entries: ProgressOutboxEntry[]): Promise<ApplyResult>;
  resetRemote?(client: SupabaseClient, epoch: number): Promise<number>;
  now(): string;
  setTimer(callback: () => void, delayMs: number): unknown;
  clearTimer?(timer: unknown): void;
  addOnlineListener?(listener: () => void): () => void;
  channel?: Channel;
  jitter?: () => number;
  onError?: (error: unknown) => void;
};

export type ProgressStore = ReturnType<typeof createProgressStore>;

function errorCode(error: unknown) {
  return error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : "SYNC_ERROR";
}

export function createProgressStore(deps: ProgressStoreDependencies, initialState?: StoreState) {
  let state = initialState ?? createEmptyProgressState();
  let status: ProgressSyncStatus = "local-only";
  let client: SupabaseClient | null = null;
  let userId: string | null = null;
  let generation = 0;
  let flushing = false;
  let forceRetryAfterFlush = false;
  let retryTimer: unknown | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const persist = () => deps.persistLocal(state, userId);
  const current = (g: number, c: SupabaseClient, u: string) => generation === g && client === c && userId === u;

  const scheduleRetry = () => {
    if (retryTimer !== null) deps.clearTimer?.(retryTimer);
    const first = state.pendingItemMutations.reduce<ProgressOutboxEntry | null>((earliest, entry) =>
      !earliest || Date.parse(entry.nextAttemptAt) < Date.parse(earliest.nextAttemptAt) ? entry : earliest, null);
    if (!first || !client || !userId) return;
    retryTimer = deps.setTimer(() => { retryTimer = null; void flush(); }, Math.max(0, Date.parse(first.nextAttemptAt) - Date.parse(deps.now())));
  };

  const update = (next: StoreState) => { state = next; persist(); notify(); };
  const rebase = (remote: RemoteProgressSnapshot) => {
    const localPending = state.pendingItemMutations;
    const merged = mergeProgressStates(state, remote.state);
    const retained = localPending.filter(({ mutation }) => {
      const authoritative = remote.state.itemStates.get(`${mutation.scope}\u0000${mutation.itemKey}`);
      return !authoritative || Date.parse(mutation.clientUpdatedAt) > Date.parse(authoritative.clientUpdatedAt) ||
        (mutation.clientUpdatedAt === authoritative.clientUpdatedAt && mutation.mutationId > authoritative.mutationId);
    });
    return { ...merged, syncEpoch: remote.epoch, pendingItemMutations: retained };
  };

  async function flush(retriedConflict = false, force = false): Promise<void> {
    if (flushing) {
      if (force) forceRetryAfterFlush = true;
      return;
    }
    if (!client || !userId) return;
    const due = force ? state.pendingItemMutations : selectDueProgressMutations(state.pendingItemMutations, deps.now());
    if (!due.length) { scheduleRetry(); return; }
    flushing = true;
    const capturedClient = client; const capturedUser = userId; const capturedGeneration = generation;
    status = "syncing"; notify();
    emitPlatformEvent({
      name: "progress.outbox",
      outcome: "retrying",
      metadata: { eventCount: due.length, retry: force || retriedConflict },
    });
    try {
      const result = await deps.applyRemote(capturedClient, state.syncEpoch ?? 0, due);
      if (!current(capturedGeneration, capturedClient, capturedUser)) return;
      update({ ...state, syncEpoch: result.epoch, pendingItemMutations: acknowledgeProgressMutations(state.pendingItemMutations, result.acknowledgedMutationIds) });
      emitPlatformEvent({
        name: "progress.outbox",
        outcome: "applied",
        metadata: { eventCount: result.acknowledgedMutationIds.length },
      });
      status = state.pendingItemMutations.length ? "syncing" : "synced";
    } catch (error) {
      if (!current(capturedGeneration, capturedClient, capturedUser)) return;
      if (error instanceof ProgressEpochConflictError && !retriedConflict) {
        emitPlatformEvent({ name: "progress.outbox", outcome: "conflict", metadata: { eventCount: due.length } });
        capturePlatformError({ code: "SYNC_CONFLICT", metadata: { eventCount: due.length } });
        try {
          const remote = await deps.loadRemote(capturedClient, capturedUser);
          if (!current(capturedGeneration, capturedClient, capturedUser)) return;
          update(rebase(remote));
          flushing = false;
          return flush(true);
        } catch (reloadError) { error = reloadError; }
      }
      const code = error instanceof ProgressEpochConflictError ? "SYNC_CONFLICT" : errorCode(error);
      update({ ...state, pendingItemMutations: state.pendingItemMutations.map((entry) =>
        due.some(({ mutation }) => mutation.mutationId === entry.mutation.mutationId)
          ? markProgressMutationFailed(entry, code, deps.now(), deps.jitter) : entry) });
      status = "failed";
      const platformCode = error instanceof ProgressEpochConflictError
        ? "SYNC_CONFLICT"
        : code === "OFFLINE"
          ? "SYNC_OFFLINE"
          : "SYNC_REMOTE_FAILED";
      emitPlatformEvent({ name: "progress.outbox", outcome: "dropped", metadata: { eventCount: due.length, reason: code } });
      capturePlatformError({ code: platformCode, metadata: { eventCount: due.length, reason: code } });
      deps.onError?.(error);
    } finally {
      flushing = false;
      if (forceRetryAfterFlush) {
        forceRetryAfterFlush = false;
        void flush(false, true);
      } else {
        scheduleRetry();
      }
      notify();
    }
  }

  const unsubscribeChannel = deps.channel?.subscribe((message) => {
    if (message.type === "reset") {
      if ((state.syncEpoch ?? 0) < message.resetEpoch) update({ ...createEmptyProgressState(), syncEpoch: message.resetEpoch });
      return;
    }
    const itemStates = mergeProgressItemStates(new Map([[`${message.mutation.scope}\u0000${message.mutation.itemKey}`, message.mutation]]), state.itemStates);
    const sets = deriveProgressSets(itemStates);
    update({ ...state, ...sets, itemStates, pendingItemMutations: enqueueProgressMutation(state.pendingItemMutations, message.mutation, deps.now()) });
    void flush();
  });
  const unsubscribeOnline = deps.addOnlineListener?.(() => void flush(false, true));

  return {
    getState: () => state,
    getStatus: () => status,
    subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); },
    async setAuth(nextClient: SupabaseClient | null, nextUserId: string | null) {
      // Auth callbacks may overlap for the same user. Always include any
      // remaining anonymous document; successful persistence clears it, making
      // repeated same-user hydration idempotent instead of race-prone.
      const mergeAnonymousProgress = nextUserId !== null;
      const authChanged = userId !== nextUserId || client !== nextClient;
      const capturedGeneration = generation + 1;
      generation = capturedGeneration;
      client = nextClient;
      userId = nextUserId;
      if (!client || !userId) {
        if (authChanged) {
          emitPlatformEvent({ name: "progress.auth_invalidated", outcome: "invalidated" });
          capturePlatformError({ code: "SYNC_AUTH_CHANGED" });
        }
        status = "local-only";
        update(deps.loadLocal());
        return true;
      }
      const capturedClient = client;
      const capturedUser = userId;
      const userLocal = deps.loadLocal(capturedUser);
      const local = mergeAnonymousProgress
        ? mergeProgressStates(deps.loadLocal(), userLocal)
        : userLocal;
      try {
        const remote = await deps.loadRemote(capturedClient, capturedUser);
        if (!current(capturedGeneration, capturedClient, capturedUser)) return false;
        update({ ...mergeProgressStates(local, remote.state), syncEpoch: remote.epoch });
        if (mergeAnonymousProgress) deps.clearLocal?.();
        status = "synced";
        void flush();
        return true;
      } catch (error) {
        if (!current(capturedGeneration, capturedClient, capturedUser)) return false;
        update(local);
        if (mergeAnonymousProgress) deps.clearLocal?.();
        status = "failed";
        deps.onError?.(error);
        return true;
      }
    },
    mutate(scope: ProgressItemScope, itemKey: string, completed: boolean) {
      const mutation = createProgressItemMutation(scope, itemKey, completed, { now: deps.now });
      const itemStates = mergeProgressItemStates(new Map([[`${scope}\u0000${itemKey}`, mutation]]), state.itemStates);
      const sets = deriveProgressSets(itemStates);
      update({ ...state, ...sets, itemStates, pendingItemMutations: enqueueProgressMutation(state.pendingItemMutations, mutation, deps.now()), lastVisit: deps.now(), startedAt: state.startedAt ?? deps.now() });
      emitPlatformEvent({ name: "progress.outbox", outcome: "queued", metadata: { eventCount: 1 } });
      deps.channel?.publish({ type: "mutation", mutation });
      void flush();
    },
    async reset() {
      generation += 1;
      const capturedGeneration = generation; const capturedClient = client; const capturedUser = userId; const epoch = state.syncEpoch ?? 0;
      update({ ...createEmptyProgressState(), lastVisit: deps.now() }); deps.clearLocal?.(capturedUser);
      if (!capturedClient || !capturedUser || !deps.resetRemote) { deps.channel?.publish({ type: "reset", resetEpoch: epoch + 1 }); return; }
      try {
        const nextEpoch = await deps.resetRemote(capturedClient, epoch);
        if (!current(capturedGeneration, capturedClient, capturedUser)) return;
        update({ ...createEmptyProgressState(), syncEpoch: nextEpoch, lastVisit: deps.now() }); status = "synced";
        deps.channel?.publish({ type: "reset", resetEpoch: nextEpoch });
      } catch (error) { status = "failed"; deps.onError?.(error); notify(); }
    },
    retrySync: () => void flush(false, true),
    replaceState(next: StoreState) { update(next); },
    destroy() { unsubscribeChannel?.(); unsubscribeOnline?.(); if (retryTimer !== null) deps.clearTimer?.(retryTimer); listeners.clear(); },
  };
}
