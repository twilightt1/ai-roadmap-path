# P0 Phase 4 Observability and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add privacy-safe platform diagnostics, control risky capabilities independently, verify learner journeys end to end, and document staging/canary/rollback operations.

**Architecture:** Feature code emits stable vendor-neutral events and errors through an allow-listing adapter. Practice analytics persistence remains a separate learner-domain pipeline. Environment-backed feature switches control worker execution, LWW remote sync, and practice ladders; Playwright and runbooks provide release evidence.

**Tech Stack:** TypeScript, Vitest, Playwright, Next.js environment config, Supabase local/staging, Markdown runbooks.

---

### Task 1: Separate platform observability from learner practice events

**Files:**
- Create: `lib/observability/types.ts`
- Create: `lib/observability/redact.ts`
- Create: `lib/observability/redact.test.ts`
- Create: `lib/observability/client.ts`
- Create: `lib/observability/client.test.ts`
- Keep: `lib/practice-events.ts` for persisted learner-domain events

- [ ] **Step 1: Write failing redaction and adapter tests**

Cover:

```ts
expect(redactMetadata({ token: "secret", code: "print(1)", requestId: "r1" }))
  .toEqual({ requestId: "r1" });
expect(adapter.captureError).toHaveBeenCalledWith(expect.objectContaining({ code: "RUNNER_TIMEOUT" }));
expect(() => emitPlatformEvent(validEvent)).not.toThrow();
```

Explicitly test removal of `password`, `token`, `cookie`, `authorization`, `code`, `answers`, `note`, `snippet`, and Supabase key-like fields.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm exec vitest run lib/observability/redact.test.ts lib/observability/client.test.ts
```

- [ ] **Step 3: Define stable contracts**

```ts
export type PlatformErrorCode =
  | "CONTENT_INVALID"
  | "RUNNER_LOAD_FAILED"
  | "RUNNER_TIMEOUT"
  | "RUNNER_EXECUTION_FAILED"
  | "RUNNER_OUTPUT_LIMIT"
  | "SYNC_OFFLINE"
  | "SYNC_CONFLICT"
  | "SYNC_AUTH_CHANGED"
  | "SYNC_REMOTE_FAILED";

export type PlatformEventName =
  | "runner.lifecycle"
  | "progress.outbox"
  | "progress.auth_invalidated"
  | "content.validation_failed"
  | "practice.step"
  | "practice.walkthrough";
```

Metadata is `Record<string, string | number | boolean | null>` after redaction, never arbitrary objects.

- [ ] **Step 4: Implement adapter registration**

Expose:

```ts
registerObservabilityAdapter(adapter: ObservabilityAdapter): () => void;
emitPlatformEvent(event: PlatformEvent): void;
capturePlatformError(error: PlatformError): void;
```

Development fallback uses structured `console.info/error`; production default is a no-op. Feature code never imports a vendor SDK.

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm exec vitest run lib/observability/redact.test.ts lib/observability/client.test.ts
```

Expected: PASS.

### Task 2: Instrument runner, progress, validation, ladder, and walkthrough boundaries

**Files:**
- Modify: `lib/runner/execution-worker-client.ts`
- Modify: `lib/progress-store.ts`
- Modify: `scripts/validate-content.ts`
- Modify: `components/practice-ladder/practice-ladder-panel.tsx`
- Modify: `components/challenge/solution-walkthrough-panel.tsx`
- Modify: `app/api/challenges/[id]/solution/route.ts`
- Test: existing focused tests plus observability spies

- [ ] **Step 1: Add failing event-emission assertions**

Assert stable names/codes for worker start/result/timeout, outbox queued/retried/applied/conflict/dropped, auth invalidation, validation failure, practice step, and walkthrough requested/displayed.

- [ ] **Step 2: Emit only allow-listed metadata**

Examples:

```ts
emitPlatformEvent({
  name: "runner.lifecycle",
  outcome: "timeout",
  metadata: { language, requestId, durationMs },
});
```

Do not pass source, stdout/stderr content, challenge code, quiz answers, note/snippet body, email, or user ID.

- [ ] **Step 3: Keep practice events separate**

`recordPracticeEvent()` still persists domain analytics to `practice_events`. It may also emit a high-level platform event, but the two types and transports must not be aliases.

- [ ] **Step 4: Make the solution route honest and bounded**

The server route cannot trust the client-only `solved || submitCount >= 3` unlock in P0. Document it as a pedagogical UI gate, add `Cache-Control: private, no-store`, validate challenge ID format, and rate-limit repeated requests per process with a small bounded token bucket. Do not claim authorization secrecy; solutions remain retrievable practice content.

- [ ] **Step 5: Run focused tests**

Run:

```bash
pnpm exec vitest run lib/observability lib/runner lib/progress-store.test.ts lib/practice-events.test.ts lib/challenge-solution.test.ts
```

Expected: PASS.

### Task 3: Add feature switches with safe defaults

**Files:**
- Create: `lib/feature-flags.ts`
- Create: `lib/feature-flags.test.ts`
- Modify: `lib/runner/index.ts`
- Modify: `lib/progress.ts`
- Modify: `app/practice/[id]/page.tsx`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Write failing flag parsing tests**

```ts
expect(parseFeatureFlag(undefined, false)).toBe(false);
expect(parseFeatureFlag("true", false)).toBe(true);
expect(parseFeatureFlag("0", true)).toBe(false);
expect(() => parseFeatureFlag("maybe", false)).toThrow();
```

- [ ] **Step 2: Define flags**

```ts
export const featureFlags = {
  workerExecution: parseFeatureFlag(process.env.NEXT_PUBLIC_P0_WORKER_EXECUTION, true),
  lwwRemoteProgress: parseFeatureFlag(process.env.NEXT_PUBLIC_P0_LWW_PROGRESS, false),
  practiceLadder: parseFeatureFlag(process.env.NEXT_PUBLIC_P0_PRACTICE_LADDER, false),
};
```

Worker execution defaults on after Phase 2 verification. Remote LWW and ladder default off until staging/canary.

- [ ] **Step 3: Wire independent fallbacks**

- Worker off: disable Run with an actionable maintenance message; never fall back to same-window JS/Python.
- LWW off: retain anonymous/local progress and avoid remote mutation RPC; do not revert to full-snapshot writes.
- Ladder off: render the existing challenge page without ladder; walkthrough remains controlled separately by content availability.

- [ ] **Step 4: Document environment values and rollback behavior**

Update `.env.example` and README with exact defaults.

- [ ] **Step 5: Run tests and build with both flag sets**

Run:

```bash
pnpm exec vitest run lib/feature-flags.test.ts
NEXT_PUBLIC_P0_WORKER_EXECUTION=true NEXT_PUBLIC_P0_LWW_PROGRESS=false NEXT_PUBLIC_P0_PRACTICE_LADDER=false pnpm build
NEXT_PUBLIC_P0_WORKER_EXECUTION=true NEXT_PUBLIC_P0_LWW_PROGRESS=true NEXT_PUBLIC_P0_PRACTICE_LADDER=true pnpm build
```

Expected: both builds pass.

### Task 4: Add Playwright smoke infrastructure

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/anonymous-learning.spec.ts`
- Create: `e2e/runner-isolation.spec.ts`
- Create: `e2e/progress-sync.spec.ts`
- Create: `e2e/practice-library.spec.ts`
- Create: `e2e/support/supabase-users.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml` through pnpm
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Install Playwright and add scripts**

Run:

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

Add:

```json
"test:e2e": "playwright test",
"test:e2e:smoke": "playwright test --project=chromium"
```

- [ ] **Step 2: Configure deterministic local web server**

Use `pnpm build && pnpm start` on port 3100, one Chromium project, screenshots/traces on first retry, and no parallelism for stateful Supabase scenarios.

- [ ] **Step 3: Write anonymous learning smoke**

Test lesson load, quiz completion, progress persistence after reload, and no login requirement.

- [ ] **Step 4: Write runner isolation smoke**

Test:

- `while(true){}` returns timeout and page button remains responsive;
- JavaScript prints `undefined` for `window` and `localStorage`;
- Python infinite loop times out;
- SQL query returns rows and a semicolon inside a string is preserved;
- output truncation marker appears for large output.

- [ ] **Step 5: Write authenticated progress smoke**

Using two pages/contexts for one test user:

1. complete in page A;
2. page B receives completion;
3. uncomplete in B;
4. A receives uncomplete;
5. simulate offline mutation, restore network, verify retry;
6. reset and verify stale page does not resurrect an old item.

- [ ] **Step 6: Write practice/library regression smoke**

Verify ladder recall/scaffold/transfer, pedagogical walkthrough unlock, bookmark, lesson note, and saved snippet.

- [ ] **Step 7: Run E2E locally**

Run:

```bash
pnpm exec supabase start
pnpm test:e2e:smoke
```

Expected: all smoke specs pass.

- [ ] **Step 8: Add conditional CI E2E job**

Start local Supabase, install Chromium, run migrations and `pnpm test:e2e:smoke`, then stop services. Upload Playwright artifacts only on failure.

### Task 5: Write deployment, migration, and rollback runbook

**Files:**
- Create: `docs/operations/p0-deploy-runbook.md`
- Create: `docs/operations/p0-verification-report.md`
- Modify: `README.md`
- Modify: `docs/operations/p0-capability-audit.md`

- [ ] **Step 1: Document staging prerequisites**

Include exact commands:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm exec supabase db reset
pnpm test:db
pnpm test:e2e:smoke
pnpm audit:prod
```

List required env vars and confirm service-role keys are server/CI secrets only.

- [ ] **Step 2: Document canary order**

1. deploy additive migrations;
2. worker flag on;
3. observe runner error counters;
4. LWW flag on for canary;
5. verify two-user RLS and merge/reset;
6. ladder flag on last.

Define a smoke window and rollback owner without inventing a SaaS provider.

- [ ] **Step 3: Document rollback**

- disable the affected flag;
- roll back app version;
- do not reverse additive migrations;
- preserve V3 outbox documents;
- do not silently discard pending operations;
- rerun smoke tests after rollback.

- [ ] **Step 4: Fill the verification report with command evidence**

Use sections:

```markdown
## Repository quality
## Content integrity
## Runner safety
## Progress convergence
## Database/RLS
## Privacy and observability
## Practice regressions
## Dependency audit
## Known limitations
```

Every claim includes command/date/result. Known limitation must retain: browser-delivered tests and solutions are inspectable and not verified assessment.

- [ ] **Step 5: Close the capability audit**

Every row becomes Accepted with evidence or explicitly Deferred with an approved out-of-scope reference. P0 acceptance rows cannot be Deferred.

### Task 6: Final P0 verification

**Files:**
- Update: `docs/operations/p0-verification-report.md`

- [ ] **Step 1: Run the complete clean-checkout sequence**

Run:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm exec supabase start
pnpm test:db
pnpm test:e2e
pnpm audit:prod
git diff --check
git status --short
```

Expected: all commands pass; audit has no high/critical; status contains only intentional P0 changes.

- [ ] **Step 2: Verify privacy by source scan**

Run:

```bash
rg -n "emitPlatformEvent|capturePlatformError" app components lib \
  | rg "code|answers|password|token|cookie|note|snippet|email|service_role"
```

Expected: no observability call passes restricted fields. Any match must be inspected and removed or proven to be a redaction test.

- [ ] **Step 3: Verify trust copy**

Run:

```bash
rg -n "hidden|verified|secure|sandbox" README.md app components lib docs/operations
```

Expected: every relevant occurrence accurately describes browser inspectability and worker limitations.

- [ ] **Step 4: Update the verification report and stop**

Record exact results and remaining out-of-scope items. Do not merge, commit, push, migrate production, or enable production flags without a separate explicit user request.
