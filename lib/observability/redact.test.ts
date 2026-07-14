import { describe, expect, it } from "vitest";

import { redactMetadata } from "./redact";

describe("redactMetadata", () => {
  it("keeps only scalar non-sensitive metadata", () => {
    expect(
      redactMetadata({
        requestId: "r1",
        durationMs: 42,
        status: "executing",
        context: { nested: true },
        labels: ["runner"],
        unapproved: "drop me",
      })
    ).toEqual({
      requestId: "r1",
      durationMs: 42,
      status: "executing",
    });
  });

  it("removes credentials and raw learner content fields", () => {
    expect(
      redactMetadata({
        password: "secret",
        token: "secret",
        cookie: "session=secret",
        authorization: "Bearer secret",
        code: "print(1)",
        answers: "the answer",
        note: "private note",
        snippet: "private snippet",
        source: "raw source",
        output: "raw output",
        userId: "learner-id",
        email: "learner@example.com",
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "secret",
        serviceRoleKey: "secret",
        requestId: "r1",
      })
    ).toEqual({ requestId: "r1" });
  });
});
