# P2 Project Evidence staging verification — 2026-07-15

## Decision

**Technical staging rollout: PASS, ready for named human release and rubric/usability review.**

- The additive P2 migration, staging security proof, dedicated P2 journey, full regression canary, rollback canary, and post-restore P2 canary passed.
- The rollback rehearsal changed only `NEXT_PUBLIC_P2_PROJECT_EVIDENCE`; it did not roll back schema or delete saved evidence.
- Broad P2 exposure is **not** approved by this technical record alone. A named human reviewer must still assess the evidence rubric, learner-facing language, and moderated usability.
- “Ready for manual review” means that the required evidence fields are complete. It does not verify correctness, originality, security, mastery, or the contents of learner-supplied URLs.

This report is sanitized. It contains no smoke-user credentials, tokens, cookies, service-role keys, repository URLs, demo URLs, or learner reflection text.

## Release context

| Field | Value |
|---|---|
| Candidate SHA | `0c8b620970b4ee046721bc3fafd210670547068d` |
| Implementation PR | [#10 — P2 project evidence](https://github.com/twilightt1/ai-roadmap-path/pull/10) |
| Staging-proof compatibility PR | [#11 — staging-compatible P2 database proof](https://github.com/twilightt1/ai-roadmap-path/pull/11) |
| Approved application target | `https://ai-roadmap-path.vercel.app` |
| Approved Supabase target | staging project ref `suwtvxmvkfiifgnlmmtk` |
| Canary window | `2026-07-15T16:05Z`–`2026-07-15T16:18Z` (`2026-07-15`, Asia/Saigon) |
| Release operator | User deployment operator plus Codex verification automation |
| Required final reviewers | Named release reviewer and P2 rubric/usability reviewer — pending |
| Normal complete flag state | worker=`true`; LWW=`true`; ladder=`true`; P1 learning loop=`true`; P2 project evidence=`true` |
| Rollback rehearsal state | all prior flags=`true`; P2 project evidence=`false` |

## Backup and migration evidence

The pre-P2 staging export remains outside the repository in the protected backup set:

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `D:\SecureBackups\ai-roadmap-staging\2026-07-15-pre-p2\schema.sql` | 50,210 | `1AC07346DEC2329A34C592F227E228026084A2A1AE18DFF01E31EA933F5C6FD8` |
| `D:\SecureBackups\ai-roadmap-staging\2026-07-15-pre-p2\data.sql` | 42,900 | `465E20F52D221547B2DDE8E1E349C0AA37A360F6DC1F8A6CDAF238693D102360` |

`supabase db push --dry-run` selected only `202607150001_p2_project_evidence.sql`. After the reviewed push, local and remote migration history matched through all six migrations:

| Version | Purpose | Result |
|---|---|---|
| `202607060001` | User-owned learning data | PASS — local/remote match |
| `202607110001` | LWW progress and practice events | PASS — local/remote match |
| `202607110002` | Progress RPC security correction | PASS — local/remote match |
| `202607120001` | P0 progress hardening | PASS — local/remote match |
| `202607140001` | P1 learning profiles | PASS — local/remote match |
| `202607150001` | P2 project evidence | PASS — local/remote match |

No destructive migration, schema rollback, RPC removal, RLS removal, or user-data deletion was performed.

## Database and security proof

`supabase/tests/p2_project_evidence_rls.test.sql` ran transactionally against the linked staging project through the Supabase Management API. The proof covered:

- owner-scoped reads and authenticated merge operations;
- anonymous RPC denial and authenticated direct-write denial;
- cross-user read isolation;
- ownership derived from `auth.uid()` rather than client-supplied identity;
- independent field-level LWW behavior;
- catalog-bounded project IDs, finite timestamps, valid HTTPS URLs, and bounded reflection text.

All assertions passed and the transaction rolled back. A follow-up cleanup query returned `fixture_users=0` and `fixture_evidence=0`. The proof's Management API compatibility change entered `main` through PR #11.

## CI and canary evidence

| Gate | Result | Evidence |
|---|---|---|
| Protected P2 implementation checks | PASS — Quality, Database integration, Dependency audit, Browser smoke | [run 29411260977](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29411260977) |
| Post-merge implementation checks | PASS | [run 29411545409](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29411545409) |
| Protected staging-proof checks | PASS — all four required jobs | [run 29412131204](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29412131204) |
| Final post-merge checks on `main@0c8b620` | PASS — all four required jobs | [run 29412381985](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29412381985) |
| P2 dedicated canary with the complete flag set | PASS | [run 29430978422](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29430978422) |
| Full all-flags regression canary | PASS | [run 29431114503](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29431114503) |
| P2-disabled rollback canary | PASS | [run 29431507789](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29431507789) |
| Restored P2 canary | PASS | [run 29431778624](https://github.com/twilightt1/ai-roadmap-path/actions/runs/29431778624) |

Every staging canary above checked out the immutable candidate SHA `0c8b620970b4ee046721bc3fafd210670547068d`.

## Non-destructive rollback and restore rehearsal

Before rollback, staging contained one saved `project_evidence` row. The operator rebuilt and redeployed the same candidate with only `NEXT_PUBLIC_P2_PROJECT_EVIDENCE=false`.

Rollback-state observations:

- the P2 evidence panel was absent;
- the existing project feature checklist remained usable;
- the P2 rollback canary passed;
- the saved evidence count remained one;
- all six migrations continued to match local and remote;
- no browser storage clear, database rollback, migration removal, or data cleanup command was executed.

The operator then restored only `NEXT_PUBLIC_P2_PROJECT_EVIDENCE=true` and redeployed the same SHA. The restored P2 canary passed, the saved evidence count remained one, and all six migrations still matched.

Rollback and restore rehearsal result: **PASS**.

## Final gate status

| Gate | Status |
|---|---|
| Backup/export retained and hashed | PASS |
| Additive migration applied and history matched | PASS |
| Staging RLS/RPC validation proof | PASS |
| Protected and post-merge CI | PASS |
| Dedicated P2 staging canary | PASS |
| Full all-flags regression canary | PASS |
| Non-destructive rollback and restored P2 canary | PASS |
| Named human release review | PENDING |
| P2 rubric/content/moderated-usability review | PENDING |

The technical rollout may proceed to human sign-off. Do not describe P2 as broadly released, learner work as verified, or the rubric as content-approved until both pending human-review rows are completed and recorded.
