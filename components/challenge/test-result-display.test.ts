import { describe, expect, it } from "vitest";
import {
  getAdditionalClientSideTestFailure,
  getTestCaseDisplayName,
} from "./test-result-display";

describe("additional client-side test display", () => {
  it("renames legacy hidden tests without describing them as secret", () => {
    expect(
      getTestCaseDisplayName({ name: "legacy edge case", passed: false, hidden: true }, 2)
    ).toBe("Additional client-side test 3");
  });

  it("shows only an error class for a failed additional client-side test", () => {
    expect(
      getAdditionalClientSideTestFailure({
        name: "legacy edge case",
        passed: false,
        hidden: true,
        actual: "learner output",
        expected: "answer key",
        error: "Traceback (most recent call last): TypeError: unsupported operand type",
      })
    ).toEqual({ errorClass: "TypeError" });
  });

  it("does not create a restricted failure payload for visible tests", () => {
    expect(
      getAdditionalClientSideTestFailure({
        name: "Example",
        passed: false,
        actual: "1",
        expected: "2",
      })
    ).toBeNull();
  });
});
