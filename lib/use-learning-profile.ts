"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Session, Subscription } from "@supabase/supabase-js";
import { capturePlatformError, emitPlatformEvent } from "./observability/client";
import { getSupabaseBrowserClient } from "./supabase/client";
import {
  clearLocalLearningProfile,
  loadLocalLearningProfile,
  saveLocalLearningProfile,
} from "./learning-profile-local";
import { learningProfileStorageKey } from "./learning-profile";
import {
  loadRemoteLearningProfile,
  mergeRemoteLearningProfile,
} from "./learning-profile-remote";
import { createLearningProfileStore } from "./learning-profile-store";

const store = createLearningProfileStore({
  loadLocal: loadLocalLearningProfile,
  saveLocal: saveLocalLearningProfile,
  clearLocal: clearLocalLearningProfile,
  loadRemote: loadRemoteLearningProfile,
  mergeRemote: mergeRemoteLearningProfile,
  onError(error) {
    capturePlatformError({
      code: "LEARNING_PROFILE_SYNC_FAILED",
      metadata: {
        reason: error instanceof Error ? error.name : "unknown",
      },
    });
  },
});

let hydrationStarted = false;
let authSubscription: Subscription | null = null;
let browserListenersStarted = false;

function applySession(session: Session | null): Promise<void> {
  const client = getSupabaseBrowserClient();
  return store.setAuth(client, session?.user.id ?? null);
}

function startBrowserListeners(): void {
  if (browserListenersStarted || typeof window === "undefined") return;
  browserListenersStarted = true;
  window.addEventListener("online", () => store.retry());
  window.addEventListener("storage", (event) => {
    const { userId } = store.getSnapshot();
    if (event.key !== learningProfileStorageKey(userId)) return;
    store.mergeExternal(loadLocalLearningProfile(userId));
  });
}

function hydrate(): void {
  if (hydrationStarted) return;
  hydrationStarted = true;
  startBrowserListeners();
  const client = getSupabaseBrowserClient();
  if (!client) {
    void store.setAuth(null, null);
    return;
  }

  void client.auth.getSession()
    .then(({ data }) => applySession(data.session))
    .catch(() => store.setAuth(null, null));
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    void applySession(session);
  });
  authSubscription = data.subscription;
}

export function useLearningProfile() {
  useEffect(() => {
    hydrate();
  }, []);

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );

  return {
    ...snapshot,
    setWeeklyTarget: store.setWeeklyTarget,
    recordDiagnostic(result: Parameters<typeof store.recordDiagnostic>[0]) {
      emitPlatformEvent({
        name: "learning_loop.diagnostic",
        outcome: "completed",
        metadata: { score: result.score, total: result.total },
      });
      store.recordDiagnostic(result);
    },
    clearDiagnostic: store.clearDiagnostic,
    retry: store.retry,
  };
}

export function disposeLearningProfileAuthForTests(): void {
  authSubscription?.unsubscribe();
  authSubscription = null;
}
