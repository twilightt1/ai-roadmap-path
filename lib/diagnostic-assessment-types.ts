export const DIAGNOSTIC_ASSESSMENT_VERSION = "foundation-v1";

export type DiagnosticQuestion = {
  id: string;
  topicKey: string;
  phaseNumber: number;
  phaseSlug: string;
  phaseTitle: string;
  topicId: string;
  topicTitle: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
};
