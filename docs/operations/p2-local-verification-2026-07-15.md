# P2 Project Evidence Local Verification — 2026-07-15

## Decision

**The first P2 Project Evidence vertical slice passes local implementation gates. It is not yet deployed or approved for broad release.**

Release requires protected CI, the P2 migration on approved staging, exact build-time flag evidence, dedicated and full staging canaries, and a rollback rehearsal. This record does not claim that learner-supplied work has been reviewed or verified.

## Verification context

| Field | Value |
|---|---|
| Branch | `codex/p2-project-evidence` |
| Parent main | `0657e11d480f02b7bb977db9317d16905459c9e2` |
| Candidate state | Commit containing this report; resolve the immutable SHA with `git rev-parse HEAD` |
| P2 flag used by Playwright build | `NEXT_PUBLIC_P2_PROJECT_EVIDENCE=true` |
| Production/staging action | None |

## Delivered vertical slice

- Private project evidence panel on `/projects/[id]` behind a disabled-by-default P2 flag.
- Deterministic rubric using existing feature completion, repository evidence, and bounded reflection.
- Optional demo evidence that improves reviewability without pretending every project must have a hosted UI.
- Anonymous local persistence, user-scoped local persistence, and anonymous-to-account merge.
- Independent LWW timestamps for repository, demo, and reflection fields.
- Owner-read Supabase `project_evidence` table; writes only through `merge_project_evidence` using `auth.uid()`.
- Sanitized sync diagnostics that contain error class only, never URL or reflection content.
- Dedicated `p2` staging-canary workflow option.

## Passed gates

| Gate | Result |
|---|---|
| `pnpm check` | PASS — 118 lessons, 118 quizzes, 35 challenge files, 2 ladders; 40 test files and 164 tests; 242 routes built; 234 pages indexed |
| `pnpm test:db` | PASS — all P0 progress, P1 learning-profile, and P2 project-evidence ownership/validation/LWW assertions |
| `pnpm test:e2e:local` | PASS — 16 passed, 0 skipped |
| P2 anonymous journey | PASS — rejects unsafe URL, saves bounded evidence, derives readiness, and survives reload |
| P2 authenticated journey | PASS — materializes anonymous evidence under the user, calls the merge RPC, and loads it in a second browser context |
| `pnpm audit:prod` | PASS at high threshold — no high/critical advisory; one tracked moderate advisory remains |

## Security and privacy evidence

- Anonymous callers have no execute privilege on the project-evidence merge RPC.
- Authenticated callers have no direct insert/update/delete privilege on `project_evidence`.
- RLS prevents User B from reading User A's project evidence.
- The RPC derives ownership exclusively from `auth.uid()` and has no user-id input.
- Repository, demo, and reflection merge independently; an older field cannot replace its newer remote value.
- URL, project-id, timestamp, and reflection bounds are validated before an atomic upsert.
- Client parsing rejects malformed remote rows and strips unknown fields.
- Observability receives no learner URL or reflection text.

## Remaining release gates

1. Push the immutable candidate and retain protected CI evidence for quality, database, browser, and dependency jobs.
2. Apply `202607150001_p2_project_evidence.sql` to approved staging through the reviewed migration process.
3. Repeat anonymous denial, direct-write denial, two-user RLS, field-level stale-write, malformed-URL, and oversized-reflection checks on staging.
4. Build and redeploy the complete flag state with `NEXT_PUBLIC_P2_PROJECT_EVIDENCE=true`; record all P0, P1, and P2 values and deployment/SHA proof.
5. Run the dedicated `p2` staging canary with both journeys executed and zero skips.
6. Run the `full` staging canary and confirm P0/P1 behavior remains green.
7. Rebuild/redeploy with only `NEXT_PUBLIC_P2_PROJECT_EVIDENCE=false`, confirm the panel is absent while project checklists remain usable, and confirm the additive migration and saved evidence remain intact.
8. Restore P2 only after the rollback rehearsal passes and record the restored canary result.
9. Conduct a named human rubric/usability review before broad exposure.

## Known limitations and next P2 slice

- URLs are learner-supplied references; the application does not fetch or verify their content.
- “Ready for manual review” means evidence completeness only, not correctness, originality, security, or mastery.
- There is no immutable submission snapshot, reviewer assignment, comments, approval state, or moderation queue yet.
- Evidence is private; public portfolio publishing and granular sharing consent remain future work.
- The next P2 slice should add a deliberate submission snapshot and reviewer workflow before building portfolio output.
