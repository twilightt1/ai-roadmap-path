import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createDefaultLearningProfile,
  updateDiagnosticResult,
  updateWeeklyTarget,
} from "./learning-profile";
import { createLearningProfileStore } from "./learning-profile-store";

const client = {} as SupabaseClient;

describe("learning profile store", () => {
  it("materializes anonymous data under the user key before clearing it", async () => {
    const calls: string[] = [];
    const anonymous = updateWeeklyTarget(
      createDefaultLearningProfile(),
      7,
      "2026-07-14T10:00:00.000Z"
    );
    const remote = updateDiagnosticResult(
      createDefaultLearningProfile(),
      {
        assessmentVersion: "foundation-v1",
        completedAt: "2026-07-14T11:00:00.000Z",
        score: 1,
        total: 1,
        topicScores: { topic: { correct: 1, total: 1 } },
      },
      "2026-07-14T11:00:00.000Z"
    );
    const store = createLearningProfileStore({
      loadLocal: (userId) => userId ? createDefaultLearningProfile() : anonymous,
      saveLocal: (_profile, userId) => calls.push(`save:${userId ?? "anon"}`),
      clearLocal: (userId) => calls.push(`clear:${userId ?? "anon"}`),
      loadRemote: vi.fn().mockResolvedValue(remote),
      mergeRemote: vi.fn().mockImplementation(async (_client, profile) => profile),
    });

    await store.setAuth(client, "user-a");

    expect(store.getSnapshot().profile.weeklyGoal.target).toBe(7);
    expect(store.getSnapshot().profile.diagnostic.value?.score).toBe(1);
    expect(calls.indexOf("save:user-a")).toBeLessThan(calls.indexOf("clear:anon"));
    expect(store.getSnapshot().status).toBe("synced");
  });

  it("ignores a stale remote load after auth changes", async () => {
    let resolveFirst!: (value: ReturnType<typeof createDefaultLearningProfile>) => void;
    const firstLoad = new Promise<ReturnType<typeof createDefaultLearningProfile>>((resolve) => {
      resolveFirst = resolve;
    });
    const loadRemote = vi.fn()
      .mockReturnValueOnce(firstLoad)
      .mockResolvedValueOnce(updateWeeklyTarget(
        createDefaultLearningProfile(),
        5,
        "2026-07-14T12:00:00.000Z"
      ));
    const store = createLearningProfileStore({
      loadLocal: () => createDefaultLearningProfile(),
      saveLocal: vi.fn(),
      clearLocal: vi.fn(),
      loadRemote,
      mergeRemote: vi.fn().mockImplementation(async (_client, profile) => profile),
    });

    const first = store.setAuth(client, "user-a");
    await store.setAuth(client, "user-b");
    resolveFirst(updateWeeklyTarget(
      createDefaultLearningProfile(),
      7,
      "2026-07-14T13:00:00.000Z"
    ));
    await first;

    expect(store.getSnapshot().userId).toBe("user-b");
    expect(store.getSnapshot().profile.weeklyGoal.target).toBe(5);
  });

  it("preserves a local mutation made while authenticated hydration is pending", async () => {
    let resolveRemote!: (value: ReturnType<typeof createDefaultLearningProfile>) => void;
    const remote = new Promise<ReturnType<typeof createDefaultLearningProfile>>((resolve) => {
      resolveRemote = resolve;
    });
    const mergeRemote = vi.fn().mockImplementation(async (_client, profile) => profile);
    const store = createLearningProfileStore({
      loadLocal: () => createDefaultLearningProfile(),
      saveLocal: vi.fn(),
      clearLocal: vi.fn(),
      loadRemote: vi.fn().mockReturnValue(remote),
      mergeRemote,
      now: () => "2026-07-14T14:00:00.000Z",
    });

    const hydration = store.setAuth(client, "user-a");
    store.setWeeklyTarget(7);
    resolveRemote(createDefaultLearningProfile());
    await hydration;

    expect(store.getSnapshot().profile.weeklyGoal.target).toBe(7);
    expect(mergeRemote).toHaveBeenCalledWith(client, expect.objectContaining({
      weeklyGoal: expect.objectContaining({ target: 7 }),
    }));
  });
});
