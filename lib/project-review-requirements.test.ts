import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { allProjects } from "./roadmap-data";

describe("project review requirement catalog", () => {
  it("keeps every database feature count aligned with the static roadmap", () => {
    const migration = readFileSync(
      resolve(process.cwd(), "supabase/migrations/202607150002_p2_submission_review_workflow.sql"),
      "utf8"
    );
    const requirements = new Map(
      [...migration.matchAll(/\('([^']+)',\s*(\d+)\)/g)]
        .map((match) => [match[1], Number(match[2])] as const)
    );
    const expected = new Map(
      allProjects.map((project) => [project.id, project.features.length] as const)
    );

    expect(requirements.size).toBe(52);
    expect([...requirements.entries()].sort()).toEqual([...expected.entries()].sort());
  });
});
