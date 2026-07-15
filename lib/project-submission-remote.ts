import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseProjectSubmissionFeedback,
  parseProjectSubmissionSnapshot,
  parseProjectSubmissionSummary,
  type ProjectReviewQueueItem,
  type ProjectSubmissionFeedback,
  type ProjectSubmissionSnapshot,
  type ProjectSubmissionSummary,
} from "./project-submission";

const SUBMISSION_COLUMNS = [
  "id",
  "learner_id",
  "project_id",
  "supersedes_submission_id",
  "repository_url",
  "repository_url_updated_at",
  "demo_url",
  "demo_url_updated_at",
  "reflection",
  "reflection_updated_at",
  "completed_feature_count",
  "required_feature_count",
  "rubric_version",
  "submitted_at",
].join(", ");

const WORKFLOW_COLUMNS = "submission_id, state, assigned_reviewer_id, updated_at";

export type ProjectSubmissionStatus = {
  summary: ProjectSubmissionSummary;
  feedback: ProjectSubmissionFeedback | null;
};

function parseWorkflowSummary(
  workflow: unknown,
  snapshot: ProjectSubmissionSnapshot
): ProjectSubmissionSummary | null {
  if (!workflow || typeof workflow !== "object" || Array.isArray(workflow)) return null;
  const input = workflow as Record<string, unknown>;
  if (input.submission_id !== snapshot.id) return null;
  return parseProjectSubmissionSummary({
    id: snapshot.id,
    project_id: snapshot.projectId,
    supersedes_submission_id: snapshot.supersedesSubmissionId,
    state: input.state,
    assigned_reviewer_id: input.assigned_reviewer_id,
    submitted_at: snapshot.submittedAt,
    updated_at: input.updated_at,
  });
}

async function loadWorkflowSummary(
  supabase: SupabaseClient,
  snapshot: ProjectSubmissionSnapshot
): Promise<ProjectSubmissionSummary> {
  const { data, error } = await supabase
    .from("project_submission_workflow")
    .select(WORKFLOW_COLUMNS)
    .eq("submission_id", snapshot.id)
    .maybeSingle();

  if (error) throw error;
  const summary = parseWorkflowSummary(data, snapshot);
  if (!summary) throw new Error("Invalid project submission workflow row");
  return summary;
}

export async function loadLatestProjectSubmission(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<ProjectSubmissionStatus | null> {
  const { data, error } = await supabase
    .from("project_submissions")
    .select(SUBMISSION_COLUMNS)
    .eq("learner_id", userId)
    .eq("project_id", projectId)
    .order("submitted_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (data === null) return null;
  const snapshot = parseProjectSubmissionSnapshot(data);
  if (!snapshot || snapshot.learnerId !== userId || snapshot.projectId !== projectId) {
    throw new Error("Invalid project submission row");
  }

  const summary = await loadWorkflowSummary(supabase, snapshot);
  const { data: feedbackData, error: feedbackError } = await supabase
    .from("project_submission_events")
    .select("event_type, comment, created_at")
    .eq("submission_id", snapshot.id)
    .in("event_type", ["changes_requested", "approved"])
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (feedbackError) throw feedbackError;
  const feedback = feedbackData === null ? null : parseProjectSubmissionFeedback(feedbackData);
  if (feedbackData !== null && !feedback) throw new Error("Invalid project submission feedback row");
  return { summary, feedback };
}

export async function submitRemoteProjectEvidence(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectSubmissionSummary> {
  const { data, error } = await supabase.rpc("submit_project_evidence", {
    project_id_input: projectId,
  });
  if (error) throw error;
  const summary = parseProjectSubmissionSummary(data);
  if (!summary || summary.projectId !== projectId) {
    throw new Error("Invalid project submission RPC response");
  }
  return summary;
}

export async function isRemoteProjectReviewer(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_project_reviewer");
  if (error) throw error;
  if (typeof data !== "boolean") throw new Error("Invalid project reviewer response");
  return data;
}

export async function loadProjectReviewQueue(
  supabase: SupabaseClient
): Promise<{ authorized: boolean; items: ProjectReviewQueueItem[] }> {
  if (!await isRemoteProjectReviewer(supabase)) return { authorized: false, items: [] };

  const { data: workflowRows, error: workflowError } = await supabase
    .from("project_submission_workflow")
    .select(WORKFLOW_COLUMNS)
    .in("state", ["pending", "in_review"])
    .order("updated_at", { ascending: true })
    .limit(50);
  if (workflowError) throw workflowError;
  if (!workflowRows?.length) return { authorized: true, items: [] };

  const submissionIds = workflowRows.map((workflow) => workflow.submission_id);
  const { data: submissionRows, error: submissionError } = await supabase
    .from("project_submissions")
    .select(SUBMISSION_COLUMNS)
    .in("id", submissionIds);
  if (submissionError) throw submissionError;
  const snapshots = (submissionRows ?? []).map((row) => {
    const snapshot = parseProjectSubmissionSnapshot(row);
    if (!snapshot) throw new Error("Invalid project review queue row");
    return snapshot;
  });
  const snapshotsById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot] as const));
  const items = workflowRows.map((workflow) => {
    const snapshot = snapshotsById.get(workflow.submission_id);
    if (!snapshot) throw new Error("Missing project review queue snapshot");
    const summary = parseWorkflowSummary(workflow, snapshot);
    if (!summary) throw new Error("Invalid project review workflow row");
    return { snapshot, summary };
  });

  return { authorized: true, items };
}

export async function claimRemoteProjectSubmission(
  supabase: SupabaseClient,
  submissionId: string
): Promise<ProjectSubmissionSummary> {
  const { data, error } = await supabase.rpc("claim_project_submission", {
    submission_id_input: submissionId,
  });
  if (error) throw error;
  const summary = parseProjectSubmissionSummary(data);
  if (!summary || summary.id !== submissionId || summary.state !== "in_review") {
    throw new Error("Invalid project submission claim response");
  }
  return summary;
}

export async function reviewRemoteProjectSubmission(
  supabase: SupabaseClient,
  submissionId: string,
  decision: "changes_requested" | "approved",
  comment: string
): Promise<ProjectSubmissionSummary> {
  const { data, error } = await supabase.rpc("review_project_submission", {
    submission_id_input: submissionId,
    decision_input: decision,
    comment_input: comment,
  });
  if (error) throw error;
  const summary = parseProjectSubmissionSummary(data);
  if (!summary || summary.id !== submissionId || summary.state !== decision) {
    throw new Error("Invalid project submission review response");
  }
  return summary;
}
