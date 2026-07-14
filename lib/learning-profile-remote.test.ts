import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createDefaultLearningProfile,
  updateWeeklyTarget,
} from "./learning-profile";
import {
  mergeRemoteLearningProfile,
  parseRemoteLearningProfile,
} from "./learning-profile-remote";

describe("learning profile remote adapter", () => {
  it("parses a bounded database row", () => {
    expect(parseRemoteLearningProfile({
      weekly_target: 5,
      weekly_goal_updated_at: "2026-07-14T10:00:00.000Z",
      diagnostic: null,
      diagnostic_updated_at: "1970-01-01T00:00:00.000Z",
    })?.weeklyGoal.target).toBe(5);
    expect(parseRemoteLearningProfile({ weekly_target: 99 })).toBeNull();
  });

  it("sends no user id and trusts the owner-scoped RPC response", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        weekly_target: 7,
        weekly_goal_updated_at: "2026-07-14T11:00:00.000Z",
        diagnostic: null,
        diagnostic_updated_at: "1970-01-01T00:00:00.000Z",
      },
      error: null,
    });
    const supabase = { rpc } as unknown as SupabaseClient;
    const profile = updateWeeklyTarget(
      createDefaultLearningProfile(),
      7,
      "2026-07-14T11:00:00.000Z"
    );

    const result = await mergeRemoteLearningProfile(supabase, profile);

    expect(result.weeklyGoal.target).toBe(7);
    expect(rpc).toHaveBeenCalledWith("merge_learning_profile", expect.not.objectContaining({
      user_id: expect.anything(),
    }));
  });
});
