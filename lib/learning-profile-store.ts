import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createDefaultLearningProfile,
  mergeLearningProfiles,
  updateDiagnosticResult,
  updateWeeklyTarget,
  type DiagnosticResult,
  type LearningProfile,
  type WeeklyTarget,
} from "./learning-profile";

export type LearningProfileSyncStatus = "local-only" | "syncing" | "synced" | "failed";

export type LearningProfileSnapshot = {
  profile: LearningProfile;
  hydrated: boolean;
  status: LearningProfileSyncStatus;
  userId: string | null;
};

export type LearningProfileStoreDependencies = {
  loadLocal(userId?: string | null): LearningProfile;
  saveLocal(profile: LearningProfile, userId?: string | null): void;
  clearLocal(userId?: string | null): void;
  loadRemote(client: SupabaseClient, userId: string): Promise<LearningProfile | null>;
  mergeRemote(client: SupabaseClient, profile: LearningProfile): Promise<LearningProfile>;
  now?(): string;
  onError?(error: unknown): void;
};

export function createLearningProfileStore(deps: LearningProfileStoreDependencies) {
  let client: SupabaseClient | null = null;
  let userId: string | null = null;
  let generation = 0;
  let syncing = false;
  let syncAgain = false;
  let snapshot: LearningProfileSnapshot = {
    profile: createDefaultLearningProfile(),
    hydrated: false,
    status: "local-only",
    userId: null,
  };
  const listeners = new Set<() => void>();
  const now = deps.now ?? (() => new Date().toISOString());

  const notify = (next: Partial<LearningProfileSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    for (const listener of listeners) listener();
  };

  const isCurrent = (
    capturedGeneration: number,
    capturedClient: SupabaseClient,
    capturedUserId: string
  ) => generation === capturedGeneration && client === capturedClient && userId === capturedUserId;

  const persistLocal = (profile: LearningProfile) => {
    deps.saveLocal(profile, userId);
  };

  const flush = async (): Promise<void> => {
    if (!client || !userId) return;
    if (syncing) {
      syncAgain = true;
      return;
    }

    syncing = true;
    const capturedClient = client;
    const capturedUserId = userId;
    const capturedGeneration = generation;
    const outgoing = snapshot.profile;
    notify({ status: "syncing" });
    try {
      const remote = await deps.mergeRemote(capturedClient, outgoing);
      if (!isCurrent(capturedGeneration, capturedClient, capturedUserId)) return;
      const merged = mergeLearningProfiles(snapshot.profile, remote);
      deps.saveLocal(merged, capturedUserId);
      notify({ profile: merged, status: "synced" });
    } catch (error) {
      if (!isCurrent(capturedGeneration, capturedClient, capturedUserId)) return;
      notify({ status: "failed" });
      deps.onError?.(error);
    } finally {
      syncing = false;
      if (syncAgain) {
        syncAgain = false;
        void flush();
      }
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async setAuth(nextClient: SupabaseClient | null, nextUserId: string | null): Promise<void> {
      generation += 1;
      const capturedGeneration = generation;
      client = nextClient;
      userId = nextUserId;

      if (!client || !userId) {
        notify({
          profile: deps.loadLocal(),
          hydrated: true,
          status: "local-only",
          userId: null,
        });
        return;
      }

      const capturedClient = client;
      const capturedUserId = userId;
      const local = mergeLearningProfiles(deps.loadLocal(), deps.loadLocal(capturedUserId));
      deps.saveLocal(local, capturedUserId);
      deps.clearLocal();
      notify({ profile: local, hydrated: true, status: "syncing", userId: capturedUserId });

      try {
        const remote = await deps.loadRemote(capturedClient, capturedUserId);
        if (!isCurrent(capturedGeneration, capturedClient, capturedUserId)) return;
        const merged = remote
          ? mergeLearningProfiles(snapshot.profile, remote)
          : snapshot.profile;
        deps.saveLocal(merged, capturedUserId);
        notify({ profile: merged });
        await flush();
      } catch (error) {
        if (!isCurrent(capturedGeneration, capturedClient, capturedUserId)) return;
        notify({ status: "failed" });
        deps.onError?.(error);
      }
    },
    setWeeklyTarget(target: WeeklyTarget) {
      const profile = updateWeeklyTarget(snapshot.profile, target, now());
      persistLocal(profile);
      notify({ profile, status: userId ? "syncing" : "local-only" });
      void flush();
    },
    recordDiagnostic(result: DiagnosticResult) {
      const profile = updateDiagnosticResult(snapshot.profile, result, now());
      persistLocal(profile);
      notify({ profile, status: userId ? "syncing" : "local-only" });
      void flush();
    },
    clearDiagnostic() {
      const profile = updateDiagnosticResult(snapshot.profile, null, now());
      persistLocal(profile);
      notify({ profile, status: userId ? "syncing" : "local-only" });
      void flush();
    },
    mergeExternal(profile: LearningProfile) {
      const merged = mergeLearningProfiles(snapshot.profile, profile);
      persistLocal(merged);
      notify({ profile: merged, status: userId ? "syncing" : "local-only" });
      void flush();
    },
    retry: () => void flush(),
  };
}
