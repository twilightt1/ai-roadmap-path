# P2.2 Reviewer Operations Local Verification — 2026-07-16

## Decision

**The default-off P2.2 reviewer-operations and bounded-queue vertical slice passes local implementation gates. It is not deployed or approved for broad release.**

Protected CI, an approved pre-migration staging backup, additive migration review, staging SQL proof, dedicated/full canaries, non-destructive rollback/restore, and named human sign-off remain separate release gates. P2/P2.1 human rubric and usability gates also remain open.

## Verification context

| Field | Value |
|---|---|
| Branch | `codex/p2-2-reviewer-operations` |
| Parent main | `07aa8be` |
| Migration | `202607160001_p2_reviewer_operations.sql` |
| Local enabled state | LWW progress=`true`; P2 evidence=`true`; P2.1 review=`true`; P2.2 pagination=`true` |
| Local rollback state | LWW progress=`true`; P2 evidence=`true`; P2.1 review=`true`; P2.2 pagination=`false` |
| Production/staging mutation | None |

## Delivered vertical slice

- Independent default-off P2.2 feature flag with build-time dependency validation on P2.1.
- Reviewer-only immutable keyset queue ordered by `(submitted_at, submission_id)`, fetched as `N+1`, with a maximum server page size of 25.
- Previous/next UI navigation, stale-request protection, and page-one refresh after claim or decision.
- Explicit reclaim UI for work assigned to a missing or revoked reviewer; active reviewer claims remain non-stealable.
- Soft reviewer lifecycle with stable non-PII aliases and an idempotent operation journal.
- Service-role-only add/revoke/restore RPC; browser roles cannot read memberships/journal or invoke lifecycle operations.
- Atomic revoke that releases assigned `in_review` work to `pending` and appends `reviewer_released` events without deleting snapshots, decisions, or Auth users.
- Last-active-reviewer guard with an explicit revoke-only break-glass input.
- Dry-run-by-default trusted CLI that emits fingerprints/aliases and stable error codes, not user UUIDs, email addresses, service keys, raw remote errors, or learner evidence.
- Dedicated `p2-review-ops` and `p2-review-ops-rollback` staging canary suites.

## Passed gates

| Gate | Result |
|---|---|
| `pnpm check` | PASS — 118 lessons, 118 quizzes, 35 challenge files, 2 ladders; 44 test files and 183 tests; 243 routes built; 234 Pagefind pages indexed |
| `pnpm test:db` | PASS — all P0/P1/P2/P2.1 assertions plus P2.2 grants, bounded order/cursor, non-reviewer denial, lifecycle, atomic release, idempotency, last-reviewer guard, restore, and reclaim assertions |
| `pnpm test:e2e:local` | PASS — 18 browser tests including the P2.2 queue and the existing P2.1 learner/reviewer cycle |
| Focused P2.2 rollback assertion | PASS — pagination is absent while the original P2.1 reviewer queue remains usable |
| Trusted CLI read-only integration | PASS — local `reviewer:ops list` returned sanitized JSON and performed no mutation |
| `pnpm audit:prod` | PASS at high threshold — no high/critical advisory; one tracked moderate advisory remains |

## Security and privacy evidence

- Lifecycle and queue functions are `SECURITY DEFINER` with an empty `search_path`; execution grants are limited to the intended role.
- Service role has read-only table access for membership status and the operation journal; direct membership/journal insert, update, delete, and truncate privileges are removed.
- Anonymous/authenticated browser roles cannot execute lifecycle operations or read the operation journal.
- The queue RPC rechecks active reviewer membership, validates paired finite cursors, and rejects page sizes outside `1..25`.
- Lifecycle mutations serialize through a transaction advisory lock, and the operation UUID makes successful retries idempotent.
- Revoke, workflow release, release-event insertion, and operation journal insertion succeed or fail in one transaction.
- The operation CLI reads the service key only from a protected environment and converts network/HTTP failures to stable sanitized error codes.
- P2.2 does not add a public reviewer directory, browser admin UI, external URL fetching, learner-code execution, portfolio sharing, grading, certification, or automated approval.

## Defects found during local validation

1. The local E2E runner initially inserted reviewer membership directly and received HTTP 403 after P2.2 removed that bypass. Fixture provisioning now uses `manage_project_reviewer`.
2. A cold Next.js build plus postbuild could exceed the previous 120-second Playwright web-server budget. The server startup budget is now 240 seconds; per-test timeouts are unchanged.
3. The external Pyodide isolation assertion allowed only 20 seconds even though the runtime contract permits a 60-second cold load before the 10-second execution timeout. The assertion now allows 75 seconds and passed focused plus full replay.
4. Narrow `SELECT` grants alone did not explicitly remove possible default service-role privileges on the new journal. The migration now revokes all service-role table privileges before granting read-only access, and SQL proof covers mutation and truncate denial.

## Staging rollout and rollback gates

1. Push the immutable candidate and retain protected Quality, Database integration, Dependency audit, and Browser smoke evidence for the exact SHA.
2. Create and hash an approved pre-P2.2 staging schema/data backup.
3. Confirm migration history matches through P2.1 and `supabase db push --dry-run` selects only `202607160001_p2_reviewer_operations.sql`.
4. Apply the additive migration through the reviewed staging process; do not delete or roll back P2.1 tables/history.
5. Run `supabase/tests/p2_reviewer_operations_rls.test.sql` transactionally against staging and confirm all fixtures roll back.
6. Use `pnpm reviewer:ops -- list`/`status` in a trusted operator environment. Add or restore the dedicated reviewer only if required, preview first, then repeat with `--apply` and a retained operation ID.
7. Deploy the exact candidate with LWW progress, P2 evidence, P2.1 review, and P2.2 pagination all `true`.
8. Run `p2-review-ops`, then the existing `full` regression canary, retaining sanitized evidence.
9. Redeploy the same SHA with only `NEXT_PUBLIC_P2_REVIEW_QUEUE_PAGINATION=false`; run `p2-review-ops-rollback` and confirm the original P2.1 queue/history plus all eight migrations remain intact.
10. Restore only the P2.2 flag, rerun `p2-review-ops`, and retain the post-restore record.
11. Complete named reviewer-operations usability and release review before broad exposure. P2/P2.1 content/rubric sign-offs remain independently required.

## Rollback invariant

Rollback is a build-time flag change only. It must not remove the additive migration, delete reviewer memberships or operation journal rows, clear browser storage, delete submissions/events, or revert P2.1. The disabled P2.2 UI uses the existing bounded P2.1 queue path.
