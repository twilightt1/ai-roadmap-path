import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LEARNING_PROFILE_SCHEMA_VERSION,
  mergeLearningProfiles,
  parseLearningProfile,
  type LearningProfile,
} from "./learning-profile";

type LearningProfileRow = {
  weekly_target?: unknown;
  weekly_goal_updated_at?: unknown;
  diagnostic?: unknown;
  diagnostic_updated_at?: unknown;
};

export function parseRemoteLearningProfile(row: unknown): LearningProfile | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const input = row as LearningProfileRow;
  return parseLearningProfile({
    schemaVersion: LEARNING_PROFILE_SCHEMA_VERSION,
    weeklyGoal: {
      target: input.weekly_target,
      updatedAt: input.weekly_goal_updated_at,
    },
    diagnostic: {
      value: input.diagnostic ?? null,
      updatedAt: input.diagnostic_updated_at,
    },
  });
}

export async function loadRemoteLearningProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<LearningProfile | null> {
  const { data, error } = await supabase
    .from("learning_profiles")
    .select("weekly_target, weekly_goal_updated_at, diagnostic, diagnostic_updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data === null) return null;
  const profile = parseRemoteLearningProfile(data);
  if (!profile) throw new Error("Invalid remote learning profile");
  return profile;
}

export async function mergeRemoteLearningProfile(
  supabase: SupabaseClient,
  profile: LearningProfile
): Promise<LearningProfile> {
  const { data, error } = await supabase.rpc("merge_learning_profile", {
    weekly_target_input: profile.weeklyGoal.target,
    weekly_goal_updated_at_input: profile.weeklyGoal.updatedAt,
    diagnostic_input: profile.diagnostic.value,
    diagnostic_updated_at_input: profile.diagnostic.updatedAt,
  });

  if (error) throw error;
  const remote = parseRemoteLearningProfile(data);
  if (!remote) throw new Error("Invalid learning profile RPC response");
  return mergeLearningProfiles(profile, remote);
}
