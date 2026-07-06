"use client";

import { useCallback, useSyncExternalStore } from "react";
import { phases, allProjects } from "./roadmap-data";
import { QUIZ_PASS_THRESHOLD } from "./quiz-types";
import type { ChallengeResult } from "./challenge-types";

/**
 * Progress tracking store — localStorage-based, không cần auth.
 *
 * Singleton store with `useSyncExternalStore` so all components share state.
 * Track: set of completed topic IDs (slug form: `${phaseSlug}/${topicId}`).
 */

const STORAGE_KEY = "ai-roadmap:progress:v1";
const COMPLETED_KEY = "ai-roadmap:completed:v1";
const STARTED_KEY = "ai-roadmap:started:v1";
const PROJECT_FEATURES_KEY = "ai-roadmap:project-features:v1";
const QUIZ_RESULTS_KEY = "ai-roadmap:quiz-results:v1";
const CHALLENGE_RESULTS_KEY = "ai-roadmap:challenge-results:v1";

export type ProgressStats = {
  /** 0..100 */
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
  /** Days since first activity — computed once when store loads */
  daysSinceStart: number;
};

/** Kết quả làm quiz của một topic — key bằng topicKey(phaseSlug, topicId). */
export type QuizResult = {
  /** Số câu đúng. */
  score: number;
  /** Tổng số câu. */
  total: number;
  /** ISO timestamp khi vượt qua ngưỡng pass lần đầu, hoặc null nếu chưa pass. */
  passedAt: string | null;
  /** Số lần đã nộp bài. */
  attempts: number;
};

type StoreState = {
  completed: Set<string>;
  projectFeatures: Set<string>;
  quizResults: Map<string, QuizResult>;
  challengeResults: Map<string, ChallengeResult>;
  startedAt: string | null;
  lastVisit: string | null;
};

const emptyState: StoreState = {
  completed: new Set(),
  projectFeatures: new Set(),
  quizResults: new Map(),
  challengeResults: new Map(),
  startedAt: null,
  lastVisit: null,
};

let state: StoreState = emptyState;
let hydrated = false;
const listeners = new Set<() => void>();

function loadState(): StoreState {
  if (typeof window === "undefined") return emptyState;
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    const completed = raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>();
    const featuresRaw = localStorage.getItem(PROJECT_FEATURES_KEY);
    const projectFeatures = featuresRaw
      ? new Set<string>(JSON.parse(featuresRaw) as string[])
      : new Set<string>();
    const quizRaw = localStorage.getItem(QUIZ_RESULTS_KEY);
    const quizResults = quizRaw
      ? new Map<string, QuizResult>(Object.entries(JSON.parse(quizRaw) as Record<string, QuizResult>))
      : new Map<string, QuizResult>();
    const challengeRaw = localStorage.getItem(CHALLENGE_RESULTS_KEY);
    const challengeResults = challengeRaw
      ? new Map<string, ChallengeResult>(
          Object.entries(JSON.parse(challengeRaw) as Record<string, ChallengeResult>)
        )
      : new Map<string, ChallengeResult>();
    const lastVisit = localStorage.getItem(STORAGE_KEY);
    const startedAt = localStorage.getItem(STARTED_KEY);
    return { completed, projectFeatures, quizResults, challengeResults, lastVisit, startedAt };
  } catch {
    return emptyState;
  }
}

function persistState(s: StoreState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify([...s.completed]));
    localStorage.setItem(PROJECT_FEATURES_KEY, JSON.stringify([...s.projectFeatures]));
    localStorage.setItem(QUIZ_RESULTS_KEY, JSON.stringify(Object.fromEntries(s.quizResults)));
    localStorage.setItem(
      CHALLENGE_RESULTS_KEY,
      JSON.stringify(Object.fromEntries(s.challengeResults))
    );
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, now);
    if (!s.startedAt) localStorage.setItem(STARTED_KEY, now);
  } catch {
    // ignore quota errors
  }
}

function setState(next: StoreState) {
  state = next;
  persistState(state);
  listeners.forEach((l) => l());
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  state = loadState();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): StoreState {
  return state;
}

function getServerSnapshot(): StoreState {
  return emptyState;
}

/** Build a topic key: `${phaseSlug}/${topicId}` */
export function topicKey(phaseSlug: string, topicId: string): string {
  return `${phaseSlug}/${topicId}`;
}

/** Build a feature key: `${projectId}/${featureIndex}` */
export function featureKey(projectId: string, featureIndex: number): string {
  return `${projectId}/${featureIndex}`;
}

/** True if all features of a project are checked. */
export function isProjectDone(projectId: string): boolean {
  const project = allProjects.find((p) => p.id === projectId);
  if (!project || project.features.length === 0) return false;
  return project.features.every((_, i) => state.projectFeatures.has(featureKey(projectId, i)));
}

/** Compute stats from a set of completed topic keys. */
export function computeStats(completed: Set<string>, s: StoreState): ProgressStats {
  const phaseProgress = phases.map((phase) => {
    const total = phase.topics.length;
    const done = phase.topics.filter((t) => completed.has(topicKey(phase.slug, t.id))).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return {
      phase: phase.number,
      slug: phase.slug,
      title: phase.title,
      completed: done,
      total,
      percent,
      done: total > 0 && done === total,
    };
  });

  const totalTopics = phaseProgress.reduce((sum, p) => sum + p.total, 0);
  const completedTopics = phaseProgress.reduce((sum, p) => sum + p.completed, 0);
  const totalPhases = phases.length;
  const completedPhases = phaseProgress.filter((p) => p.done).length;

  // Days since start — computed once when the store loads (not in render).
  const daysSinceStart = s.startedAt
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(s.startedAt).getTime()) / (1000 * 60 * 60 * 24))
      )
    : 0;

  const projectProgress = phases.map((phase) => {
    const total = phase.projects.length;
    const completed = phase.projects.filter((p) => isProjectDone(p.id)).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return {
      phase: phase.number,
      slug: phase.slug,
      title: phase.title,
      completed,
      total,
      percent,
    };
  });

  const totalProjects = allProjects.length;
  const completedProjects = allProjects.filter((p) => isProjectDone(p.id)).length;

  return {
    overall: totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100),
    completedTopics,
    totalTopics,
    completedPhases,
    totalPhases,
    phaseProgress,
    completedProjects,
    totalProjects,
    projectProgress,
    startedAt: s.startedAt,
    lastVisit: s.lastVisit,
    daysSinceStart,
  };
}

/**
 * Hook: useProgress — returns shared state + helpers.
 */
export function useProgress() {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((phaseSlug: string, topicId: string) => {
    const key = topicKey(phaseSlug, topicId);
    const next = new Set(state.completed);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setState({ ...state, completed: next, lastVisit: new Date().toISOString() });
  }, []);

  const setCompleted = useCallback((phaseSlug: string, topicId: string, value: boolean) => {
    const key = topicKey(phaseSlug, topicId);
    const next = new Set(state.completed);
    if (value) next.add(key);
    else next.delete(key);
    setState({ ...state, completed: next, lastVisit: new Date().toISOString() });
  }, []);

  const isCompleted = useCallback(
    (phaseSlug: string, topicId: string) => store.completed.has(topicKey(phaseSlug, topicId)),
    [store.completed]
  );

  const toggleFeature = useCallback((projectId: string, featureIndex: number) => {
    const key = featureKey(projectId, featureIndex);
    const next = new Set(state.projectFeatures);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setState({ ...state, projectFeatures: next, lastVisit: new Date().toISOString() });
  }, []);

  const setFeature = useCallback((projectId: string, featureIndex: number, value: boolean) => {
    const key = featureKey(projectId, featureIndex);
    const next = new Set(state.projectFeatures);
    if (value) next.add(key);
    else next.delete(key);
    setState({ ...state, projectFeatures: next, lastVisit: new Date().toISOString() });
  }, []);

  const isFeatureDone = useCallback(
    (projectId: string, featureIndex: number) => state.projectFeatures.has(featureKey(projectId, featureIndex)),
    [state.projectFeatures]
  );

  const isProjectDoneCb = useCallback(
    (projectId: string) => {
      const project = allProjects.find((p) => p.id === projectId);
      if (!project || project.features.length === 0) return false;
      return project.features.every((_, i) => state.projectFeatures.has(featureKey(projectId, i)));
    },
    [state.projectFeatures]
  );

  const setQuizResult = useCallback(
    (phaseSlug: string, topicId: string, score: number, total: number) => {
      const key = topicKey(phaseSlug, topicId);
      const prev = state.quizResults.get(key);
      const passed = total > 0 && score / total >= QUIZ_PASS_THRESHOLD;
      const nextResults = new Map(state.quizResults);
      nextResults.set(key, {
        score,
        total,
        // Giữ passedAt cũ nếu đã pass rồi; đặt mới nếu pass lần đầu.
        passedAt: passed ? prev?.passedAt ?? new Date().toISOString() : prev?.passedAt ?? null,
        attempts: (prev?.attempts ?? 0) + 1,
      });
      const nextCompleted = new Set(state.completed);
      if (passed) nextCompleted.add(key);
      setState({
        ...state,
        completed: nextCompleted,
        quizResults: nextResults,
        lastVisit: new Date().toISOString(),
      });
    },
    []
  );

  const getQuizResult = useCallback(
    (phaseSlug: string, topicId: string): QuizResult | undefined =>
      store.quizResults.get(topicKey(phaseSlug, topicId)),
    [store.quizResults]
  );

  const setChallengeResult = useCallback((challengeId: string, passed: boolean) => {
    const prev = state.challengeResults.get(challengeId);
    const nextResults = new Map(state.challengeResults);
    nextResults.set(challengeId, {
      // Giữ solvedAt cũ nếu đã giải rồi; đặt mới nếu pass lần đầu.
      solvedAt: passed ? prev?.solvedAt ?? new Date().toISOString() : prev?.solvedAt ?? null,
      attempts: (prev?.attempts ?? 0) + 1,
      lastPassed: passed,
    });
    setState({
      ...state,
      challengeResults: nextResults,
      lastVisit: new Date().toISOString(),
    });
  }, []);

  const getChallengeResult = useCallback(
    (challengeId: string): ChallengeResult | undefined =>
      store.challengeResults.get(challengeId),
    [store.challengeResults]
  );

  const isChallengeSolved = useCallback(
    (challengeId: string) => state.challengeResults.get(challengeId)?.solvedAt != null,
    [state.challengeResults]
  );

  const reset = useCallback(() => {
    setState({ ...emptyState, lastVisit: new Date().toISOString() });
    if (typeof window !== "undefined") {
      localStorage.removeItem(COMPLETED_KEY);
      localStorage.removeItem(PROJECT_FEATURES_KEY);
      localStorage.removeItem(QUIZ_RESULTS_KEY);
      localStorage.removeItem(CHALLENGE_RESULTS_KEY);
      localStorage.removeItem(STARTED_KEY);
    }
  }, []);

  const stats = computeStats(store.completed, store);

  const projectStats = {
    completed: stats.completedProjects,
    total: stats.totalProjects,
    percent:
      stats.totalProjects === 0
        ? 0
        : Math.round((stats.completedProjects / stats.totalProjects) * 100),
  };

  return {
    completed: store.completed,
    projectFeatures: store.projectFeatures,
    hydrated,
    stats,
    toggle,
    setCompleted,
    isCompleted,
    reset,
    toggleFeature,
    setFeature,
    isFeatureDone,
    isProjectDone: isProjectDoneCb,
    setQuizResult,
    getQuizResult,
    setChallengeResult,
    getChallengeResult,
    isChallengeSolved,
    challengeResults: store.challengeResults,
    projectStats,
    startedAt: store.startedAt,
    lastVisit: store.lastVisit,
  };
}
