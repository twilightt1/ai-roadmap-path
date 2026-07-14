"use client";

import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useSyncExternalStore } from "react";
import { phases, allProjects } from "./roadmap-data";
import { QUIZ_PASS_THRESHOLD } from "./quiz-types";
import type { ChallengeResult } from "./challenge-types";
import type { ChallengeAttemptDetails, ProgressStats, QuizAttemptDetails, QuizResult, StoreState } from "./progress-types";
import { createEmptyProgressState, featureKey, topicKey } from "./progress-types";
import { clearLocalProgressState, loadLocalProgressState, persistLocalProgressState } from "./progress-local-storage";
import { createProgressChannel } from "./progress-channel";
import { featureFlags } from "./feature-flags";
import { appendRemotePracticeEvents, applyRemoteProgressItemMutations, loadAuthoritativeProgressState, recordRemoteChallengeAttempt, recordRemoteQuizAttempt, resetAuthoritativeProgress } from "./progress-remote";
import { createPracticeEvent, type PracticeEvent, type PracticeEventType } from "./practice-events";
import { getSupabaseBrowserClient } from "./supabase/client";
import { createProgressStore } from "./progress-store";

export type { ProgressStats, QuizResult } from "./progress-types";
export { featureKey, topicKey } from "./progress-types";

const emptyState = createEmptyProgressState();
let state: StoreState = createEmptyProgressState();
let hydrated = false;
let hydrateStarted = false;
let remoteClient: SupabaseClient | null = null;
let remoteUserId: string | null = null;
let syncStatus: import("./progress-types").ProgressSyncStatus = "local-only";
let authSubscription: { unsubscribe: () => void } | null = null;
const progressChannel = createProgressChannel();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const progressStore = createProgressStore({
  loadLocal: loadLocalProgressState, persistLocal: persistLocalProgressState, clearLocal: clearLocalProgressState,
  loadRemote: loadAuthoritativeProgressState,
  applyRemote: (client, epoch, entries) => applyRemoteProgressItemMutations(client, epoch, entries.map((entry) => entry.mutation)),
  resetRemote: resetAuthoritativeProgress, now: () => new Date().toISOString(),
  setTimer: (callback, delay) => setTimeout(callback, delay), clearTimer: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
  addOnlineListener: typeof window === "undefined" ? undefined : (listener) => { window.addEventListener("online", listener); return () => window.removeEventListener("online", listener); },
  channel: progressChannel, onError: (error) => console.error("[progress] sync failed", error),
});
progressStore.subscribe(() => { state = progressStore.getState(); syncStatus = progressStore.getStatus(); notify(); });
function setState(next: StoreState) { state = next; progressStore.replaceState(state); }
function applyProgressItem(scope: "lesson" | "project_feature", itemKey: string, completed: boolean) { progressStore.mutate(scope, itemKey, completed); }
function enqueueRemoteWrite(write: (client: SupabaseClient, userId: string) => Promise<void>) { const client = remoteClient; const userId = remoteUserId; if (featureFlags.lwwRemoteProgress && client && userId) void write(client, userId).catch((error) => console.error("[progress] Supabase sync failed", error)); }
const recordPracticeEvent = (input: { challengeId: string; contentVersion?: string | null; eventType: PracticeEventType; step?: PracticeEvent["step"]; hintLevel?: PracticeEvent["hintLevel"]; passed?: boolean | null; }) => { const event = createPracticeEvent({ ...input, origin: remoteUserId ? "authenticated" : "anonymous" }); setState({ ...state, pendingPracticeEvents: [...state.pendingPracticeEvents, event] }); const client = remoteClient; if (featureFlags.lwwRemoteProgress && client && remoteUserId) void appendRemotePracticeEvents(client, state.syncEpoch ?? 0, [event]).then((result) => { const acknowledged = new Set(result.acknowledgedEventIds); setState({ ...state, syncEpoch: result.epoch, pendingPracticeEvents: state.pendingPracticeEvents.filter((pending) => !acknowledged.has(pending.eventId)) }); }).catch((error) => console.error("[progress] Practice event sync failed", error)); };
async function applySession(session: Session | null) {
  remoteUserId = session?.user.id ?? null;
  const applied = await progressStore.setAuth(
    featureFlags.lwwRemoteProgress ? remoteClient : null,
    featureFlags.lwwRemoteProgress ? remoteUserId : null
  );
  if (!applied) return;
  state = { ...progressStore.getState() };
  syncStatus = progressStore.getStatus();
  hydrated = true;
  notify();
}
export async function syncProgressAfterSignIn(session: Session): Promise<void> {
  remoteClient ??= getSupabaseBrowserClient();
  await applySession(session);
}
function hydrate() { if (hydrateStarted) return; hydrateStarted = true; remoteClient = getSupabaseBrowserClient(); if (!remoteClient) { hydrated = true; void progressStore.setAuth(null, null); return; } void remoteClient.auth.getSession().then(({ data }) => applySession(data.session)); if (!authSubscription) { const { data } = remoteClient.auth.onAuthStateChange((_event, session) => { void applySession(session); }); authSubscription = data.subscription; } }
function subscribe(listener: () => void) { listeners.add(listener); hydrate(); return () => listeners.delete(listener); }
function getSnapshot(): StoreState { return state; }
function getServerSnapshot(): StoreState { return emptyState; }

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
    applyProgressItem("lesson", key, !state.completed.has(key));
  }, []);

  const setCompleted = useCallback((phaseSlug: string, topicId: string, value: boolean) => {
    applyProgressItem("lesson", topicKey(phaseSlug, topicId), value);
  }, []);

  const isCompleted = useCallback(
    (phaseSlug: string, topicId: string) => store.completed.has(topicKey(phaseSlug, topicId)),
    [store.completed]
  );

  const toggleFeature = useCallback((projectId: string, featureIndex: number) => {
    const key = featureKey(projectId, featureIndex);
    applyProgressItem("project_feature", key, !state.projectFeatures.has(key));
  }, []);

  const setFeature = useCallback((projectId: string, featureIndex: number, value: boolean) => {
    applyProgressItem("project_feature", featureKey(projectId, featureIndex), value);
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

  const reset = useCallback(() => { void progressStore.reset(); }, []);

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
    itemStates: store.itemStates,
    quizResults: store.quizResults,
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
    recordPracticeEvent,
    syncStatus,
    retrySync: progressStore.retrySync,
    startedAt: store.startedAt,
    lastVisit: store.lastVisit,
  };
}
