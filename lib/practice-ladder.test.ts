import { describe, expect, it } from "vitest";
import { toLearnerSafePracticeLadder } from "./practice-ladder";
import type { PracticeLadder } from "./practice-ladder-types";

const ladder: PracticeLadder = {
  schemaVersion: 1,
  contentVersion: "1.0.0",
  challengeId: "python-fibonacci",
  linkedTopicIds: ["python-fundamentals"],
  recall: { prompt: "p", options: ["a"], correctOption: 0, explanation: "e" },
  workedExample: {
    prompt: "p",
    code: "print(1)",
    predictionOptions: ["1"],
    correctOption: 0,
    explanation: "e",
  },
  scaffold: { instructions: "i", starterCode: "", testCases: [], feedback: "f" },
  hints: [
    { level: 1, title: "one", content: "one" },
    { level: 2, title: "two", content: "two" },
    { level: 3, title: "three", content: "three" },
  ],
  walkthrough: {
    approach: "approach",
    steps: ["step"],
    commonMistakes: [],
    referenceSolution: "secret solution",
  },
  transfer: { instructions: "i", starterCode: "", testCases: [], feedback: "f" },
};

describe("learner-safe practice ladder", () => {
  it("omits walkthrough and reference solution from the initial learner payload", () => {
    const safe = toLearnerSafePracticeLadder(ladder);

    expect(safe).toMatchObject({ challengeId: "python-fibonacci", walkthroughAvailable: true });
    expect(safe).not.toHaveProperty("walkthrough");
    expect(JSON.stringify(safe)).not.toContain("secret solution");
  });
});
