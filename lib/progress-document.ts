import type { ChallengeResult } from "./challenge-types";
import { deriveProgressSets, itemStateKey } from "./progress-item-state";
import type { PracticeEvent } from "./practice-events";
import type { ProgressItemState, ProgressOutboxEntry, QuizResult, StoreState } from "./progress-types";

export type LocalProgressDocumentV3 = {
  schemaVersion: 3;
  syncEpoch: number | null;
  pendingItemMutations: ProgressOutboxEntry[];
  pendingPracticeEvents: PracticeEvent[];
  itemStates: ProgressItemState[];
  quizResults: Record<string, QuizResult>;
  challengeResults: Record<string, ChallengeResult>;
  startedAt: string | null;
  lastVisit: string | null;
};

type LocalProgressDocumentV2 = Omit<LocalProgressDocumentV3, "schemaVersion"> & {
  schemaVersion: 2;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_TYPES = new Set([
  "challenge_started",
  "step_viewed",
  "step_completed",
  "run",
  "submit",
  "hint_opened",
  "walkthrough_opened",
  "challenge_passed",
  "transfer_passed",
]);
const PRACTICE_STEPS = new Set([
  "recall",
  "worked_example",
  "scaffold",
  "independent_challenge",
  "transfer",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function isNullableDate(value: unknown): value is string | null {
  return value === null || isValidDate(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isSyncEpoch(value: unknown): value is number | null | undefined {
  return value === undefined || value === null || (typeof value === "number" && Number.isInteger(value) && value >= 0);
}

function isProgressItemState(value: unknown): value is ProgressItemState {
  if (!isRecord(value)) return false;
  return (
    (value.scope === "lesson" || value.scope === "project_feature") &&
    typeof value.itemKey === "string" &&
    value.itemKey.length > 0 &&
    typeof value.completed === "boolean" &&
    isValidDate(value.clientUpdatedAt) &&
    isUuid(value.mutationId)
  );
}

function isProgressOutboxEntry(value: unknown): value is ProgressOutboxEntry {
  if (!isRecord(value)) return false;
  return (
    isProgressItemState(value.mutation) &&
    typeof value.attemptCount === "number" &&
    Number.isInteger(value.attemptCount) &&
    value.attemptCount >= 0 &&
    isValidDate(value.nextAttemptAt) &&
    (value.lastErrorCode === null || typeof value.lastErrorCode === "string")
  );
}

function isPracticeEvent(value: unknown): value is PracticeEvent {
  if (!isRecord(value)) return false;
  return (
    isUuid(value.eventId) &&
    typeof value.challengeId === "string" &&
    value.challengeId.length > 0 &&
    (value.contentVersion === null || typeof value.contentVersion === "string") &&
    (value.origin === "anonymous" || value.origin === "authenticated") &&
    typeof value.eventType === "string" &&
    EVENT_TYPES.has(value.eventType) &&
    (value.step === null || (typeof value.step === "string" && PRACTICE_STEPS.has(value.step))) &&
    (value.hintLevel === null || value.hintLevel === 0 || value.hintLevel === 1 || value.hintLevel === 2 || value.hintLevel === 3) &&
    (value.passed === null || typeof value.passed === "boolean") &&
    isValidDate(value.occurredAt)
  );
}

function isQuizResult(value: unknown): value is QuizResult {
  if (!isRecord(value)) return false;
  return (
    typeof value.score === "number" &&
    Number.isFinite(value.score) &&
    value.score >= 0 &&
    typeof value.total === "number" &&
    Number.isFinite(value.total) &&
    value.total >= 0 &&
    value.score <= value.total &&
    isNullableDate(value.passedAt) &&
    typeof value.attempts === "number" &&
    Number.isInteger(value.attempts) &&
    value.attempts >= 0
  );
}

function isChallengeResult(value: unknown): value is ChallengeResult {
  if (!isRecord(value)) return false;
  return (
    isNullableDate(value.solvedAt) &&
    typeof value.attempts === "number" &&
    Number.isInteger(value.attempts) &&
    value.attempts >= 0 &&
    typeof value.lastPassed === "boolean"
  );
}

function isResultMap<T>(value: unknown, isResult: (entry: unknown) => entry is T): value is Record<string, T> {
  return isRecord(value) && Object.entries(value).every(([key, entry]) => key.length > 0 && isResult(entry));
}

function parseDocument(value: unknown): StoreState | null {
  if (!isRecord(value) || (value.schemaVersion !== 2 && value.schemaVersion !== 3)) return null;
  if (
    !Array.isArray(value.itemStates) ||
    !value.itemStates.every(isProgressItemState) ||
    (value.pendingItemMutations !== undefined &&
      (!Array.isArray(value.pendingItemMutations) ||
        !value.pendingItemMutations.every(
          (entry) => isProgressOutboxEntry(entry) || isProgressItemState(entry)
        ))) ||
    (value.pendingPracticeEvents !== undefined && (!Array.isArray(value.pendingPracticeEvents) || !value.pendingPracticeEvents.every(isPracticeEvent))) ||
    !isSyncEpoch(value.syncEpoch) ||
    !isResultMap(value.quizResults, isQuizResult) ||
    !isResultMap(value.challengeResults, isChallengeResult) ||
    !isNullableDate(value.startedAt) ||
    !isNullableDate(value.lastVisit)
  ) {
    return null;
  }

  const itemStates = new Map<string, ProgressItemState>();
  for (const state of value.itemStates) itemStates.set(itemStateKey(state.scope, state.itemKey), state);
  const { completed, projectFeatures } = deriveProgressSets(itemStates);

  return {
    completed,
    projectFeatures,
    itemStates,
    pendingItemMutations: (value.pendingItemMutations ?? []).map((entry) =>
      isProgressOutboxEntry(entry)
        ? entry
        : {
            mutation: entry,
            attemptCount: 0,
            nextAttemptAt: entry.clientUpdatedAt,
            lastErrorCode: null,
          }
    ),
    pendingPracticeEvents: value.pendingPracticeEvents ?? [],
    syncEpoch: value.syncEpoch ?? 0,
    quizResults: new Map(Object.entries(value.quizResults)),
    challengeResults: new Map(Object.entries(value.challengeResults)),
    startedAt: value.startedAt,
    lastVisit: value.lastVisit,
  };
}

/** Parses a complete V3 document or a valid V2 document awaiting migration. */
export function parseProgressDocument(value: unknown): StoreState | null {
  return parseDocument(value);
}

export function serializeProgressDocument(state: StoreState): LocalProgressDocumentV3 {
  return {
    schemaVersion: 3,
    syncEpoch: state.syncEpoch,
    pendingItemMutations: state.pendingItemMutations,
    pendingPracticeEvents: state.pendingPracticeEvents,
    itemStates: [...state.itemStates.values()],
    quizResults: Object.fromEntries(state.quizResults),
    challengeResults: Object.fromEntries(state.challengeResults),
    startedAt: state.startedAt,
    lastVisit: state.lastVisit,
  };
}

export type { LocalProgressDocumentV2 };
