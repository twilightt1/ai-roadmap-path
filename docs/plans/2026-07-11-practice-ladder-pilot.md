# Practice Ladder Pilot Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Build reliable learning-progress foundations and two complete Practice Ladders (`python-fibonacci` and `numpy-reshape-matrix`) that measure independent application of lesson concepts.

**Architecture:** Preserve the existing `/practice/[id]` challenge experience and add optional, versioned ladder content. Replace positive-only progress union with explicit per-item LWW mutations, a persisted outbox, and a server reset epoch; model ladder learning as idempotent events. Run Python and JavaScript in terminating workers, make React the editor state owner, and reuse one solution endpoint/walkthrough component.

**Tech Stack:** Next.js 16, React 19, strict TypeScript, Supabase/PostgreSQL/RLS/RPC, Vitest, CodeMirror 6, Pyodide 0.26.4, Web Workers, pnpm.

---

## Approved decisions

- Central pilot reports include only events created while authenticated. Anonymous learning remains local-first; imported anonymous events retain `origin: anonymous` and are excluded from the default cohort.
- The first slices are `python-fibonacci` and `numpy-reshape-matrix`.
- Walkthrough unlock is a learning UX gate after solving or three failed submits, not an anti-cheat boundary.
- AI tutoring, gamification, secure grading, CMS, and analytics SaaS are out of scope.
- Do not commit or push unless explicitly requested.

## Ordered tasks

1. Establish worktree-safe lint/type/test configuration, pin Node/pnpm, add CI, and create a unified quality command.
2. Add explicit `ProgressItemState` with `(clientUpdatedAt, mutationId)` LWW ordering and migrate local v1 state into a versioned v2 document.
3. Add Supabase authoritative item state, idempotent practice events, conditional mutation RPCs, and an atomic reset epoch.
4. Add a persisted outbox, retry/sync status, one-time anonymous import, and BroadcastChannel/storage-event cross-tab behavior.
5. Add privacy-safe challenge baseline events and a pure ladder progress/independence reducer.
6. Implement a tested execution-worker lifecycle controller with status, timeout, cancellation, stale-response rejection, and clean retry.
7. Move Pyodide and JavaScript execution out of the application page and expose clear runtime UI states.
8. Make CodeMirror controlled for external reset, resume, deep-link, and language transitions.
9. Add strict challenge/ladder schemas, path-aware validation, learner-safe projections, and CI content validation.
10. Add the shared solution accessor, API route, and unlock-aware walkthrough panel.
11. Build the end-to-end ladder UI with accessible step navigation and privacy-safe event emission.
12. Author and validate Fibonacci and NumPy reshape ladder content.
13. Run automated/manual verification and add an authenticated pilot funnel SQL report.

## Required quality gates

```bash
pnpm validate:content
pnpm typecheck
pnpm lint
pnpm test:run
pnpm build
pnpm check
git diff --check
```

## Release gate

Do not author the remaining pilot ladders until the first two slices have no known progress resurrection/loss, runtime failures are separated from learner failures, and both slices satisfy the approved Definition of Done in `docs/superpowers/specs/2026-07-10-practice-ladder-design.md`.
