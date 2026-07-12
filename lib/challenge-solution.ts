import { getChallenge } from "./challenge";
import { getPracticeLadder } from "./practice-ladder";
import type { SolutionWalkthrough } from "./practice-ladder-types";

export type ChallengeSolutionPayload = {
  id: string;
  contentVersion?: string;
  solution: string;
  solutionWalkthrough?: SolutionWalkthrough;
};

export async function getChallengeSolutionPayload(
  challengeId: string
): Promise<ChallengeSolutionPayload | null> {
  const [challenge, ladder] = await Promise.all([
    getChallenge(challengeId, true),
    getPracticeLadder(challengeId),
  ]);
  if (!challenge?.solution) return null;

  if (ladder) {
    const { referenceSolution, ...solutionWalkthrough } = ladder.walkthrough;
    return {
      id: challengeId,
      contentVersion: ladder.contentVersion,
      solution: referenceSolution,
      solutionWalkthrough,
    };
  }

  return { id: challengeId, solution: challenge.solution };
}
