import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createDefaultProjectEvidence,
  updateProjectEvidenceField,
} from "./project-evidence";
import {
  mergeRemoteProjectEvidence,
  parseRemoteProjectEvidence,
} from "./project-evidence-remote";

describe("project evidence remote adapter", () => {
  it("parses a bounded owner-scoped row", () => {
    expect(parseRemoteProjectEvidence({
      project_id: "p1-easy",
      repository_url: "https://github.com/learner/project",
      repository_url_updated_at: "2026-07-15T10:00:00.000Z",
      demo_url: "",
      demo_url_updated_at: "1970-01-01T00:00:00.000Z",
      reflection: "",
      reflection_updated_at: "1970-01-01T00:00:00.000Z",
    })?.repositoryUrl.value).toContain("github.com");
    expect(parseRemoteProjectEvidence({ project_id: "../../unsafe" })).toBeNull();
  });

  it("sends the project id but never accepts a caller-supplied owner id", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        project_id: "p1-easy",
        repository_url: "https://github.com/learner/project",
        repository_url_updated_at: "2026-07-15T10:00:00.000Z",
        demo_url: "",
        demo_url_updated_at: "1970-01-01T00:00:00.000Z",
        reflection: "",
        reflection_updated_at: "1970-01-01T00:00:00.000Z",
      },
      error: null,
    });
    const supabase = { rpc } as unknown as SupabaseClient;
    const evidence = updateProjectEvidenceField(
      createDefaultProjectEvidence("p1-easy"),
      "repositoryUrl",
      "https://github.com/learner/project",
      "2026-07-15T10:00:00.000Z"
    );

    const result = await mergeRemoteProjectEvidence(supabase, evidence);

    expect(result.repositoryUrl.value).toContain("github.com");
    expect(rpc).toHaveBeenCalledWith("merge_project_evidence", expect.objectContaining({
      project_id_input: "p1-easy",
    }));
    expect(rpc).toHaveBeenCalledWith("merge_project_evidence", expect.not.objectContaining({
      user_id: expect.anything(),
      user_id_input: expect.anything(),
    }));
  });
});
