"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { capturePlatformError } from "./observability/client";
import {
  clearLocalProjectEvidence,
  loadLocalProjectEvidence,
  saveLocalProjectEvidence,
} from "./project-evidence-local";
import {
  loadRemoteProjectEvidence,
  mergeRemoteProjectEvidence,
} from "./project-evidence-remote";
import { projectEvidenceStorageKey } from "./project-evidence";
import { createProjectEvidenceStore } from "./project-evidence-store";

type ProjectEvidenceStore = ReturnType<typeof createProjectEvidenceStore>;

const stores = new Map<string, ProjectEvidenceStore>();

function getProjectEvidenceStore(projectId: string): ProjectEvidenceStore {
  const existing = stores.get(projectId);
  if (existing) return existing;

  const store = createProjectEvidenceStore(projectId, {
    loadLocal: loadLocalProjectEvidence,
    saveLocal: saveLocalProjectEvidence,
    clearLocal: clearLocalProjectEvidence,
    loadRemote: loadRemoteProjectEvidence,
    mergeRemote: mergeRemoteProjectEvidence,
    onError(error) {
      capturePlatformError({
        code: "PROJECT_EVIDENCE_SYNC_FAILED",
        metadata: { reason: error instanceof Error ? error.name : "unknown" },
      });
    },
  });
  stores.set(projectId, store);
  return store;
}

export function useProjectEvidence(
  projectId: string,
  supabase: SupabaseClient | null,
  userId: string | null,
  authLoading: boolean
) {
  const store = useMemo(() => getProjectEvidenceStore(projectId), [projectId]);

  useEffect(() => {
    if (authLoading) return;
    void store.setAuth(supabase, userId);
  }, [authLoading, store, supabase, userId]);

  useEffect(() => {
    const handleOnline = () => store.retry();
    const handleStorage = (event: StorageEvent) => {
      const currentUserId = store.getSnapshot().userId;
      if (event.key !== projectEvidenceStorageKey(projectId, currentUserId)) return;
      store.mergeExternal(loadLocalProjectEvidence(projectId, currentUserId));
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("storage", handleStorage);
    };
  }, [projectId, store]);

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );

  return {
    ...snapshot,
    setRepositoryUrl: store.setRepositoryUrl,
    setDemoUrl: store.setDemoUrl,
    setReflection: store.setReflection,
    retry: store.retry,
  };
}
