import { describe, expect, it } from "vitest";
import { parseFeatureFlag, validateFeatureFlagDependencies } from "./feature-flags";

describe("parseFeatureFlag", () => {
  it("uses the supplied default when unset", () => {
    expect(parseFeatureFlag(undefined, false)).toBe(false);
    expect(parseFeatureFlag(undefined, true)).toBe(true);
  });

  it.each([
    ["true", true],
    ["TRUE", true],
    ["1", true],
    ["false", false],
    ["FALSE", false],
    ["0", false],
  ])("parses %s as %s", (value, expected) => {
    expect(parseFeatureFlag(value, !expected)).toBe(expected);
  });

  it("rejects invalid values instead of silently enabling a capability", () => {
    expect(() => parseFeatureFlag("maybe", false)).toThrow('Invalid feature flag value: "maybe"');
  });

  it("rejects P2.1 review without both synced progress and P2 evidence", () => {
    expect(() => validateFeatureFlagDependencies({
      lwwRemoteProgress: false,
      projectEvidence: true,
      projectReviewWorkflow: true,
    })).toThrow("requires NEXT_PUBLIC_P0_LWW_PROGRESS");
    expect(() => validateFeatureFlagDependencies({
      lwwRemoteProgress: true,
      projectEvidence: false,
      projectReviewWorkflow: true,
    })).toThrow("requires NEXT_PUBLIC_P0_LWW_PROGRESS");
    expect(() => validateFeatureFlagDependencies({
      lwwRemoteProgress: true,
      projectEvidence: true,
      projectReviewWorkflow: true,
    })).not.toThrow();
  });
});
