import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { validateChallenge } from "../lib/challenge-validation";
import { validatePracticeLadder } from "../lib/practice-ladder-validation";

async function main() {
  const challengesDir = path.join(process.cwd(), "content", "challenges");
  const files = (await readdir(challengesDir)).filter((file) => file.endsWith(".json"));
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const file of files) {
    const relativePath = path.join("content", "challenges", file);
    try {
      const parsed = JSON.parse(await readFile(path.join(challengesDir, file), "utf-8")) as unknown;
      errors.push(...validateChallenge(parsed, relativePath));
      const id = (parsed as { id?: unknown }).id;
      if (typeof id === "string") {
        if (ids.has(id)) errors.push(`${relativePath}: duplicate challenge id '${id}'`);
        ids.add(id);
      }
    } catch (error) {
      errors.push(`${relativePath}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  const laddersDir = path.join(process.cwd(), "content", "practice-ladders");
  const ladderFiles = (await readdir(laddersDir)).filter((file) => file.endsWith(".json"));
  for (const file of ladderFiles) {
    const relativePath = path.join("content", "practice-ladders", file);
    try {
      const parsed = JSON.parse(await readFile(path.join(laddersDir, file), "utf-8")) as unknown;
      errors.push(...validatePracticeLadder(parsed, relativePath));
      const challengeId = (parsed as { challengeId?: unknown }).challengeId;
      if (typeof challengeId === "string" && !ids.has(challengeId)) {
        errors.push(`${relativePath}: challengeId '${challengeId}' has no matching challenge`);
      }
    } catch (error) {
      errors.push(`${relativePath}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
    return;
  }

  console.log(`Validated ${files.length} challenge files and ${ladderFiles.length} practice ladders.`);
}

void main();
