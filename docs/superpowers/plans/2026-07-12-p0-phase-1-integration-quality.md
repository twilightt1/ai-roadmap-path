# P0 Phase 1 Integration and Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Safely integrate the canonical candidate branch and establish deterministic repository, CI, content, and dependency quality gates.

**Architecture:** Preserve the overlapping walkthrough work as a patch, merge `f9a86af` into the P0 branch, and treat every integrated subsystem as untrusted candidate code. Move content checks into focused inventory/validator modules so the CLI, Vitest, and CI use the same validation path.

**Tech Stack:** Git, pnpm, TypeScript, Vitest, ESLint, Next.js build, GitHub Actions.

---

### Task 1: Preserve overlapping work and integrate the canonical candidate

**Files:**
- Create: `.zcode/backups/challenge-solution-walkthrough-2026-07-12.patch` (local ignored safety artifact)
- Modify through merge: files in commit `f9a86af`
- Verify: `docs/superpowers/specs/2026-07-12-p0-full-stabilization-design.md`

- [ ] **Step 1: Confirm the P0 branch and a clean tracked source state**

Run:

```bash
git branch --show-current
git status --short
```

Expected: branch is `feat/p0-full-stabilization`; only the approved spec and plan documents are untracked/modified.

- [ ] **Step 2: Create a binary-safe backup of walkthrough work**

Run:

```bash
mkdir -p .zcode/backups
git -C .worktrees/challenge-solution-walkthrough diff --binary HEAD > .zcode/backups/challenge-solution-walkthrough-2026-07-12.patch
git -C .worktrees/challenge-solution-walkthrough ls-files --others --exclude-standard -z \
  | tar --null -T - -czf .zcode/backups/challenge-solution-walkthrough-untracked-2026-07-12.tgz \
      -C .worktrees/challenge-solution-walkthrough
```

Expected: patch and archive exist under ignored `.zcode/backups`; walkthrough worktree remains unchanged.

- [ ] **Step 3: Verify the backup can be inspected**

Run:

```bash
git apply --stat .zcode/backups/challenge-solution-walkthrough-2026-07-12.patch
tar -tzf .zcode/backups/challenge-solution-walkthrough-untracked-2026-07-12.tgz
```

Expected: the diff stat and untracked file list include walkthrough route/UI/types/tests.

- [ ] **Step 4: Integrate the canonical commit without committing the merge result**

Run:

```bash
git merge --no-commit --no-ff f9a86af
```

Expected: merge stages the candidate implementation or reports conflicts only in P0 plan/spec files. Resolve by retaining both historical docs and the new P0 docs.

- [ ] **Step 5: Record the candidate baseline**

Run:

```bash
pnpm install --frozen-lockfile
pnpm validate:content
pnpm typecheck
pnpm lint
pnpm test:run
pnpm build
```

Expected: capture pass/fail evidence. Do not fix unrelated failures in this step.

- [ ] **Step 6: Compare the walkthrough backup with integrated files**

Run:

```bash
git diff --no-index .worktrees/challenge-solution-walkthrough/lib/challenge.ts lib/challenge.ts || true
git diff --no-index .worktrees/challenge-solution-walkthrough/components/challenge/challenge-view.tsx components/challenge/challenge-view.tsx || true
```

Expected: identify unique behavior only. Port no duplicate implementation; add findings to `docs/operations/p0-capability-audit.md` in Task 2.

### Task 2: Add the capability audit ledger

**Files:**
- Create: `docs/operations/p0-capability-audit.md`
- Test: manual coverage check against the approved spec

- [ ] **Step 1: Create the audit document with every required capability**

Write:

```markdown
# P0 Capability Audit

| Capability | Candidate files | Status | Evidence | Required action |
|---|---|---|---|---|
| Root quality scope | package/config files | Pending | — | Audit |
| CI gates | .github/workflows/ci.yml | Pending | — | Audit |
| Content integrity | scripts + validators | Pending | — | Audit |
| Python worker | lib/runner/* | Pending | — | Audit |
| JavaScript worker | lib/runner/* | Pending | — | Audit |
| SQL worker | lib/runner/* | Missing | SQL main-thread | Replace |
| LWW item state | lib/progress-item-state.ts | Pending | — | Audit |
| Outbox/retry | lib/progress-outbox.ts | Pending | — | Audit |
| Multi-tab channel | lib/progress-channel.ts | Pending | — | Audit |
| Remote RPC | lib/progress-remote.ts | Pending | — | Audit |
| Migration/RLS | supabase/migrations/* | Pending | — | Audit |
| Observability | lib/practice-events.ts | Missing boundary | DB events only | Add |
| Feature switches | — | Missing | — | Add |
| E2E | — | Missing | — | Add |
| Runbook | — | Missing | — | Add |
```

- [ ] **Step 2: Mark each row Accepted, Fix required, Replace, or Missing**

Use direct file/test evidence. Each non-Accepted row must reference a task in one of the four phase plans.

- [ ] **Step 3: Check the ledger has no unresolved placeholder status**

Run:

```bash
rg -n "Pending|TBD|TODO" docs/operations/p0-capability-audit.md
```

Expected: no output after audit is complete.

### Task 3: Make root quality scripts deterministic

**Files:**
- Modify: `package.json:4-19`
- Modify: `vitest.config.ts:1-8`
- Modify: `eslint.config.mjs:8-18`
- Modify: `tsconfig.json:24-33`
- Test: command-level root checks

- [ ] **Step 1: Add a failing scope smoke script**

Add to `package.json`:

```json
"test:unit": "vitest run --dir .",
"audit:prod": "pnpm audit --prod --audit-level high",
"check:fast": "pnpm validate:content && pnpm typecheck && pnpm lint && pnpm test:unit",
"check": "pnpm check:fast && pnpm build"
```

- [ ] **Step 2: Run unit and lint commands to expose nested worktree leaks**

Run:

```bash
pnpm test:unit
pnpm lint
```

Expected before config correction: any `.worktrees` path in output is a failure of this task.

- [ ] **Step 3: Use anchored root exclusions**

Keep these exact exclusions:

```ts
// vitest.config.ts
exclude: [...configDefaults.exclude, "**/.worktrees/**", "**/.next/**", "public/pagefind/**"]
```

```js
// eslint.config.mjs globalIgnores
".next/**",
"**/.next/**",
".worktrees/**",
"public/pagefind/**"
```

```json
// tsconfig.json
"exclude": ["node_modules", ".worktrees", "**/.next/**", "public/pagefind/**"]
```

- [ ] **Step 4: Run scoped quality checks**

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test:unit
```

Expected: all pass and output contains no `.worktrees` test or generated file.

### Task 4: Build a complete content inventory and validator

**Files:**
- Create: `lib/content-validation/types.ts`
- Create: `lib/content-validation/inventory.ts`
- Create: `lib/content-validation/validate.ts`
- Create: `lib/content-validation/validate.test.ts`
- Modify: `scripts/validate-content.ts:1-51`
- Modify: `lib/challenge-validation.ts`
- Modify: `lib/practice-ladder-validation.ts`
- Test: `lib/content-validation/validate.test.ts`

- [ ] **Step 1: Write failing inventory validation tests**

Create fixtures in the test and assert these error codes:

```ts
expect(validateInventory(inventory)).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ code: "DUPLICATE_ID" }),
    expect.objectContaining({ code: "MISSING_LESSON" }),
    expect.objectContaining({ code: "MISSING_QUIZ" }),
    expect.objectContaining({ code: "INVALID_ANSWER_INDEX" }),
    expect.objectContaining({ code: "ORPHAN_CONTENT" }),
    expect.objectContaining({ code: "MISSING_VISIBLE_TEST" }),
    expect.objectContaining({ code: "BROKEN_LADDER_REFERENCE" }),
  ])
);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
pnpm exec vitest run lib/content-validation/validate.test.ts
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Define validation contracts**

In `types.ts` define:

```ts
export type ContentValidationCode =
  | "DUPLICATE_ID"
  | "FILENAME_ID_MISMATCH"
  | "MISSING_LESSON"
  | "MISSING_QUIZ"
  | "INVALID_ANSWER_INDEX"
  | "ORPHAN_CONTENT"
  | "INVALID_CHALLENGE"
  | "MISSING_VISIBLE_TEST"
  | "INVALID_LADDER"
  | "BROKEN_LADDER_REFERENCE"
  | "MDX_COMPILE_FAILED";

export type ContentValidationIssue = {
  code: ContentValidationCode;
  file: string;
  message: string;
};
```

- [ ] **Step 4: Implement inventory construction**

`inventory.ts` must read:

- `phases`/projects/topics from `lib/roadmap-data.ts`;
- `content/phase-*/*.mdx`;
- `content/quizzes/*.json`;
- `content/challenges/*.json`;
- `content/practice-ladders/*.json` when the directory exists.

Return parsed records plus filename/path; do not print or exit in library code.

- [ ] **Step 5: Implement cross-reference validation**

`validate.ts` must enforce all codes from Step 3, including `answerIndex >= 0 && answerIndex < options.length` and at least one challenge test with `hidden !== true`.

- [ ] **Step 6: Compile every MDX lesson during validation**

Use the same MDX options as `components/roadmap/mdx-content.tsx` through a server-safe helper. Catch compiler errors and return `MDX_COMPILE_FAILED` with the file path.

- [ ] **Step 7: Replace the CLI body with the shared library**

`scripts/validate-content.ts` should only:

```ts
const inventory = await buildContentInventory(process.cwd());
const issues = await validateContentInventory(inventory);
if (issues.length) {
  console.error(issues.map(formatContentIssue).join("\n"));
  process.exitCode = 1;
} else {
  console.log(formatContentSummary(inventory));
}
```

- [ ] **Step 8: Run tests and the repository validator**

Run:

```bash
pnpm exec vitest run lib/content-validation/validate.test.ts lib/challenge-validation.test.ts lib/practice-ladder-validation.test.ts
pnpm validate:content
```

Expected: tests pass; validator reports 118 lessons, 118 quizzes, 35 challenges, and the integrated ladder count.

### Task 5: Enforce CI and dependency policy

**Files:**
- Modify: `.github/workflows/ci.yml:1-33`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml` only through package-manager operations
- Create: `docs/operations/dependency-risk-register.md`
- Test: local commands and workflow syntax

- [ ] **Step 1: Split CI into named quality and security jobs**

Use jobs:

```yaml
jobs:
  quality:
    steps:
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
  dependency-audit:
    steps:
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit:prod
```

Set Node 22 and pnpm from `packageManager`.

- [ ] **Step 2: Attempt the framework/dependency upgrade that resolves the PostCSS advisory**

Run:

```bash
pnpm update next@latest eslint-config-next@latest
pnpm audit --prod
```

Expected: no high/critical. If moderate remains because upstream has no fix, restore the smallest compatible dependency set and record package, advisory, exposure, owner, and review date in the risk register.

- [ ] **Step 3: Verify lockfile-only dependency changes**

Run:

```bash
pnpm install --frozen-lockfile
pnpm audit:prod
pnpm check
```

Expected: all exit `0`.

- [ ] **Step 4: Phase 1 exit gate**

Run:

```bash
git diff --check
pnpm check
pnpm audit:prod
git status --short
```

Expected: no whitespace errors; quality and audit pass; audit ledger references Phase 2/3/4 gaps precisely.
