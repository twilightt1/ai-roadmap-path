"use client";

import { useCallback, useSyncExternalStore } from "react";
import { phases, allProjects } from "./roadmap-data";

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

type StoreState = {
  completed: Set<string>;
  projectFeatures: Set<string>;
  startedAt: string | null;
  lastVisit: string | null;
};

const emptyState: StoreState = {
  completed: new Set(),
  projectFeatures: new Set(),
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
    const lastVisit = localStorage.getItem(STORAGE_KEY);
    const startedAt = localStorage.getItem(STARTED_KEY);
    return { completed, projectFeatures, lastVisit, startedAt };
  } catch {
    return emptyState;
  }
}

function persistState(s: StoreState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify([...s.completed]));
    localStorage.setItem(PROJECT_FEATURES_KEY, JSON.stringify([...s.projectFeatures]));
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

  const projectStats = {
    completed: allProjects.filter((p) => isProjectDone(p.id)).length,
    total: allProjects.length,
    percent:
      allProjects.length === 0
        ? 0
        : Math.round((allProjects.filter((p) => isProjectDone(p.id)).length / allProjects.length) * 100),
  };

  const reset = useCallback(() => {
    setState({ ...emptyState, lastVisit: new Date().toISOString() });
    if (typeof window !== "undefined") {
      localStorage.removeItem(COMPLETED_KEY);
      localStorage.removeItem(PROJECT_FEATURES_KEY);
      localStorage.removeItem(STARTED_KEY);
    }
  }, []);

  const stats = computeStats(store.completed, store);

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
    projectStats,
    startedAt: store.startedAt,
    lastVisit: store.lastVisit,
  };
}
