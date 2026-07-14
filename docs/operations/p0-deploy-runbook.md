# P0 Staging Deploy and Rollback Runbook

Use this reusable procedure for a named P0 candidate. It is not evidence that any release has passed.

## Release record

Complete this record before beginning and retain it with the release evidence.

| Field | Value |
|---|---|
| Candidate SHA | `<fill at release time>` |
| Release operator | `<fill at release time>` |
| Reviewer | `<fill at release time>` |
| Approved Supabase environment | `<fill at release time>` |
| Release window | `<fill at release time>` |
| Evidence report | `docs/operations/p0-verification-report.md` (or approved reviewer-accessible evidence link) |

## Non-negotiable stop rule

**Do not promote** if any required preflight, migration verification, RLS assertion, authenticated E2E journey, dependency audit, or canary smoke check is failed or **BLOCKED**. Record the result and evidence link in the release report, keep the release at **P0 Not Ready**, and follow rollback/recovery where applicable. A blocked dependency, environment, credential, service, command, or assertion is not a skipped check.

## Ownership, prerequisites, and data safety

Before the release window, the operator must have all of the following:

- An approved, identifiable staging or disposable local Supabase environment. Record its project/environment name in the release record; do not use an unapproved target.
- A pre-migration **non-destructive** backup/export reference (for example, approved backup job ID, export artifact path, or change record), stored with the release evidence.
- Two separate authenticated test users (User A and User B) for independent staging isolation checks.
- Smoke-user credentials available only through approved local or CI secret handling for Playwright.
- Reviewer-accessible, protected evidence storage for sanitized command output, CI runs, and redacted diagnostics.

- Never put `SUPABASE_SERVICE_ROLE_KEY`, access tokens, cookies, passwords, or raw learner content in this runbook, the verification report, browser environment variables, screenshots, or commit messages.
- `scripts/run-supabase-tests.mjs` resets the local database while staging legacy data. Run it only against disposable local Supabase; do not point it at staging or production.
- Browser-exposed variables may use only the public feature switches listed in `lib/feature-flags.ts`.

Use stable platform error codes and typed/redacted diagnostics in release artifacts. Do not put secrets, service-role credentials, tokens, cookies, passwords, raw learner code, notes, or quiz content in documentation, browser environment, screenshots, or commits.

## Preflight gates

Run all commands from the repository root at the candidate SHA. Save sanitized output to the evidence location and require exit code `0` from every command before migration or canary work begins.

Provision `PLAYWRIGHT_SMOKE_USER_EMAIL`, `PLAYWRIGHT_SMOKE_USER_PASSWORD`, and `PLAYWRIGHT_BASE_URL` before this step through the approved secret manager/CI protected environment or approved shell-safe secret-loading mechanism. Do not type, paste, quote, or export credential values in an interactive shell or documentation.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm audit:prod
pnpm test:db
node -e "const required=['PLAYWRIGHT_SMOKE_USER_EMAIL','PLAYWRIGHT_SMOKE_USER_PASSWORD','PLAYWRIGHT_BASE_URL']; const missing=required.filter((name)=>!process.env[name]?.trim()); if (missing.length) { console.error('Required Playwright environment variables are missing or empty: '+missing.join(', ')); process.exit(1); }"
pnpm test:e2e
```

The Node validation prints only missing variable names, never their values. `PLAYWRIGHT_BASE_URL` must be provisioned as the approved preview or staging URL; a missing or empty value is **BLOCKED** so E2E cannot silently fall back to localhost or another default. The report uses the same approved secret-manager/CI or shell-safe secret-loading requirement; no command or artifact may contain the values.

| Gate | Required outcome |
|---|---|
| `pnpm install --frozen-lockfile` | Dependency installation exactly matches the lockfile. |
| `pnpm check` | Passes content validation, TypeScript checking, linting, unit tests, and the production build (`check:fast` plus `build`). |
| Root quality-script scope | The source-alignment inspection below confirms the root quality chain excludes `.worktrees` and generated output, and the root `pnpm check` exits 0. |
| Content negative-validation fixture | The focused content-validation test passes while proving malformed and orphaned fixture content produces validation failures; it leaves no bad repository content. |
| Client test-description truth boundary | The documented client/docs phrase searches are reviewed manually; no learner-facing test description claims tests are secure, hidden, or verified. |
| `pnpm audit:prod` | No high or critical production dependency finding. The accepted moderate PostCSS advisory remains recorded in `docs/operations/dependency-risk-register.md`; its review does not waive this high/critical gate. |
| `pnpm test:db` | Passes against a running disposable **local** Supabase stack. If the stack, Supabase CLI, `psql`, or DB URL is unavailable, the result is **BLOCKED**, not skipped. This script resets the local DB and must never target staging or production. |
| Authenticated `pnpm test:e2e` | The smoke-user validation passes with both required variables non-empty, and the suite passes against `PLAYWRIGHT_BASE_URL` using those variables. Do not record their values. Required authenticated journeys must report **zero skips**; Playwright exit code `0` alone is insufficient. If credentials, approved URL, or required-journey execution is unavailable, mark **BLOCKED**. |

Record each command, timestamp, environment, exit status, artifact link, and operator in the evidence report. A failing or blocked row invokes the stop rule.

## Migration and staging security validation

### 1. Establish migration readiness

1. Confirm the approved environment and pre-migration backup/export reference in the release record.
2. Inspect the candidate migration inventory and verify it is additive; do not approve a release that depends on destructive schema changes. The named migrations below must not drop or remove user-owned progress data, tables, columns, history, or schema. A reviewed, data-preserving replacement of a security policy, trigger, or function is permitted only through a reviewed migration and only when it preserves user-owned progress data and history.
3. Apply the migrations through the approved Supabase change process in this exact filename order:

```text
202607060001_user_data.sql
202607110001_progress_lww_practice_events.sql
202607110002_fix_progress_rpc_security.sql
202607120001_p0_progress_hardening.sql
```

4. Query or inspect the approved environment migration history and record the deployed versions, change reference, timestamp, operator, and evidence location.
5. Verify all expected versions are present before enabling any remote-progress functionality. A missing, out-of-order, failed, or non-additive migration is **BLOCKED**.

### 2. Perform two-user staging security checks

Use User A and User B, with separate authenticated sessions, against the approved staging environment. Record only sanitized results and stable/redacted error references.

1. Create or identify distinct progress records for each user.
2. Prove User A cannot read, insert, update, or delete User B's user-owned progress; repeat the reciprocal attempt for User B where applicable.
3. Attempt an anonymous write to user-owned progress records and verify it is rejected.
4. Call the relevant progress RPC with a mismatched client-supplied user ID and verify ownership derives from `auth.uid()`, not the request's claimed user ID.
5. Attempt role escalation or use of an unauthorized role/path and verify it is rejected.
6. Verify expected authenticated, owner-scoped operations still work and record the migration/RLS evidence.

Any failed or blocked assertion blocks `NEXT_PUBLIC_P0_LWW_PROGRESS` and therefore blocks promotion. Do not attempt destructive schema rollback.

## Canary rollout

Record the deployed SHA, migration inventory, environment, flag values, release timestamp, and evidence URL for every stage. `lib/feature-flags.ts` currently defaults worker execution to `true`; LWW remote progress and practice ladder default to `false`. Record actual deployed values explicitly—never infer them from defaults. Where a candidate has a tested documented default, its initial state must still be recorded.

`NEXT_PUBLIC_*` flags are build-time values embedded in the client bundle, not runtime switches. For every complete three-flag state, build and redeploy the candidate with that exact state, then verify the deployed bundle or deployment configuration at runtime before running smoke checks. Record the build/deployment evidence with the state; do not treat a changed environment variable without a rebuild/redeploy as an applied flag change.

Before Stage 1, complete and record the mandatory baseline full three-flag state: `NEXT_PUBLIC_P0_WORKER_EXECUTION=true` **only when relying on the tested, documented default**; `NEXT_PUBLIC_P0_LWW_PROGRESS=false`; and `NEXT_PUBLIC_P0_PRACTICE_LADDER=false`. Do not begin Stage 1 until this complete state is built, redeployed, runtime/deployment-verified, and recorded in the evidence report. At every stage transition, build and redeploy the complete three-flag state, verify it at runtime/deployment, and record the complete three-flag state again, including flags whose values did not change.

Run stages in order; do not move to a later stage when the current one is failed or blocked.

### Required authenticated canary command context (Stages 2 and 3)

Before each Stage 2 or Stage 3 command, the operator must: (1) build and redeploy the named candidate with that stage's **complete** three-flag state; (2) verify and record the deployed SHA, approved `PLAYWRIGHT_BASE_URL`, and runtime/deployment flag proof; (3) confirm the approved staging RLS/RPC prerequisite is `PASS` for Stage 2; and (4) provision the smoke-user variables only through the approved secret manager/CI protected environment or approved shell-safe secret-loading mechanism. Never print, paste, or record their values.

In that already-provisioned shell/CI context, run this validation before every required authenticated command:

```bash
node -e "const required=['PLAYWRIGHT_SMOKE_USER_EMAIL','PLAYWRIGHT_SMOKE_USER_PASSWORD','PLAYWRIGHT_BASE_URL']; const missing=required.filter((name)=>!process.env[name]?.trim()); if (missing.length) { console.error('Required Playwright environment variables are missing or empty: '+missing.join(', ')); process.exit(1); }"
```

The validation reports only missing names. `PLAYWRIGHT_BASE_URL` must identify the already prebuilt/redeployed approved target; do not allow Playwright to start its local `webServer` fallback. A missing variable, target mismatch, absent deployment/runtime proof, or prerequisite failure is **BLOCKED**.

**Zero-skip policy:** required authenticated canary journeys are mandatory, not optional environment-gated checks. The current test files contain `test.skip` guards when smoke credentials are absent; the validation above prevents those guards from being used as a pass condition. The required command's Playwright output must show zero skipped tests for its required authenticated journey. A zero command exit with a skipped authenticated journey is **BLOCKED**.

#### Stage 2 exact command and required execution

With `NEXT_PUBLIC_P0_LWW_PROGRESS=true` in the verified, prebuilt/redeployed target and Stage 1 plus staging RLS/RPC rows `PASS`, run:

```bash
pnpm exec playwright test e2e/progress-sync.spec.ts --project=chromium
```

This must execute `authenticated progress sync › syncs a completion across contexts and preserves an offline mutation`—the existing authenticated multi-context/multi-tab progress sync and offline retry test. Attach its sanitized Playwright report and redacted diagnostics.

#### Stage 3 exact commands and explicit notes/snippets regression

With `NEXT_PUBLIC_P0_WORKER_EXECUTION=true` and `NEXT_PUBLIC_P0_PRACTICE_LADDER=true` in the verified, prebuilt/redeployed target, run:

```bash
pnpm exec playwright test e2e/anonymous-learning.spec.ts e2e/practice-library.spec.ts --project=chromium
```

This must execute all anonymous tests plus `authenticated library › allows a learner to bookmark a challenge and view it in the library`. Existing Playwright coverage is limited to bookmark persistence; it does **not** exercise notes or snippets. After the command, in the same authenticated smoke-user session complete and sign the following manual regression record:

1. Open `/practice/python-fibonacci`; select **Lưu challenge**, confirm **Đã lưu challenge**, and later verify the bookmark in `/library`.
2. Open `/phase/phase-1-programming/python-fundamentals`; enter a disposable non-sensitive note in **Nội dung ghi chú mới**, select **Thêm ghi chú**, edit it with **Sửa**/**Lưu**, then delete it with **Xóa**. Confirm the note appears in `/library` before deletion and is absent after deletion.
3. Return to `/practice/python-fibonacci`; use the challenge editor's **Lưu snippet**, enter a disposable non-sensitive title, select **Lưu**, and verify the snippet appears in `/library`; delete the disposable snippet there. Do not retain code or note text in the evidence.

Record only test-user aliases, timestamps, operation outcomes, counts, stable error codes, and redacted UI state. Include the candidate SHA, migration-history reference, target/flag proof, and operator/reviewer. An unsuccessful operation, a missing expected library result, incomplete cleanup, or any required authenticated skip is **BLOCKED**. Mirror this evidence in the `Post-migration authenticated bookmarks, notes, and snippets regression` and Stage 3 rows of `docs/operations/p0-verification-report.md`.

| Stage | Enabled variable | Smoke / observability checks | Promote only when |
|---|---|---|---|
| 1 — worker | `NEXT_PUBLIC_P0_WORKER_EXECUTION=true` | Run `PLAYWRIGHT_RUN_EXTERNAL_RUNTIME=true pnpm exec playwright test e2e/runner-isolation.spec.ts --project=chromium` from a POSIX shell/CI runner. Inspect only redacted runner timeout/execution error codes and relevant observability for correlation, timeout/restart, JavaScript isolation from `window`/`localStorage`, output limits, and stale-response handling. | The required runner test actually runs with the external runtime and **zero skips**; UI remains responsive; JavaScript cannot access `window` or `localStorage`; output limits and stale responses behave as tested; no unredacted diagnostics appear. |
| 2 — LWW | `NEXT_PUBLIC_P0_LWW_PROGRESS=true` | On the **prebuilt/redeployed** LWW=true target, after the Stage 2 secret/target validation below, run `pnpm exec playwright test e2e/progress-sync.spec.ts --project=chromium`. This executes the authenticated `syncs a completion across contexts and preserves an offline mutation` journey, including cross-context/multi-tab propagation and offline retry. Inspect only redacted progress outbox and auth-invalidation signals. | Staging RLS/RPC prerequisite remains PASS; the exact LWW=true deployment/runtime evidence exists; the required authenticated progress/multi-tab journey runs with **zero skips**; and ordering, retry/idempotency, cross-tab propagation, merge/auth invalidation, and authenticated sync pass with no unredacted diagnostics. |
| 3 — ladder | `NEXT_PUBLIC_P0_PRACTICE_LADDER=true` (retain `NEXT_PUBLIC_P0_WORKER_EXECUTION=true`) | On the **prebuilt/redeployed** worker=true, ladder=true target, after the Stage 3 secret/target validation below, run `pnpm exec playwright test e2e/anonymous-learning.spec.ts e2e/practice-library.spec.ts --project=chromium`, then execute the explicit authenticated bookmark/note/snippet regression below. This is distinct from baseline anonymous regression smoke. Inspect only privacy-safe practice events and stable error codes. | Every anonymous journey and the required authenticated bookmark journey run with **zero skips**; the explicit note/snippet regression passes; ladder/walkthrough and personal-library flows pass with worker=true/ladder=true deployment/runtime proof and without challenge, library, or progress regression. |

At each stage: capture sanitized smoke output and observations, assess hold/promote, and update the evidence report. A blocking regression freezes promotion and follows rollback.

## Promote

Promote only after every required verification-report row is PASS or an approved N/A, including staging migration/RLS proof, authenticated E2E proof, and all three canary stages. Record candidate SHA, approved environment, active flags, migration versions, CI/artifact URLs, release operator, reviewer, and timestamp. Continue monitoring redacted error signals through the release window.

## Roll back application behavior

1. Freeze promotion and capture the failing URL, timestamp, stable platform error code, active flags, SHA, affected environment, and sanitized evidence link.
2. Disable only the implicated public feature switch when that safely restores service. Otherwise, redeploy the prior **compatible** application SHA.
3. Keep all additive P0 migrations in place. Never drop or remove user-owned progress data, tables, columns, schema, or history as rollback. Do not remove P0 RPCs or RLS policies as rollback. A reviewed, data-preserving replacement of a security policy, trigger, or function may be applied only through a reviewed migration that preserves user-owned progress data and history.
4. Preserve local client progress and local outbox entries; do not clear them as rollback. Allow a compatible client to reconcile them.
5. Re-run the affected smoke journey after the flag change or compatible redeploy.
6. Update the verification report result to **BLOCKED** until a corrected candidate passes; record rollback state, owner, and next action.

## Incident handoff checklist

Before handing off, provide the next owner and reviewer with:

- Exact sanitized reproduction steps, failing URL, timestamp, and affected user population/environment.
- Candidate SHA and prior compatible SHA; deployed migration inventory and change/backup-export references.
- Every active public feature-flag value and the implicated flag/stage.
- Failed or blocked gate, command/manual assertion, result, and reviewer-accessible output location.
- Stable platform error codes and redacted log/trace reference; never raw learner content or credentials.
- Rollback decision and current state, affected smoke retest result, and confirmation that migrations and local progress/outbox were preserved.
- Named owner, next decision time, next corrective action, and release-report update location.

## Source-alignment verification

Before publishing or updating this runbook, run the following read-only checks from the candidate repository root. Save sanitized output and a reviewer record with the release evidence; do not put secrets in commands, outputs, or records.

### Flag, script, and migration alignment

```bash
rg -n "NEXT_PUBLIC_P0_(WORKER_EXECUTION|LWW_PROGRESS|PRACTICE_LADDER)" lib/feature-flags.ts playwright.config.ts
rg -n '"(test:db|test:e2e|audit:prod|check|check:fast)"' package.json
node -e "const fs=require('fs'); console.log(fs.readdirSync('supabase/migrations').filter((name)=>name.endsWith('.sql')).sort().join('\n'))"
```

Expected result: the canonical three flag names, required quality/release scripts, and four migrations match this runbook. The Node command is cross-platform; in PowerShell, use `Get-ChildItem supabase/migrations -File -Filter *.sql | Sort-Object Name | ForEach-Object Name`.

### 1. Root quality-script scope

Inspect the root quality chain and ignore configuration, then exercise only that root scope:

```bash
rg -n -C 3 '"(check|check:fast|lint|test:unit|validate:content)"' package.json
rg -n -C 3 '(\.worktrees|\.next|out/\*\*|build/\*\*|public/pagefind)' eslint.config.mjs vitest.config.ts .gitignore
pnpm check
```

Expected result: `package.json` shows the root `check` chain; ESLint/Vitest configuration explicitly excludes `.worktrees` and generated output (`.next`, `out`/`build`, and `public/pagefind` as applicable); and root `pnpm check` exits 0. Do not run quality commands from a nested worktree to substitute for this proof. Missing or ambiguous exclusions, a non-root invocation, or a nonzero scoped check is **BLOCKED**.

### 2. Malformed and orphaned content rejection

Use the existing isolated temporary-fixture unit test; it creates test content under the operating-system temporary directory and removes it in `afterEach`, so it does not leave malformed or orphaned content in the repository:

```bash
rg -n -C 3 'mkdtemp|afterEach|ORPHAN_CONTENT|MDX_COMPILE_FAILED|INVALID_ANSWER_INDEX' lib/content-validation/validate.test.ts lib/content-validation/validate.ts
pnpm exec vitest run lib/content-validation/validate.test.ts
```

Expected result: the inspection shows the temporary-fixture cleanup and assertions covering malformed/integrity failures and `ORPHAN_CONTENT`; the focused Vitest command exits 0 because those invalid fixtures are correctly rejected. Do not create a bad repository fixture or run the content validator against a modified repository solely to prove failure. An absent assertion, skipped test, failed cleanup, or nonzero focused test is **BLOCKED**.

### 3. Client test-description truth boundary

Search client-delivered surfaces and documentation for the claim words, then have a named reviewer classify every result. These searches do not require credentials and must not be broadened to secret-bearing environment files or artifacts.

```bash
rg -n -i --glob '!node_modules/**' --glob '!.next/**' --glob '!.worktrees/**' --glob '!public/pagefind/**' '\b(secure|hidden|verified)\b' app components content
rg -n -i --glob '!node_modules/**' --glob '!.next/**' --glob '!.worktrees/**' --glob '!public/pagefind/**' '\b(secure|hidden|verified)\b' docs
```

Expected result: client-delivered paths have no learner-facing test description that represents client-delivered tests as **secure**, **hidden**, or **verified**. The reviewer must retain a sanitized signed record with the candidate SHA, searched paths, every hit (or an explicit no-hit result), classification, and conclusion. Documentation matches may be legitimate operational wording but must be reviewed to ensure they do not make that learner-facing claim. Any unreviewed hit or unsupported claim is **BLOCKED**.

### Documentation whitespace check

These documents are untracked during this corrective task, so use no-index diff checking rather than `git diff --check`:

```bash
git diff --no-index --check /dev/null docs/operations/p0-verification-report.md
git diff --no-index --check /dev/null docs/operations/p0-deploy-runbook.md
```

Expected result: no whitespace diagnostics. Exit code `1` is expected only because each no-index comparison detects a file addition; any whitespace diagnostic is a failure. Attach sanitized outputs to the documentation review.
