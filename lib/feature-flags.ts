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

export const featureFlags = {
  workerExecution: parseFeatureFlag(process.env.NEXT_PUBLIC_P0_WORKER_EXECUTION, true),
  lwwRemoteProgress: parseFeatureFlag(process.env.NEXT_PUBLIC_P0_LWW_PROGRESS, false),
  practiceLadder: parseFeatureFlag(process.env.NEXT_PUBLIC_P0_PRACTICE_LADDER, false),
  learningLoop: parseFeatureFlag(process.env.NEXT_PUBLIC_P1_LEARNING_LOOP, false),
  projectEvidence: parseFeatureFlag(process.env.NEXT_PUBLIC_P2_PROJECT_EVIDENCE, false),
} as const;
