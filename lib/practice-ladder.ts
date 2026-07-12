import { promises as fs } from "node:fs";
import path from "node:path";
import type { LearnerSafePracticeLadder, PracticeLadder } from "./practice-ladder-types";

const laddersDirectory = path.join(process.cwd(), "content", "practice-ladders");

export function toLearnerSafePracticeLadder(ladder: PracticeLadder): LearnerSafePracticeLadder {
  const safe = { ...ladder } as Partial<PracticeLadder>;
  delete safe.walkthrough;
  return { ...(safe as Omit<PracticeLadder, "walkthrough">), walkthroughAvailable: true };
}

export async function getPracticeLadder(challengeId: string): Promise<PracticeLadder | null> {
  try {
    const raw = await fs.readFile(path.join(laddersDirectory, `${challengeId}.json`), "utf-8");
    return JSON.parse(raw) as PracticeLadder;
  } catch {
    return null;
  }
}

export async function getLearnerSafePracticeLadder(
  challengeId: string
): Promise<LearnerSafePracticeLadder | null> {
  const ladder = await getPracticeLadder(challengeId);
  return ladder ? toLearnerSafePracticeLadder(ladder) : null;
}
