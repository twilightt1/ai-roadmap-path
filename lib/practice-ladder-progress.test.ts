import { describe, expect, it } from "vitest";
import { derivePracticeLadderProgress } from "./practice-ladder-progress";
import type { PracticeEvent } from "./practice-events";

function event(overrides: Partial<PracticeEvent>): PracticeEvent {
  return {
    eventId: crypto.randomUUID(),
    challengeId: "python-fibonacci",
    contentVersion: "1.0.0",
    origin: "authenticated",
    eventType: "challenge_started",
    step: "independent_challenge",
    hintLevel: null,
    passed: null,
    occurredAt: "2026-07-11T12:00:00.000Z",
    ...overrides,
  };
}

describe("practice ladder progress", () => {
  it("deduplicates events and classifies a strict independent pass", () => {
    const started = event({ eventId: "00000000-0000-4000-8000-000000000001" });
    const submitted = event({
      eventId: "00000000-0000-4000-8000-000000000002",
      eventType: "submit",
      passed: true,
    });
    const passed = event({
      eventId: "00000000-0000-4000-8000-000000000003",
      eventType: "challenge_passed",
      passed: true,
    });

    const progress = derivePracticeLadderProgress([started, submitted, submitted, passed]);

    expect(progress.submitCount).toBe(1);
    expect(progress.highestHintOpened).toBe(0);
    expect(progress.independenceLevel).toBe("strict_independent");
    expect(progress.walkthroughUnlocked).toBe(true);
  });

  it("classifies a pass after hint two as assisted", () => {
    const progress = derivePracticeLadderProgress([
      event({ eventId: "00000000-0000-4000-8000-000000000004" }),
      event({
        eventId: "00000000-0000-4000-8000-000000000005",
        eventType: "hint_opened",
        hintLevel: 2,
      }),
      event({
        eventId: "00000000-0000-4000-8000-000000000006",
        eventType: "challenge_passed",
        passed: true,
      }),
    ]);

    expect(progress.independenceLevel).toBe("assisted");
  });

  it("unlocks walkthrough after three failed submit events", () => {
    const progress = derivePracticeLadderProgress([
      event({ eventId: "00000000-0000-4000-8000-000000000007", eventType: "submit", passed: false }),
      event({ eventId: "00000000-0000-4000-8000-000000000008", eventType: "submit", passed: false }),
      event({ eventId: "00000000-0000-4000-8000-000000000009", eventType: "submit", passed: false }),
    ]);

    expect(progress.submitCount).toBe(3);
    expect(progress.walkthroughUnlocked).toBe(true);
    expect(progress.independenceLevel).toBe("not_passed");
  });
});
