import type { TestCase } from "./challenge-types";

export type RecallStep = {
  prompt: string;
  options: string[];
  correctOption: number;
  explanation: string;
};

export type WorkedExampleStep = {
  prompt: string;
  code: string;
  predictionOptions: string[];
  correctOption: number;
  explanation: string;
};

export type CodeExerciseStep = {
  instructions: string;
  starterCode: string;
  testCases: TestCase[];
  feedback: string;
};

export type PracticeHint = {
  level: 1 | 2 | 3;
  title: string;
  content: string;
};

export type SolutionWalkthrough = {
  approach: string;
  steps: string[];
  commonMistakes: string[];
  edgeCases?: string[];
  complexity?: string;
};

export type PracticeLadder = {
  schemaVersion: 1;
  contentVersion: string;
  challengeId: string;
  linkedTopicIds: string[];
  prerequisiteTopicIds?: string[];
  recall: RecallStep;
  workedExample: WorkedExampleStep;
  scaffold: CodeExerciseStep;
  hints: [PracticeHint, PracticeHint, PracticeHint];
  walkthrough: SolutionWalkthrough & { referenceSolution: string };
  transfer: CodeExerciseStep;
};

export type LearnerSafePracticeLadder = Omit<PracticeLadder, "walkthrough"> & {
  walkthroughAvailable: true;
};
