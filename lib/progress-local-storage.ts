import type { ChallengeResult } from "./challenge-types";
import { parseProgressDocument, serializeProgressDocument } from "./progress-document";
import { itemStateKey } from "./progress-item-state";
import type { ProgressItemState, QuizResult, StoreState } from "./progress-types";
import { createEmptyProgressState } from "./progress-types";

const V3_STORAGE_KEY = "ai-roadmap:progress:v3";
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
type ProgressBaseKey = LegacyBaseKey | typeof V2_STORAGE_KEY | typeof V3_STORAGE_KEY;

function keyFor(baseKey: ProgressBaseKey, userId?: string | null): string {
  return userId ? `${baseKey}:user:${encodeURIComponent(userId)}` : baseKey;
}

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isResultMap(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function legacyMutationId(scope: "lesson" | "project_feature", itemKey: string): string {
  let hash = 2166136261;
  for (const character of `${scope}:${itemKey}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const suffix = (hash >>> 0).toString(16).padStart(8, "0");
  return `00000000-0000-4000-8000-0000${suffix}`;
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
      mutationId: legacyMutationId("lesson", itemKey),
    };
    itemStates.set(itemStateKey(state.scope, state.itemKey), state);
  }

  for (const itemKey of projectFeatures) {
    const state: ProgressItemState = {
      scope: "project_feature",
      itemKey,
      completed: true,
      clientUpdatedAt,
      mutationId: legacyMutationId("project_feature", itemKey),
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

function parseStoredDocument(key: string): StoreState | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    return parseProgressDocument(JSON.parse(raw));
  } catch {
    return null;
  }
}

function stateForPersistence(state: StoreState): StoreState {
  if (state.itemStates.size > 0) return state;

  return {
    ...state,
    itemStates: createLegacyItemStates(state.completed, state.projectFeatures, state.lastVisit),
  };
}

function persistV3Document(state: StoreState, userId?: string | null): boolean {
  try {
    localStorage.setItem(
      keyFor(V3_STORAGE_KEY, userId),
      JSON.stringify(serializeProgressDocument(stateForPersistence(state)))
    );
    return true;
  } catch {
    return false;
  }
}

function removeKeys(keys: readonly ProgressBaseKey[], userId?: string | null): void {
  for (const key of keys) localStorage.removeItem(keyFor(key, userId));
}

export function loadLocalProgressState(userId?: string | null): StoreState {
  if (typeof window === "undefined") return createEmptyProgressState();

  const v3State = parseStoredDocument(keyFor(V3_STORAGE_KEY, userId));
  if (v3State) return v3State;

  const v2State = parseStoredDocument(keyFor(V2_STORAGE_KEY, userId));
  if (v2State) {
    if (persistV3Document(v2State, userId)) localStorage.removeItem(keyFor(V2_STORAGE_KEY, userId));
    return v2State;
  }

  const hasLegacyData = LEGACY_BASE_KEYS.some((key) => localStorage.getItem(keyFor(key, userId)) !== null);
  if (!hasLegacyData) return createEmptyProgressState();

  const legacyState = loadLegacyProgressState(userId);
  if (persistV3Document(legacyState, userId)) removeKeys(LEGACY_BASE_KEYS, userId);
  return legacyState;
}

export function persistLocalProgressState(state: StoreState, userId?: string | null): void {
  if (typeof window === "undefined") return;
  if (persistV3Document(state, userId)) removeKeys([V2_STORAGE_KEY, ...LEGACY_BASE_KEYS], userId);
}

export function clearLocalProgressState(userId?: string | null): void {
  if (typeof window === "undefined") return;
  removeKeys([V3_STORAGE_KEY, V2_STORAGE_KEY, ...LEGACY_BASE_KEYS], userId);
}
