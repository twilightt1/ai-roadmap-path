import { describe, expect, it, vi } from "vitest";
import {
  parseReviewerOpsArgs,
  ReviewerOpsError,
  runReviewerOps,
} from "./manage-project-reviewers";

const targetId = "11111111-1111-4111-8111-111111111111";
const operationId = "22222222-2222-4222-8222-222222222222";
const env = {
  NODE_ENV: "test",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "server-only-service-role-key",
  PROJECT_REVIEWER_USER_ID: targetId,
  PROJECT_REVIEWER_OPERATION_ID: operationId,
} satisfies NodeJS.ProcessEnv;

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json", ...init.headers },
    ...init,
  });
}

function membershipResponse(): Response {
  return jsonResponse([{
    operator_alias: "reviewer-1111111111111111",
    revoked_at: null,
    created_at: "2026-07-16T00:00:00.000Z",
  }]);
}

function claimsResponse(count: number): Response {
  return jsonResponse([], { headers: { "content-range": `*/${count}` } });
}

describe("reviewer operations CLI", () => {
  it("parses dry-run/apply flags and restricts break glass to revoke", () => {
    expect(parseReviewerOpsArgs(["add"])).toEqual({
      command: "add",
      apply: false,
      allowLastReviewer: false,
    });
    expect(parseReviewerOpsArgs(["revoke", "--apply", "--allow-last-reviewer"]))
      .toMatchObject({ command: "revoke", apply: true, allowLastReviewer: true });
    expect(() => parseReviewerOpsArgs(["add", "--allow-last-reviewer"]))
      .toThrowError(ReviewerOpsError);
  });

  it("keeps revoke dry-run read-only and reports only a target fingerprint", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(membershipResponse())
      .mockResolvedValueOnce(claimsResponse(2));

    const result = await runReviewerOps(
      parseReviewerOpsArgs(["revoke"]),
      env,
      fetchImpl as typeof fetch
    );
    expect(result).toMatchObject({
      mode: "dry-run",
      membership: "active",
      activeClaimCount: 2,
    });
    expect(JSON.stringify(result)).not.toContain(targetId);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls.every((call) => call[1]?.method !== "POST")).toBe(true);
  });

  it("applies an idempotent lifecycle RPC with the protected operation id", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(membershipResponse())
      .mockResolvedValueOnce(claimsResponse(1))
      .mockResolvedValueOnce(jsonResponse({
        operation_id: operationId,
        operation: "revoke",
        reviewer_alias: "reviewer-1111111111111111",
        status: "revoked",
        released_claim_count: 1,
        active_reviewer_count: 1,
        active_queue_count: 3,
      }));

    const result = await runReviewerOps(
      parseReviewerOpsArgs(["revoke", "--apply"]),
      env,
      fetchImpl as typeof fetch
    );
    expect(result).toMatchObject({
      mode: "applied",
      operationId,
      status: "revoked",
      releasedClaimCount: 1,
    });
    const rpcBody = JSON.parse(String(fetchImpl.mock.calls[2]?.[1]?.body));
    expect(rpcBody).toMatchObject({
      operation_id_input: operationId,
      reviewer_user_id_input: targetId,
      operation_input: "revoke",
    });
    expect(JSON.stringify(result)).not.toContain(targetId);
  });

  it("validates an Auth user before adding a reviewer", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(claimsResponse(0))
      .mockResolvedValueOnce(jsonResponse({ id: targetId }));

    await expect(runReviewerOps(
      parseReviewerOpsArgs(["add"]),
      env,
      fetchImpl as typeof fetch
    )).resolves.toMatchObject({ mode: "dry-run", membership: "absent" });
    expect(fetchImpl.mock.calls[2]?.[0]).toContain("/auth/v1/admin/users/");
  });

  it("redacts raw remote errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: "secret reviewer@example.test" }),
      { status: 403 }
    ));
    await expect(runReviewerOps(
      parseReviewerOpsArgs(["status"]),
      env,
      fetchImpl as typeof fetch
    )).rejects.toMatchObject({ code: "HTTP_403" });
  });
});
