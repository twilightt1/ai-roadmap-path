import { describe, expect, it } from "vitest";
import {
  MAX_PROJECT_EVIDENCE_REFLECTION_LENGTH,
  MIN_PROJECT_EVIDENCE_REFLECTION_LENGTH,
  createDefaultProjectEvidence,
  deriveProjectEvidenceRubric,
  mergeProjectEvidence,
  parseProjectEvidence,
  updateProjectEvidenceField,
} from "./project-evidence";

const projectId = "p1-easy";

describe("project evidence", () => {
  it("starts as a private empty draft with stable field timestamps", () => {
    const evidence = createDefaultProjectEvidence(projectId);

    expect(evidence).toEqual({
      schemaVersion: 1,
      projectId,
      repositoryUrl: { value: "", updatedAt: "1970-01-01T00:00:00.000Z" },
      demoUrl: { value: "", updatedAt: "1970-01-01T00:00:00.000Z" },
      reflection: { value: "", updatedAt: "1970-01-01T00:00:00.000Z" },
    });
  });

  it("accepts bounded HTTPS evidence and rejects unsafe or oversized data", () => {
    const valid = updateProjectEvidenceField(
      createDefaultProjectEvidence(projectId),
      "repositoryUrl",
      "https://codeberg.org/learner/project",
      "2026-07-15T10:00:00.000Z"
    );

    expect(parseProjectEvidence(valid)).toEqual(valid);
    expect(parseProjectEvidence({
      ...valid,
      repositoryUrl: { ...valid.repositoryUrl, value: "javascript:alert(1)" },
    })).toBeNull();
    expect(parseProjectEvidence({
      ...valid,
      demoUrl: { ...valid.demoUrl, value: "http://insecure.example.test" },
    })).toBeNull();
    expect(parseProjectEvidence({
      ...valid,
      reflection: {
        ...valid.reflection,
        value: "x".repeat(MAX_PROJECT_EVIDENCE_REFLECTION_LENGTH + 1),
      },
    })).toBeNull();
  });

  it("merges fields independently so concurrent device edits are preserved", () => {
    const base = createDefaultProjectEvidence(projectId);
    const repositoryEdit = updateProjectEvidenceField(
      base,
      "repositoryUrl",
      "https://github.com/learner/project",
      "2026-07-15T10:00:00.000Z"
    );
    const reflectionEdit = updateProjectEvidenceField(
      base,
      "reflection",
      "I separated transport concerns from the domain layer and documented the trade-off.",
      "2026-07-15T11:00:00.000Z"
    );

    const merged = mergeProjectEvidence(repositoryEdit, reflectionEdit);

    expect(merged.repositoryUrl.value).toBe("https://github.com/learner/project");
    expect(merged.reflection.value).toContain("transport concerns");
  });

  it("keeps the newest value and resolves equal timestamps deterministically", () => {
    const older = updateProjectEvidenceField(
      createDefaultProjectEvidence(projectId),
      "demoUrl",
      "https://demo.example.test/a",
      "2026-07-15T10:00:00.000Z"
    );
    const newer = updateProjectEvidenceField(
      createDefaultProjectEvidence(projectId),
      "demoUrl",
      "https://demo.example.test/b",
      "2026-07-15T11:00:00.000Z"
    );
    const equalTimestampWinner = updateProjectEvidenceField(
      createDefaultProjectEvidence(projectId),
      "demoUrl",
      "https://demo.example.test/z",
      "2026-07-15T11:00:00.000Z"
    );

    expect(mergeProjectEvidence(newer, older).demoUrl.value).toBe("https://demo.example.test/b");
    expect(mergeProjectEvidence(newer, equalTimestampWinner).demoUrl.value)
      .toBe("https://demo.example.test/z");
  });

  it("requires implementation, repository, and reflection for manual review readiness", () => {
    let evidence = updateProjectEvidenceField(
      createDefaultProjectEvidence(projectId),
      "repositoryUrl",
      "https://github.com/learner/project",
      "2026-07-15T10:00:00.000Z"
    );
    evidence = updateProjectEvidenceField(
      evidence,
      "reflection",
      "r".repeat(MIN_PROJECT_EVIDENCE_REFLECTION_LENGTH),
      "2026-07-15T11:00:00.000Z"
    );

    const ready = deriveProjectEvidenceRubric({
      evidence,
      completedFeatures: 3,
      totalFeatures: 3,
    });
    const incomplete = deriveProjectEvidenceRubric({
      evidence,
      completedFeatures: 2,
      totalFeatures: 3,
    });

    expect(ready.readyForManualReview).toBe(true);
    expect(ready.criteria.find((criterion) => criterion.id === "demo")).toMatchObject({
      required: false,
      satisfied: false,
    });
    expect(incomplete.readyForManualReview).toBe(false);
  });
});
