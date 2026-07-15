import {
  MAX_PROJECT_EVIDENCE_REFLECTION_LENGTH,
  countProjectEvidenceReflectionCharacters,
  isProjectEvidenceProjectId,
  isSafeProjectEvidenceUrl,
} from "./project-evidence";

export const MAX_PROJECT_REVIEW_COMMENT_LENGTH = 2_000;

export const PROJECT_SUBMISSION_STATES = [
  "pending",
  "in_review",
  "changes_requested",
  "approved",
] as const;

export type ProjectSubmissionState = (typeof PROJECT_SUBMISSION_STATES)[number];

export type ProjectSubmissionSummary = {
  id: string;
  projectId: string;
  supersedesSubmissionId: string | null;
  state: ProjectSubmissionState;
  assignedReviewerId: string | null;
  submittedAt: string;
  updatedAt: string;
};

export type ProjectSubmissionSnapshot = {
  id: string;
  learnerId: string;
  projectId: string;
  supersedesSubmissionId: string | null;
  repositoryUrl: string;
  repositoryUrlUpdatedAt: string;
  demoUrl: string;
  demoUrlUpdatedAt: string;
  reflection: string;
  reflectionUpdatedAt: string;
  completedFeatureCount: number;
  requiredFeatureCount: number;
  rubricVersion: 1;
  submittedAt: string;
};

export type ProjectSubmissionFeedback = {
  eventType: "changes_requested" | "approved";
  comment: string;
  createdAt: string;
};

export type ProjectReviewQueueItem = {
  snapshot: ProjectSubmissionSnapshot;
  summary: ProjectSubmissionSummary;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function isNullableUuid(value: unknown): value is string | null {
  return value === null || isUuid(value);
}

function isSubmissionState(value: unknown): value is ProjectSubmissionState {
  return typeof value === "string"
    && (PROJECT_SUBMISSION_STATES as readonly string[]).includes(value);
}

export function parseProjectSubmissionSummary(value: unknown): ProjectSubmissionSummary | null {
  if (!isRecord(value)
    || !isUuid(value.id)
    || !isProjectEvidenceProjectId(value.project_id)
    || !isNullableUuid(value.supersedes_submission_id)
    || !isSubmissionState(value.state)
    || !isNullableUuid(value.assigned_reviewer_id)
    || !isTimestamp(value.submitted_at)
    || !isTimestamp(value.updated_at)
  ) {
    return null;
  }

  return {
    id: value.id,
    projectId: value.project_id,
    supersedesSubmissionId: value.supersedes_submission_id,
    state: value.state,
    assignedReviewerId: value.assigned_reviewer_id,
    submittedAt: value.submitted_at,
    updatedAt: value.updated_at,
  };
}

export function parseProjectSubmissionSnapshot(value: unknown): ProjectSubmissionSnapshot | null {
  if (!isRecord(value)
    || !isUuid(value.id)
    || !isUuid(value.learner_id)
    || !isProjectEvidenceProjectId(value.project_id)
    || !isNullableUuid(value.supersedes_submission_id)
    || typeof value.repository_url !== "string"
    || value.repository_url.length === 0
    || !isSafeProjectEvidenceUrl(value.repository_url)
    || !isTimestamp(value.repository_url_updated_at)
    || typeof value.demo_url !== "string"
    || !isSafeProjectEvidenceUrl(value.demo_url)
    || !isTimestamp(value.demo_url_updated_at)
    || typeof value.reflection !== "string"
    || value.reflection.length > MAX_PROJECT_EVIDENCE_REFLECTION_LENGTH
    || countProjectEvidenceReflectionCharacters(value.reflection) < 80
    || !isTimestamp(value.reflection_updated_at)
    || !Number.isInteger(value.completed_feature_count)
    || !Number.isInteger(value.required_feature_count)
    || value.completed_feature_count !== value.required_feature_count
    || (value.required_feature_count as number) < 1
    || (value.required_feature_count as number) > 20
    || value.rubric_version !== 1
    || !isTimestamp(value.submitted_at)
  ) {
    return null;
  }

  return {
    id: value.id,
    learnerId: value.learner_id,
    projectId: value.project_id,
    supersedesSubmissionId: value.supersedes_submission_id,
    repositoryUrl: value.repository_url,
    repositoryUrlUpdatedAt: value.repository_url_updated_at,
    demoUrl: value.demo_url,
    demoUrlUpdatedAt: value.demo_url_updated_at,
    reflection: value.reflection,
    reflectionUpdatedAt: value.reflection_updated_at,
    completedFeatureCount: value.completed_feature_count as number,
    requiredFeatureCount: value.required_feature_count as number,
    rubricVersion: 1,
    submittedAt: value.submitted_at,
  };
}

export function parseProjectSubmissionFeedback(value: unknown): ProjectSubmissionFeedback | null {
  if (!isRecord(value)
    || (value.event_type !== "changes_requested" && value.event_type !== "approved")
    || typeof value.comment !== "string"
    || value.comment.length > MAX_PROJECT_REVIEW_COMMENT_LENGTH
    || !isTimestamp(value.created_at)
  ) {
    return null;
  }

  return {
    eventType: value.event_type,
    comment: value.comment,
    createdAt: value.created_at,
  };
}

export function canCreateProjectSubmission(summary: ProjectSubmissionSummary | null): boolean {
  return summary === null || summary.state === "changes_requested";
}
