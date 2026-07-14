import { NextResponse } from "next/server";
import { getChallengeSolutionPayload } from "@/lib/challenge-solution";

const CACHE_CONTROL = "private, no-store";
const CHALLENGE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_CHALLENGE_ID_LENGTH = 100;
const RATE_LIMIT_CAPACITY = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_RATE_LIMIT_CLIENTS = 1_000;

type TokenBucket = {
  tokens: number;
  updatedAt: number;
};

const solutionRequestBuckets = new Map<string, TokenBucket>();

function response(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", CACHE_CONTROL);
  return NextResponse.json(body, { ...init, headers });
}

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonymous";
}

function takeRequestToken(clientKey: string, now = Date.now()) {
  const existing = solutionRequestBuckets.get(clientKey);
  const elapsed = Math.max(0, now - (existing?.updatedAt ?? now));
  const tokens = Math.min(
    RATE_LIMIT_CAPACITY,
    (existing?.tokens ?? RATE_LIMIT_CAPACITY) + (elapsed / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_CAPACITY
  );

  if (tokens < 1) {
    solutionRequestBuckets.set(clientKey, { tokens, updatedAt: now });
    return false;
  }

  if (!existing && solutionRequestBuckets.size >= MAX_RATE_LIMIT_CLIENTS) {
    const oldestClient = solutionRequestBuckets.keys().next().value;
    if (oldestClient) solutionRequestBuckets.delete(oldestClient);
  }
  solutionRequestBuckets.set(clientKey, { tokens: tokens - 1, updatedAt: now });
  return true;
}

export function resetSolutionRouteRateLimitForTest() {
  solutionRequestBuckets.clear();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!CHALLENGE_ID_PATTERN.test(id) || id.length > MAX_CHALLENGE_ID_LENGTH) {
    return response({ error: "Invalid challenge id" }, { status: 400 });
  }

  if (!takeRequestToken(getClientKey(request))) {
    return response(
      { error: "Too many solution requests. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": "6" } }
    );
  }

  const payload = await getChallengeSolutionPayload(id);
  if (!payload) {
    return response(
      { error: "No practice solution is available for this challenge." },
      { status: 404 }
    );
  }

  return response(payload);
}
