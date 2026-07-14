export function validatePracticeLadder(value: unknown, filePath: string): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return [`${filePath}: expected an object`];
  const ladder = value as Record<string, unknown>;
  const filename = filePath.split(/[\\/]/).pop()?.replace(/\.json$/, "") ?? "";

  if (ladder.schemaVersion !== 1) errors.push(`${filePath}: schemaVersion must be 1`);
  if (typeof ladder.contentVersion !== "string" || !ladder.contentVersion) {
    errors.push(`${filePath}: contentVersion must be a non-empty string`);
  }
  if (typeof ladder.challengeId !== "string" || !ladder.challengeId) {
    errors.push(`${filePath}: challengeId must be a non-empty string`);
  } else if (ladder.challengeId !== filename) {
    errors.push(`${filePath}: challengeId must match filename '${filename}'`);
  }
  if (!Array.isArray(ladder.linkedTopicIds) || !ladder.linkedTopicIds.every((id) => typeof id === "string")) {
    errors.push(`${filePath}: linkedTopicIds must be an array of strings`);
  }

  const hints = ladder.hints;
  if (
    !Array.isArray(hints) ||
    hints.length !== 3 ||
    !hints.every(
      (hint, index) =>
        hint &&
        typeof hint === "object" &&
        (hint as Record<string, unknown>).level === index + 1 &&
        typeof (hint as Record<string, unknown>).title === "string" &&
        typeof (hint as Record<string, unknown>).content === "string"
    )
  ) {
    errors.push(`${filePath}: hints must contain levels 1, 2, and 3 in order`);
  }

  const walkthrough = ladder.walkthrough as Record<string, unknown> | undefined;
  if (
    !walkthrough ||
    typeof walkthrough.approach !== "string" ||
    !Array.isArray(walkthrough.steps) ||
    !walkthrough.steps.every((step) => typeof step === "string") ||
    !Array.isArray(walkthrough.commonMistakes) ||
    !walkthrough.commonMistakes.every((mistake) => typeof mistake === "string") ||
    typeof walkthrough.referenceSolution !== "string"
  ) {
    errors.push(`${filePath}: walkthrough is incomplete`);
  }

  for (const stepName of ["recall", "workedExample", "scaffold", "transfer"]) {
    if (!ladder[stepName]) errors.push(`${filePath}: ${stepName} is required`);
  }
  return errors;
}
