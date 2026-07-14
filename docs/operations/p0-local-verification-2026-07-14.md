# P0 Local Verification — 2026-07-14

## Decision

**Local implementation gates pass. The candidate is ready for protected CI, but P0 is not ready for release yet.**

This report is stored in the candidate commit whose tree was verified locally. Resolve its immutable SHA with `git rev-parse HEAD`. Release readiness still requires protected CI evidence, approved staging migration and two-user RLS/RPC proof, authenticated deployed-target evidence, observability review, and all three canary stages.

## Verification context

| Field | Value |
|---|---|
| Branch | `codex/p0-integration` |
| Parent HEAD | `1ca8a00` |
| Candidate state | Commit containing this report; immutable once created |
| Runtime | Windows; Node `v24.2.0`; pnpm `10.5.2` |
| Local data stack | Supabase CLI `2.109.1`; Docker client/server `29.3.1`; PostgreSQL client `18.1` |
| Public flags used by local Playwright web server | worker `true`; LWW `true`; ladder `true` |
| Production/staging action | None |

## Passed local gates

| Gate | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm check` | PASS — 118 lessons, 118 quizzes, 35 challenge files, 2 ladders; 31 test files and 134 tests; 241 routes built; 234 pages indexed |
| `pnpm audit:prod` | PASS at high threshold — no high/critical advisory; one tracked moderate advisory remains in `dependency-risk-register.md` |
| `pnpm test:db` | PASS — legacy backfill, owner reads, cross-user write/delete rejection, anon RPC denial, RPC ownership, role-escalation prevention, retry idempotency, explicit uncomplete LWW, and epoch-reset rejection |
| `pnpm test:e2e:local` | PASS — 11 passed, 0 skipped; anonymous learning, anonymous-to-authenticated merge, ladder/walkthrough, login gate, authenticated bookmark/library, authenticated cross-context/offline progress, JavaScript isolation/limits, SQL runtime, and Python timeout |
| `git diff --check` | PASS |

`test:e2e:local` reads only the loopback Supabase status, refuses non-loopback API URLs, creates a random disposable smoke user, passes credentials through child-process environment only, and deletes the user in `finally`.

## Defects found and corrected during verification

- Replaced the nonexistent SQL.js `Statement.getValues()` call with `Statement.get()` and proved it against the external SQL.js runtime.
- Migrated deprecated Next.js `middleware.ts` convention to `proxy.ts`.
- Added versioned local Supabase configuration and disabled unrelated local services.
- Made the DB harness safe for Windows workspace paths containing spaces.
- Removed a PL/pgSQL `event_id` ambiguity and added explicit Data API grants while retaining RLS/RPC as the ownership boundary.
- Corrected an invalid array-membership assertion in the DB test itself.
- Added a deterministic post-login redirect and made Playwright wait for completed authentication.
- Made every authenticated transition merge the remaining anonymous local document idempotently before clearing it, so sign-in cannot discard offline guest progress.
- Fixed same-user auth hydration generation capture so stale loads cannot overwrite newer local work.
- Preserved online retry signals that arrive while an offline flush is still settling.
- Added explicit RPC barriers to the cross-context E2E journey so pre-hydration UI cannot create false passes.
- Replaced `[object Object]` user-facing API failures with bounded structured error messages.
- Changed CI browser smoke to create a disposable local user and enforce zero authenticated skips.

## Remaining release blockers

1. Push the immutable candidate SHA and run all protected CI jobs for that exact SHA.
2. Apply the four migrations to an approved staging project through the reviewed change process.
3. Repeat two-user cross-account RLS, anonymous-write rejection, RPC ownership, and role-escalation checks on staging.
4. Run authenticated E2E against the prebuilt deployed target with exact flag-state and deployment proof.
5. Complete the manual post-migration bookmark, note, and snippet regression documented in the runbook.
6. Review actual staging/canary diagnostics for redaction and attach reviewer-accessible evidence.
7. Promote worker, LWW, then ladder flags through the three canary stages; do not enable LWW before staging RLS/RPC proof passes.

## Non-blocking tracked risks

- Pagefind does not stem Vietnamese; indexing succeeds, but root-word matching is limited.
- The moderate transitive PostCSS advisory remains accepted temporarily and tracked with a review date.
