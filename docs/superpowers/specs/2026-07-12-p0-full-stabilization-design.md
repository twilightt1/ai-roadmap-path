# P0 Full Stabilization Design

**Date:** 2026-07-12
**Status:** Approved in conversation; awaiting written-spec review
**Target branch:** `feat/p0-full-stabilization`

## 1. Purpose

P0 Full is an integration and stabilization release for the AI Engineer learning platform. It makes the current learning, practice, browser execution, authentication, and progress features safe and predictable enough for a public beta.

P0 does not introduce a new product category. It integrates the existing `feat/practice-ladder-pilot` work as a candidate implementation, audits every capability, and completes the missing production safeguards.

## 2. Decisions

The following decisions are fixed for this milestone:

- Integrate and audit the existing practice-ladder branch rather than reimplementing it.
- Treat `feat/practice-ladder-pilot` commit `f9a86af` as the canonical source for overlapping practice-ladder and solution-walkthrough work.
- Back up the uncommitted `feat/challenge-solution-walkthrough` worktree before cleanup; port only unique, valuable differences discovered during audit.
- Keep code execution client-side in P0, but isolate it with Web Workers and enforce timeouts and output limits.
- Do not claim that client-visible additional tests are secure, hidden, or verified.
- Use per-item last-write-wins progress semantics with explicit status and timestamps.
- Keep normalized item progress as canonical state; retain the aggregate snapshot as a compatibility projection/cache.
- Use vendor-neutral typed observability contracts without adding an analytics or error-monitoring SaaS in P0.
- Restore the eleven deleted historical design/plan documents from `HEAD` before starting integration.
- Implement P0 on `feat/p0-full-stabilization`, not directly on `master`.

## 3. Scope

### 3.1 Repository health

- Ensure lint, typecheck, tests, and build exclude local worktrees and generated output.
- Make root scripts deterministic and scoped to the root application.
- Add GitHub Actions gates for lint, typecheck, tests, content validation, production build, dependency audit, and migration checks.
- Record dependency advisories and block high/critical production vulnerabilities.

### 3.2 Content integrity

Add a build-time validator that fails on invalid or inconsistent learning content.

It must check:

- unique phase, topic, project, challenge, and practice-ladder identifiers;
- filename and embedded identifier consistency;
- lesson metadata to MDX coverage;
- lesson metadata to quiz coverage;
- quiz answer indexes and required fields;
- challenge schema, compare modes, and at least one visible test;
- practice-ladder schema and references;
- valid lesson, project, challenge, and ladder links;
- orphan files and missing referenced files;
- MDX compilation for all lessons.

Runtime loaders may still return a controlled not-found result, but malformed repository content must not pass CI silently.

### 3.3 Browser execution safety

- Execute Python and JavaScript in dedicated Web Workers.
- Ensure user JavaScript cannot access the application window, DOM, local storage, or browser Supabase session.
- Execute SQL in an isolated worker as well, or document and enforce an equivalent isolation boundary before P0 completion.
- Correlate every request and response with an execution ID.
- Terminate the worker when a hard timeout expires.
- Create a clean worker for the next execution after termination.
- Cap stdout, stderr, serialized rows, and error payload sizes.
- Ignore stale responses from earlier executions.
- Normalize load, timeout, execution, and serialization errors.
- Never send raw source code to analytics or diagnostics.

Challenge submission remains practice-grade in P0. All tests delivered to the browser are inspectable. UI copy and documentation must describe them as visible or additional client-side tests, not secure hidden tests or verified assessment.

### 3.4 Progress correctness

Represent mutable progress as item state:

```ts
type ProgressItemState = {
  itemType: "lesson" | "project_feature" | "quiz_summary" | "challenge_summary";
  itemKey: string;
  status: string;
  updatedAt: string;
  operationId: string;
};
```

Exact status payloads may vary by item type, but every mutable item must have an explicit state, update time, and deterministic operation identifier.

Conflict rules:

1. Newer `updatedAt` wins.
2. Equal timestamps are resolved deterministically by `operationId`.
3. Complete and uncomplete are both explicit writes.
4. Attempt history remains append-only and is not resolved through LWW.
5. Anonymous-to-authenticated merge uses the same rules.

The client flow is:

```text
User action
  -> optimistic local item update
  -> persist local item state
  -> broadcast to other tabs
  -> enqueue idempotent outbox operation
  -> authenticated delta RPC/upsert
  -> canonical normalized item state
  -> update compatibility snapshot projection
```

The application must not upload all completed lessons and project features after every click.

### 3.5 Offline, multi-tab, and auth changes

- Persist failed remote mutations in a local outbox.
- Retry when connectivity returns, authentication is ready, or the application starts again.
- Use bounded exponential backoff for transient errors.
- Make retry idempotent with `operationId`.
- Broadcast item updates across same-origin tabs.
- Reject stale writes associated with an old authentication generation or user ID.
- Prevent an old tab or device from resurrecting progress superseded by a newer reset/uncomplete operation.
- Model reset as an explicit revisioned operation rather than a best-effort sequence of table deletes.

### 3.6 Database and security

Migrations must be additive and backward compatible in P0.

- Add normalized LWW item state and idempotent mutation support.
- Preserve legacy snapshot fields during the migration window.
- Support reading legacy data and converting it to item state without data loss.
- Do not drop legacy columns or tables in P0.
- Scope all RPCs to `auth.uid()`; do not accept a trusted user ID from browser input.
- Use explicit secure `search_path` settings for security-definer functions.
- Revoke public execution and grant only the minimum required role permissions.
- Keep Row Level Security enabled for every user-owned table.
- Verify that a learner cannot elevate their profile role.
- Never expose the service role key to browser code.

The canonical long-term state is normalized item progress. `user_progress_state` remains a read-optimized compatibility projection/cache until a later migration removes it.

### 3.7 Observability

Define a vendor-neutral interface for typed product events and platform errors.

The initial adapter may log structured records in development and no-op or buffer safely in production. It must be possible to add Sentry, PostHog, or another provider later without changing feature code.

Initial event families:

- content validation failure;
- runner load, timeout, execution, and worker lifecycle;
- progress outbox queued, retried, applied, conflicted, and dropped;
- auth-generation invalidation;
- practice-ladder step started and completed;
- solution walkthrough requested and displayed.

Observability must not include:

- passwords, tokens, cookies, or Supabase secrets;
- raw learner code;
- raw notes or snippets;
- quiz answers;
- private profile fields not needed for diagnosis.

Errors use stable codes such as:

```ts
type PlatformErrorCode =
  | "CONTENT_INVALID"
  | "RUNNER_LOAD_FAILED"
  | "RUNNER_TIMEOUT"
  | "RUNNER_EXECUTION_FAILED"
  | "RUNNER_OUTPUT_LIMIT"
  | "SYNC_OFFLINE"
  | "SYNC_CONFLICT"
  | "SYNC_AUTH_CHANGED"
  | "SYNC_REMOTE_FAILED";
```

UI messages remain actionable and localized. Detailed diagnostics are redacted before entering the observability adapter.

### 3.8 Practice ladder and solution walkthrough

The practice-ladder pilot and solution walkthrough already present in the canonical branch are included in P0, subject to the same gates as core functionality.

They must:

- pass schema and reference validation;
- use the hardened execution client;
- persist progress through the LWW/outbox model;
- not reveal secure-server guarantees that do not exist;
- preserve current challenge and playground behavior;
- emit only privacy-safe typed events.

P0 does not expand the pilot into a full adaptive engine.

## 4. Out of Scope

- Server-side verified code execution or grading.
- AI tutor, AI-generated study plans, or AI code review.
- Billing and subscriptions.
- Portfolio and project-submission workflows.
- Community, cohort, or mentor features.
- MongoDB or a new CMS.
- Large visual redesign.
- Destructive removal of the legacy progress snapshot.

## 5. Integration Strategy

### 5.1 Source control sequence

1. Work from `feat/p0-full-stabilization`, created from restored `master`.
2. Back up uncommitted changes in the walkthrough worktree as a patch or safety branch before any cleanup.
3. Integrate `f9a86af` from `feat/practice-ladder-pilot` as the canonical candidate implementation.
4. Run a capability-by-capability audit rather than assuming the integrated code satisfies P0.
5. Compare the walkthrough backup against the integrated result and port only unique requirements or fixes.
6. Keep stabilization fixes reviewable by capability where practical.

### 5.2 Capability audit matrix

Each integrated area receives one of four statuses:

- **Accepted:** implementation and tests satisfy this spec.
- **Fix required:** implementation exists but misses acceptance criteria.
- **Replace:** implementation violates a trust or data boundary.
- **Missing:** implementation must be added.

The audit covers repository config, CI, content validation, each runner, progress item state, outbox, multi-tab channel, remote mutation APIs, migrations, RLS, walkthrough, practice ladder, observability, and documentation.

## 6. Migration and Rollback

### 6.1 Migration

- Apply additive schema and RPC migrations in staging first.
- Validate with at least two independent authenticated users.
- Read legacy snapshot data during hydration.
- Convert legacy progress to normalized item records through idempotent writes.
- Keep compatibility reads and projection updates enabled during P0.

### 6.2 Feature switches

Provide independently controllable switches for:

- worker execution;
- LWW remote progress;
- practice ladder.

The exact mechanism may use environment-backed build flags or a small runtime configuration layer, but defaults and rollback behavior must be documented.

### 6.3 Rollback

- Roll back the application without reversing or dropping additive database structures.
- Disable worker runner, LWW remote writes, or the ladder independently if a production regression appears.
- Preserve local outbox entries until the compatible client is available again; do not discard them silently.
- Do not perform destructive database rollback in P0.

## 7. Testing Strategy

### 7.1 Unit tests

Required coverage includes:

- content schemas and cross-references;
- LWW complete/uncomplete ordering;
- equal-timestamp tie-breaking;
- anonymous/account merge;
- outbox idempotency, retry, and deduplication;
- authentication-generation invalidation;
- multi-tab message validation;
- worker request correlation;
- timeout termination and clean restart;
- stale-response rejection;
- output limits;
- error redaction;
- practice-ladder progression;
- solution walkthrough access and payload shaping.

### 7.2 Supabase integration tests

Using a disposable local or staging Supabase instance:

- User A cannot read or mutate User B's records.
- Anonymous access cannot write user-owned state.
- Learners cannot elevate their role.
- RPCs operate only on `auth.uid()`.
- Retried operations do not duplicate state or attempts.
- Legacy snapshots convert without losing completion state.
- Newer uncomplete/reset operations cannot be overwritten by older devices.

### 7.3 End-to-end smoke tests

Automate at least these journeys:

1. Anonymous lesson -> quiz -> local progress.
2. Login -> deterministic anonymous progress merge.
3. Complete in tab A -> state appears in tab B.
4. Newer uncomplete wins over older complete.
5. Infinite Python execution times out while the UI remains responsive.
6. JavaScript execution cannot access app window or local storage.
7. Practice-ladder steps complete in order.
8. Bookmark, note, and snippet operations still work after migration.

## 8. CI and Release Gates

A pull request may merge only when:

1. lint passes;
2. typecheck passes;
3. unit and required integration tests pass;
4. content validation passes;
5. production build and Pagefind generation pass;
6. production dependency audit has no high or critical finding;
7. migration and security checks pass;
8. relevant E2E smoke tests pass for changes touching auth, progress, runners, or practice.

Moderate advisories may be temporarily accepted only when an upstream fix is unavailable, the exposure is assessed, and a follow-up deadline is recorded.

## 9. Release Process

1. Complete integration and capability audit on the P0 branch.
2. Deploy a preview against Supabase staging.
3. Apply additive migrations in staging.
4. Execute automated and manual two-user RLS verification.
5. Enable worker execution in a preview/canary environment.
6. Enable LWW sync after runner health is stable.
7. Enable the practice ladder last.
8. Review typed error counters and smoke results after each switch.
9. Promote defaults only after the canary window shows no blocking regression.

## 10. Acceptance Criteria

P0 is complete only when all statements below are true:

- Root quality scripts do not scan `.worktrees` or generated output.
- Lint, typecheck, unit tests, content validation, and production build pass from a clean checkout.
- CI enforces the same commands used locally.
- Malformed or orphaned repository content fails validation.
- Infinite user code cannot freeze the application main UI.
- User JavaScript no longer executes in the application window.
- Every runner has a documented timeout and output limit.
- Client-delivered tests are not described as secure hidden or verified tests.
- Complete and uncomplete synchronize correctly through deterministic LWW rules.
- Offline mutations retry idempotently.
- Multi-tab and auth-change races are covered by tests.
- Automated evidence proves RLS isolation between two users.
- Existing authenticated and anonymous progress survives migration.
- No observability payload contains secrets or raw learner content.
- Practice ladder and walkthrough do not regress existing challenge, playground, library, or progress behavior.
- Production dependency audit contains no high or critical finding.
- Deployment, feature-switch, migration, and rollback instructions are documented and tested in staging.

## 11. Deliverables

- Integrated and stabilized source code.
- Additive Supabase migrations and security checks.
- GitHub Actions workflow.
- Repository content validator.
- Worker-based execution clients and workers.
- LWW item state, local outbox, multi-tab channel, and remote delta mutation path.
- Vendor-neutral observability contracts and redaction helpers.
- Unit, Supabase integration, and E2E smoke tests.
- Updated README trust-boundary and operations documentation.
- Deployment/migration/rollback runbook.
- Capability audit and final P0 verification report.

## 12. Follow-up Milestones

After P0, product work continues as separate spec/plan cycles:

1. Learning loop: diagnostic assessment, continue-learning recommendation, weekly goals, and mastery model.
2. Project evidence: milestones, rubric, repository/demo submission, review, and portfolio output.
3. Adaptive practice: difficulty progression, weak-topic detection, spaced review, and richer practice ladders.
4. Grounded AI tutor and monetization only after learning and operational data are trustworthy.
