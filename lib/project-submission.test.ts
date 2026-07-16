import { describe, expect, it } from "vitest";
import {
  canCreateProjectSubmission,
  parseProjectReviewQueuePageRows,
  parseProjectReviewQueueCursor,
  parseProjectSubmissionSnapshot,
  parseProjectSubmissionSummary,
  type ProjectSubmissionSummary,
} from "./project-submission";

const summaryRow = {
  id: "11111111-1111-4111-8111-111111111111",
  project_id: "p1-easy",
  supersedes_submission_id: null,
  state: "pending",
  assigned_reviewer_id: null,
  submitted_at: "2026-07-15T10:00:00.000Z",
  updated_at: "2026-07-15T10:00:00.000Z",
};

const snapshotRow = {
  id: summaryRow.id,
  learner_id: "22222222-2222-4222-8222-222222222222",
  project_id: "p1-easy",
  supersedes_submission_id: null,
  repository_url: "https://github.com/learner/project",
  repository_url_updated_at: "2026-07-15T09:00:00.000Z",
  demo_url: "",
  demo_url_updated_at: "1970-01-01T00:00:00.000Z",
  reflection: "A deterministic architecture keeps domain behavior independent from transport retries and makes failure ownership explicit.",
  reflection_updated_at: "2026-07-15T09:00:00.000Z",
  completed_feature_count: 3,
  required_feature_count: 3,
  rubric_version: 1,
  submitted_at: "2026-07-15T10:00:00.000Z",
};

describe("project submission contracts", () => {
  it("parses bounded workflow summaries and immutable snapshots", () => {
    expect(parseProjectSubmissionSummary(summaryRow)).toMatchObject({
      projectId: "p1-easy",
      state: "pending",
    });
    expect(parseProjectSubmissionSnapshot(snapshotRow)).toMatchObject({
      learnerId: snapshotRow.learner_id,
      requiredFeatureCount: 3,
    });
  });

  it("rejects malformed ids, unsafe URLs, weak reflections, and incomplete snapshots", () => {
    expect(parseProjectSubmissionSummary({ ...summaryRow, id: "not-a-uuid" })).toBeNull();
    expect(parseProjectSubmissionSnapshot({
      ...snapshotRow,
      repository_url: "https://user:secret@example.test/project",
    })).toBeNull();
    expect(parseProjectSubmissionSnapshot({ ...snapshotRow, reflection: " \n\t".repeat(100) })).toBeNull();
    expect(parseProjectSubmissionSnapshot({ ...snapshotRow, completed_feature_count: 2 })).toBeNull();
  });

  it("allows a new snapshot only before submission or after requested changes", () => {
    expect(canCreateProjectSubmission(null)).toBe(true);
    const summary = parseProjectSubmissionSummary(summaryRow) as ProjectSubmissionSummary;
    expect(canCreateProjectSubmission(summary)).toBe(false);
    expect(canCreateProjectSubmission({ ...summary, state: "changes_requested" })).toBe(true);
    expect(canCreateProjectSubmission({ ...summary, state: "approved" })).toBe(false);
  });

  it("parses an N+1 reviewer page and derives the next immutable cursor", () => {
    const rows = [0, 1, 2].map((index) => ({
      ...snapshotRow,
      ...summaryRow,
      id: `${index + 1}1111111-1111-4111-8111-111111111111`,
      submitted_at: `2026-07-15T10:0${index}:00.000Z`,
      updated_at: `2026-07-15T10:0${index}:30.000Z`,
      assigned_reviewer_active: false,
    }));

    expect(parseProjectReviewQueuePageRows(rows, 2)).toMatchObject({
      items: [{ summary: { id: rows[0]?.id } }, { summary: { id: rows[1]?.id } }],
      nextCursor: {
        submittedAt: rows[1]?.submitted_at,
        submissionId: rows[1]?.id,
      },
    });
  });

  it("rejects malformed, duplicate, and over-bound reviewer pages", () => {
    const row = {
      ...snapshotRow,
      ...summaryRow,
      assigned_reviewer_active: false,
    };
    expect(parseProjectReviewQueuePageRows([
      { ...row, assigned_reviewer_active: true },
    ], 1)).toBeNull();
    expect(parseProjectReviewQueuePageRows([row, row], 2)).toBeNull();
    expect(parseProjectReviewQueuePageRows([row, row, row], 1)).toBeNull();
    expect(parseProjectReviewQueuePageRows([], 26)).toBeNull();
  });

  it("accepts only finite timestamp and UUID queue cursors", () => {
    expect(parseProjectReviewQueueCursor({
      submittedAt: summaryRow.submitted_at,
      submissionId: summaryRow.id,
    })).toEqual({
      submittedAt: summaryRow.submitted_at,
      submissionId: summaryRow.id,
    });
    expect(parseProjectReviewQueueCursor({
      submittedAt: "infinity",
      submissionId: summaryRow.id,
    })).toBeNull();
    expect(parseProjectReviewQueueCursor({
      submittedAt: summaryRow.submitted_at,
      submissionId: "not-a-uuid",
    })).toBeNull();
  });
});
