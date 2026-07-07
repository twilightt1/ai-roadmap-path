"use client";

import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useSyncExternalStore } from "react";
import { phases, allProjects } from "./roadmap-data";
import { QUIZ_PASS_THRESHOLD } from "./quiz-types";
import type { ChallengeResult } from "./challenge-types";
import type {
  ChallengeAttemptDetails,
  ProgressStats,
  QuizAttemptDetails,
  QuizResult,
  StoreState,
} from "./progress-types";
import { createEmptyProgressState, featureKey, topicKey } from "./progress-types";
import {
  clearLocalProgressState,
  loadLocalProgressState,
  persistLocalProgressState,
} from "./progress-local-storage";
import { mergeProgressStates } from "./progress-sync";
import {
  loadRemoteProgressState,
  recordRemoteChallengeAttempt,
  recordRemoteQuizAttempt,
  resetRemoteProgress,
  saveRemoteProgressSnapshot,
} from "./progress-remote";
import { getSupabaseBrowserClient } from "./supabase/client";

export type { ProgressStats, QuizResult } from "./progress-types";
export { featureKey, topicKey } from "./progress-types";

/**
 * Progress tracking store.
 *
 * Public API stays synchronous for components. Anonymous users and unconfigured
 * Supabase use localStorage only. Authenticated users hydrate from Supabase,
 * merge with local progress, then write optimistic local changes to Supabase in
 * a serialized background queue.
 */

const emptyState = createEmptyProgressState();

let state: StoreState = createEmptyProgressState();
let hydrated = false;
let hydrateStarted = false;
let remoteClient: SupabaseClient | null = null;
let remoteUserId: string | null = null;
let remoteWriteQueue: Promise<void> = Promise.resolve();
let authGeneration = 0;
let authSubscription: { unsubscribe: () => void } | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function enqueueRemoteWrite(write: (client: SupabaseClient, userId: string) => Promise<void>) {
  if (!remoteClient || !remoteUserId) return;

  const client = remoteClient;
  const userId = remoteUserId;
  const generation = authGeneration;

  remoteWriteQueue = remoteWriteQueue
    .then(async () => {
      if (generation !== authGeneration || client !== remoteClient || userId !== remoteUserId) return;
      await write(client, userId);
    })
    .catch((error) => {
      console.error("[progress] Supabase sync failed", error);
    });
}

function persistCurrentLocalState(next: StoreState) {
  persistLocalProgressState(next, remoteUserId);
}

function isCurrentAuthContext(client: SupabaseClient, userId: string | null, generation: number) {
  return generation === authGeneration && client === remoteClient && userId === remoteUserId;
}

function withActivityMetadata(next: StoreState): StoreState {
  const now = next.lastVisit ?? new Date().toISOString();
  return {
    ...next,
    startedAt: next.startedAt ?? state.startedAt ?? now,
    lastVisit: now,
  };
}

function setState(next: StoreState, options: { persistRemote?: boolean } = {}) {
  state = options.persistRemote === false ? next : withActivityMetadata(next);
  persistCurrentLocalState(state);
  notify();

  if (options.persistRemote !== false) {
    const snapshot = state;
    enqueueRemoteWrite((client, userId) => saveRemoteProgressSnapshot(client, userId, snapshot));
  }
}

async function applySession(session: Session | null) {
  const client = remoteClient;
  authGeneration += 1;
  const generation = authGeneration;

  if (!session || !client) {
    remoteUserId = null;
    state = loadLocalProgressState();
    hydrated = true;
    notify();
    return;
  }

  const userId = session.user.id;
  remoteUserId = userId;
  const userLocalState = loadLocalProgressState(userId);
  const anonymousLocalState = loadLocalProgressState();

  try {
    const remoteState = await loadRemoteProgressState(client, userId);
    if (!isCurrentAuthContext(client, userId, generation)) return;

    const currentUserLocalState = loadLocalProgressState(userId);
    const localWithInFlightMutations = mergeProgressStates(currentUserLocalState, state);
    const merged = mergeProgressStates(
      mergeProgressStates(anonymousLocalState, userLocalState),
      mergeProgressStates(remoteState, localWithInFlightMutations)
    );

    if (!isCurrentAuthContext(client, userId, generation)) return;
    state = merged;
    hydrated = true;
    persistLocalProgressState(merged, userId);
    notify();
    enqueueRemoteWrite((currentClient, currentUserId) =>
      saveRemoteProgressSnapshot(currentClient, currentUserId, merged)
    );
  } catch (error) {
    if (!isCurrentAuthContext(client, userId, generation)) return;
    console.error("[progress] Failed to load Supabase progress; using local progress", error);
    state = mergeProgressStates(userLocalState, state);
    hydrated = true;
    persistLocalProgressState(state, userId);
    notify();
  }
}

function hydrate() {
  if (hydrateStarted) return;
  hydrateStarted = true;

  remoteClient = getSupabaseBrowserClient();

  if (!remoteClient) {
    state = loadLocalProgressState();
    hydrated = true;
    notify();
    return;
  }

  void remoteClient.auth.getSession().then(({ data }) => applySession(data.session));

  if (!authSubscription) {
    const { data } = remoteClient.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });
    authSubscription = data.subscription;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  hydrate();
  return () => listeners.delete(listener);
}

function getSnapshot(): StoreState {
  return state;
}

function getServerSnapshot(): StoreState {
  return emptyState;
}

/** True if all features of a project are checked. */
export function isProjectDone(projectId: string): boolean {
  const project = allProjects.find((p) => p.id === projectId);
  if (!project || project.features.length === 0) return false;
  return project.features.every((_, i) => state.projectFeatures.has(featureKey(projectId, i)));
}

function isProjectDoneFromState(projectId: string, s: StoreState): boolean {
  const project = allProjects.find((p) => p.id === projectId);
  if (!project || project.features.length === 0) return false;
  return project.features.every((_, i) => s.projectFeatures.has(featureKey(projectId, i)));
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
    const completed = phase.projects.filter((p) => isProjectDoneFromState(p.id, s)).length;
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
  const completedProjects = allProjects.filter((p) => isProjectDoneFromState(p.id, s)).length;

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
    (projectId: string, featureIndex: number) =>
      store.projectFeatures.has(featureKey(projectId, featureIndex)),
    [store.projectFeatures]
  );

  const isProjectDoneCb = useCallback(
    (projectId: string) => isProjectDoneFromState(projectId, store),
    [store]
  );

  const setQuizResult = useCallback(
    (
      phaseSlug: string,
      topicId: string,
      score: number,
      total: number,
      details?: QuizAttemptDetails
    ) => {
      const key = topicKey(phaseSlug, topicId);
      const prev = state.quizResults.get(key);
      const passed = total > 0 && score / total >= QUIZ_PASS_THRESHOLD;
      const now = new Date().toISOString();
      const nextResults = new Map(state.quizResults);
      nextResults.set(key, {
        score,
        total,
        // Giữ passedAt cũ nếu đã pass rồi; đặt mới nếu pass lần đầu.
        passedAt: passed ? prev?.passedAt ?? now : prev?.passedAt ?? null,
        attempts: (prev?.attempts ?? 0) + 1,
      });
      const nextCompleted = new Set(state.completed);
      if (passed) nextCompleted.add(key);
      setState({
        ...state,
        completed: nextCompleted,
        quizResults: nextResults,
        lastVisit: now,
      });
      if (total > 0 && score >= 0 && score <= total) {
        enqueueRemoteWrite((client, userId) =>
          recordRemoteQuizAttempt(client, userId, {
            quizSlug: key,
            score,
            total,
            details,
          })
        );
      }
    },
    []
  );

  const getQuizResult = useCallback(
    (phaseSlug: string, topicId: string): QuizResult | undefined =>
      store.quizResults.get(topicKey(phaseSlug, topicId)),
    [store.quizResults]
  );

  const setChallengeResult = useCallback(
    (challengeId: string, passed: boolean, details?: ChallengeAttemptDetails) => {
      const prev = state.challengeResults.get(challengeId);
      const now = new Date().toISOString();
      const nextResults = new Map(state.challengeResults);
      nextResults.set(challengeId, {
        // Giữ solvedAt cũ nếu đã giải rồi; đặt mới nếu pass lần đầu.
        solvedAt: passed ? prev?.solvedAt ?? now : prev?.solvedAt ?? null,
        attempts: (prev?.attempts ?? 0) + 1,
        lastPassed: passed,
      });
      setState({
        ...state,
        challengeResults: nextResults,
        lastVisit: now,
      });
      enqueueRemoteWrite((client, userId) =>
        recordRemoteChallengeAttempt(client, userId, {
          challengeSlug: challengeId,
          passed,
          details,
        })
      );
    },
    []
  );

  const getChallengeResult = useCallback(
    (challengeId: string): ChallengeResult | undefined => store.challengeResults.get(challengeId),
    [store.challengeResults]
  );

  const isChallengeSolved = useCallback(
    (challengeId: string) => store.challengeResults.get(challengeId)?.solvedAt != null,
    [store.challengeResults]
  );

  const reset = useCallback(() => {
    const client = remoteClient;
    const userId = remoteUserId;
    authGeneration += 1;
    const generation = authGeneration;

    state = { ...createEmptyProgressState(), lastVisit: new Date().toISOString() };
    clearLocalProgressState(userId);
    persistLocalProgressState(state, userId);
    notify();

    if (client && userId) {
      remoteWriteQueue = remoteWriteQueue
        .then(async () => {
          if (generation !== authGeneration || client !== remoteClient || userId !== remoteUserId) return;
          await resetRemoteProgress(client, userId);
        })
        .catch((error) => {
          console.error("[progress] Supabase reset failed", error);
        });
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
