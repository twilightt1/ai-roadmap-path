# P2.1 Submission Snapshot and Reviewer Workflow Design

**Date:** 2026-07-15
**Status:** Implementation baseline

## Goal

Add the smallest reviewable workflow on top of P2 project-evidence drafts: an authenticated learner can create an immutable snapshot, and an explicitly provisioned reviewer can claim it and record either approval or a bounded change request.

The workflow preserves the existing trust boundary. It does not fetch learner URLs, execute learner code, grade work automatically, certify mastery, or publish a portfolio.

## Scope

- A separate `NEXT_PUBLIC_P2_REVIEW_WORKFLOW` flag, disabled by default.
- Server-derived snapshots that copy the authenticated owner's synced evidence row.
- Server verification that every static project feature is complete in canonical `user_progress_items`.
- A versioned, database-owned project requirement catalog for all 52 project IDs.
- One active submission per learner/project. A new snapshot is allowed only after a reviewer requests changes.
- A private reviewer queue at `/review/projects`.
- Explicit reviewer membership provisioned through trusted service-role operations.
- Atomic claim, change-request, and approval RPCs with an append-only event trail.
- Owner and reviewer read access through RLS; no direct browser writes to snapshot, workflow, event, membership, or requirement tables.

## Non-goals

- Public portfolio pages or sharing controls.
- Reviewer administration UI, teams, load balancing, or notifications.
- File uploads, repository cloning, URL crawling, malware scanning, or code execution.
- Numeric grades, certificates, verified-competence claims, plagiarism checks, or AI review.
- Editing or deleting a submitted snapshot through the application workflow.
- Anonymous submission. Anonymous evidence remains a local draft until sign-in and successful sync.

## Data and trust model

`project_submissions` is the immutable evidence snapshot. It has no `updated_at` field, authenticated clients receive only `SELECT`, and a trigger rejects row updates. Account deletion may still cascade-delete private data for lifecycle/privacy handling.

`project_submission_workflow` is mutable workflow metadata kept separate from the snapshot. `project_submission_events` is an append-only audit trail for submit, claim, change request, and approval actions.

`project_reviewer_memberships` is a service-role-managed allow-list. Reviewer authority is never accepted from browser payloads, user metadata, email domains, or learner-editable profile fields.

## Submission contract

`submit_project_evidence(project_id_input)` derives the learner from `auth.uid()` and accepts no evidence values, feature counts, timestamps, owner IDs, or workflow state from the browser. Inside one transaction it:

1. resolves the expected feature count from `project_review_requirements`;
2. reads the learner's current `project_evidence` row;
3. requires a repository URL and at least 80 non-whitespace reflection characters;
4. verifies every required feature key in canonical `user_progress_items`;
5. prevents duplicate pending, in-review, or approved submissions;
6. copies evidence and source timestamps into a new immutable snapshot;
7. creates pending workflow state and a submitted event.

## Reviewer contract

`claim_project_submission` atomically moves a pending submission to `in_review`. Another reviewer cannot steal an active claim. Repeating the claim by the assigned reviewer is idempotent.

`review_project_submission` accepts only `changes_requested` or `approved`. The caller must be the assigned reviewer. Change requests require a non-empty comment; all comments are limited to 2,000 characters. Each transition appends an audit event.

## Rollout and rollback

- Apply the additive P2.1 migration and pass local/staging two-user plus reviewer RLS/RPC proof before enabling the flag.
- Provision a dedicated staging reviewer through a trusted service-role operation; never expose the service-role key to browser code or Playwright output.
- Run the dedicated learner/reviewer canary, followed by the existing full regression canary.
- Rollback disables only `NEXT_PUBLIC_P2_REVIEW_WORKFLOW`. P2 drafts stay enabled, and submission/review tables and history remain intact.

## Acceptance criteria

- Anonymous callers cannot submit, claim, review, or read private workflow data.
- Learners cannot submit unsynced/incomplete evidence and cannot read another learner's snapshot.
- Snapshot values come from server-owned rows and cannot be updated after submission.
- Non-reviewers cannot list the review queue or call reviewer RPCs.
- Two reviewers cannot claim the same pending submission.
- A change request keeps the old snapshot unchanged and permits one new superseding snapshot.
- Approval closes the learner/project workflow against further submission.
- Flag-off rollback hides submission/reviewer UI while the existing P2 draft and project checklist remain usable.
