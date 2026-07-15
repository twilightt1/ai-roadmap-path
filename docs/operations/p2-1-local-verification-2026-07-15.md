# P2.1 Submission Review Local Verification — 2026-07-15

## Decision

**The P2.1 immutable submission and allow-listed reviewer vertical slice passes local implementation gates. It is not deployed or approved for broad release.**

Release still requires protected CI, an approved staging backup and additive migration, staging RLS/RPC proof, dedicated learner/reviewer credentials, exact flag evidence, dedicated/full canaries, and a non-destructive rollback/restore rehearsal.

An `approved` workflow state records one allow-listed person's manual review outcome. It is not automated verification, a security review, proof of originality, a grade, mastery, or certification.

## Verification context

| Field | Value |
|---|---|
| Branch | `codex/p2-1-review-workflow` |
| Parent main | `c0937253dbcd7910090f45715e9a70fd6a6efa2d` |
| Migration | `202607150002_p2_submission_review_workflow.sql` |
| Local enabled state | LWW progress=`true`; P2 evidence=`true`; P2.1 review=`true` |
| Local rollback state | LWW progress=`true`; P2 evidence=`true`; P2.1 review=`false` |
| Production/staging mutation | None |

## Delivered vertical slice

- Server-owned requirement catalog for the 52 static project IDs and expected feature counts.
- Immutable evidence snapshots copied only from the authenticated learner's synced P2 evidence row.
- Server-side verification of every required canonical project-feature progress row.
- One active learner/project submission; a change request permits one superseding snapshot while preserving the original.
- Service-role-managed reviewer allow-list that cannot be read or mutated by browser roles.
- Private RLS-backed review queue with atomic claim, change-request, and approval RPCs.
- Append-only submit/claim/decision event trail separated from mutable workflow state.
- Build-time dependency validation: P2.1 cannot start without both LWW progress and P2 evidence.
- Dedicated `p2-review` and `p2-review-rollback` staging-canary suites.

## Passed gates

| Gate | Result |
|---|---|
| `pnpm check` | PASS — 118 lessons, 118 quizzes, 35 challenge files, 2 ladders; 43 test files and 172 tests; 243 routes built; 235 Pagefind pages indexed |
| `pnpm test:db` | PASS — all P0/P1/P2 assertions plus P2.1 ownership, reviewer access, snapshot immutability, claim conflict, transition, resubmission, approval, and atomic rejection assertions |
| Focused P2.1 browser journey | PASS — disposable learner submitted; allow-listed disposable reviewer claimed and requested changes; learner received feedback and could create a superseding snapshot |
| `pnpm test:e2e:local` | PASS — 17 passed, zero skipped/failed/flaky |
| Local P2.1 rollback assertion | PASS — reviewer route returned 404 and submit UI was absent while P2 draft and feature checklist remained usable |
| `pnpm audit:prod` | PASS at high threshold — no high/critical advisory; one tracked moderate advisory remains |

## Security and privacy evidence

- Submission RPC accepts only a project ID and derives the owner from `auth.uid()`.
- Evidence values, timestamps, feature counts, reviewer identity, and workflow state are never accepted from the submission browser payload.
- Browser roles have no direct insert/update/delete privileges on snapshots, workflow, or events.
- A database trigger rejects snapshot updates even through a privileged accidental update path.
- Anonymous users cannot execute submit, reviewer-role, claim, or decision RPCs.
- Non-reviewers cannot read another learner's snapshot/workflow/events or claim a submission.
- A second reviewer cannot steal an active claim; a revoked/deleted reviewer claim can be safely reclaimed by another active allow-listed reviewer.
- Change requests require a non-empty bounded comment; all review comments are limited to 2,000 characters.
- Repository/demo/reflection values are not emitted to application diagnostics or CI evidence.
- The application stores validated HTTPS links but does not fetch, crawl, render, execute, or verify their contents.

## Defects found during local validation

1. Initial service-role REST provisioning returned HTTP 403 because the membership table intentionally revoked browser roles but did not explicitly retain the narrow admin grant. The migration now grants only `SELECT`, `INSERT`, and `DELETE` on reviewer memberships to `service_role`.
2. A SQL assertion initially ordered two same-transaction snapshots by timestamp and UUID. PostgreSQL `now()` is transaction-stable, so the result could be nondeterministic. Submission timestamps now use `clock_timestamp()`, and the proof identifies the new snapshot through its `supersedes_submission_id` relationship.
3. The local E2E cleanup path allowed a transient Auth API network failure to turn a passed Playwright run into a false-negative exit. Cleanup now retries three times and reports a sanitized best-effort error without exposing credentials.

## Remaining staging and release gates

1. Push the immutable candidate and retain protected Quality, Database integration, Dependency audit, and Browser smoke evidence.
2. Create and hash an approved pre-P2.1 staging schema/data backup.
3. Confirm `supabase db push --dry-run` selects only `202607150002_p2_submission_review_workflow.sql`, then apply it through the reviewed staging process.
4. Run `supabase/tests/p2_submission_review_rls.test.sql` transactionally on staging and confirm no fixture users, memberships, snapshots, workflow, or events remain.
5. Provision a dedicated staging reviewer through a trusted service-role operation and configure `PLAYWRIGHT_REVIEWER_USER_EMAIL` plus `PLAYWRIGHT_REVIEWER_USER_PASSWORD` as protected GitHub environment secrets.
6. Deploy the candidate with LWW progress, P2 evidence, and P2.1 review all `true`; record the exact SHA and flags.
7. Run the `p2-review` canary, followed by the existing `full` regression canary.
8. Redeploy the same SHA with only `NEXT_PUBLIC_P2_REVIEW_WORKFLOW=false`, run `p2-review-rollback`, and confirm snapshots/history plus all seven migrations remain intact.
9. Restore P2.1, rerun the dedicated canary, and retain the sanitized staging record.
10. Complete named human release, rubric/content, and reviewer-workflow usability reviews before broad exposure.

## Known limitations and next slice

- Reviewer provisioning and removal are operator-managed; there is no reviewer-admin UI.
- The queue shows at most 50 active items and has no pagination, assignment balancing, notification, or SLA support.
- Review comments and decisions are append-only; there is no conversation thread or appeal workflow.
- Repeated staging canaries intentionally add immutable history to their dedicated learner account. Retention cleanup should rotate/delete that disposable account through an approved lifecycle operation, never delete individual snapshots as rollback.
- Account deletion may cascade-delete private learner submission data for lifecycle/privacy handling; application users cannot directly delete individual snapshots.
- The next slice should add reviewer operations tooling and bounded queue pagination before public portfolio or sharing work.
