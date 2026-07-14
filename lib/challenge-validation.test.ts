import { describe, expect, it } from "vitest";
import { validateChallenge } from "./challenge-validation";

describe("validateChallenge", () => {
  it("reports a filename mismatch and invalid hidden flag", () => {
    const errors = validateChallenge(
      {
        id: "different-id",
        title: "Example",
        difficulty: "easy",
        category: "python",
        tags: ["python"],
        description: "Example",
        starterCode: "def solve(): pass",
        testCases: [
          { name: "case", call: "solve()", expected: "1", compare: "exact", hidden: "no" },
        ],
      },
      "content/challenges/example.json"
    );

    expect(errors).toContain("content/challenges/example.json: id must match filename 'example'");
    expect(errors).toContain("content/challenges/example.json: testCases[0].hidden must be a boolean");
  });

  it("accepts a valid minimal challenge", () => {
    expect(
      validateChallenge(
        {
          id: "example",
          title: "Example",
          difficulty: "easy",
          category: "python",
          tags: ["python"],
          description: "Example",
          starterCode: "def solve(): pass",
          testCases: [{ name: "case", call: "solve()", expected: "1", compare: "exact" }],
        },
        "content/challenges/example.json"
      )
    ).toEqual([]);
  });
});
