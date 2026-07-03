"use client";

import { useCallback, useSyncExternalStore } from "react";
import { phases } from "./roadmap-data";

/**
 * Progress tracking store — localStorage-based, không cần auth.
 *
 * Singleton store with `useSyncExternalStore` so all components share state.
 * Track: set of completed topic IDs (slug form: `${phaseSlug}/${topicId}`).
 */

const STORAGE_KEY = "ai-roadmap:progress:v1";
const COMPLETED_KEY = "ai-roadmap:completed:v1";
const STARTED_KEY = "ai-roadmap:started:v1";

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
  startedAt: string | null;
  lastVisit: string | null;
  /** Days since first activity — computed once when store loads */
  daysSinceStart: number;
};

type StoreState = {
  completed: Set<string>;
  startedAt: string | null;
  lastVisit: string | null;
};

const emptyState: StoreState = {
  completed: new Set(),
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
    const lastVisit = localStorage.getItem(STORAGE_KEY);
    const startedAt = localStorage.getItem(STARTED_KEY);
    return { completed, lastVisit, startedAt };
  } catch {
    return emptyState;
  }
}

function persistState(s: StoreState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify([...s.completed]));
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

  return {
    overall: totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100),
    completedTopics,
    totalTopics,
    completedPhases,
    totalPhases,
    phaseProgress,
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

  const reset = useCallback(() => {
    setState({ ...emptyState, lastVisit: new Date().toISOString() });
    if (typeof window !== "undefined") {
      localStorage.removeItem(COMPLETED_KEY);
      localStorage.removeItem(STARTED_KEY);
    }
  }, []);

  const stats = computeStats(store.completed, store);

  return {
    completed: store.completed,
    hydrated,
    stats,
    toggle,
    setCompleted,
    isCompleted,
    reset,
    startedAt: store.startedAt,
    lastVisit: store.lastVisit,
  };
}
