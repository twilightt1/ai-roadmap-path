import { describe, expect, it } from "vitest";
import { createPracticeEvent } from "./practice-events";

describe("practice events", () => {
  it("creates a privacy-safe challenge submit event", () => {
    const event = createPracticeEvent(
      {
        challengeId: "python-fibonacci",
        contentVersion: null,
        origin: "authenticated",
        eventType: "submit",
        step: "independent_challenge",
        passed: false,
      },
      {
        now: () => "2026-07-11T12:00:00.000Z",
        createId: () => "00000000-0000-4000-8000-000000000001",
      }
    );

    expect(event).toEqual({
      eventId: "00000000-0000-4000-8000-000000000001",
      challengeId: "python-fibonacci",
      contentVersion: null,
      origin: "authenticated",
      eventType: "submit",
      step: "independent_challenge",
      hintLevel: null,
      passed: false,
      occurredAt: "2026-07-11T12:00:00.000Z",
    });
    expect(Object.keys(event)).not.toContain("code");
    expect(Object.keys(event)).not.toContain("stdout");
  });

  it("rejects unsupported event fields by only accepting the event input contract", () => {
    expect(() =>
      createPracticeEvent({ challengeId: "python-fibonacci", eventType: "unknown" } as never)
    ).toThrow("Unsupported practice event type");
  });
});
