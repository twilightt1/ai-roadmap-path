import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  claimRemoteProjectSubmission,
  loadProjectReviewQueuePage,
  reviewRemoteProjectSubmission,
  submitRemoteProjectEvidence,
} from "./project-submission-remote";

const summaryRow = {
  id: "11111111-1111-4111-8111-111111111111",
  project_id: "p1-easy",
  supersedes_submission_id: null,
  state: "pending",
  assigned_reviewer_id: null,
  submitted_at: "2026-07-15T10:00:00.000Z",
  updated_at: "2026-07-15T10:00:00.000Z",
};

const queueRow = {
  ...summaryRow,
  learner_id: "33333333-3333-4333-8333-333333333333",
  repository_url: "https://github.com/learner/project",
  repository_url_updated_at: "2026-07-15T09:00:00.000Z",
  demo_url: "",
  demo_url_updated_at: "1970-01-01T00:00:00.000Z",
  reflection: "A deterministic architecture keeps domain behavior independent from transport retries and makes failure ownership explicit.",
  reflection_updated_at: "2026-07-15T09:00:00.000Z",
  completed_feature_count: 3,
  required_feature_count: 3,
  rubric_version: 1,
  assigned_reviewer_active: false,
};

describe("project submission remote adapter", () => {
  it("submits only a project id and never accepts client evidence or owner fields", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: summaryRow, error: null });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(submitRemoteProjectEvidence(client, "p1-easy"))
      .resolves.toMatchObject({ state: "pending" });
    expect(rpc).toHaveBeenCalledWith("submit_project_evidence", {
      project_id_input: "p1-easy",
    });
    expect(rpc.mock.calls[0]?.[1]).not.toEqual(expect.objectContaining({
      user_id_input: expect.anything(),
      repository_url_input: expect.anything(),
      reflection_input: expect.anything(),
      required_feature_count_input: expect.anything(),
    }));
  });

  it("uses explicit claim and bounded-decision RPC contracts", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({
        data: {
          ...summaryRow,
          state: "in_review",
          assigned_reviewer_id: "22222222-2222-4222-8222-222222222222",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ...summaryRow,
          state: "changes_requested",
          assigned_reviewer_id: "22222222-2222-4222-8222-222222222222",
        },
        error: null,
      });
    const client = { rpc } as unknown as SupabaseClient;

    await claimRemoteProjectSubmission(client, summaryRow.id);
    await reviewRemoteProjectSubmission(
      client,
      summaryRow.id,
      "changes_requested",
      "Add a deterministic failure-path test."
    );

    expect(rpc).toHaveBeenNthCalledWith(1, "claim_project_submission", {
      submission_id_input: summaryRow.id,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "review_project_submission", {
      submission_id_input: summaryRow.id,
      decision_input: "changes_requested",
      comment_input: "Add a deterministic failure-path test.",
    });
  });

  it("loads a bounded reviewer page only after reviewer authorization", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: [queueRow], error: null });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(loadProjectReviewQueuePage(client, null, 10)).resolves.toMatchObject({
      authorized: true,
      items: [{ summary: { id: summaryRow.id } }],
      nextCursor: null,
    });
    expect(rpc).toHaveBeenNthCalledWith(1, "is_project_reviewer");
    expect(rpc).toHaveBeenNthCalledWith(2, "list_project_review_queue_page", {
      page_size_input: 10,
      cursor_submitted_at_input: null,
      cursor_submission_id_input: null,
    });
  });

  it("does not call the page RPC for non-reviewers", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(loadProjectReviewQueuePage(client)).resolves.toEqual({
      authorized: false,
      items: [],
      nextCursor: null,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
