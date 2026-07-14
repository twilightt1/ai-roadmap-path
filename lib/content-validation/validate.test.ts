import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildContentInventory } from "./inventory";
import { validateContentInventory } from "./validate";

const directories: string[] = [];

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "content-validation-"));
  directories.push(root);

  await Promise.all(
    Object.entries(files).map(async ([file, content]) => {
      const target = path.join(root, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    })
  );

  return root;
}

const validChallenge = (id: string) =>
  JSON.stringify({
    id,
    title: "Example",
    difficulty: "easy",
    category: "python",
    tags: ["python"],
    description: "Example",
    starterCode: "def solve(): pass",
    testCases: [{ name: "visible", call: "solve()", expected: "1", compare: "exact" }],
  });

const validLadder = (challengeId: string) =>
  JSON.stringify({
    schemaVersion: 1,
    contentVersion: "1.0.0",
    challengeId,
    linkedTopicIds: ["topic-a"],
    recall: {},
    workedExample: {},
    scaffold: {},
    hints: [
      { level: 1, title: "one", content: "one" },
      { level: 2, title: "two", content: "two" },
      { level: 3, title: "three", content: "three" },
    ],
    walkthrough: { approach: "a", steps: [], commonMistakes: [], referenceSolution: "x" },
    transfer: {},
  });

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("content inventory validation", () => {
  it("reports content integrity and cross-reference failures from an isolated fixture", async () => {
    const root = await fixture({
      "content/phase-1/topic-a.mdx": "# A",
      "content/phase-1/orphan.mdx": "# Orphan",
      "content/quizzes/topic-a.json": JSON.stringify({ questions: [{ id: "q", prompt: "?", options: ["a"], answerIndex: 1 }] }),
      "content/quizzes/orphan.json": JSON.stringify({ questions: [] }),
      "content/challenges/one.json": validChallenge("duplicate"),
      "content/challenges/two.json": validChallenge("duplicate"),
      "content/challenges/all-hidden.json": JSON.stringify({
        ...JSON.parse(validChallenge("all-hidden")),
        testCases: [{ name: "hidden", call: "solve()", expected: "1", compare: "exact", hidden: true }],
      }),
      "content/practice-ladders/missing-challenge.json": validLadder("missing-challenge"),
    });

    const inventory = await buildContentInventory(root, { topicIds: ["topic-a", "topic-b"] });
    const issues = await validateContentInventory(inventory);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATE_ID" }),
        expect.objectContaining({ code: "FILENAME_ID_MISMATCH" }),
        expect.objectContaining({ code: "MISSING_LESSON", file: "topic-b" }),
        expect.objectContaining({ code: "MISSING_QUIZ", file: "topic-b" }),
        expect.objectContaining({ code: "INVALID_ANSWER_INDEX" }),
        expect.objectContaining({ code: "ORPHAN_CONTENT" }),
        expect.objectContaining({ code: "MISSING_VISIBLE_TEST" }),
        expect.objectContaining({ code: "BROKEN_LADDER_REFERENCE" }),
      ])
    );
  });

  it("compiles every lesson and reports invalid MDX", async () => {
    const root = await fixture({
      "content/phase-1/topic-a.mdx": "{",
      "content/quizzes/topic-a.json": JSON.stringify({ questions: [] }),
    });

    const inventory = await buildContentInventory(root, { topicIds: ["topic-a"] });
    const issues = await validateContentInventory(inventory);

    expect(issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "MDX_COMPILE_FAILED" })]));
  });
});
