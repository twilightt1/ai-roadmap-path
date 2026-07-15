import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PROJECT_EVIDENCE_SCHEMA_VERSION,
  mergeProjectEvidence,
  parseProjectEvidence,
  type ProjectEvidence,
} from "./project-evidence";

type ProjectEvidenceRow = {
  project_id?: unknown;
  repository_url?: unknown;
  repository_url_updated_at?: unknown;
  demo_url?: unknown;
  demo_url_updated_at?: unknown;
  reflection?: unknown;
  reflection_updated_at?: unknown;
};

const PROJECT_EVIDENCE_COLUMNS = [
  "project_id",
  "repository_url",
  "repository_url_updated_at",
  "demo_url",
  "demo_url_updated_at",
  "reflection",
  "reflection_updated_at",
].join(", ");

export function parseRemoteProjectEvidence(row: unknown): ProjectEvidence | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const input = row as ProjectEvidenceRow;
  return parseProjectEvidence({
    schemaVersion: PROJECT_EVIDENCE_SCHEMA_VERSION,
    projectId: input.project_id,
    repositoryUrl: {
      value: input.repository_url,
      updatedAt: input.repository_url_updated_at,
    },
    demoUrl: {
      value: input.demo_url,
      updatedAt: input.demo_url_updated_at,
    },
    reflection: {
      value: input.reflection,
      updatedAt: input.reflection_updated_at,
    },
  });
}

export async function loadRemoteProjectEvidence(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<ProjectEvidence | null> {
  const { data, error } = await supabase
    .from("project_evidence")
    .select(PROJECT_EVIDENCE_COLUMNS)
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw error;
  if (data === null) return null;
  const evidence = parseRemoteProjectEvidence(data);
  if (!evidence || evidence.projectId !== projectId) {
    throw new Error("Invalid remote project evidence");
  }
  return evidence;
}

export async function mergeRemoteProjectEvidence(
  supabase: SupabaseClient,
  evidence: ProjectEvidence
): Promise<ProjectEvidence> {
  const { data, error } = await supabase.rpc("merge_project_evidence", {
    project_id_input: evidence.projectId,
    repository_url_input: evidence.repositoryUrl.value,
    repository_url_updated_at_input: evidence.repositoryUrl.updatedAt,
    demo_url_input: evidence.demoUrl.value,
    demo_url_updated_at_input: evidence.demoUrl.updatedAt,
    reflection_input: evidence.reflection.value,
    reflection_updated_at_input: evidence.reflection.updatedAt,
  });

  if (error) throw error;
  const remote = parseRemoteProjectEvidence(data);
  if (!remote || remote.projectId !== evidence.projectId) {
    throw new Error("Invalid project evidence RPC response");
  }
  return mergeProjectEvidence(evidence, remote);
}
