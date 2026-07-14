import type { TestCaseResult } from "@/lib/challenge-types";

/** Legacy `hidden` cases are inspectable browser tests, but get reduced failure detail. */
export function getTestCaseDisplayName(tc: TestCaseResult, index: number): string {
  return tc.hidden ? `Additional client-side test ${index + 1}` : tc.name;
}

/** Do not disclose expected or actual values for failed additional client-side tests. */
export function getAdditionalClientSideTestFailure(
  tc: TestCaseResult
): { errorClass?: string } | null {
  if (!tc.hidden || tc.passed) return null;

  const errorClass = tc.error?.match(/(?:^|:\s*)([A-Za-z][A-Za-z0-9]*Error|Exception)\b/)?.[1];
  return errorClass ? { errorClass } : {};
}
