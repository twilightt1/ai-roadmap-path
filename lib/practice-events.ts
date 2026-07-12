export type PracticeLadderStep =
  | "recall"
  | "worked_example"
  | "scaffold"
  | "independent_challenge"
  | "transfer";

export type PracticeEventType =
  | "challenge_started"
  | "step_viewed"
  | "step_completed"
  | "run"
  | "submit"
  | "hint_opened"
  | "walkthrough_opened"
  | "challenge_passed"
  | "transfer_passed";

export type PracticeEvent = {
  eventId: string;
  challengeId: string;
  contentVersion: string | null;
  origin: "anonymous" | "authenticated";
  eventType: PracticeEventType;
  step: PracticeLadderStep | null;
  hintLevel: 0 | 1 | 2 | 3 | null;
  passed: boolean | null;
  occurredAt: string;
};

type CreatePracticeEventInput = {
  challengeId: string;
  contentVersion?: string | null;
  origin?: "anonymous" | "authenticated";
  eventType: PracticeEventType;
  step?: PracticeLadderStep | null;
  hintLevel?: 0 | 1 | 2 | 3 | null;
  passed?: boolean | null;
};

type EventDependencies = {
  now?: () => string;
  createId?: () => string;
};

const EVENT_TYPES: PracticeEventType[] = [
  "challenge_started",
  "step_viewed",
  "step_completed",
  "run",
  "submit",
  "hint_opened",
  "walkthrough_opened",
  "challenge_passed",
  "transfer_passed",
];

export function createPracticeEvent(
  input: CreatePracticeEventInput,
  dependencies: EventDependencies = {}
): PracticeEvent {
  if (!EVENT_TYPES.includes(input.eventType)) {
    throw new Error("Unsupported practice event type");
  }
  if (!input.challengeId.trim()) {
    throw new Error("A challenge id is required");
  }

  const now = dependencies.now ?? (() => new Date().toISOString());
  const createId = dependencies.createId ?? (() => crypto.randomUUID());
  return {
    eventId: createId(),
    challengeId: input.challengeId,
    contentVersion: input.contentVersion ?? null,
    origin: input.origin ?? "anonymous",
    eventType: input.eventType,
    step: input.step ?? null,
    hintLevel: input.hintLevel ?? null,
    passed: input.passed ?? null,
    occurredAt: now(),
  };
}
