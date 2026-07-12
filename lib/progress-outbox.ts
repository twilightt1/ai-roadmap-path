import { compareProgressItemMutations, itemStateKey } from "./progress-item-state";
import type { ProgressItemState } from "./progress-types";

export function enqueueProgressMutation(
  pending: ProgressItemState[],
  mutation: ProgressItemState
): ProgressItemState[] {
  const key = itemStateKey(mutation.scope, mutation.itemKey);
  const existing = pending.find((entry) => itemStateKey(entry.scope, entry.itemKey) === key);

  if (!existing) return [...pending, mutation];
  if (compareProgressItemMutations(mutation, existing) <= 0) return [...pending];

  return pending.map((entry) =>
    itemStateKey(entry.scope, entry.itemKey) === key ? mutation : entry
  );
}

export function mergePendingProgressMutations(
  current: ProgressItemState[],
  incoming: ProgressItemState[]
): ProgressItemState[] {
  return incoming.reduce(enqueueProgressMutation, current);
}

export function acknowledgeProgressMutations(
  pending: ProgressItemState[],
  acknowledgedMutationIds: string[]
): ProgressItemState[] {
  const acknowledged = new Set(acknowledgedMutationIds);
  return pending.filter((mutation) => !acknowledged.has(mutation.mutationId));
}
