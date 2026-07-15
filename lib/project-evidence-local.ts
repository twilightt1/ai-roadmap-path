import {
  createDefaultProjectEvidence,
  parseProjectEvidence,
  projectEvidenceStorageKey,
  type ProjectEvidence,
} from "./project-evidence";

export function loadLocalProjectEvidence(
  projectId: string,
  userId?: string | null
): ProjectEvidence {
  if (typeof window === "undefined") return createDefaultProjectEvidence(projectId);
  const raw = window.localStorage.getItem(projectEvidenceStorageKey(projectId, userId));
  if (!raw) return createDefaultProjectEvidence(projectId);
  try {
    const parsed = parseProjectEvidence(JSON.parse(raw));
    return parsed?.projectId === projectId ? parsed : createDefaultProjectEvidence(projectId);
  } catch {
    return createDefaultProjectEvidence(projectId);
  }
}

export function saveLocalProjectEvidence(
  evidence: ProjectEvidence,
  userId?: string | null
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    projectEvidenceStorageKey(evidence.projectId, userId),
    JSON.stringify(evidence)
  );
}

export function clearLocalProjectEvidence(projectId: string, userId?: string | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(projectEvidenceStorageKey(projectId, userId));
}
