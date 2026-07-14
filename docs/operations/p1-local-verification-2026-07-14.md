# P1 Learning Loop Local Verification — 2026-07-14

> **Staging follow-up:** [`p0-p1-staging-verification-2026-07-15.md`](./p0-p1-staging-verification-2026-07-15.md) records the successful P1 staging canary, full canary, and rollback/restore rehearsal for `914bd03`. Broad exposure still requires the named human content/moderated-usability review listed below.

## Decision

**The P1 learning-loop vertical slice passes local implementation gates. It is not ready for release.**

P0 still lacks protected CI, approved staging, and canary evidence. P1 additionally requires its migration and rollout flag to be proven on an approved staging target before exposure to learners.

## Verification context

| Field | Value |
|---|---|
| Branch | `codex/p1-learning-loop` |
| Parent P0 candidate | `7b02c24c14ee89d01cd8e4e59de1f7aabcaca111` |
| Candidate state | Commit containing this report; resolve the immutable SHA with `git rev-parse HEAD` |
| P1 flag used by Playwright build | `NEXT_PUBLIC_P1_LEARNING_LOOP=true` |
| Production/staging action | None |

## Delivered vertical slice

- Versioned eight-question foundation diagnostic assembled from existing reviewed quizzes.
- Privacy-minimal diagnostic persistence: only score, total, completion time, version, and per-topic aggregates.
- Deterministic recommendation priority: failed quiz, weak diagnostic, roadmap order, unfinished project, complete.
- Phase mastery estimate with a separate evidence-confidence label.
- Weekly lesson targets of 3, 5, or 7 using canonical LWW lesson timestamps.
- Anonymous, user-scoped local, and remote field-level LWW merge.
- Owner-read Supabase `learning_profiles` table; writes only through `merge_learning_profile` using `auth.uid()`.
- P1 rollout flag disabled by default.

## Passed gates

| Gate | Result |
|---|---|
| `pnpm check` | PASS — 118 lessons, 118 quizzes, 35 challenge files, 2 ladders; 36 test files and 151 tests; 242 routes built; 234 pages indexed |
| `pnpm test:db` | PASS — all 9 P0 assertions plus 6 P1 learning-profile ownership/validation/LWW assertions |
| `pnpm test:e2e:local` | PASS — 13 passed, 0 skipped |
| P1 anonymous journey | PASS — diagnostic completion, aggregate-only local document, weekly-goal persistence after reload |
| P1 authenticated journey | PASS — anonymous goal merges on sign-in and loads in a second browser context |
| `pnpm audit:prod` | PASS at high threshold — no high/critical advisory; one tracked moderate advisory remains |

## Security and privacy evidence

- Anonymous callers have no execute privilege on the profile merge RPC.
- Authenticated callers have no direct insert/update/delete privilege on `learning_profiles`.
- RLS prevents User B from reading User A's profile.
- The RPC derives ownership exclusively from `auth.uid()` and has no user-id input.
- Stale field timestamps cannot overwrite newer goal or diagnostic fields.
- Unknown diagnostic keys, including `selectedAnswers`, are rejected by SQL.
- Oversized or inconsistent diagnostic payloads are rejected atomically.
- Client parsing also strips unknown fields and never serializes selected answers.

## Remaining release gates

1. Configure a Git remote, push the exact candidate SHA, and retain protected CI evidence.
2. Finish the P0 staging and worker → LWW → ladder canaries before enabling P1.
3. Apply `202607140001_p1_learning_profiles.sql` to approved staging through the reviewed change process.
4. Repeat two-user RLS, direct-write denial, anonymous RPC denial, stale-write, and answer-bearing-payload tests on staging.
5. Build/redeploy with the complete flag state recorded and enable `NEXT_PUBLIC_P1_LEARNING_LOOP=true` only for the P1 canary.
6. Run all 13 browser journeys against the deployed target with zero skips and inspect redacted diagnostics.
7. Conduct a content review/moderated usability pass for the eight diagnostic questions before broad rollout.

## Known limitations

- Recommendations are intentionally deterministic and do not yet use a full prerequisite graph.
- Weekly progress counts currently completed lesson items whose latest LWW timestamp falls in the local week; it is not an event-history streak.
- Mastery is an estimate, not verified competence. Confidence describes evidence coverage, not certainty of the score.
- The first diagnostic covers eight foundation signals and is not comprehensive across all 118 topics.
