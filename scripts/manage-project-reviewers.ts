#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALIAS_PATTERN = /^reviewer-[0-9a-f]{16}$/;

type ReviewerCommand = "list" | "status" | "add" | "revoke" | "restore";

export type ReviewerOpsArgs = {
  command: ReviewerCommand;
  apply: boolean;
  allowLastReviewer: boolean;
};

type ReviewerOpsConfig = {
  apiUrl: string;
  serviceRoleKey: string;
  targetUserId: string | null;
  operationId: string | null;
};

type MembershipRow = {
  operator_alias: string;
  revoked_at: string | null;
  created_at: string;
};

export class ReviewerOpsError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "ReviewerOpsError";
  }
}

export function parseReviewerOpsArgs(argv: string[]): ReviewerOpsArgs {
  const [commandInput, ...flags] = argv;
  if (!(["list", "status", "add", "revoke", "restore"] as string[]).includes(commandInput ?? "")) {
    throw new ReviewerOpsError("INVALID_COMMAND");
  }
  const unknown = flags.filter((flag) => !["--apply", "--allow-last-reviewer"].includes(flag));
  if (unknown.length > 0) throw new ReviewerOpsError("INVALID_FLAG");
  if (flags.includes("--allow-last-reviewer") && commandInput !== "revoke") {
    throw new ReviewerOpsError("BREAK_GLASS_ONLY_FOR_REVOKE");
  }
  return {
    command: commandInput as ReviewerCommand,
    apply: flags.includes("--apply"),
    allowLastReviewer: flags.includes("--allow-last-reviewer"),
  };
}

function loadConfig(env: NodeJS.ProcessEnv, command: ReviewerCommand): ReviewerOpsConfig {
  const apiUrlInput = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!apiUrlInput || !serviceRoleKey) throw new ReviewerOpsError("MISSING_TRUSTED_ENV");
  let apiUrl: URL;
  try {
    apiUrl = new URL(apiUrlInput);
  } catch {
    throw new ReviewerOpsError("INVALID_SUPABASE_URL");
  }
  if (!(["https:", "http:"] as string[]).includes(apiUrl.protocol)) {
    throw new ReviewerOpsError("INVALID_SUPABASE_URL");
  }

  const targetUserId = env.PROJECT_REVIEWER_USER_ID?.trim() || null;
  if (command !== "list" && (!targetUserId || !UUID_PATTERN.test(targetUserId))) {
    throw new ReviewerOpsError("INVALID_REVIEWER_TARGET");
  }
  const operationId = env.PROJECT_REVIEWER_OPERATION_ID?.trim() || null;
  if (operationId && !UUID_PATTERN.test(operationId)) {
    throw new ReviewerOpsError("INVALID_OPERATION_ID");
  }
  return {
    apiUrl: apiUrl.origin,
    serviceRoleKey,
    targetUserId,
    operationId,
  };
}

function targetFingerprint(userId: string): string {
  return `subject-${createHash("sha256").update(userId).digest("hex").slice(0, 12)}`;
}

async function trustedRequest(
  config: ReviewerOpsConfig,
  fetchImpl: typeof fetch,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  let response: Response;
  try {
    response = await fetchImpl(`${config.apiUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${config.serviceRoleKey}`,
        apikey: config.serviceRoleKey,
        "content-type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new ReviewerOpsError("NETWORK_ERROR");
  }
  if (!response.ok) throw new ReviewerOpsError(`HTTP_${response.status}`);
  return response;
}

async function getMembership(
  config: ReviewerOpsConfig,
  fetchImpl: typeof fetch,
  userId: string
): Promise<MembershipRow | null> {
  const response = await trustedRequest(
    config,
    fetchImpl,
    `/rest/v1/project_reviewer_memberships?select=operator_alias,revoked_at,created_at&user_id=eq.${encodeURIComponent(userId)}&limit=1`
  );
  const data = await response.json() as unknown;
  if (!Array.isArray(data) || data.length > 1) throw new ReviewerOpsError("INVALID_MEMBERSHIP_RESPONSE");
  if (data.length === 0) return null;
  const row = data[0] as Partial<MembershipRow>;
  if (!ALIAS_PATTERN.test(row.operator_alias ?? "")
    || (row.revoked_at !== null && typeof row.revoked_at !== "string")
    || typeof row.created_at !== "string"
  ) {
    throw new ReviewerOpsError("INVALID_MEMBERSHIP_RESPONSE");
  }
  return row as MembershipRow;
}

async function getActiveClaimCount(
  config: ReviewerOpsConfig,
  fetchImpl: typeof fetch,
  userId: string
): Promise<number> {
  const response = await trustedRequest(
    config,
    fetchImpl,
    `/rest/v1/project_submission_workflow?select=submission_id&state=eq.in_review&assigned_reviewer_id=eq.${encodeURIComponent(userId)}&limit=1`,
    { headers: { prefer: "count=exact" } }
  );
  const range = response.headers.get("content-range");
  const count = range?.match(/\/(\d+)$/)?.[1];
  if (count === undefined) throw new ReviewerOpsError("INVALID_CLAIM_COUNT_RESPONSE");
  return Number(count);
}

async function requireAuthUser(
  config: ReviewerOpsConfig,
  fetchImpl: typeof fetch,
  userId: string
): Promise<void> {
  await trustedRequest(
    config,
    fetchImpl,
    `/auth/v1/admin/users/${encodeURIComponent(userId)}`
  );
}

function membershipState(membership: MembershipRow | null): "absent" | "active" | "revoked" {
  if (!membership) return "absent";
  return membership.revoked_at === null ? "active" : "revoked";
}

export async function runReviewerOps(
  args: ReviewerOpsArgs,
  env: NodeJS.ProcessEnv,
  fetchImpl: typeof fetch = fetch
): Promise<Record<string, unknown>> {
  const config = loadConfig(env, args.command);
  if (args.command === "list") {
    const response = await trustedRequest(
      config,
      fetchImpl,
      "/rest/v1/project_reviewer_memberships?select=operator_alias,revoked_at,created_at&order=created_at.asc&limit=100"
    );
    const rows = await response.json() as unknown;
    if (!Array.isArray(rows)) throw new ReviewerOpsError("INVALID_MEMBERSHIP_RESPONSE");
    const reviewers = rows.map((row) => {
      const input = row as Partial<MembershipRow>;
      if (!ALIAS_PATTERN.test(input.operator_alias ?? "")
        || (input.revoked_at !== null && typeof input.revoked_at !== "string")
        || typeof input.created_at !== "string"
      ) {
        throw new ReviewerOpsError("INVALID_MEMBERSHIP_RESPONSE");
      }
      return {
        alias: input.operator_alias,
        state: input.revoked_at === null ? "active" : "revoked",
        createdAt: input.created_at,
      };
    });
    return { ok: true, command: "list", reviewerCount: reviewers.length, reviewers };
  }

  const userId = config.targetUserId as string;
  const [membership, activeClaimCount] = await Promise.all([
    getMembership(config, fetchImpl, userId),
    getActiveClaimCount(config, fetchImpl, userId),
  ]);
  const baseResult = {
    ok: true,
    command: args.command,
    target: targetFingerprint(userId),
    alias: membership?.operator_alias ?? null,
    membership: membershipState(membership),
    activeClaimCount,
  };
  if (args.command === "status") return baseResult;

  if (args.command === "add") await requireAuthUser(config, fetchImpl, userId);
  if (!args.apply) {
    return {
      ...baseResult,
      mode: "dry-run",
      allowLastReviewer: args.allowLastReviewer,
    };
  }

  const operationId = config.operationId ?? randomUUID();
  const response = await trustedRequest(
    config,
    fetchImpl,
    "/rest/v1/rpc/manage_project_reviewer",
    {
      method: "POST",
      body: JSON.stringify({
        operation_id_input: operationId,
        operation_input: args.command,
        reviewer_user_id_input: userId,
        allow_last_reviewer_input: args.allowLastReviewer,
      }),
    }
  );
  const result = await response.json() as Record<string, unknown>;
  if (result.operation_id !== operationId
    || result.operation !== args.command
    || !ALIAS_PATTERN.test(String(result.reviewer_alias ?? ""))
    || typeof result.status !== "string"
    || !Number.isInteger(result.released_claim_count)
    || !Number.isInteger(result.active_reviewer_count)
    || !Number.isInteger(result.active_queue_count)
  ) {
    throw new ReviewerOpsError("INVALID_OPERATION_RESPONSE");
  }
  return {
    ok: true,
    command: args.command,
    mode: "applied",
    operationId,
    alias: result.reviewer_alias,
    status: result.status,
    releasedClaimCount: result.released_claim_count,
    activeReviewerCount: result.active_reviewer_count,
    activeQueueCount: result.active_queue_count,
  };
}

async function main() {
  try {
    const args = parseReviewerOpsArgs(process.argv.slice(2));
    const result = await runReviewerOps(args, process.env);
    console.log(JSON.stringify(result));
  } catch (error) {
    const code = error instanceof ReviewerOpsError ? error.code : "UNKNOWN_ERROR";
    console.error(JSON.stringify({ ok: false, code }));
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) void main();
