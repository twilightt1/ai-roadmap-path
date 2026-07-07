import type { ChallengeResult } from "./challenge-types";
import type { QuizResult, StoreState } from "./progress-types";

function earliestIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}

function latestIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function quizRatio(result: QuizResult): number {
  return result.total === 0 ? 0 : result.score / result.total;
}

function mergeQuizResult(local: QuizResult, remote: QuizResult): QuizResult {
  const localRatio = quizRatio(local);
  const remoteRatio = quizRatio(remote);
  let best = remote;

  if (localRatio > remoteRatio) {
    best = local;
  } else if (localRatio === remoteRatio) {
    if (local.score > remote.score) {
      best = local;
    } else if (local.score === remote.score && local.total > remote.total) {
      best = local;
    }
  }

  return {
    score: best.score,
    total: best.total,
    passedAt: earliestIso(local.passedAt, remote.passedAt),
    attempts: Math.max(local.attempts, remote.attempts),
  };
}

function mergeChallengeResult(local: ChallengeResult, remote: ChallengeResult): ChallengeResult {
  return {
    solvedAt: earliestIso(local.solvedAt, remote.solvedAt),
    attempts: Math.max(local.attempts, remote.attempts),
    // ChallengeResult does not include a last-attempt timestamp yet, so ties cannot
    // be ordered chronologically. Use a stable deterministic fallback: keep the
    // remote lastPassed value because remote is the current synced source.
    lastPassed: remote.lastPassed,
  };
}

export function mergeProgressStates(local: StoreState, remote: StoreState): StoreState {
  const quizResults = new Map(remote.quizResults);
  for (const [key, localResult] of local.quizResults) {
    const remoteResult = quizResults.get(key);
    quizResults.set(key, remoteResult ? mergeQuizResult(localResult, remoteResult) : localResult);
  }

  const challengeResults = new Map(remote.challengeResults);
  for (const [key, localResult] of local.challengeResults) {
    const remoteResult = challengeResults.get(key);
    challengeResults.set(
      key,
      remoteResult ? mergeChallengeResult(localResult, remoteResult) : localResult
    );
  }

  return {
    completed: new Set([...remote.completed, ...local.completed]),
    projectFeatures: new Set([...remote.projectFeatures, ...local.projectFeatures]),
    quizResults,
    challengeResults,
    startedAt: earliestIso(local.startedAt, remote.startedAt),
    lastVisit: latestIso(local.lastVisit, remote.lastVisit),
  };
}
