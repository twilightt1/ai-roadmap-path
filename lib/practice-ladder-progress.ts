import type { PracticeEvent } from "./practice-events";

export type PracticeIndependenceLevel =
  | "not_passed"
  | "strict_independent"
  | "independent"
  | "assisted"
  | "guided";

export type PracticeLadderProgress = {
  runCount: number;
  submitCount: number;
  highestHintOpened: 0 | 1 | 2 | 3;
  walkthroughUnlocked: boolean;
  walkthroughOpened: boolean;
  challengePassed: boolean;
  transferPassed: boolean;
  independenceLevel: PracticeIndependenceLevel;
};

export function derivePracticeLadderProgress(events: PracticeEvent[]): PracticeLadderProgress {
  const uniqueEvents = new Map(events.map((event) => [event.eventId, event]));
  const values = [...uniqueEvents.values()];
  const runCount = values.filter((event) => event.eventType === "run").length;
  const submitCount = values.filter((event) => event.eventType === "submit").length;
  const highestHintOpened = values.reduce<0 | 1 | 2 | 3>((highest, event) => {
    if (event.eventType !== "hint_opened" || event.hintLevel === null) return highest;
    return Math.max(highest, event.hintLevel) as 0 | 1 | 2 | 3;
  }, 0);
  const challengePassed = values.some(
    (event) => event.eventType === "challenge_passed" && event.passed === true
  );
  const walkthroughOpened = values.some((event) => event.eventType === "walkthrough_opened");
  const transferPassed = values.some(
    (event) => event.eventType === "transfer_passed" && event.passed === true
  );
  const walkthroughUnlocked = challengePassed || submitCount >= 3;

  let independenceLevel: PracticeIndependenceLevel = "not_passed";
  if (challengePassed) {
    if (walkthroughOpened || highestHintOpened === 3) independenceLevel = "guided";
    else if (highestHintOpened === 0) independenceLevel = "strict_independent";
    else if (highestHintOpened <= 2) independenceLevel = "assisted";
    else independenceLevel = "independent";
  }

  return {
    runCount,
    submitCount,
    highestHintOpened,
    walkthroughUnlocked,
    walkthroughOpened,
    challengePassed,
    transferPassed,
    independenceLevel,
  };
}
