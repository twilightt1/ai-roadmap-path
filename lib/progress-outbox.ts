import { compareProgressItemMutations, itemStateKey } from "./progress-item-state";
import type { ProgressItemState, ProgressOutboxEntry } from "./progress-types";

const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 60_000] as const;

type LegacyOrOutboxEntry = ProgressItemState | ProgressOutboxEntry;

function isOutboxEntry(entry: LegacyOrOutboxEntry): entry is ProgressOutboxEntry {
  return "mutation" in entry;
}

function mutationOf(entry: LegacyOrOutboxEntry): ProgressItemState {
  return isOutboxEntry(entry) ? entry.mutation : entry;
}

function retryEntry(mutation: ProgressItemState, now: string): ProgressOutboxEntry {
  return { mutation, attemptCount: 0, nextAttemptAt: now, lastErrorCode: null };
}

/** Returns the bounded base delay before deterministic jitter is applied. */
export function nextRetryDelayMs(attemptCount: number): number {
  return RETRY_DELAYS_MS[Math.min(Math.max(0, attemptCount), RETRY_DELAYS_MS.length - 1)];
}

/** A retry is due when its persisted deadline is not later than the supplied time. */
export function isRetryDue(entry: ProgressOutboxEntry, now: string): boolean {
  return Date.parse(entry.nextAttemptAt) <= Date.parse(now);
}

/** Selects entries due at a caller-supplied instant without mutating the outbox. */
export function selectDueProgressMutations(
  pending: ProgressOutboxEntry[],
  now: string
): ProgressOutboxEntry[] {
  return pending.filter((entry) => isRetryDue(entry, now));
}

/**
 * Records a failed attempt and schedules its next attempt. `jitter` must return
 * a deterministic value in [0, 1] when reproducible scheduling is required.
 */
export function markProgressMutationFailed(
  entry: ProgressOutboxEntry,
  errorCode: string,
  now: string,
  jitter: () => number = () => 0
): ProgressOutboxEntry {
  const baseDelay = nextRetryDelayMs(entry.attemptCount);
  const jitterRatio = Math.min(1, Math.max(0, jitter()));
  const delay = baseDelay + Math.round(baseDelay * 0.2 * jitterRatio);

  return {
    ...entry,
    attemptCount: entry.attemptCount + 1,
    nextAttemptAt: new Date(Date.parse(now) + delay).toISOString(),
    lastErrorCode: errorCode,
  };
}

export function enqueueProgressMutation(
  pending: ProgressOutboxEntry[],
  mutation: ProgressItemState,
  now?: string
): ProgressOutboxEntry[];
/** @deprecated Prefer durable ProgressOutboxEntry values. */
export function enqueueProgressMutation(
  pending: ProgressItemState[],
  mutation: ProgressItemState,
  now?: string
): ProgressItemState[];
export function enqueueProgressMutation(
  pending: LegacyOrOutboxEntry[],
  mutation: ProgressItemState,
  now?: string
): LegacyOrOutboxEntry[] {
  // An unadorned raw-mutation array is the legacy contract. Durable callers
  // opt in with an outbox entry or an explicit scheduling instant, which keeps
  // an initially empty durable outbox distinguishable at runtime.
  const durable = now !== undefined || pending.some(isOutboxEntry);
  const scheduledAt = now ?? mutation.clientUpdatedAt;
  const key = itemStateKey(mutation.scope, mutation.itemKey);
  const existing = pending.find((entry) => {
    const existingMutation = mutationOf(entry);
    return itemStateKey(existingMutation.scope, existingMutation.itemKey) === key;
  });

  if (!existing) return [...pending, durable ? retryEntry(mutation, scheduledAt) : mutation];
  if (compareProgressItemMutations(mutation, mutationOf(existing)) <= 0) return [...pending];

  return pending.map((entry) => {
    const existingMutation = mutationOf(entry);
    return itemStateKey(existingMutation.scope, existingMutation.itemKey) === key
      ? isOutboxEntry(entry)
        ? retryEntry(mutation, scheduledAt)
        : mutation
      : entry;
  });
}

export function mergePendingProgressMutations(
  current: ProgressOutboxEntry[],
  incoming: ProgressOutboxEntry[],
  now?: string
): ProgressOutboxEntry[];
/** @deprecated Prefer durable ProgressOutboxEntry values. */
export function mergePendingProgressMutations(
  current: ProgressItemState[],
  incoming: ProgressItemState[],
  now?: string
): ProgressItemState[];
export function mergePendingProgressMutations(
  current: LegacyOrOutboxEntry[],
  incoming: LegacyOrOutboxEntry[],
  now?: string
): LegacyOrOutboxEntry[] {
  const durable = current.some(isOutboxEntry) || incoming.some(isOutboxEntry);

  return incoming.reduce<LegacyOrOutboxEntry[]>(
    (pending, entry) => {
      const mutation = mutationOf(entry);
      return enqueueProgressMutation(
        pending as ProgressItemState[],
        mutation,
        durable ? (now ?? mutation.clientUpdatedAt) : undefined
      ) as LegacyOrOutboxEntry[];
    },
    current
  );
}

export function acknowledgeProgressMutations(
  pending: ProgressOutboxEntry[],
  acknowledgedMutationIds: string[]
): ProgressOutboxEntry[];
/** @deprecated Prefer durable ProgressOutboxEntry values. */
export function acknowledgeProgressMutations(
  pending: ProgressItemState[],
  acknowledgedMutationIds: string[]
): ProgressItemState[];
export function acknowledgeProgressMutations(
  pending: LegacyOrOutboxEntry[],
  acknowledgedMutationIds: string[]
): LegacyOrOutboxEntry[] {
  const acknowledged = new Set(acknowledgedMutationIds);
  return pending.filter((entry) => !acknowledged.has(mutationOf(entry).mutationId));
}
