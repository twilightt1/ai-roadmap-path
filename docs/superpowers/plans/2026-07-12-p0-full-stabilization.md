# P0 Full Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the existing practice-ladder candidate and complete the repository, runner, progress, database, observability, and release safeguards required for a public beta.

**Architecture:** `f9a86af` is integrated as candidate code, then audited through four independently verifiable phases. Static learning content remains repository-owned, browser execution moves behind worker clients, normalized LWW item state is authoritative, and Supabase RPC/RLS boundaries are verified automatically.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Playwright, Web Workers, Pyodide, sql.js, Supabase PostgreSQL/RLS, GitHub Actions, pnpm.

---

## Execution policy

- Work only on `feat/p0-full-stabilization`.
- Do not modify `master` directly.
- Do not commit unless the user explicitly requests commits. Replace commit steps in sub-plans with review checkpoints (`git diff --check`, scoped tests, and `git status --short`).
- Preserve the approved design at `docs/superpowers/specs/2026-07-12-p0-full-stabilization-design.md`.
- Preserve a binary-safe backup of uncommitted walkthrough work before changing or removing its worktree.
- Execute phases in order. Each phase must pass its exit gate before the next begins.

## Plan map

| Phase | Plan | Working result |
|---|---|---|
| 1 | `docs/superpowers/plans/2026-07-12-p0-phase-1-integration-quality.md` | Canonical candidate integrated; deterministic scripts, CI, complete content validation, dependency gate |
| 2 | `docs/superpowers/plans/2026-07-12-p0-phase-2-runner-hardening.md` | Python, JavaScript, and SQL isolated in workers with timeout, output limits, stale-response protection |
| 3 | `docs/superpowers/plans/2026-07-12-p0-phase-3-progress-security.md` | Epoch-safe LWW sync, durable outbox retry, multi-tab validation, additive migrations, automated RLS proof |
| 4 | `docs/superpowers/plans/2026-07-12-p0-phase-4-observability-release.md` | Vendor-neutral observability, privacy-safe practice features, feature switches, E2E smoke, runbooks and final report |

## Cross-phase file boundaries

### Integration and quality

- `.github/workflows/ci.yml`: root quality and security gates.
- `package.json`: deterministic scripts and pinned tool entry points.
- `vitest.config.ts`, `eslint.config.mjs`, `tsconfig.json`: root-only scope.
- `scripts/validate-content.ts`: validation orchestrator only.
- `lib/content-validation/*`: focused validators and inventory builders.

### Runner

- `lib/runner/worker-protocol.ts`: request/status/result protocol.
- `lib/runner/execution-worker-client.ts`: worker lifecycle, request correlation, timeout, cancel, stale response.
- `lib/runner/runner-limits.ts`: byte/row limits and truncation.
- `lib/runner/javascript.worker.ts`, `pyodide.worker.ts`, `sql.worker.ts`: language-specific execution only.
- `lib/runner/js-runner.ts`, `pyodide-runner.ts`, `sql-runner.ts`: public adapters.
- `lib/runner/index.ts`: language dispatch only.

### Progress and database

- `lib/progress-item-state.ts`: LWW ordering and derived state.
- `lib/progress-outbox.ts`: queue, acknowledgement, retry metadata and backoff.
- `lib/progress-channel.ts`: validated same-origin tab messages.
- `lib/progress-local-storage.ts`: schema migration and durable local document.
- `lib/progress-remote.ts`: typed Supabase reads/RPC adapters only.
- `lib/progress-store.ts`: state-machine orchestration extracted from `lib/progress.ts`.
- `lib/progress.ts`: React-facing hook and compatibility API.
- `supabase/migrations/202607120001_p0_progress_hardening.sql`: additive corrections after candidate migrations.
- `supabase/tests/p0_progress_rls.test.sql`: SQL/RLS evidence.

### Observability and release

- `lib/observability/types.ts`: stable error/event vocabulary.
- `lib/observability/redact.ts`: allow-list metadata sanitization.
- `lib/observability/client.ts`: adapter registration and development fallback.
- `lib/feature-flags.ts`: worker, LWW, and ladder switches.
- `e2e/*.spec.ts`: public-beta smoke journeys.
- `docs/operations/p0-deploy-runbook.md`: staging, canary, rollback.
- `docs/operations/p0-verification-report.md`: evidence and remaining limitations.

## Final P0 exit gate

Run from a clean checkout with Supabase local services available:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test:db
pnpm test:e2e
pnpm audit:prod
```

Expected:

- every command exits `0`;
- dependency report contains no high or critical production vulnerability;
- RLS tests prove cross-user isolation and RPC ownership;
- E2E proves anonymous learning, login merge, multi-tab uncomplete, worker timeout/isolation, practice ladder, and library regression coverage;
- `git diff --check` emits no output;
- `git status --short` contains only intentional P0 files.
