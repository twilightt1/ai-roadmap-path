import type { ChallengeResult, ChallengeRunResult } from "./challenge-types";

export type ProgressStats = {
  overall: number;
  completedTopics: number;
  totalTopics: number;
  completedPhases: number;
  totalPhases: number;
  phaseProgress: Array<{
    phase: number;
    slug: string;
    title: string;
    completed: number;
    total: number;
    percent: number;
    done: boolean;
  }>;
  completedProjects: number;
  totalProjects: number;
  projectProgress: Array<{
    phase: number;
    slug: string;
    title: string;
    completed: number;
    total: number;
    percent: number;
  }>;
  startedAt: string | null;
  lastVisit: string | null;
  daysSinceStart: number;
};

export type QuizResult = {
  score: number;
  total: number;
  passedAt: string | null;
  attempts: number;
};

export type ProgressItemScope = "lesson" | "project_feature";

/**
 * Authoritative state for a completion checkbox. An explicit `completed: false`
 * is retained so an uncheck can win over an older remote completion.
 */
export type ProgressItemState = {
  scope: ProgressItemScope;
  itemKey: string;
  completed: boolean;
  clientUpdatedAt: string;
  mutationId: string;
};

export type ProgressOutboxEntry = {
  mutation: ProgressItemState;
  attemptCount: number;
  nextAttemptAt: string;
  lastErrorCode: string | null;
};

export type ProgressSyncStatus = "local-only" | "syncing" | "synced" | "failed";

export type StoreState = {
  completed: Set<string>;
  projectFeatures: Set<string>;
  itemStates: Map<string, ProgressItemState>;
  pendingItemMutations: ProgressOutboxEntry[];
  pendingPracticeEvents: import("./practice-events").PracticeEvent[];
  syncEpoch: number | null;
  quizResults: Map<string, QuizResult>;
  challengeResults: Map<string, ChallengeResult>;
  startedAt: string | null;
  lastVisit: string | null;
};

export type QuizAttemptDetails = {
  answers?: Array<number | null>;
  durationSeconds?: number;
  completedAt?: string;
};

export type ChallengeAttemptDetails = {
  code?: string;
  language?: string;
  testResults?: ChallengeRunResult;
  durationSeconds?: number;
  submittedAt?: string;
};

export function topicKey(phaseSlug: string, topicId: string): string {
  return `${phaseSlug}/${topicId}`;
}

export function featureKey(projectId: string, featureIndex: number): string {
  return `${projectId}/${featureIndex}`;
}

export function createEmptyProgressState(): StoreState {
  return {
    completed: new Set(),
    projectFeatures: new Set(),
    itemStates: new Map(),
    pendingItemMutations: [],
    pendingPracticeEvents: [],
    syncEpoch: null,
    quizResults: new Map(),
    challengeResults: new Map(),
    startedAt: null,
    lastVisit: null,
  };
}

export function cloneProgressState(state: StoreState): StoreState {
  return {
    completed: new Set(state.completed),
    projectFeatures: new Set(state.projectFeatures),
    itemStates: new Map(state.itemStates),
    pendingItemMutations: [...state.pendingItemMutations],
    pendingPracticeEvents: [...state.pendingPracticeEvents],
    syncEpoch: state.syncEpoch,
    quizResults: new Map(state.quizResults),
    challengeResults: new Map(state.challengeResults),
    startedAt: state.startedAt,
    lastVisit: state.lastVisit,
  };
}
