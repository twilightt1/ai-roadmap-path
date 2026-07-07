import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChallengeResult } from "./challenge-types";
import type {
  ChallengeAttemptDetails,
  QuizAttemptDetails,
  QuizResult,
  StoreState,
} from "./progress-types";
import { mergeProgressStates } from "./progress-sync";
import { createEmptyProgressState, featureKey } from "./progress-types";

type ProgressStateRow = {
  completed: unknown;
  project_features: unknown;
  quiz_results: unknown;
  challenge_results: unknown;
  started_at: string | null;
  last_visit: string | null;
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function validDateString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseQuizResult(value: unknown): QuizResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const input = value as Record<string, unknown>;
  const score = input.score;
  const total = input.total;
  const attempts = input.attempts;

  if (
    typeof score !== "number" ||
    typeof total !== "number" ||
    typeof attempts !== "number" ||
    !Number.isFinite(score) ||
    !Number.isFinite(total) ||
    !Number.isFinite(attempts)
  ) {
    return null;
  }

  return {
    score,
    total,
    attempts,
    passedAt: input.passedAt === null || typeof input.passedAt === "string" ? input.passedAt : null,
  };
}

function parseChallengeResult(value: unknown): ChallengeResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const input = value as Record<string, unknown>;
  const attempts = input.attempts;
  const lastPassed = input.lastPassed;

  if (typeof attempts !== "number" || !Number.isFinite(attempts) || typeof lastPassed !== "boolean") {
    return null;
  }

  return {
    attempts,
    lastPassed,
    solvedAt: input.solvedAt === null || typeof input.solvedAt === "string" ? input.solvedAt : null,
  };
}

function parseResultMap<T>(value: unknown, parser: (entry: unknown) => T | null): Map<string, T> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return new Map();

  const entries: Array<[string, T]> = [];
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const parsed = parser(entry);
    if (parsed) entries.push([key, parsed]);
  }

  return new Map(entries);
}

function rowToState(row: ProgressStateRow | null): StoreState {
  if (!row) return createEmptyProgressState();

  return {
    completed: new Set(stringArray(row.completed)),
    projectFeatures: new Set(stringArray(row.project_features)),
    quizResults: parseResultMap(row.quiz_results, parseQuizResult),
    challengeResults: parseResultMap(row.challenge_results, parseChallengeResult),
    startedAt: validDateString(row.started_at),
    lastVisit: validDateString(row.last_visit),
  };
}

function stateToSnapshot(userId: string, state: StoreState) {
  return {
    user_id: userId,
    completed: [...state.completed],
    project_features: [...state.projectFeatures],
    quiz_results: Object.fromEntries(state.quizResults),
    challenge_results: Object.fromEntries(state.challengeResults),
    started_at: state.startedAt,
    last_visit: state.lastVisit,
  };
}

function parseFeatureKey(key: string): { projectId: string; featureIndex: number } | null {
  const lastSlash = key.lastIndexOf("/");
  if (lastSlash <= 0) return null;

  const projectId = key.slice(0, lastSlash);
  const rawIndex = key.slice(lastSlash + 1);
  const featureIndex = Number(rawIndex);

  if (!projectId || !Number.isInteger(featureIndex) || featureIndex < 0) return null;
  return { projectId, featureIndex };
}

async function syncLessonProgress(
  supabase: SupabaseClient,
  userId: string,
  state: StoreState,
  completedAt: string
): Promise<void> {
  const lessonRows = [...state.completed].map((lessonSlug) => ({
    user_id: userId,
    lesson_slug: lessonSlug,
    status: "completed",
    progress_percent: 100,
    last_seen_at: state.lastVisit,
    completed_at: completedAt,
  }));

  if (lessonRows.length > 0) {
    const { error } = await supabase
      .from("lesson_progress")
      .upsert(lessonRows, { onConflict: "user_id,lesson_slug" });
    if (error) throw error;
  }
}

async function syncProjectFeatureProgress(
  supabase: SupabaseClient,
  userId: string,
  state: StoreState,
  completedAt: string
): Promise<void> {
  const featureRows = [...state.projectFeatures]
    .map((key) => {
      const parsed = parseFeatureKey(key);
      if (!parsed) return null;

      return {
        user_id: userId,
        project_id: parsed.projectId,
        feature_index: parsed.featureIndex,
        feature_key: featureKey(parsed.projectId, parsed.featureIndex),
        completed_at: completedAt,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (featureRows.length > 0) {
    const { error } = await supabase
      .from("project_feature_progress")
      .upsert(featureRows, { onConflict: "user_id,feature_key" });
    if (error) throw error;
  }
}

export async function loadRemoteProgressState(
  supabase: SupabaseClient,
  userId: string
): Promise<StoreState> {
  const { data, error } = await supabase
    .from("user_progress_state")
    .select("completed, project_features, quiz_results, challenge_results, started_at, last_visit")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return rowToState(data as ProgressStateRow | null);
}

export async function saveRemoteProgressSnapshot(
  supabase: SupabaseClient,
  userId: string,
  state: StoreState
): Promise<void> {
  const remoteState = await loadRemoteProgressState(supabase, userId);
  const mergedState = mergeProgressStates(state, remoteState);

  const { error: snapshotError } = await supabase
    .from("user_progress_state")
    .upsert(stateToSnapshot(userId, mergedState), { onConflict: "user_id" });

  if (snapshotError) throw snapshotError;

  const completedAt = mergedState.lastVisit ?? new Date().toISOString();
  await syncLessonProgress(supabase, userId, mergedState, completedAt);
  await syncProjectFeatureProgress(supabase, userId, mergedState, completedAt);
}

export async function recordRemoteQuizAttempt(
  supabase: SupabaseClient,
  userId: string,
  input: {
    quizSlug: string;
    score: number;
    total: number;
    details?: QuizAttemptDetails;
  }
): Promise<void> {
  if (input.total <= 0 || input.score < 0 || input.score > input.total) return;

  const { error } = await supabase.from("quiz_attempts").insert({
    user_id: userId,
    quiz_slug: input.quizSlug,
    score: input.score,
    total: input.total,
    answers: { selected: input.details?.answers ?? [] },
    duration_seconds: input.details?.durationSeconds ?? null,
    completed_at: input.details?.completedAt ?? new Date().toISOString(),
  });

  if (error) throw error;
}

export async function recordRemoteChallengeAttempt(
  supabase: SupabaseClient,
  userId: string,
  input: {
    challengeSlug: string;
    passed: boolean;
    details?: ChallengeAttemptDetails;
  }
): Promise<void> {
  const { error } = await supabase.from("challenge_attempts").insert({
    user_id: userId,
    challenge_slug: input.challengeSlug,
    status: input.passed ? "passed" : "failed",
    language: input.details?.language ?? "python",
    code: input.details?.code ?? null,
    test_results: input.details?.testResults ?? {},
    duration_seconds: input.details?.durationSeconds ?? null,
    submitted_at: input.details?.submittedAt ?? new Date().toISOString(),
  });

  if (error) throw error;
}

export async function resetRemoteProgress(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const tables = [
    "lesson_progress",
    "topic_progress",
    "project_feature_progress",
    "quiz_attempts",
    "challenge_attempts",
    "user_progress_state",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) throw error;
  }
}
