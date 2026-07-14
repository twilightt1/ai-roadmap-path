import { validateChallenge } from "../challenge-validation";
import { validatePracticeLadder } from "../practice-ladder-validation";
import type { ContentFile, ContentInventory, ContentValidationIssue } from "./types";

function issue(code: ContentValidationIssue["code"], file: string, message: string): ContentValidationIssue {
  return { code, file, message };
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function parseError(value: unknown): string | undefined {
  const record = object(value);
  return typeof record?.__parseError === "string" ? record.__parseError : undefined;
}

function duplicateIds(files: ContentFile[], kind: string): ContentValidationIssue[] {
  const seen = new Map<string, string>();
  const issues: ContentValidationIssue[] = [];
  for (const content of files) {
    const record = object(content.value);
    const id = typeof record?.id === "string" ? record.id : typeof record?.challengeId === "string" ? record.challengeId : undefined;
    if (!id) continue;
    const existing = seen.get(id);
    if (existing) issues.push(issue("DUPLICATE_ID", content.file, `duplicate ${kind} id '${id}' (also in ${existing})`));
    else seen.set(id, content.file);
  }
  return issues;
}

function validateQuiz(quiz: ContentFile): ContentValidationIssue[] {
  const record = object(quiz.value);
  if (!record || !Array.isArray(record.questions)) return [issue("INVALID_CHALLENGE", quiz.file, "quiz must contain a questions array")];
  return record.questions.flatMap((question, index) => {
    const value = object(question);
    const options = value?.options;
    const answerIndex = value?.answerIndex;
    return Array.isArray(options) && typeof answerIndex === "number" && Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < options.length
      ? []
      : [issue("INVALID_ANSWER_INDEX", quiz.file, `questions[${index}].answerIndex must reference an option`)];
  });
}

function challengeIssues(challenge: ContentFile): ContentValidationIssue[] {
  const parseFailure = parseError(challenge.value);
  if (parseFailure) return [issue("INVALID_CHALLENGE", challenge.file, `invalid JSON (${parseFailure})`)];
  const errors = validateChallenge(challenge.value, challenge.file);
  const issues = errors.map((message) => issue(
    message.includes("id must match filename") ? "FILENAME_ID_MISMATCH" : "INVALID_CHALLENGE",
    challenge.file,
    message
  ));
  const tests = object(challenge.value)?.testCases;
  if (Array.isArray(tests) && !tests.some((test) => object(test)?.hidden !== true)) {
    issues.push(issue("MISSING_VISIBLE_TEST", challenge.file, "challenge must include at least one visible test"));
  }
  return issues;
}

function ladderIssues(ladder: ContentFile, challengeIds: Set<string>): ContentValidationIssue[] {
  const parseFailure = parseError(ladder.value);
  if (parseFailure) return [issue("INVALID_LADDER", ladder.file, `invalid JSON (${parseFailure})`)];
  const errors = validatePracticeLadder(ladder.value, ladder.file);
  const issues = errors.map((message) => issue(
    message.includes("challengeId must match filename") ? "FILENAME_ID_MISMATCH" : "INVALID_LADDER",
    ladder.file,
    message
  ));
  const challengeId = object(ladder.value)?.challengeId;
  if (typeof challengeId === "string" && !challengeIds.has(challengeId)) {
    issues.push(issue("BROKEN_LADDER_REFERENCE", ladder.file, `challengeId '${challengeId}' has no matching challenge`));
  }
  return issues;
}

async function mdxIssues(inventory: ContentInventory): Promise<ContentValidationIssue[]> {
  const { compile } = await import("@mdx-js/mdx");
  const results = await Promise.all(inventory.lessons.map(async (lesson) => {
    try {
      await compile(lesson.value, { format: "mdx" });
      return [];
    } catch (error) {
      return [issue("MDX_COMPILE_FAILED", lesson.file, error instanceof Error ? error.message : String(error))];
    }
  }));
  return results.flat();
}

export async function validateContentInventory(inventory: ContentInventory): Promise<ContentValidationIssue[]> {
  const issues: ContentValidationIssue[] = [];
  const lessonIds = new Set(inventory.lessons.map((lesson) => lesson.id));
  const quizIds = new Set(inventory.quizzes.map((quiz) => quiz.id));
  const topicIds = new Set(inventory.topicIds);

  for (const topicId of inventory.topicIds) {
    if (!lessonIds.has(topicId)) issues.push(issue("MISSING_LESSON", topicId, `roadmap topic '${topicId}' has no MDX lesson`));
    if (!quizIds.has(topicId)) issues.push(issue("MISSING_QUIZ", topicId, `roadmap topic '${topicId}' has no quiz`));
  }
  for (const lesson of inventory.lessons) {
    if (!topicIds.has(lesson.id)) issues.push(issue("ORPHAN_CONTENT", lesson.file, `lesson '${lesson.id}' is not a roadmap topic`));
  }
  for (const quiz of inventory.quizzes) {
    if (!topicIds.has(quiz.id)) issues.push(issue("ORPHAN_CONTENT", quiz.file, `quiz '${quiz.id}' is not a roadmap topic`));
    issues.push(...validateQuiz(quiz));
  }

  issues.push(...duplicateIds(inventory.challenges, "challenge"));
  issues.push(...duplicateIds(inventory.ladders, "ladder"));
  for (const challenge of inventory.challenges) issues.push(...challengeIssues(challenge));
  const challengeIds = new Set(inventory.challenges.flatMap((challenge) => {
    const id = object(challenge.value)?.id;
    return typeof id === "string" ? [id] : [];
  }));
  for (const ladder of inventory.ladders) issues.push(...ladderIssues(ladder, challengeIds));
  issues.push(...await mdxIssues(inventory));

  return issues;
}

export function formatContentIssue(contentIssue: ContentValidationIssue): string {
  return `[${contentIssue.code}] ${contentIssue.file}: ${contentIssue.message}`;
}

export function formatContentSummary(inventory: ContentInventory): string {
  return `Validated ${inventory.lessons.length} lessons, ${inventory.quizzes.length} quizzes, ${inventory.challenges.length} challenge files, and ${inventory.ladders.length} practice ladders.`;
}
