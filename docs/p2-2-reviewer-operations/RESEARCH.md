# P2.2 Reviewer Operations Research

## Overview

P2.2 makes the private P2.1 review workflow operable beyond a single staging reviewer. It adds bounded reviewer-queue pagination and a trusted reviewer lifecycle tool without publishing learner evidence, exposing Auth users to browsers, or changing the meaning of approval.

P2.1 human release and usability sign-offs remain separate gates. P2.2 may be developed behind a default-off flag, but neither slice is broadly released by this implementation alone.

## Problem Statement

The current reviewer queue loads at most 50 active submissions through two browser queries and cannot move beyond that window. Reviewer membership is managed through ad-hoc service-role operations. Removing a reviewer membership can also leave an `in_review` item visually stuck: the database claim RPC permits reclaim when the assignee is no longer active, but the current UI shows only “reviewer khác đang xử lý.”

The next slice must therefore solve three connected operational problems:

1. page through active private submissions with a deterministic, bounded contract;
2. add, revoke, and restore reviewers through an audited, idempotent trusted operation;
3. release claims atomically when a reviewer is revoked so no private work is stranded.

## User Stories / Use Cases

- A reviewer pages forward and backward through a bounded active queue without loading every private snapshot.
- A reviewer can reclaim an `in_review` item whose assignee is no longer active, but cannot steal an active reviewer’s claim.
- An operator previews reviewer lifecycle changes before applying them.
- An operator retries a lifecycle request after losing the HTTP response without applying it twice.
- Revoking a reviewer releases their active claims to `pending` and appends audit events without deleting snapshots, decisions, or Auth users.
- Rollback disables only the P2.2 paginated UI; the P2.1 queue and immutable history remain available.

## Technical Research

### Approach Options

#### Browser offset/range pagination

This is small but weak for an active queue: rows can disappear after review, offsets can skip or duplicate items, and the current two-query workflow/snapshot load is not a consistent page boundary.

#### Keyset pagination over mutable workflow timestamps

This avoids offset cost, but claim/review updates move rows because `workflow.updated_at` is mutable. The same item can move across page boundaries during review.

#### Keyset pagination over immutable snapshot order — recommended

Order active rows by `(project_submissions.submitted_at, project_submissions.id)`. The snapshot timestamp and ID never change, so claim/reclaim does not move an item. The RPC fetches `N+1` rows, returns at most the bounded page size, and the client derives the next cursor from the last emitted row.

#### Direct membership INSERT/DELETE from an operator script

This is easy but has no atomic claim release, last-reviewer guard, or idempotency record. A partial operation can strand work.

#### Service-role-only lifecycle RPC — recommended

Add reviewer lifecycle metadata and an operation journal. A single transaction handles add/revoke/restore, last-reviewer safety, claim release, and append-only `reviewer_released` events. Direct service-role membership mutations are revoked so the CLI cannot bypass the invariant.

### Recommended Approach

- Add `NEXT_PUBLIC_P2_REVIEW_QUEUE_PAGINATION=false`, dependent on P2.1.
- Flag OFF keeps the existing P2.1 50-row loader as the rollback path.
- Flag ON calls a reviewer-only `list_project_review_queue_page` RPC with page size `1..25` and a paired immutable cursor.
- Extend reviewer memberships with a non-PII operator alias and `revoked_at` instead of deleting lifecycle rows.
- Add a service-role-only, idempotent `manage_project_reviewer` RPC for `add`, `revoke`, and `restore`.
- Revoke releases assigned `in_review` rows to `pending`, appends `reviewer_released`, and blocks removal of the last active reviewer while active work exists unless an explicit break-glass input is supplied.
- Add a dry-run-by-default CLI. It reads URL/key only from protected environment variables, targets a UUID through `PROJECT_REVIEWER_USER_ID`, and never prints UUID, email, key, raw response body, or learner evidence.

### Required Technologies

- Existing Supabase PostgreSQL, RLS, RPC, Auth Admin API, and service-role server access.
- Existing React/Next.js reviewer queue and Supabase browser client.
- Existing `tsx`, Vitest, Playwright, Supabase CLI, and transactional SQL test harness.

### Data Requirements

- `project_reviewer_memberships.operator_alias`: stable non-PII operator handle.
- `project_reviewer_memberships.revoked_at`: active/revoked lifecycle state.
- `project_reviewer_operations`: idempotency/audit journal containing operation ID, type, optional target UUID, sanitized JSON result, and timestamp.
- `project_submission_events.event_type`: additive `reviewer_released` audit event.
- No public reviewer directory, learner identity, email, password, or service key is added to browser data.

## UI/UX Considerations

- Show a fixed page-size queue with “Trang trước” and “Trang sau”.
- Refresh and claim/decision actions return to page one so removed items cannot leave a confusing empty later page.
- Show “Nhận lại review” only for unassigned/inactive-reviewer `in_review` items.
- Keep the existing access-denied and anonymous states.
- P2.2 rollback hides pagination/reclaim additions but keeps the P2.1 reviewer route usable.

## Integration Points

- `lib/feature-flags.ts` and `.env.example` for the rollback boundary.
- `supabase/migrations/` for lifecycle, RPC, grants, events, and queue index.
- `lib/project-submission*.ts` for cursor/page parsing and RPC access.
- `components/project-review/project-review-queue.tsx` for bounded navigation and reclaim UI.
- `scripts/manage-project-reviewers.ts` and `package.json` for trusted operations.
- Supabase SQL, Vitest, Playwright, local E2E, staging canary, README, and operations evidence.

## Risks and Challenges

- The queue is live, not a snapshot transaction; completed items may disappear between pages. Immutable ordering prevents movement but not intentional removal.
- A reviewer deletion at the Auth layer can still cascade membership state; the queue RPC must treat null/missing assignees as reclaimable.
- A lost response must be retried with the same operation ID.
- Break-glass last-reviewer revocation can leave pending work with no reviewer and must never be the default.
- Repeated canaries append immutable history; lifecycle cleanup rotates disposable accounts rather than deleting individual snapshots.

## Open Questions

- Notifications, SLAs, load balancing, reviewer teams, conversation threads, and appeals remain future slices.
- Public portfolio/sharing remains explicitly out of scope.
- A future DB hardening slice should add a causal current-pointer/sequence invariant for submission chains; P2.2 does not change submission ordering.

## References

- [Supabase database functions](https://supabase.com/docs/guides/database/functions)
- [Supabase API security and function grants](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Auth user management](https://supabase.com/docs/guides/auth/users)
- [Supabase Admin delete-user boundary](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)
