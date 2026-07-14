import type {
  ChallengeCategory,
  ChallengeDifficulty,
  CompareMode,
} from "./challenge-types";

const DIFFICULTIES: ChallengeDifficulty[] = ["easy", "medium", "hard"];
const CATEGORIES: ChallengeCategory[] = ["numpy", "pandas", "python", "ml"];
const COMPARES: CompareMode[] = ["exact", "approx", "np_array", "pd_frame", "pd_series"];

export function validateChallenge(value: unknown, filePath: string): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [`${filePath}: expected an object`];
  }

  const challenge = value as Record<string, unknown>;
  const filename = filePath.split(/[\\/]/).pop()?.replace(/\.json$/, "") ?? "";
  if (typeof challenge.id !== "string" || !challenge.id) {
    errors.push(`${filePath}: id must be a non-empty string`);
  } else if (challenge.id !== filename) {
    errors.push(`${filePath}: id must match filename '${filename}'`);
  }
  if (typeof challenge.title !== "string") errors.push(`${filePath}: title must be a string`);
  if (!DIFFICULTIES.includes(challenge.difficulty as ChallengeDifficulty)) {
    errors.push(`${filePath}: difficulty is invalid`);
  }
  if (!CATEGORIES.includes(challenge.category as ChallengeCategory)) {
    errors.push(`${filePath}: category is invalid`);
  }
  if (!Array.isArray(challenge.tags) || !challenge.tags.every((tag) => typeof tag === "string")) {
    errors.push(`${filePath}: tags must be an array of strings`);
  }
  if (typeof challenge.description !== "string") errors.push(`${filePath}: description must be a string`);
  if (typeof challenge.starterCode !== "string") errors.push(`${filePath}: starterCode must be a string`);
  if (!Array.isArray(challenge.testCases) || challenge.testCases.length === 0) {
    errors.push(`${filePath}: testCases must be a non-empty array`);
  } else {
    for (const [index, testCase] of challenge.testCases.entries()) {
      if (!testCase || typeof testCase !== "object" || Array.isArray(testCase)) {
        errors.push(`${filePath}: testCases[${index}] must be an object`);
        continue;
      }
      const test = testCase as Record<string, unknown>;
      if (typeof test.name !== "string") errors.push(`${filePath}: testCases[${index}].name must be a string`);
      if (typeof test.call !== "string") errors.push(`${filePath}: testCases[${index}].call must be a string`);
      if (typeof test.expected !== "string") errors.push(`${filePath}: testCases[${index}].expected must be a string`);
      if (!COMPARES.includes(test.compare as CompareMode)) {
        errors.push(`${filePath}: testCases[${index}].compare is invalid`);
      }
      if (test.hidden !== undefined && typeof test.hidden !== "boolean") {
        errors.push(`${filePath}: testCases[${index}].hidden must be a boolean`);
      }
    }
  }

  return errors;
}
