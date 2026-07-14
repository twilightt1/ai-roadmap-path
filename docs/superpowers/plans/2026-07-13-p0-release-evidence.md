# P0 Release Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a reusable P0 staging deployment/rollback runbook and an evidence-only final verification report template that prevents release-ready claims without Supabase/RLS and authenticated-E2E proof.

**Architecture:** Keep procedure and evidence separate. `p0-deploy-runbook.md` is the executable operational playbook, while `p0-verification-report.md` is a release-specific matrix populated only from real command output, CI artifacts, and reviewed manual staging checks. Both documents reference existing scripts, migrations, feature-flag names, and release gates without introducing new infrastructure.

**Tech Stack:** Markdown, pnpm scripts, Supabase CLI/psql, Playwright, GitHub Actions, Next.js environment-backed feature flags.

---

## Execution policy

- Work only in `D:/ZCode Data/AI_learining_platform/.worktrees/p0-full-stabilization` on `feat/p0-full-stabilization`.
- Do not modify application code, migrations, CI behavior, or feature-flag behavior for this documentation scope.
- Do not state that P0 is ready in the verification report template.
- Do not copy secrets, service-role values, session cookies, raw learner code, private notes, or personally identifying test data into either document.
- Do not commit unless the user explicitly requests it. Use `git diff --check` and targeted content review as checkpoints instead.

## File structure

| File | Responsibility |
|---|---|
| Create `docs/operations/p0-deploy-runbook.md` | Reusable operator instructions for staging deployment, additive migration validation, sequential canary flags, promotion, rollback, and incident handoff. |
| Create `docs/operations/p0-verification-report.md` | Evidence-only release template that maps P0 requirements to commands/procedures and enforces PASS/BLOCKED/approved-N/A conclusion rules. |
| Reference `lib/feature-flags.ts` | Source of canonical environment variables and defaults: `NEXT_PUBLIC_P0_WORKER_EXECUTION=true`, `NEXT_PUBLIC_P0_LWW_PROGRESS=false`, `NEXT_PUBLIC_P0_PRACTICE_LADDER=false`. |
| Reference `scripts/run-supabase-tests.mjs` | Source of the local-Supabase DB/RLS procedure and its destructive-local-reset warning. |
| Reference `playwright.config.ts` and `e2e/support/supabase-users.ts` | Source of Playwright environment setup, activated P0 test flags, and required smoke-user variables. |
| Reference `supabase/migrations/*.sql` | Ordered additive migration inventory: `202607060001_user_data.sql`, `202607110001_progress_lww_practice_events.sql`, `202607110002_fix_progress_rpc_security.sql`, `202607120001_p0_progress_hardening.sql`. |
| Reference `docs/operations/dependency-risk-register.md` | Record of the accepted moderate PostCSS advisory, which does not waive the high/critical production-audit gate. |

### Task 1: Create the P0 staging deployment and rollback runbook

**Files:**
- Create: `docs/operations/p0-deploy-runbook.md`
- Reference: `docs/superpowers/specs/2026-07-13-p0-release-evidence-design.md`
- Reference: `lib/feature-flags.ts`
- Reference: `scripts/run-supabase-tests.mjs`
- Reference: `playwright.config.ts`
- Reference: `supabase/migrations/202607060001_user_data.sql`
- Reference: `supabase/migrations/202607110001_progress_lww_practice_events.sql`
- Reference: `supabase/migrations/202607110002_fix_progress_rpc_security.sql`
- Reference: `supabase/migrations/202607120001_p0_progress_hardening.sql`

- [ ] **Step 1: Create a runbook skeleton with explicit release metadata and hard-stop rule**

Write the following opening sections exactly enough that an operator can identify the release and cannot overlook missing prerequisites:

```markdown
# P0 Staging Deploy and Rollback Runbook

## Release record

| Field | Value |
|---|---|
| Candidate SHA | `<fill at release time>` |
| Release operator | `<fill at release time>` |
| Reviewer | `<fill at release time>` |
| Approved Supabase environment | `<fill at release time>` |
| Release window | `<fill at release time>` |
| Evidence report | `docs/operations/p0-verification-report.md` |

## Non-negotiable stop rule

Stop promotion immediately when any required preflight command, migration check, RLS assertion, authenticated E2E journey, dependency audit, or canary smoke check is failed or blocked. Record the failure in the verification report and follow the rollback section. Do not mark P0 Ready for Release while any required row is BLOCKED.
```

- [ ] **Step 2: Add prerequisites and secret-handling instructions**

Add a section requiring an approved staging/local-Supabase environment, a pre-migration non-destructive backup/export reference, two independent test users, Playwright smoke-user credentials, and accessible evidence artifact storage. Include these literal prohibitions:

```markdown
- Never put `SUPABASE_SERVICE_ROLE_KEY`, access tokens, cookies, passwords, or raw learner content in this runbook, the verification report, browser environment variables, screenshots, or commit messages.
- `scripts/run-supabase-tests.mjs` resets the local database while staging legacy data. Run it only against disposable local Supabase; do not point it at staging or production.
- Browser-exposed variables may use only the public feature switches listed in `lib/feature-flags.ts`.
```

- [ ] **Step 3: Add exact preflight commands and expected outcomes**

Add the following command block and outcome table. State that all commands run from the repository root and must exit `0` before migration/canary work begins:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm audit:prod
pnpm test:db
PLAYWRIGHT_SMOKE_USER_EMAIL='<staging smoke user>' \
PLAYWRIGHT_SMOKE_USER_PASSWORD='<staging smoke password>' \
PLAYWRIGHT_BASE_URL='<approved preview URL>' \
pnpm test:e2e
```

Document that `pnpm check` covers content validation, TypeScript, lint, unit tests, and production build; that `pnpm audit:prod` blocks high/critical findings while the accepted moderate advisory remains tracked in `dependency-risk-register.md`; and that an unavailable local Supabase stack causes `pnpm test:db` to be **BLOCKED**, not skipped.

- [ ] **Step 4: Add migration and security-validation procedure**

Specify the migration order verbatim and require operators to record the deployed migration inventory:

```text
202607060001_user_data.sql
202607110001_progress_lww_practice_events.sql
202607110002_fix_progress_rpc_security.sql
202607120001_p0_progress_hardening.sql
```

Add steps to apply these additive migrations through the approved Supabase change process, verify all expected versions are present, then run a two-user staging validation that proves: User A cannot read/mutate User B progress; unauthenticated access cannot write user-owned records; RPC ownership comes from `auth.uid()` rather than client user ID; and role escalation is rejected. State that any failed assertion blocks enabling `NEXT_PUBLIC_P0_LWW_PROGRESS`.

- [ ] **Step 5: Add the sequential canary procedure using canonical flag names**

Create a three-row canary table in this exact rollout order:

| Stage | Enabled variable | Smoke/observation requirement | Promote only when |
|---|---|---|---|
| 1 | `NEXT_PUBLIC_P0_WORKER_EXECUTION=true` | Run runner-isolation E2E journeys; inspect redacted runner timeout/execution error codes. | UI remains responsive, JavaScript cannot access window/localStorage, output limits and stale responses behave as tested. |
| 2 | `NEXT_PUBLIC_P0_LWW_PROGRESS=true` | Run authenticated progress sync/multi-tab journeys and inspect progress outbox/auth-invalidation events. | Complete/uncomplete ordering, retry, and cross-tab propagation pass without unredacted diagnostics. |
| 3 | `NEXT_PUBLIC_P0_PRACTICE_LADDER=true` | Run anonymous and authenticated practice/library journeys and inspect privacy-safe practice events. | Ladder/walkthrough flows pass without regressing challenge, library, or progress behavior. |

State that `workerExecution` defaults true while the LWW and ladder flags default false in `lib/feature-flags.ts`; therefore the candidate environment must explicitly record every deployed value rather than assuming defaults.

- [ ] **Step 6: Add promotion, rollback, and incident-handoff procedures**

Write these operational rules:

```markdown
### Promote

Promote only after every required verification-report row is PASS or an approved N/A. Record candidate SHA, environment, active flags, migration versions, CI/artifact URLs, operator, reviewer, and timestamp.

### Roll back application behavior

1. Freeze promotion and capture the failing URL, timestamp, stable platform error code, active flags, SHA, and affected environment.
2. Disable only the implicated public feature switch when that safely restores service; otherwise redeploy the prior compatible application SHA.
3. Keep all additive P0 migrations in place. Do not drop tables, RPCs, columns, or RLS policies as a rollback action.
4. Do not clear local progress or local outbox entries. Preserve them for a compatible client to reconcile.
5. Re-run the affected smoke journey and update the verification report result to BLOCKED until a corrected candidate passes.

### Incident handoff

Record reproduction steps, impact, candidate/prior SHA, migration inventory, flag values, failed gate/output location, redacted error code/log reference, rollback state, owner, and next decision time.
```

- [ ] **Step 7: Review the runbook against source-of-truth files**

Run:

```bash
rg -n "NEXT_PUBLIC_P0_(WORKER_EXECUTION|LWW_PROGRESS|PRACTICE_LADDER)" lib/feature-flags.ts playwright.config.ts
rg -n "test:db|test:e2e|audit:prod|check" package.json
find supabase/migrations -maxdepth 1 -type f -printf "%f\n" | sort
git diff --check -- docs/operations/p0-deploy-runbook.md
```

Expected: all three flag names, all four script names, and the four migration files match the runbook; `git diff --check` has no output.

### Task 2: Create the final P0 verification evidence report template

**Files:**
- Create: `docs/operations/p0-verification-report.md`
- Reference: `docs/superpowers/specs/2026-07-13-p0-release-evidence-design.md`
- Reference: `docs/superpowers/specs/2026-07-12-p0-full-stabilization-design.md:299-346`
- Reference: `docs/operations/p0-deploy-runbook.md`
- Reference: `docs/operations/dependency-risk-register.md`

- [ ] **Step 1: Create report metadata and immutable conclusion guard**

Begin the report with a template marker and a release record table. Include the following text:

```markdown
# P0 Final Verification Report

> **Template status:** This file is not evidence of a completed release until a named candidate SHA, environment, command outputs, evidence links, operator, and date populate every required row. Do not replace missing evidence with PASS.

## Result vocabulary

- **PASS:** The procedure completed successfully and the linked evidence is available to release reviewers.
- **BLOCKED:** A required environment, credential, service, command, or assertion is unavailable or failed. This blocks P0 readiness.
- **N/A:** Only for an objectively inapplicable criterion, with explicit justification and reviewer approval. N/A cannot bypass Supabase/RLS or authenticated-E2E evidence.
```

Add a release record table for candidate SHA, environment, migration inventory, public feature flags, release operator, reviewer, start/end time, and report status. Initialize the report status as `P0 Not Ready — evidence pending`.

- [ ] **Step 2: Add an evidence-matrix schema and evidence-link policy**

Add this table header once before the grouped rows:

```markdown
| Criterion | Procedure / command | Environment and configuration | Result | Evidence | Operator / date | Notes |
|---|---|---|---|---|---|---|
```

Under it, require protected CI/staging artifact links or repository-relative sanitized output paths. State that links must be accessible to release reviewers and must not expose credentials, service-role keys, cookies, raw learner code, raw notes, or quiz answers.

- [ ] **Step 3: Add repository-quality and content rows with executable commands**

Add rows for deterministic install, content validation/typecheck/lint/unit/build, CI parity, and production audit. Use these exact commands in the Procedure column:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm audit:prod
```

For the dependency-audit row, reference `docs/operations/dependency-risk-register.md` and require no high/critical production advisory. Note that the currently tracked moderate advisory requires a recorded review but does not turn a successful high/critical gate into a failure.

- [ ] **Step 4: Add worker and observability evidence rows**

Add distinct rows requiring evidence for request correlation/stale response rejection, timeout termination and clean restart, JavaScript window/localStorage isolation, SQL quoted-semicolon execution and worker isolation, output/error bounds, and redacted diagnostics. Use these commands:

```bash
pnpm exec playwright test e2e/runner-isolation.spec.ts --project=chromium
pnpm test:unit -- lib/runner
```

Add a manual review procedure that inspects emitted platform events/errors and confirms raw learner code, tokens, cookies, private notes, and quiz answers are absent.

- [ ] **Step 5: Add progress, migration, RLS, and authenticated E2E evidence rows**

Add rows for deterministic LWW complete/uncomplete, outbox retry/idempotency, multi-tab propagation, anonymous-to-authenticated merge, auth-generation invalidation, additive migration/legacy compatibility, RLS cross-user isolation, RPC ownership, and role-escalation prevention.

Use these procedures:

```bash
pnpm test:unit -- lib/progress
pnpm test:db
PLAYWRIGHT_SMOKE_USER_EMAIL='<staging smoke user>' \
PLAYWRIGHT_SMOKE_USER_PASSWORD='<staging smoke password>' \
PLAYWRIGHT_BASE_URL='<approved preview URL>' \
pnpm exec playwright test e2e/progress-sync.spec.ts e2e/practice-library.spec.ts --project=chromium
```

State explicitly that `pnpm test:db` is local-stack-only because its script resets the local database, while staging RLS proof is a manual two-user procedure recorded separately. Mark both the local DB test and staging proof as required; neither can be N/A.

- [ ] **Step 6: Add anonymous flows, canary, and rollback-rehearsal evidence rows**

Add rows for anonymous lesson progress, practice ladder/walkthrough, feature-switch canary stages, and rollback rehearsal. Use the following procedures:

```bash
pnpm exec playwright test e2e/anonymous-learning.spec.ts e2e/practice-library.spec.ts --project=chromium
```

For canary evidence, require the three stages and exact environment variables from Task 1. For rollback evidence, require a recorded rehearsal that disables one feature flag or redeploys a compatible prior SHA, confirms the affected smoke journey, confirms migrations remain intact, and confirms no client progress/outbox clear occurred.

- [ ] **Step 7: Add the final decision section that cannot be misread**

End the report with:

```markdown
## Final decision

- [ ] **P0 Ready for Release** — check only when every required matrix row is PASS or approved N/A, staging migration/RLS evidence is PASS, authenticated E2E evidence is PASS, and canary plus rollback-rehearsal evidence is PASS.
- [x] **P0 Not Ready** — default until the condition above is met.

### Blocking criteria

| Criterion | Why blocked | Owner | Next action | Target date |
|---|---|---|---|---|
| `<fill only when a required criterion is BLOCKED>` | `<evidence or missing prerequisite>` | `<owner>` | `<specific next step>` | `<ISO date>` |
```

- [ ] **Step 8: Review report completeness and documentation formatting**

Run:

```bash
rg -n "PASS|BLOCKED|N/A|P0 Ready for Release|P0 Not Ready|test:db|PLAYWRIGHT_SMOKE_USER_EMAIL|NEXT_PUBLIC_P0_" docs/operations/p0-verification-report.md
git diff --check -- docs/operations/p0-verification-report.md
```

Expected: each required vocabulary term, DB/authenticated-E2E requirement, feature-switch reference, and mutually exclusive final-decision default is present; `git diff --check` has no output.

### Task 3: Perform the documentation release-readiness review

**Files:**
- Review: `docs/operations/p0-deploy-runbook.md`
- Review: `docs/operations/p0-verification-report.md`
- Review: `docs/superpowers/specs/2026-07-13-p0-release-evidence-design.md`
- Reference: `docs/superpowers/specs/2026-07-12-p0-full-stabilization-design.md:299-346`

- [ ] **Step 1: Compare the documents against the approved release-evidence spec**

Verify each of these requirements maps to an explicit runbook section or report row:

```text
preflight hard stop
additive migration order
staging two-user RLS/RPC verification
worker -> LWW -> ladder canary order
non-destructive rollback preserving local outbox
incident handoff
PASS/BLOCKED/approved-N/A definitions
evidence links with operator/date/environment
mandatory local DB and staging RLS proof
mandatory authenticated E2E proof
rollback rehearsal
P0 Not Ready as template default
```

- [ ] **Step 2: Scan both documents for forbidden claims or sensitive placeholders**

Run:

```bash
rg -n -i "service.role|service_role|password=|access_token|cookie=|secret=|P0 Ready for Release" docs/operations/p0-deploy-runbook.md docs/operations/p0-verification-report.md
```

Expected: only policy statements prohibiting sensitive material and the unchecked final-decision label appear. No actual secret-shaped value or unsupported P0-ready claim appears.

- [ ] **Step 3: Verify the exact files and document only intentional changes**

Run:

```bash
git diff --check
git status --short
git diff -- docs/operations/p0-deploy-runbook.md docs/operations/p0-verification-report.md
```

Expected: whitespace check is clean; the diff contains the two documentation deliverables only for this scope, aside from pre-existing P0 worktree changes. Do not commit unless the user explicitly asks.

## Spec-coverage self-review

- **Runbook scope:** Task 1 covers ownership, secrets safety, preflight, additive migration/RLS validation, canary flags, promotion, non-destructive rollback, and incident handoff.
- **Evidence report scope:** Task 2 supplies result vocabulary, release metadata, reviewable evidence matrix, every required evidence group, and a default Not Ready conclusion.
- **Hard proof requirement:** Tasks 1 and 2 both distinguish disposable-local `pnpm test:db` from required staging two-user proof and require authenticated E2E credentials/evidence.
- **Safety:** Tasks 1–3 prohibit secret/raw-content capture and verify sensitive material is absent.
- **No placeholders in instructions:** Template placeholders are intentionally limited to runtime release-record cells and are explicitly labeled as release-time fields, not implementation omissions.
