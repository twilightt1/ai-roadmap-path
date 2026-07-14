import type { ProgressItemScope, ProgressItemState } from "./progress-types";

export type ProgressItemMutationDependencies = {
  now?: () => string;
  createId?: () => string;
};

export function itemStateKey(scope: ProgressItemScope, itemKey: string): string {
  return `${scope}\u0000${itemKey}`;
}

/**
 * Compares the last-write-wins tuple `(clientUpdatedAt, mutationId)`.
 * A positive result means `left` is newer than `right`.
 */
export function compareProgressItemMutations(
  left: ProgressItemState,
  right: ProgressItemState
): number {
  const timestamp = left.clientUpdatedAt.localeCompare(right.clientUpdatedAt);
  return timestamp !== 0 ? timestamp : left.mutationId.localeCompare(right.mutationId);
}

export function applyProgressItemMutation(
  states: Map<string, ProgressItemState>,
  mutation: ProgressItemState
): Map<string, ProgressItemState> {
  const key = itemStateKey(mutation.scope, mutation.itemKey);
  const existing = states.get(key);

  if (existing && compareProgressItemMutations(mutation, existing) <= 0) {
    return new Map(states);
  }

  const next = new Map(states);
  next.set(key, mutation);
  return next;
}

export function mergeProgressItemStates(
  local: Map<string, ProgressItemState>,
  remote: Map<string, ProgressItemState>
): Map<string, ProgressItemState> {
  let merged = new Map(remote);
  for (const mutation of local.values()) {
    merged = applyProgressItemMutation(merged, mutation);
  }
  return merged;
}

export function deriveProgressSets(states: Map<string, ProgressItemState>): {
  completed: Set<string>;
  projectFeatures: Set<string>;
} {
  const completed = new Set<string>();
  const projectFeatures = new Set<string>();

  for (const state of states.values()) {
    if (!state.completed) continue;
    if (state.scope === "lesson") completed.add(state.itemKey);
    else projectFeatures.add(state.itemKey);
  }

  return { completed, projectFeatures };
}

export function createProgressItemMutation(
  scope: ProgressItemScope,
  itemKey: string,
  completed: boolean,
  dependencies: ProgressItemMutationDependencies = {}
): ProgressItemState {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const createId = dependencies.createId ?? (() => crypto.randomUUID());

  return {
    scope,
    itemKey,
    completed,
    clientUpdatedAt: now(),
    mutationId: createId(),
  };
}
