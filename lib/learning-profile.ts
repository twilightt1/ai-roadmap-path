export const LEARNING_PROFILE_SCHEMA_VERSION = 1 as const;
export const LEARNING_PROFILE_STORAGE_KEY = "ai-roadmap:learning-profile:v1";
export const WEEKLY_TARGET_OPTIONS = [3, 5, 7] as const;
export const DEFAULT_WEEKLY_TARGET = WEEKLY_TARGET_OPTIONS[0];

const EMPTY_TIMESTAMP = "1970-01-01T00:00:00.000Z";
const MAX_DIAGNOSTIC_TOPICS = 20;

export type WeeklyTarget = (typeof WEEKLY_TARGET_OPTIONS)[number];

export type DiagnosticTopicScore = {
  correct: number;
  total: number;
};

export type DiagnosticResult = {
  assessmentVersion: string;
  completedAt: string;
  score: number;
  total: number;
  topicScores: Record<string, DiagnosticTopicScore>;
};

export type LearningProfile = {
  schemaVersion: typeof LEARNING_PROFILE_SCHEMA_VERSION;
  weeklyGoal: {
    target: WeeklyTarget;
    updatedAt: string;
  };
  diagnostic: {
    value: DiagnosticResult | null;
    updatedAt: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function isBoundedInteger(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum;
}

export function isWeeklyTarget(value: unknown): value is WeeklyTarget {
  return typeof value === "number" && WEEKLY_TARGET_OPTIONS.includes(value as WeeklyTarget);
}

export function parseDiagnosticResult(value: unknown): DiagnosticResult | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.assessmentVersion !== "string" ||
    value.assessmentVersion.length < 1 ||
    value.assessmentVersion.length > 80 ||
    !isTimestamp(value.completedAt) ||
    !isBoundedInteger(value.score, 0, 100) ||
    !isBoundedInteger(value.total, 1, 100) ||
    value.score > value.total ||
    !isRecord(value.topicScores)
  ) {
    return null;
  }

  const entries = Object.entries(value.topicScores);
  if (entries.length < 1 || entries.length > MAX_DIAGNOSTIC_TOPICS) return null;

  const topicScores: Record<string, DiagnosticTopicScore> = {};
  let score = 0;
  let total = 0;
  for (const [topicKey, rawScore] of entries) {
    if (topicKey.length < 1 || topicKey.length > 500 || !isRecord(rawScore)) return null;
    if (
      !isBoundedInteger(rawScore.correct, 0, 20) ||
      !isBoundedInteger(rawScore.total, 1, 20) ||
      rawScore.correct > rawScore.total
    ) {
      return null;
    }
    topicScores[topicKey] = { correct: rawScore.correct, total: rawScore.total };
    score += rawScore.correct;
    total += rawScore.total;
  }

  if (score !== value.score || total !== value.total) return null;

  return {
    assessmentVersion: value.assessmentVersion,
    completedAt: value.completedAt,
    score: value.score,
    total: value.total,
    topicScores,
  };
}

export function createDefaultLearningProfile(): LearningProfile {
  return {
    schemaVersion: LEARNING_PROFILE_SCHEMA_VERSION,
    weeklyGoal: { target: DEFAULT_WEEKLY_TARGET, updatedAt: EMPTY_TIMESTAMP },
    diagnostic: { value: null, updatedAt: EMPTY_TIMESTAMP },
  };
}

export function parseLearningProfile(value: unknown): LearningProfile | null {
  if (!isRecord(value) || value.schemaVersion !== LEARNING_PROFILE_SCHEMA_VERSION) return null;
  if (!isRecord(value.weeklyGoal) || !isRecord(value.diagnostic)) return null;
  if (!isWeeklyTarget(value.weeklyGoal.target) || !isTimestamp(value.weeklyGoal.updatedAt)) return null;
  if (!isTimestamp(value.diagnostic.updatedAt)) return null;

  const diagnostic = value.diagnostic.value === null
    ? null
    : parseDiagnosticResult(value.diagnostic.value);
  if (value.diagnostic.value !== null && diagnostic === null) return null;

  return {
    schemaVersion: LEARNING_PROFILE_SCHEMA_VERSION,
    weeklyGoal: {
      target: value.weeklyGoal.target,
      updatedAt: value.weeklyGoal.updatedAt,
    },
    diagnostic: {
      value: diagnostic,
      updatedAt: value.diagnostic.updatedAt,
    },
  };
}

function compareField(leftUpdatedAt: string, leftTieBreak: string, rightUpdatedAt: string, rightTieBreak: string): number {
  const timestampComparison = Date.parse(leftUpdatedAt) - Date.parse(rightUpdatedAt);
  return timestampComparison !== 0 ? timestampComparison : leftTieBreak.localeCompare(rightTieBreak);
}

function diagnosticTieBreak(value: DiagnosticResult | null): string {
  if (value === null) return "";
  return JSON.stringify({
    assessmentVersion: value.assessmentVersion,
    completedAt: value.completedAt,
    score: value.score,
    total: value.total,
    topicScores: Object.fromEntries(
      Object.entries(value.topicScores).sort(([left], [right]) => left.localeCompare(right))
    ),
  });
}

export function mergeLearningProfiles(...profiles: LearningProfile[]): LearningProfile {
  return profiles.reduce((merged, candidate) => {
    const weeklyGoal = compareField(
      candidate.weeklyGoal.updatedAt,
      String(candidate.weeklyGoal.target),
      merged.weeklyGoal.updatedAt,
      String(merged.weeklyGoal.target)
    ) > 0
      ? candidate.weeklyGoal
      : merged.weeklyGoal;

    const candidateDiagnostic = diagnosticTieBreak(candidate.diagnostic.value);
    const mergedDiagnostic = diagnosticTieBreak(merged.diagnostic.value);
    const diagnostic = compareField(
      candidate.diagnostic.updatedAt,
      candidateDiagnostic,
      merged.diagnostic.updatedAt,
      mergedDiagnostic
    ) > 0
      ? candidate.diagnostic
      : merged.diagnostic;

    return {
      schemaVersion: LEARNING_PROFILE_SCHEMA_VERSION,
      weeklyGoal: { ...weeklyGoal },
      diagnostic: {
        value: diagnostic.value === null
          ? null
          : {
              ...diagnostic.value,
              topicScores: { ...diagnostic.value.topicScores },
            },
        updatedAt: diagnostic.updatedAt,
      },
    };
  }, createDefaultLearningProfile());
}

export function updateWeeklyTarget(
  profile: LearningProfile,
  target: WeeklyTarget,
  updatedAt = new Date().toISOString()
): LearningProfile {
  return {
    ...profile,
    weeklyGoal: { target, updatedAt },
  };
}

export function updateDiagnosticResult(
  profile: LearningProfile,
  value: DiagnosticResult | null,
  updatedAt = new Date().toISOString()
): LearningProfile {
  return {
    ...profile,
    diagnostic: { value, updatedAt },
  };
}

export function learningProfileStorageKey(userId?: string | null): string {
  return userId
    ? `${LEARNING_PROFILE_STORAGE_KEY}:user:${encodeURIComponent(userId)}`
    : LEARNING_PROFILE_STORAGE_KEY;
}
