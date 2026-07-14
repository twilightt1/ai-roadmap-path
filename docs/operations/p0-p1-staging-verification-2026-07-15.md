# P0/P1 staging verification — 2026-07-15

## Decision

**Technical staging rollout: PASS, ready for named human release sign-off.**

- P0 worker execution, LWW progress, practice ladder, and personal-library flows passed staged and full canaries.
- P1 diagnostic/learning-loop flows passed the staged canary and the post-rollback restore canary.
- The non-destructive rollback rehearsal passed without changing the database schema or clearing browser progress/outbox storage.
- Broad P1 exposure is **not** approved by this technical record alone. A named human reviewer must still complete the content/moderated-usability review of the eight diagnostic questions described in `p1-local-verification-2026-07-14.md`.

This report is sanitized. It contains no smoke-user credentials, tokens, cookies, service-role keys, learner notes, learner code, or quiz answers.

## Release context

| Field | Value |
|---|---|
| Candidate SHA | `914bd03297259971580a54a693d5eecb78f6e7e7` |
| Candidate PR | [#8 — reusable full-canary state determinism](https://github.com/twilightt1/ai-roadmap-path/pull/8) |
| Approved application target | `https://ai-roadmap-path.vercel.app` |
| Approved Supabase target | staging project ref `suwtvxmvkfiifgnlmmtk` |
| Verification window | `2026-07-14T20:29Z`–`2026-07-14T20:48Z` (`2026-07-15`, Asia/Saigon) |
| Release operator | User deployment operator plus Codex verification automation |
| Required final reviewer | Named human release/content reviewer — pending |
| Normal complete flag state | worker=`true`; LWW=`true`; ladder=`true`; P1 learning loop=`true` |
| Rollback rehearsal state | worker=`true`; LWW=`true`; ladder=`true`; P1 learning loop=`false` |

## Backup and migration evidence

The pre-rollout staging export was retained outside the repository:

| Artifact | SHA-256 |
|---|---|
| `D:\SecureBackups\ai-roadmap-staging\2026-07-15-pre-p0-p1\data.sql` | `479AB0E134CB9056597C1748F3977CE69D8ECAD527FA99ECB87D53CA28AADF0C` |
| schema export in the same protected backup set | `50536C65AD1E7F9C4195D6E9710B4BD5A8D69B7D6F28467E195128CBB7BC5E35` |

The linked migration history matched local and remote before rollout, after the full canary, and during rollback rehearsal:

| Version | Purpose | Result |
|---|---|---|
| `202607060001` | User-owned learning data | PASS — local/remote match |
| `202607110001` | LWW progress and practice events | PASS — local/remote match |
| `202607110002` | Progress RPC security correction | PASS — local/remote match |
| `202607120001` | P0 progress hardening | PASS — local/remote match |
| `202607140001` | P1 learning profiles | PASS — local/remote match |

No destructive migration, schema rollback, RPC removal, RLS removal, or user-data deletion was performed.

## Database and security proof

`supabase/tests/staging_security_proof.sql` ran transactionally against the linked staging project and rolled back its fixtures. The proof covered:

- owner-scoped authenticated operations;
- cross-user isolation;
- anonymous write and RPC denial;
- ownership derived from `auth.uid()` rather than client-supplied identity;
- unauthorized role/path rejection;
- P1 learning-profile validation and stale-write behavior.

All assertions passed, the transaction rolled back, and post-proof cleanup counts were zero. The reviewed proof entered `main` through [PR #4](https://github.com/twilightt1/ai-roadmap-path/pull/4).

## CI and canary evidence

| Gate | Result | Evidence |
|---|---|---|
| Protected PR checks for the final fix | PASS — Quality, Database integration, Dependency audit, Browser smoke | [PR check run 29365219253](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29365219253) |
| Post-merge checks on `main@914bd03` | PASS — all four required checks; Browser smoke `14 passed` | [main run 29365494343](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29365494343) |
| Baseline worker/anonymous canary | PASS | [run 29357975059](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29357975059) |
| LWW canary | PASS — `2 passed`, zero authenticated skips | [run 29358909936](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29358909936) |
| Ladder/personal-library canary | PASS — `5 passed`, zero failed/flaky/skipped; disposable note/snippet cleanup completed | [run 29361539416](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29361539416) |
| P1 learning-loop canary | PASS — `2 passed`, zero skips | [run 29361852472](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29361852472) |
| Final full canary on all four enabled flags | PASS — `14 passed (1.4m)`, zero failed/flaky/skipped | [run 29365871976](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29365871976) |

The earlier full run [29361972625](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29361972625) is intentionally retained as failed evidence. It exposed reusable-user races in bookmark state and same-user progress hydration. The release remained blocked until the fixes in PR #8 passed repeated local E2E, protected CI, post-merge CI, and the final full staging canary.

## Reusable-user race regression evidence

The final candidate includes the following corrections:

- bookmark writes express the desired state and use insert-ignore-conflict plus owner-scoped select under the existing narrow RLS policy;
- bookmark UI waits for the current user/target remote state before enabling interaction;
- a mutation queued while a progress flush is active triggers a follow-up flush;
- repeated same-user hydration merges the remote snapshot into the latest local state rather than overwriting a newer mutation/outbox entry;
- cross-context E2E verification isolates its observer from BroadcastChannel so convergence must come from Supabase.

Verification before PR creation:

- `pnpm check`: PASS — 154 unit tests, production build, 242 generated routes, 234 Pagefind-indexed pages;
- repeated local practice/library plus progress group: PASS — `12 passed`, zero failures/skips/flaky;
- protected and post-merge Browser smoke: PASS — `14 passed` in each run.

## Non-destructive rollback rehearsal

The operator rebuilt/redeployed the same candidate with only `NEXT_PUBLIC_P1_LEARNING_LOOP=false`; all three P0 flags remained `true`.

Rollback-state observations:

- root and `/dashboard`: HTTP 200;
- `/diagnostic`: HTTP 404;
- learning-loop widget absent and dashboard fallback present;
- all five linked migrations still matched local/remote;
- no browser storage-clear, database rollback, migration removal, or data cleanup command was executed;
- LWW authenticated canary: PASS — `2 passed`, proving progress sync/offline-outbox journeys remained operational under the rollback state ([run 29366649025](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29366649025)).

The operator then restored `NEXT_PUBLIC_P1_LEARNING_LOOP=true` and redeployed the same SHA:

- `/diagnostic`: HTTP 200 with diagnostic UI present;
- restored P1 canary: PASS — `2 passed`, zero skips/failures ([run 29367067248](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29367067248)).

Rollback rehearsal result: **PASS**.

## Final gate status

| Gate | Status |
|---|---|
| Backup/export retained and hashed | PASS |
| Additive migrations applied and history matched | PASS |
| Staging RLS/RPC/P1 security proof | PASS |
| Protected candidate CI | PASS |
| Worker → LWW → ladder → P1 staged canaries | PASS |
| Full all-flags canary | PASS |
| Non-destructive rollback and restore rehearsal | PASS |
| Named human release review | PENDING |
| P1 diagnostic content/moderated-usability review | PENDING |

The technical implementation may proceed to human sign-off. Do not describe P1 as broadly released or content-approved until both pending human-review rows are completed and recorded.
