import type { ChallengeResult } from "./challenge-types";
import type { QuizResult, StoreState } from "./progress-types";
import { createEmptyProgressState } from "./progress-types";

const STORAGE_KEY = "ai-roadmap:progress:v1";
const COMPLETED_KEY = "ai-roadmap:completed:v1";
const STARTED_KEY = "ai-roadmap:started:v1";
const PROJECT_FEATURES_KEY = "ai-roadmap:project-features:v1";
const QUIZ_RESULTS_KEY = "ai-roadmap:quiz-results:v1";
const CHALLENGE_RESULTS_KEY = "ai-roadmap:challenge-results:v1";

const BASE_KEYS = [
  STORAGE_KEY,
  COMPLETED_KEY,
  STARTED_KEY,
  PROJECT_FEATURES_KEY,
  QUIZ_RESULTS_KEY,
  CHALLENGE_RESULTS_KEY,
] as const;

type BaseKey = (typeof BASE_KEYS)[number];

function keyFor(baseKey: BaseKey, userId?: string | null): string {
  return userId ? `${baseKey}:user:${encodeURIComponent(userId)}` : baseKey;
}

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  const parsed = JSON.parse(raw) as unknown;
  return parsed as T;
}

export function loadLocalProgressState(userId?: string | null): StoreState {
  if (typeof window === "undefined") return createEmptyProgressState();

  try {
    const rawCompleted = readJson<unknown>(keyFor(COMPLETED_KEY, userId), []);
    const completed = Array.isArray(rawCompleted)
      ? new Set(rawCompleted.filter((entry): entry is string => typeof entry === "string"))
      : new Set<string>();

    const rawFeatures = readJson<unknown>(keyFor(PROJECT_FEATURES_KEY, userId), []);
    const projectFeatures = Array.isArray(rawFeatures)
      ? new Set(rawFeatures.filter((entry): entry is string => typeof entry === "string"))
      : new Set<string>();

    const rawQuizResults = readJson<unknown>(keyFor(QUIZ_RESULTS_KEY, userId), {});
    const quizResults =
      rawQuizResults && typeof rawQuizResults === "object" && !Array.isArray(rawQuizResults)
        ? new Map<string, QuizResult>(Object.entries(rawQuizResults as Record<string, QuizResult>))
        : new Map<string, QuizResult>();

    const rawChallengeResults = readJson<unknown>(keyFor(CHALLENGE_RESULTS_KEY, userId), {});
    const challengeResults =
      rawChallengeResults && typeof rawChallengeResults === "object" && !Array.isArray(rawChallengeResults)
        ? new Map<string, ChallengeResult>(
            Object.entries(rawChallengeResults as Record<string, ChallengeResult>)
          )
        : new Map<string, ChallengeResult>();

    return {
      completed,
      projectFeatures,
      quizResults,
      challengeResults,
      lastVisit: localStorage.getItem(keyFor(STORAGE_KEY, userId)),
      startedAt: localStorage.getItem(keyFor(STARTED_KEY, userId)),
    };
  } catch {
    return createEmptyProgressState();
  }
}

export function persistLocalProgressState(state: StoreState, userId?: string | null): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(keyFor(COMPLETED_KEY, userId), JSON.stringify([...state.completed]));
    localStorage.setItem(keyFor(PROJECT_FEATURES_KEY, userId), JSON.stringify([...state.projectFeatures]));
    localStorage.setItem(keyFor(QUIZ_RESULTS_KEY, userId), JSON.stringify(Object.fromEntries(state.quizResults)));
    localStorage.setItem(
      keyFor(CHALLENGE_RESULTS_KEY, userId),
      JSON.stringify(Object.fromEntries(state.challengeResults))
    );

    if (state.lastVisit) localStorage.setItem(keyFor(STORAGE_KEY, userId), state.lastVisit);
    else localStorage.removeItem(keyFor(STORAGE_KEY, userId));

    if (state.startedAt) localStorage.setItem(keyFor(STARTED_KEY, userId), state.startedAt);
    else localStorage.removeItem(keyFor(STARTED_KEY, userId));
  } catch {
    // Ignore browser quota/security errors. The in-memory store remains usable.
  }
}

export function clearLocalProgressState(userId?: string | null): void {
  if (typeof window === "undefined") return;

  for (const key of BASE_KEYS) {
    localStorage.removeItem(keyFor(key, userId));
  }
}
