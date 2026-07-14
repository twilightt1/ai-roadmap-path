import { phases } from "./roadmap-data";
import { getQuiz } from "./quiz";
import { topicKey } from "./progress-types";
import {
  DIAGNOSTIC_ASSESSMENT_VERSION,
  type DiagnosticQuestion,
} from "./diagnostic-assessment-types";

const DIAGNOSTIC_TOPICS = [
  { phaseSlug: "phase-0-mindset", topicId: "what-is-ai-engineer" },
  { phaseSlug: "phase-1-programming", topicId: "python-fundamentals" },
  { phaseSlug: "phase-1-programming", topicId: "async-python" },
  { phaseSlug: "phase-2-math", topicId: "linear-algebra" },
  { phaseSlug: "phase-3-ml-fundamentals", topicId: "core-ml-concepts" },
  { phaseSlug: "phase-4-deep-learning", topicId: "nn-fundamentals" },
  { phaseSlug: "phase-6-llm-engineering", topicId: "prompt-engineering" },
  { phaseSlug: "phase-8-rag-vector-db", topicId: "why-rag" },
] as const;

export async function getDiagnosticAssessment(): Promise<{
  version: typeof DIAGNOSTIC_ASSESSMENT_VERSION;
  questions: DiagnosticQuestion[];
}> {
  const questions = await Promise.all(DIAGNOSTIC_TOPICS.map(async (entry, index) => {
    const phase = phases.find((candidate) => candidate.slug === entry.phaseSlug);
    const topic = phase?.topics.find((candidate) => candidate.id === entry.topicId);
    if (!phase || !topic) {
      throw new Error(`Diagnostic topic is missing from roadmap: ${entry.phaseSlug}/${entry.topicId}`);
    }
    const quiz = await getQuiz(phase.number, topic.id);
    const question = quiz?.questions[0];
    if (!question) {
      throw new Error(`Diagnostic quiz question is missing: ${entry.phaseSlug}/${entry.topicId}`);
    }
    return {
      id: `diagnostic-${index + 1}-${question.id}`,
      topicKey: topicKey(phase.slug, topic.id),
      phaseNumber: phase.number,
      phaseSlug: phase.slug,
      phaseTitle: phase.title,
      topicId: topic.id,
      topicTitle: topic.title,
      prompt: question.prompt,
      options: [...question.options],
      answerIndex: question.answerIndex,
      explanation: question.explanation,
    } satisfies DiagnosticQuestion;
  }));

  return { version: DIAGNOSTIC_ASSESSMENT_VERSION, questions };
}
