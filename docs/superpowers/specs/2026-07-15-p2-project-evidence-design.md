# P2 Project Evidence Design

**Date:** 2026-07-15
**Status:** Implementation baseline

## Goal

Turn project completion from a feature-checkbox signal into an evidence-backed workflow. The first P2 slice lets a learner collect private repository, demo, and reflection evidence and understand whether the project has enough material for a human review.

This slice remains deterministic and local-first. It does not grade the learner, verify that a URL contains the claimed work, or publish a portfolio.

## Product scope

- A project-level evidence panel on `/projects/[id]`.
- A deterministic rubric combining the existing project feature checklist with repository and reflection evidence.
- An optional demo link that improves reviewability but does not block manual-review readiness.
- Bounded HTTPS repository and demo URLs.
- A bounded private reflection covering decisions, obstacles, or trade-offs.
- Local-first anonymous persistence and user-scoped local persistence.
- Field-level LWW merge into owner-scoped Supabase rows through an authenticated RPC.
- A `NEXT_PUBLIC_P2_PROJECT_EVIDENCE` rollout flag, disabled by default.

## Non-goals

- Automated, AI-generated, or security-sensitive code review.
- A numeric grade, mastery score, certificate, or verified-competence claim.
- Public portfolio pages, public discovery, or sharing permissions.
- Reviewer assignment, comments, approval state, or moderation queues.
- Fetching, cloning, crawling, or executing content from learner-supplied URLs.
- Uploading source archives, screenshots, videos, or arbitrary files.

## Evidence model

Each `(user, project)` draft has three independently merged fields:

- repository URL and `updatedAt`;
- optional demo URL and `updatedAt`;
- reflection and `updatedAt`.

URLs are empty or bounded HTTPS URLs without embedded credentials. Reflection is limited to 2,000 characters. Anonymous and authenticated documents use separate local-storage keys. On sign-in, anonymous, user-local, and remote fields merge independently; the user-scoped document is written before the anonymous document is removed.

The remote `merge_project_evidence` RPC has no user-id input. It derives ownership from `auth.uid()`, validates every field and timestamp before the upsert, and returns only the owner-scoped merged row. Authenticated clients can select their own row but cannot insert, update, or delete the table directly.

## Deterministic rubric

Manual-review readiness requires all three mandatory signals:

1. every existing feature in the project checklist is complete;
2. a valid repository URL is present;
3. reflection contains at least 80 non-whitespace characters.

A demo URL is a fourth, optional signal. The UI reports completed mandatory criteria as a checklist, not as a percentage or grade. “Ready for manual review” means only that enough evidence has been collected for a person to review it.

## Privacy and trust boundary

- Evidence drafts are private on the current device for anonymous learners and owner-scoped for authenticated learners.
- Repository, demo, and reflection values are never included in observability events or error metadata.
- The browser never fetches or renders remote URL content; it stores validated link text only.
- URL presence is evidence supplied by the learner, not proof that the work is accessible, safe, original, or complete.
- Rubric readiness is not a security or assessment boundary.

## Rollout and rollback

- Flag off: project pages retain the existing feature checklist and do not mount the P2 store or panel.
- Flag on: project pages expose the private evidence panel after the existing checklist.
- Apply `202607150001_p2_project_evidence.sql` and pass owner/RLS/RPC checks before enabling the flag for authenticated learners.
- Run the dedicated `p2` staging canary, then the `full` canary, with zero authenticated skips.
- Rollback disables only `NEXT_PUBLIC_P2_PROJECT_EVIDENCE`; the additive table remains in place and local/remote evidence must not be cleared.

## Acceptance criteria

- Anonymous evidence survives reload without requiring sign-in.
- Unsafe URL schemes and oversized reflections are rejected.
- Required rubric state changes predictably with project feature progress and evidence fields.
- Anonymous evidence merges into the authenticated owner row and loads in another browser context.
- Concurrent field edits merge without a stale field overwriting a newer field.
- Anonymous RPC calls, cross-user reads, and direct authenticated table mutations fail.
- Unit tests, database tests, dedicated P2 Playwright journeys, and the full existing quality gate pass.
