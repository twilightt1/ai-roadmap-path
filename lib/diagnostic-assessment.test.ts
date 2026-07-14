import { describe, expect, it } from "vitest";
import { getDiagnosticAssessment } from "./diagnostic-assessment";

describe("diagnostic assessment manifest", () => {
  it("assembles eight stable reviewed quiz questions", async () => {
    const assessment = await getDiagnosticAssessment();
    expect(assessment.version).toBe("foundation-v1");
    expect(assessment.questions).toHaveLength(8);
    expect(new Set(assessment.questions.map((question) => question.topicKey)).size).toBe(8);
    expect(assessment.questions.every((question) =>
      question.options.length >= 2 &&
      question.answerIndex >= 0 &&
      question.answerIndex < question.options.length
    )).toBe(true);
  });
});
