import { describe, expect, it } from "vitest";
import { getChallengeSolutionPayload } from "./challenge-solution";

describe("challenge solution payload", () => {
  it("returns only the solution-focused fields for an existing challenge", async () => {
    const payload = await getChallengeSolutionPayload("python-fibonacci");

    expect(payload).toMatchObject({
      id: "python-fibonacci",
      solution: expect.stringContaining("def solve"),
    });
    expect(payload).not.toHaveProperty("testCases");
    expect(payload).not.toHaveProperty("starterCode");
  });

  it("returns null for a missing challenge", async () => {
    await expect(getChallengeSolutionPayload("missing")).resolves.toBeNull();
  });
});
