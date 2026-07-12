import type { ChallengeResult } from "./challenge-types";
import { deriveProgressSets, itemStateKey } from "./progress-item-state";
import type { ProgressItemState, QuizResult, StoreState } from "./progress-types";
import { createEmptyProgressState } from "./progress-types";

const V2_STORAGE_KEY = "ai-roadmap:progress:v2";
const STORAGE_KEY = "ai-roadmap:progress:v1";
const COMPLETED_KEY = "ai-roadmap:completed:v1";
const STARTED_KEY = "ai-roadmap:started:v1";
const PROJECT_FEATURES_KEY = "ai-roadmap:project-features:v1";
const QUIZ_RESULTS_KEY = "ai-roadmap:quiz-results:v1";
const CHALLENGE_RESULTS_KEY = "ai-roadmap:challenge-results:v1";

const LEGACY_BASE_KEYS = [
  STORAGE_KEY,
  COMPLETED_KEY,
  STARTED_KEY,
  PROJECT_FEATURES_KEY,
  QUIZ_RESULTS_KEY,
  CHALLENGE_RESULTS_KEY,
] as const;

type LegacyBaseKey = (typeof LEGACY_BASE_KEYS)[number];

type LocalProgressDocumentV2 = {
  schemaVersion: 2;
  syncEpoch: number | null;
  pendingItemMutations: ProgressItemState[];
  pendingPracticeEvents: import("./practice-events").PracticeEvent[];
  itemStates: ProgressItemState[];
  quizResults: Record<string, QuizResult>;
  challengeResults: Record<string, ChallengeResult>;
  startedAt: string | null;
  lastVisit: string | null;
};

function keyFor(baseKey: LegacyBaseKey | typeof V2_STORAGE_KEY, userId?: string | null): string {
  return userId ? `${baseKey}:user:${encodeURIComponent(userId)}` : baseKey;
}

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  return JSON.parse(raw) as T;
}

function isProgressItemState(value: unknown): value is ProgressItemState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    (item.scope === "lesson" || item.scope === "project_feature") &&
    typeof item.itemKey === "string" &&
    typeof item.completed === "boolean" &&
    typeof item.clientUpdatedAt === "string" &&
    typeof item.mutationId === "string"
  );
}

function isResultMap(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseV2(value: unknown): StoreState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const document = value as Record<string, unknown>;
  if (
    document.schemaVersion !== 2 ||
    !Array.isArray(document.itemStates) ||
    !document.itemStates.every(isProgressItemState) ||
    (document.pendingItemMutations !== undefined &&
      (!Array.isArray(document.pendingItemMutations) ||
        !document.pendingItemMutations.every(isProgressItemState))) ||
    (document.pendingPracticeEvents !== undefined && !Array.isArray(document.pendingPracticeEvents)) ||
    (document.syncEpoch !== undefined &&
      document.syncEpoch !== null &&
      (typeof document.syncEpoch !== "number" || !Number.isInteger(document.syncEpoch))) ||
    !isResultMap(document.quizResults) ||
    !isResultMap(document.challengeResults) ||
    (document.startedAt !== null && typeof document.startedAt !== "string") ||
    (document.lastVisit !== null && typeof document.lastVisit !== "string")
  ) {
    return null;
  }

  const itemStates = new Map<string, ProgressItemState>();
  for (const state of document.itemStates) {
    itemStates.set(itemStateKey(state.scope, state.itemKey), state);
  }

  const { completed, projectFeatures } = deriveProgressSets(itemStates);
  return {
    completed,
    projectFeatures,
    itemStates,
    pendingItemMutations: (document.pendingItemMutations as ProgressItemState[] | undefined) ?? [],
    pendingPracticeEvents: (document.pendingPracticeEvents as import("./practice-events").PracticeEvent[] | undefined) ?? [],
    syncEpoch: (document.syncEpoch as number | null | undefined) ?? null,
    quizResults: new Map(Object.entries(document.quizResults as Record<string, QuizResult>)),
    challengeResults: new Map(
      Object.entries(document.challengeResults as Record<string, ChallengeResult>)
    ),
    startedAt: document.startedAt,
    lastVisit: document.lastVisit,
  };
}

function createLegacyItemStates(
  completed: Set<string>,
  projectFeatures: Set<string>,
  timestamp: string | null
): Map<string, ProgressItemState> {
  const clientUpdatedAt = timestamp ?? "1970-01-01T00:00:00.000Z";
  const itemStates = new Map<string, ProgressItemState>();

  for (const itemKey of completed) {
    const state: ProgressItemState = {
      scope: "lesson",
      itemKey,
      completed: true,
      clientUpdatedAt,
      mutationId: `legacy:lesson:${itemKey}`,
    };
    itemStates.set(itemStateKey(state.scope, state.itemKey), state);
  }

  for (const itemKey of projectFeatures) {
    const state: ProgressItemState = {
      scope: "project_feature",
      itemKey,
      completed: true,
      clientUpdatedAt,
      mutationId: `legacy:project_feature:${itemKey}`,
    };
    itemStates.set(itemStateKey(state.scope, state.itemKey), state);
  }

  return itemStates;
}

function loadLegacyProgressState(userId?: string | null): StoreState {
  const rawCompleted = readJson<unknown>(keyFor(COMPLETED_KEY, userId), []);
  const completed = Array.isArray(rawCompleted)
    ? new Set(rawCompleted.filter((entry): entry is string => typeof entry === "string"))
    : new Set<string>();

  const rawFeatures = readJson<unknown>(keyFor(PROJECT_FEATURES_KEY, userId), []);
  const projectFeatures = Array.isArray(rawFeatures)
    ? new Set(rawFeatures.filter((entry): entry is string => typeof entry === "string"))
    : new Set<string>();

  const rawQuizResults = readJson<unknown>(keyFor(QUIZ_RESULTS_KEY, userId), {});
  const quizResults = isResultMap(rawQuizResults)
    ? new Map<string, QuizResult>(Object.entries(rawQuizResults as Record<string, QuizResult>))
    : new Map<string, QuizResult>();

  const rawChallengeResults = readJson<unknown>(keyFor(CHALLENGE_RESULTS_KEY, userId), {});
  const challengeResults = isResultMap(rawChallengeResults)
    ? new Map<string, ChallengeResult>(
        Object.entries(rawChallengeResults as Record<string, ChallengeResult>)
      )
    : new Map<string, ChallengeResult>();

  const lastVisit = localStorage.getItem(keyFor(STORAGE_KEY, userId));
  const startedAt = localStorage.getItem(keyFor(STARTED_KEY, userId));
  const itemStates = createLegacyItemStates(completed, projectFeatures, lastVisit);

  return {
    completed,
    projectFeatures,
    itemStates,
    pendingItemMutations: [],
    pendingPracticeEvents: [],
    syncEpoch: null,
    quizResults,
    challengeResults,
    lastVisit,
    startedAt,
  };
}

function itemStatesForPersistence(state: StoreState): Map<string, ProgressItemState> {
  if (state.itemStates.size > 0) return state.itemStates;
  return createLegacyItemStates(state.completed, state.projectFeatures, state.lastVisit);
}

function toV2Document(state: StoreState): LocalProgressDocumentV2 {
  return {
    schemaVersion: 2,
    syncEpoch: state.syncEpoch,
    pendingItemMutations: state.pendingItemMutations,
    pendingPracticeEvents: state.pendingPracticeEvents,
    itemStates: [...itemStatesForPersistence(state).values()],
    quizResults: Object.fromEntries(state.quizResults),
    challengeResults: Object.fromEntries(state.challengeResults),
    startedAt: state.startedAt,
    lastVisit: state.lastVisit,
  };
}

export function loadLocalProgressState(userId?: string | null): StoreState {
  if (typeof window === "undefined") return createEmptyProgressState();

  try {
    const v2Key = keyFor(V2_STORAGE_KEY, userId);
    const rawV2 = localStorage.getItem(v2Key);
    if (rawV2) {
      const state = parseV2(JSON.parse(rawV2));
      return state ?? createEmptyProgressState();
    }

    const legacyState = loadLegacyProgressState(userId);
    const hasLegacyData = LEGACY_BASE_KEYS.some((key) => localStorage.getItem(keyFor(key, userId)) !== null);
    if (hasLegacyData) persistLocalProgressState(legacyState, userId);
    return legacyState;
  } catch {
    return createEmptyProgressState();
  }
}

export function persistLocalProgressState(state: StoreState, userId?: string | null): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(keyFor(V2_STORAGE_KEY, userId), JSON.stringify(toV2Document(state)));
    for (const key of LEGACY_BASE_KEYS) {
      localStorage.removeItem(keyFor(key, userId));
    }
  } catch {
    // Ignore browser quota/security errors. The in-memory store remains usable.
  }
}

export function clearLocalProgressState(userId?: string | null): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(keyFor(V2_STORAGE_KEY, userId));
  for (const key of LEGACY_BASE_KEYS) {
    localStorage.removeItem(keyFor(key, userId));
  }
}
