import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createDefaultProjectEvidence,
  updateProjectEvidenceField,
} from "./project-evidence";
import { createProjectEvidenceStore } from "./project-evidence-store";

const client = {} as SupabaseClient;
const projectId = "p1-easy";

describe("project evidence store", () => {
  it("materializes an anonymous draft under the user key before clearing it", async () => {
    const calls: string[] = [];
    const anonymous = updateProjectEvidenceField(
      createDefaultProjectEvidence(projectId),
      "repositoryUrl",
      "https://github.com/learner/project",
      "2026-07-15T10:00:00.000Z"
    );
    const remote = updateProjectEvidenceField(
      createDefaultProjectEvidence(projectId),
      "reflection",
      "A remote reflection that should be merged without dropping the anonymous repository.",
      "2026-07-15T11:00:00.000Z"
    );
    const store = createProjectEvidenceStore(projectId, {
      loadLocal: (_projectId, userId) => userId ? createDefaultProjectEvidence(projectId) : anonymous,
      saveLocal: (_evidence, userId) => calls.push(`save:${userId ?? "anon"}`),
      clearLocal: (_projectId, userId) => calls.push(`clear:${userId ?? "anon"}`),
      loadRemote: vi.fn().mockResolvedValue(remote),
      mergeRemote: vi.fn().mockImplementation(async (_client, evidence) => evidence),
    });

    await store.setAuth(client, "user-a");

    expect(store.getSnapshot().evidence.repositoryUrl.value).toContain("github.com");
    expect(store.getSnapshot().evidence.reflection.value).toContain("remote reflection");
    expect(calls.indexOf("save:user-a")).toBeLessThan(calls.indexOf("clear:anon"));
    expect(store.getSnapshot().status).toBe("synced");
  });

  it("preserves a local edit made while authenticated hydration is pending", async () => {
    let resolveRemote!: (value: ReturnType<typeof createDefaultProjectEvidence>) => void;
    const remote = new Promise<ReturnType<typeof createDefaultProjectEvidence>>((resolve) => {
      resolveRemote = resolve;
    });
    const mergeRemote = vi.fn().mockImplementation(async (_client, evidence) => evidence);
    const store = createProjectEvidenceStore(projectId, {
      loadLocal: () => createDefaultProjectEvidence(projectId),
      saveLocal: vi.fn(),
      clearLocal: vi.fn(),
      loadRemote: vi.fn().mockReturnValue(remote),
      mergeRemote,
      now: () => "2026-07-15T12:00:00.000Z",
    });

    const hydration = store.setAuth(client, "user-a");
    store.setRepositoryUrl("https://codeberg.org/learner/project");
    resolveRemote(createDefaultProjectEvidence(projectId));
    await hydration;

    expect(store.getSnapshot().evidence.repositoryUrl.value).toContain("codeberg.org");
    expect(mergeRemote).toHaveBeenCalledWith(client, expect.objectContaining({
      repositoryUrl: expect.objectContaining({ value: "https://codeberg.org/learner/project" }),
    }));
  });

  it("ignores remote data from a stale auth generation", async () => {
    let resolveFirst!: (value: ReturnType<typeof createDefaultProjectEvidence>) => void;
    const firstLoad = new Promise<ReturnType<typeof createDefaultProjectEvidence>>((resolve) => {
      resolveFirst = resolve;
    });
    const userB = updateProjectEvidenceField(
      createDefaultProjectEvidence(projectId),
      "demoUrl",
      "https://demo.example.test/user-b",
      "2026-07-15T13:00:00.000Z"
    );
    const store = createProjectEvidenceStore(projectId, {
      loadLocal: () => createDefaultProjectEvidence(projectId),
      saveLocal: vi.fn(),
      clearLocal: vi.fn(),
      loadRemote: vi.fn().mockReturnValueOnce(firstLoad).mockResolvedValueOnce(userB),
      mergeRemote: vi.fn().mockImplementation(async (_client, evidence) => evidence),
    });

    const first = store.setAuth(client, "user-a");
    await store.setAuth(client, "user-b");
    resolveFirst(updateProjectEvidenceField(
      createDefaultProjectEvidence(projectId),
      "demoUrl",
      "https://demo.example.test/user-a",
      "2026-07-15T14:00:00.000Z"
    ));
    await first;

    expect(store.getSnapshot().userId).toBe("user-b");
    expect(store.getSnapshot().evidence.demoUrl.value).toContain("user-b");
  });
});
