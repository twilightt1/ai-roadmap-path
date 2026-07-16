export function parseFeatureFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;

  switch (value.toLowerCase()) {
    case "true":
    case "1":
      return true;
    case "false":
    case "0":
      return false;
    default:
      throw new Error(`Invalid feature flag value: "${value}"`);
  }
}

export function validateFeatureFlagDependencies(flags: {
  lwwRemoteProgress: boolean;
  projectEvidence: boolean;
  projectReviewWorkflow: boolean;
  projectReviewQueuePagination: boolean;
}): void {
  if (flags.projectReviewWorkflow && (!flags.lwwRemoteProgress || !flags.projectEvidence)) {
    throw new Error(
      "NEXT_PUBLIC_P2_REVIEW_WORKFLOW requires NEXT_PUBLIC_P0_LWW_PROGRESS and NEXT_PUBLIC_P2_PROJECT_EVIDENCE"
    );
  }
  if (flags.projectReviewQueuePagination && !flags.projectReviewWorkflow) {
    throw new Error(
      "NEXT_PUBLIC_P2_REVIEW_QUEUE_PAGINATION requires NEXT_PUBLIC_P2_REVIEW_WORKFLOW"
    );
  }
}

const lwwRemoteProgress = parseFeatureFlag(process.env.NEXT_PUBLIC_P0_LWW_PROGRESS, false);
const projectEvidence = parseFeatureFlag(process.env.NEXT_PUBLIC_P2_PROJECT_EVIDENCE, false);
const projectReviewWorkflow = parseFeatureFlag(process.env.NEXT_PUBLIC_P2_REVIEW_WORKFLOW, false);
const projectReviewQueuePagination = parseFeatureFlag(
  process.env.NEXT_PUBLIC_P2_REVIEW_QUEUE_PAGINATION,
  false
);

validateFeatureFlagDependencies({
  lwwRemoteProgress,
  projectEvidence,
  projectReviewWorkflow,
  projectReviewQueuePagination,
});

export const featureFlags = {
  workerExecution: parseFeatureFlag(process.env.NEXT_PUBLIC_P0_WORKER_EXECUTION, true),
  lwwRemoteProgress,
  practiceLadder: parseFeatureFlag(process.env.NEXT_PUBLIC_P0_PRACTICE_LADDER, false),
  learningLoop: parseFeatureFlag(process.env.NEXT_PUBLIC_P1_LEARNING_LOOP, false),
  projectEvidence,
  projectReviewWorkflow,
  projectReviewQueuePagination,
} as const;
