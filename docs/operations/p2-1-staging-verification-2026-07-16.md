# P2.1 Submission Review staging verification — 2026-07-16

## Decision

**Pre-deploy staging gates are partially complete. P2.1 must remain disabled until a dedicated reviewer is provisioned and the protected reviewer credentials are configured.**

- Candidate `e054b2b6856dafe91b7e4c5a4e06a3109d0075e3` is merged into `main` and its post-merge CI passed.
- The protected pre-P2.1 backup is present and its hashes were re-verified.
- Staging migration history matches all seven local migrations, including the additive P2.1 migration.
- The P2.1 RLS/RPC proof passed transactionally on staging and left zero fixture records.
- Staging currently has zero reviewer memberships, so the P2.1 flag must not be enabled yet and the learner/reviewer canary cannot run.

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

## Current blocker

A staging count query returned `reviewer_memberships=0`, `submissions=0`, and `submission_events=0`.

Before enabling P2.1:

1. Create or select a dedicated staging reviewer Auth user.
2. Add that user's UUID to `public.project_reviewer_memberships` through a trusted service-role or SQL-editor operation.
3. Store `PLAYWRIGHT_REVIEWER_USER_EMAIL` and `PLAYWRIGHT_REVIEWER_USER_PASSWORD` as protected secrets in the GitHub `staging` environment.
4. Confirm only the membership count, never the reviewer UUID/email/password, in the sanitized release record.

## Remaining rollout gates

| Gate | Status |
|---|---|
| Candidate merged and protected/post-merge CI | PASS |
| Backup retained and hashes verified | PASS |
| Seven migrations match local/remote | PASS |
| Transactional P2.1 RLS/RPC proof | PASS |
| Zero proof fixtures after rollback | PASS |
| Dedicated reviewer provisioned | BLOCKED — zero memberships |
| Protected reviewer secrets configured | PENDING |
| Deploy exact candidate with P2.1 enabled | PENDING |
| Dedicated `p2-review` canary | PENDING |
| Full regression canary | PENDING |
| P2.1-only rollback and `p2-review-rollback` canary | PENDING |
| Restore P2.1 and rerun dedicated canary | PENDING |
| Snapshot/history and seven-migration preservation evidence | PENDING |
| Named release and reviewer-workflow usability sign-off | PENDING |
| Existing P2 rubric/content/moderated-usability sign-off | PENDING |

Do not call P2.1 deployed or broadly released until the pending rollout and human-review gates are recorded with the exact candidate SHA, flag state, reviewer, date, and conclusion.
