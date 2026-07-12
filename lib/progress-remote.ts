import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChallengeResult } from "./challenge-types";
import type {
  ChallengeAttemptDetails,
  QuizAttemptDetails,
  QuizResult,
  StoreState,
} from "./progress-types";
import type { PracticeEvent } from "./practice-events";
import { deriveProgressSets, itemStateKey } from "./progress-item-state";
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

type ProgressSyncRow = {
  sync_epoch: number;
};

type ProgressItemRow = {
  scope: unknown;
  item_key: unknown;
  completed: unknown;
  client_updated_at: unknown;
  mutation_id: unknown;
};

export type RemoteProgressSnapshot = {
  epoch: number;
  state: StoreState;
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

  const completed = new Set(stringArray(row.completed));
  const projectFeatures = new Set(stringArray(row.project_features));
  const timestamp = validDateString(row.last_visit) ?? "1970-01-01T00:00:00.000Z";
  const itemStates = new Map();

  for (const itemKey of completed) {
    itemStates.set(itemStateKey("lesson", itemKey), {
      scope: "lesson",
      itemKey,
      completed: true,
      clientUpdatedAt: timestamp,
      mutationId: `legacy:lesson:${itemKey}`,
    });
  }

  for (const itemKey of projectFeatures) {
    itemStates.set(itemStateKey("project_feature", itemKey), {
      scope: "project_feature",
      itemKey,
      completed: true,
      clientUpdatedAt: timestamp,
      mutationId: `legacy:project_feature:${itemKey}`,
    });
  }

  return {
    completed,
    projectFeatures,
    itemStates,
    pendingItemMutations: [],
    pendingPracticeEvents: [],
    syncEpoch: null,
    quizResults: parseResultMap(row.quiz_results, parseQuizResult),
    challengeResults: parseResultMap(row.challenge_results, parseChallengeResult),
    startedAt: validDateString(row.started_at),
    lastVisit: validDateString(row.last_visit),
  };
}

function parseProgressItemRows(rows: ProgressItemRow[] | null): Map<string, import("./progress-types").ProgressItemState> {
  const itemStates = new Map<string, import("./progress-types").ProgressItemState>();
  for (const row of rows ?? []) {
    if (
      (row.scope !== "lesson" && row.scope !== "project_feature") ||
      typeof row.item_key !== "string" ||
      typeof row.completed !== "boolean" ||
      typeof row.client_updated_at !== "string" ||
      typeof row.mutation_id !== "string"
    ) {
      continue;
    }

    const item = {
      scope: row.scope,
      itemKey: row.item_key,
      completed: row.completed,
      clientUpdatedAt: row.client_updated_at,
      mutationId: row.mutation_id,
    } as import("./progress-types").ProgressItemState;
    itemStates.set(itemStateKey(item.scope, item.itemKey), item);
  }
  return itemStates;
}

export async function loadAuthoritativeProgressState(
  supabase: SupabaseClient,
  userId: string
): Promise<RemoteProgressSnapshot> {
  const [syncResponse, itemsResponse] = await Promise.all([
    supabase
      .from("user_progress_sync")
      .select("sync_epoch")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_progress_items")
      .select("scope, item_key, completed, client_updated_at, mutation_id")
      .eq("user_id", userId),
  ]);

  if (syncResponse.error) throw syncResponse.error;
  if (itemsResponse.error) throw itemsResponse.error;

  const itemStates = parseProgressItemRows(itemsResponse.data as ProgressItemRow[] | null);
  const { completed, projectFeatures } = deriveProgressSets(itemStates);
  const sync = syncResponse.data as ProgressSyncRow | null;
  return {
    epoch: sync?.sync_epoch ?? 0,
    state: {
      ...createEmptyProgressState(),
      completed,
      projectFeatures,
      itemStates,
      syncEpoch: sync?.sync_epoch ?? 0,
    },
  };
}

export async function applyRemoteProgressItemMutations(
  supabase: SupabaseClient,
  expectedEpoch: number,
  mutations: import("./progress-types").ProgressItemState[]
): Promise<{ epoch: number; acknowledgedMutationIds: string[] }> {
  if (mutations.length === 0) return { epoch: expectedEpoch, acknowledgedMutationIds: [] };

  const { data, error } = await supabase.rpc("apply_progress_item_mutations", {
    expected_epoch: expectedEpoch,
    mutations: mutations.map((mutation) => ({
      scope: mutation.scope,
      item_key: mutation.itemKey,
      completed: mutation.completed,
      client_updated_at: mutation.clientUpdatedAt,
      mutation_id: mutation.mutationId,
    })),
  });

  if (error) throw error;
  const result = data as { epoch?: unknown; acknowledgedMutationIds?: unknown } | null;
  if (
    !result ||
    typeof result.epoch !== "number" ||
    !Array.isArray(result.acknowledgedMutationIds) ||
    !result.acknowledgedMutationIds.every((id): id is string => typeof id === "string")
  ) {
    throw new Error("Invalid progress mutation RPC response");
  }

  return { epoch: result.epoch, acknowledgedMutationIds: result.acknowledgedMutationIds };
}

export async function appendRemotePracticeEvents(
  supabase: SupabaseClient,
  expectedEpoch: number,
  events: PracticeEvent[]
): Promise<{ epoch: number; acknowledgedEventIds: string[] }> {
  if (events.length === 0) return { epoch: expectedEpoch, acknowledgedEventIds: [] };
  const { data, error } = await supabase.rpc("append_practice_events", {
    expected_epoch: expectedEpoch,
    events: events.map((event) => ({
      event_id: event.eventId,
      challenge_id: event.challengeId,
      content_version: event.contentVersion,
      origin: event.origin,
      event_type: event.eventType,
      step: event.step,
      hint_level: event.hintLevel,
      passed: event.passed,
      occurred_at: event.occurredAt,
    })),
  });
  if (error) throw error;
  const result = data as { epoch?: unknown; acknowledgedEventIds?: unknown } | null;
  if (
    !result ||
    typeof result.epoch !== "number" ||
    !Array.isArray(result.acknowledgedEventIds) ||
    !result.acknowledgedEventIds.every((id): id is string => typeof id === "string")
  ) {
    throw new Error("Invalid practice event RPC response");
  }
  return { epoch: result.epoch, acknowledgedEventIds: result.acknowledgedEventIds };
}

export async function resetAuthoritativeProgress(
  supabase: SupabaseClient,
  expectedEpoch: number
): Promise<number> {
  const { data, error } = await supabase.rpc("reset_learning_progress", {
    expected_epoch: expectedEpoch,
  });
  if (error) throw error;

  const result = data as { epoch?: unknown } | null;
  if (!result || typeof result.epoch !== "number") {
    throw new Error("Invalid progress reset RPC response");
  }
  return result.epoch;
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
