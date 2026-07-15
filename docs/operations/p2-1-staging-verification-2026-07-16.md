# P2.1 Submission Review staging verification — 2026-07-16

## Decision

**Pre-deploy staging gates are complete. P2.1 is ready for a controlled deployment of the immutable candidate; it is not approved for broad release.**

- Candidate `e054b2b6856dafe91b7e4c5a4e06a3109d0075e3` is merged into `main` and its post-merge CI passed.
- The protected pre-P2.1 backup is present and its hashes were re-verified.
- Staging migration history matches all seven local migrations, including the additive P2.1 migration.
- The P2.1 RLS/RPC proof passed transactionally on staging and left zero fixture records.
- One dedicated staging reviewer is allow-listed and both protected reviewer secrets are configured for the learner/reviewer canary.

This is a sanitized operational record. It contains no user email, password, token, cookie, service-role key, learner URL, reflection, or reviewer identity.

## Release context

| Field | Value |
|---|---|
| Candidate SHA | `e054b2b6856dafe91b7e4c5a4e06a3109d0075e3` |
| Implementation PR | [#13 — immutable submission review workflow](https://github.com/twilightt1/ai-roadmap-path/pull/13) |
| Approved application target | `https://ai-roadmap-path.vercel.app` |
| Approved Supabase target | staging project ref `suwtvxmvkfiifgnlmmtk` |
| Verification date | `2026-07-16` Asia/Saigon |
| Required enabled dependencies | LWW progress=`true`; P2 evidence=`true` |
| P2.1 pre-deploy state | review workflow=`false` |
| Intended P2.1 rollout state | LWW progress=`true`; P2 evidence=`true`; P2.1 review=`true` |

## CI evidence

| Gate | Result | Evidence |
|---|---|---|
| Protected implementation checks | PASS | [PR #13](https://github.com/twilightt1/ai-roadmap-path/pull/13) |
| Post-merge checks on `main@e054b2b` | PASS | [run 29435828015](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29435828015) |
| Fresh `pnpm check` from `e054b2b` plus this documentation-only branch | PASS | 118 lessons, 118 quizzes, 35 challenge files, 2 ladders; 43 test files and 172 tests; 243 routes built; 234 Pagefind pages indexed |
| Fresh `pnpm audit:prod` | PASS at high threshold | One tracked moderate advisory; zero high/critical advisories |

## Backup and migration evidence

The pre-P2.1 export remains outside the repository in the protected backup set:

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `D:\SecureBackups\ai-roadmap-staging\2026-07-15-pre-p2-1\schema.sql` | 58,952 | `F0E4D126EC69D3F286E5B212606435CBFAA1A3E1E4CA2BBBFB5589AB4A2AA9FB` |
| `D:\SecureBackups\ai-roadmap-staging\2026-07-15-pre-p2-1\data.sql` | 52,386 | `BBF5737E3679BE83D02D695C93AA5D1D19AD65ADF368EFAA7932B4C59A2F1C7C` |

`supabase migration list` reported an exact local/remote match through:

| Version | Purpose | Result |
|---|---|---|
| `202607060001` | User-owned learning data | PASS — local/remote match |
| `202607110001` | LWW progress and practice events | PASS — local/remote match |
| `202607110002` | Progress RPC security correction | PASS — local/remote match |
| `202607120001` | P0 progress hardening | PASS — local/remote match |
| `202607140001` | P1 learning profiles | PASS — local/remote match |
| `202607150001` | P2 project evidence | PASS — local/remote match |
| `202607150002` | P2.1 immutable submission/reviewer workflow | PASS — local/remote match |

A follow-up `supabase db push --dry-run` returned `Remote database is up to date`. The pre-apply dry-run transcript is not stored in this repository, so this record does not claim to reconstruct it after the fact.

## Staging database and security proof

`supabase/tests/p2_submission_review_rls.test.sql` ran through `supabase db query --linked --file ...`. The proof completed successfully inside a transaction and rolled back.

The proof covers:

- the bounded 52-project requirement catalog;
- anonymous RPC denial and browser direct-write denial;
- learner ownership and cross-user read isolation;
- server-derived immutable evidence snapshots;
- rejection of incomplete canonical project-feature progress;
- reviewer allow-list enforcement and queue isolation;
- atomic claim conflicts and reviewer-only decisions;
- required bounded change-request feedback;
- superseding snapshots without mutation of the original;
- approval closing the learner/project workflow.

The post-proof cleanup query returned:

| Fixture class | Remaining rows |
|---|---:|
| Auth users | 0 |
| Reviewer memberships | 0 |
| Submission snapshots | 0 |
| Workflow rows | 0 |
| Submission events | 0 |

No fixture cleanup mutation was necessary because the proof transaction rolled back successfully.

## Reviewer provisioning evidence

A dedicated canary reviewer was created through the Supabase Admin API using a freshly retrieved service-role key. The returned Auth UUID was inserted into `public.project_reviewer_memberships` through the trusted service-role REST path. The generated password was never printed or written to the repository.

The GitHub `staging` environment now contains all four expected protected secret names:

- `PLAYWRIGHT_SMOKE_USER_EMAIL`
- `PLAYWRIGHT_SMOKE_USER_PASSWORD`
- `PLAYWRIGHT_REVIEWER_USER_EMAIL`
- `PLAYWRIGHT_REVIEWER_USER_PASSWORD`

A sanitized follow-up query returned `generated_reviewer_users=1` and `reviewer_memberships=1`. No reviewer UUID, email, password, token, or service-role key is retained in this record.

The first provisioning attempt reached user/membership creation but failed while formatting its sanitized status output. Its compensation path deleted the generated Auth user and both newly written reviewer secrets; a follow-up query proved zero generated users and zero memberships before the successful retry. This rollback evidence is retained to show that partial provisioning does not leave an orphaned reviewer.

## Next operator action

Deploy exact candidate `e054b2b6856dafe91b7e4c5a4e06a3109d0075e3` with `NEXT_PUBLIC_P2_REVIEW_WORKFLOW=true` while keeping LWW progress and P2 evidence enabled. Do not dispatch `p2-review` until the deployment is healthy and `/review/projects` no longer returns the flag-off 404.

## Remaining rollout gates

| Gate | Status |
|---|---|
| Candidate merged and protected/post-merge CI | PASS |
| Backup retained and hashes verified | PASS |
| Seven migrations match local/remote | PASS |
| Transactional P2.1 RLS/RPC proof | PASS |
| Zero proof fixtures after rollback | PASS |
| Dedicated reviewer provisioned | PASS — one generated Auth user and one allow-list membership |
| Protected reviewer secrets configured | PASS — both reviewer secret names present |
| Deploy exact candidate with P2.1 enabled | PENDING |
| Dedicated `p2-review` canary | PENDING |
| Full regression canary | PENDING |
| P2.1-only rollback and `p2-review-rollback` canary | PENDING |
| Restore P2.1 and rerun dedicated canary | PENDING |
| Snapshot/history and seven-migration preservation evidence | PENDING |
| Named release and reviewer-workflow usability sign-off | PENDING |
| Existing P2 rubric/content/moderated-usability sign-off | PENDING |

Do not call P2.1 deployed or broadly released until the pending rollout and human-review gates are recorded with the exact candidate SHA, flag state, reviewer, date, and conclusion.
