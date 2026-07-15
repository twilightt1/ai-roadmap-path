import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createDefaultProjectEvidence,
  mergeProjectEvidence,
  updateProjectEvidenceField,
  type ProjectEvidence,
  type ProjectEvidenceFieldName,
} from "./project-evidence";

export type ProjectEvidenceSyncStatus = "local-only" | "syncing" | "synced" | "failed";

export type ProjectEvidenceSnapshot = {
  evidence: ProjectEvidence;
  hydrated: boolean;
  status: ProjectEvidenceSyncStatus;
  userId: string | null;
};

export type ProjectEvidenceStoreDependencies = {
  loadLocal(projectId: string, userId?: string | null): ProjectEvidence;
  saveLocal(evidence: ProjectEvidence, userId?: string | null): void;
  clearLocal(projectId: string, userId?: string | null): void;
  loadRemote(
    client: SupabaseClient,
    userId: string,
    projectId: string
  ): Promise<ProjectEvidence | null>;
  mergeRemote(client: SupabaseClient, evidence: ProjectEvidence): Promise<ProjectEvidence>;
  now?(): string;
  onError?(error: unknown): void;
};

export function createProjectEvidenceStore(
  projectId: string,
  deps: ProjectEvidenceStoreDependencies
) {
  let client: SupabaseClient | null = null;
  let userId: string | null = null;
  let generation = 0;
  let syncing = false;
  let syncAgain = false;
  let snapshot: ProjectEvidenceSnapshot = {
    evidence: createDefaultProjectEvidence(projectId),
    hydrated: false,
    status: "local-only",
    userId: null,
  };
  const listeners = new Set<() => void>();
  const now = deps.now ?? (() => new Date().toISOString());

  const notify = (next: Partial<ProjectEvidenceSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    for (const listener of listeners) listener();
  };

  const isCurrent = (
    capturedGeneration: number,
    capturedClient: SupabaseClient,
    capturedUserId: string
  ) => generation === capturedGeneration && client === capturedClient && userId === capturedUserId;

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
    const outgoing = snapshot.evidence;
    notify({ status: "syncing" });
    try {
      const remote = await deps.mergeRemote(capturedClient, outgoing);
      if (!isCurrent(capturedGeneration, capturedClient, capturedUserId)) return;
      const merged = mergeProjectEvidence(snapshot.evidence, remote);
      deps.saveLocal(merged, capturedUserId);
      notify({ evidence: merged, status: "synced" });
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

  const setField = (field: ProjectEvidenceFieldName, value: string) => {
    const evidence = updateProjectEvidenceField(snapshot.evidence, field, value, now());
    deps.saveLocal(evidence, userId);
    notify({ evidence, status: userId ? "syncing" : "local-only" });
    void flush();
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
          evidence: deps.loadLocal(projectId),
          hydrated: true,
          status: "local-only",
          userId: null,
        });
        return;
      }

      const capturedClient = client;
      const capturedUserId = userId;
      const local = mergeProjectEvidence(
        deps.loadLocal(projectId),
        deps.loadLocal(projectId, capturedUserId)
      );
      deps.saveLocal(local, capturedUserId);
      deps.clearLocal(projectId);
      notify({ evidence: local, hydrated: true, status: "syncing", userId: capturedUserId });

      try {
        const remote = await deps.loadRemote(capturedClient, capturedUserId, projectId);
        if (!isCurrent(capturedGeneration, capturedClient, capturedUserId)) return;
        const merged = remote ? mergeProjectEvidence(snapshot.evidence, remote) : snapshot.evidence;
        deps.saveLocal(merged, capturedUserId);
        notify({ evidence: merged });
        await flush();
      } catch (error) {
        if (!isCurrent(capturedGeneration, capturedClient, capturedUserId)) return;
        notify({ status: "failed" });
        deps.onError?.(error);
      }
    },
    setRepositoryUrl(value: string) {
      setField("repositoryUrl", value);
    },
    setDemoUrl(value: string) {
      setField("demoUrl", value);
    },
    setReflection(value: string) {
      setField("reflection", value);
    },
    mergeExternal(evidence: ProjectEvidence) {
      if (evidence.projectId !== projectId) return;
      const merged = mergeProjectEvidence(snapshot.evidence, evidence);
      deps.saveLocal(merged, userId);
      notify({ evidence: merged, status: userId ? "syncing" : "local-only" });
      void flush();
    },
    retry: () => void flush(),
  };
}
