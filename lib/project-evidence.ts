export const PROJECT_EVIDENCE_SCHEMA_VERSION = 1 as const;
export const PROJECT_EVIDENCE_STORAGE_KEY = "ai-roadmap:project-evidence:v1";
export const MAX_PROJECT_EVIDENCE_URL_LENGTH = 500;
export const MIN_PROJECT_EVIDENCE_REFLECTION_LENGTH = 80;
export const MAX_PROJECT_EVIDENCE_REFLECTION_LENGTH = 2_000;

const EMPTY_TIMESTAMP = "1970-01-01T00:00:00.000Z";
// Keep the persistence contract bounded to the static catalog: three projects
// for phases 1-17 plus the capstone. Update the database constraint together
// with this pattern when the catalog gains another project.
const PROJECT_ID_PATTERN = /^(?:p(?:[1-9]|1[0-7])-(?:easy|medium|hard)|capstone-main)$/;

export type ProjectEvidenceFieldName = "repositoryUrl" | "demoUrl" | "reflection";

export type ProjectEvidenceField = {
  value: string;
  updatedAt: string;
};

export type ProjectEvidence = {
  schemaVersion: typeof PROJECT_EVIDENCE_SCHEMA_VERSION;
  projectId: string;
  repositoryUrl: ProjectEvidenceField;
  demoUrl: ProjectEvidenceField;
  reflection: ProjectEvidenceField;
};

export type ProjectEvidenceCriterionId = "implementation" | "repository" | "reflection" | "demo";

export type ProjectEvidenceCriterion = {
  id: ProjectEvidenceCriterionId;
  label: string;
  description: string;
  required: boolean;
  satisfied: boolean;
};

export type ProjectEvidenceRubric = {
  criteria: ProjectEvidenceCriterion[];
  requiredCompleted: number;
  requiredTotal: number;
  readyForManualReview: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

export function isProjectEvidenceProjectId(value: unknown): value is string {
  return typeof value === "string" && PROJECT_ID_PATTERN.test(value);
}

export function isSafeProjectEvidenceUrl(value: string): boolean {
  if (value === "") return true;
  if (value.length > MAX_PROJECT_EVIDENCE_URL_LENGTH || /\s/.test(value)) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function countProjectEvidenceReflectionCharacters(value: string): number {
  return value.match(/\S/gu)?.length ?? 0;
}

function parseField(value: unknown, kind: ProjectEvidenceFieldName): ProjectEvidenceField | null {
  if (!isRecord(value) || typeof value.value !== "string" || !isTimestamp(value.updatedAt)) {
    return null;
  }
  if (kind === "reflection") {
    if (value.value.length > MAX_PROJECT_EVIDENCE_REFLECTION_LENGTH) return null;
  } else if (!isSafeProjectEvidenceUrl(value.value)) {
    return null;
  }
  return { value: value.value, updatedAt: value.updatedAt };
}

export function createDefaultProjectEvidence(projectId: string): ProjectEvidence {
  if (!isProjectEvidenceProjectId(projectId)) throw new Error("Invalid project evidence project id");
  return {
    schemaVersion: PROJECT_EVIDENCE_SCHEMA_VERSION,
    projectId,
    repositoryUrl: { value: "", updatedAt: EMPTY_TIMESTAMP },
    demoUrl: { value: "", updatedAt: EMPTY_TIMESTAMP },
    reflection: { value: "", updatedAt: EMPTY_TIMESTAMP },
  };
}

export function parseProjectEvidence(value: unknown): ProjectEvidence | null {
  if (
    !isRecord(value) ||
    value.schemaVersion !== PROJECT_EVIDENCE_SCHEMA_VERSION ||
    !isProjectEvidenceProjectId(value.projectId)
  ) {
    return null;
  }

  const repositoryUrl = parseField(value.repositoryUrl, "repositoryUrl");
  const demoUrl = parseField(value.demoUrl, "demoUrl");
  const reflection = parseField(value.reflection, "reflection");
  if (!repositoryUrl || !demoUrl || !reflection) return null;

  return {
    schemaVersion: PROJECT_EVIDENCE_SCHEMA_VERSION,
    projectId: value.projectId,
    repositoryUrl,
    demoUrl,
    reflection,
  };
}

function compareFields(left: ProjectEvidenceField, right: ProjectEvidenceField): number {
  const timestampComparison = Date.parse(left.updatedAt) - Date.parse(right.updatedAt);
  if (timestampComparison !== 0) return timestampComparison;
  if (left.value === right.value) return 0;
  return left.value > right.value ? 1 : -1;
}

export function mergeProjectEvidence(...candidates: ProjectEvidence[]): ProjectEvidence {
  if (candidates.length === 0) throw new Error("At least one project evidence candidate is required");
  const projectId = candidates[0].projectId;
  if (candidates.some((candidate) => candidate.projectId !== projectId)) {
    throw new Error("Cannot merge evidence from different projects");
  }

  return candidates.reduce((merged, candidate) => ({
    schemaVersion: PROJECT_EVIDENCE_SCHEMA_VERSION,
    projectId,
    repositoryUrl: compareFields(candidate.repositoryUrl, merged.repositoryUrl) > 0
      ? { ...candidate.repositoryUrl }
      : { ...merged.repositoryUrl },
    demoUrl: compareFields(candidate.demoUrl, merged.demoUrl) > 0
      ? { ...candidate.demoUrl }
      : { ...merged.demoUrl },
    reflection: compareFields(candidate.reflection, merged.reflection) > 0
      ? { ...candidate.reflection }
      : { ...merged.reflection },
  }), createDefaultProjectEvidence(projectId));
}

export function updateProjectEvidenceField(
  evidence: ProjectEvidence,
  field: ProjectEvidenceFieldName,
  rawValue: string,
  updatedAt = new Date().toISOString()
): ProjectEvidence {
  const value = field === "reflection" ? rawValue : rawValue.trim();
  const candidate = {
    ...evidence,
    [field]: { value, updatedAt },
  };
  const parsed = parseProjectEvidence(candidate);
  if (!parsed) throw new Error(`Invalid project evidence ${field}`);
  return parsed;
}

export function deriveProjectEvidenceRubric({
  evidence,
  completedFeatures,
  totalFeatures,
}: {
  evidence: ProjectEvidence;
  completedFeatures: number;
  totalFeatures: number;
}): ProjectEvidenceRubric {
  const criteria: ProjectEvidenceCriterion[] = [
    {
      id: "implementation",
      label: "Yêu cầu cốt lõi",
      description: `Hoàn thành checklist tính năng (${completedFeatures}/${totalFeatures}).`,
      required: true,
      satisfied: totalFeatures > 0 && completedFeatures === totalFeatures,
    },
    {
      id: "repository",
      label: "Repository tái lập",
      description: "Cung cấp liên kết HTTPS tới mã nguồn và hướng dẫn chạy.",
      required: true,
      satisfied: evidence.repositoryUrl.value.length > 0,
    },
    {
      id: "reflection",
      label: "Tự đánh giá",
      description: `Nêu quyết định, trở ngại hoặc trade-off trong ít nhất ${MIN_PROJECT_EVIDENCE_REFLECTION_LENGTH} ký tự.`,
      required: true,
      satisfied:
        countProjectEvidenceReflectionCharacters(evidence.reflection.value) >=
        MIN_PROJECT_EVIDENCE_REFLECTION_LENGTH,
    },
    {
      id: "demo",
      label: "Demo kiểm chứng",
      description: "Liên kết HTTPS tới bản chạy hoặc video demo; khuyến khích nhưng không bắt buộc.",
      required: false,
      satisfied: evidence.demoUrl.value.length > 0,
    },
  ];
  const required = criteria.filter((criterion) => criterion.required);
  const requiredCompleted = required.filter((criterion) => criterion.satisfied).length;

  return {
    criteria,
    requiredCompleted,
    requiredTotal: required.length,
    readyForManualReview: requiredCompleted === required.length,
  };
}

export function projectEvidenceStorageKey(projectId: string, userId?: string | null): string {
  const base = `${PROJECT_EVIDENCE_STORAGE_KEY}:project:${encodeURIComponent(projectId)}`;
  return userId ? `${base}:user:${encodeURIComponent(userId)}` : base;
}
