import { describe, expect, it } from "vitest";
import { validatePracticeLadder } from "./practice-ladder-validation";

const validLadder = {
  schemaVersion: 1,
  contentVersion: "1.0.0",
  challengeId: "python-fibonacci",
  linkedTopicIds: ["python-fundamentals"],
  recall: { prompt: "p", options: ["a"], correctOption: 0, explanation: "e" },
  workedExample: { prompt: "p", code: "x", predictionOptions: ["a"], correctOption: 0, explanation: "e" },
  scaffold: { instructions: "i", starterCode: "x", testCases: [], feedback: "f" },
  hints: [
    { level: 1, title: "one", content: "one" },
    { level: 2, title: "two", content: "two" },
    { level: 3, title: "three", content: "three" }
  ],
  walkthrough: { approach: "a", steps: ["s"], commonMistakes: [], referenceSolution: "x" },
  transfer: { instructions: "i", starterCode: "x", testCases: [], feedback: "f" }
};

describe("validatePracticeLadder", () => {
  it("accepts a ladder with ordered three-level hints", () => {
    expect(validatePracticeLadder(validLadder, "content/practice-ladders/python-fibonacci.json")).toEqual([]);
  });

  it("reports a filename mismatch and invalid hint order", () => {
    const errors = validatePracticeLadder(
      { ...validLadder, challengeId: "other", hints: [{ level: 2, title: "bad", content: "bad" }] },
      "content/practice-ladders/python-fibonacci.json"
    );

    expect(errors).toContain("content/practice-ladders/python-fibonacci.json: challengeId must match filename 'python-fibonacci'");
    expect(errors).toContain("content/practice-ladders/python-fibonacci.json: hints must contain levels 1, 2, and 3 in order");
  });
});
