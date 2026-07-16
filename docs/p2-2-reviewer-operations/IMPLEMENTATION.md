# P2.2 Reviewer Operations Implementation Plan

## Overview

Build a default-off, independently rollbackable reviewer-operations slice on top of P2.1. The implementation keeps learner evidence private, preserves immutable history, and makes reviewer lifecycle mutations transactional and auditable.

## Prerequisites

- P2.1 migration and technical rollout are complete.
- LWW progress, P2 evidence, and P2.1 review remain enabled dependencies.
- P2/P2.1 human sign-offs remain pending and are not bypassed by this plan.

## Phase Summary

1. Feature/data contracts.
2. Reviewer lifecycle RPC and trusted CLI.
3. Bounded queue pagination and reclaim UI.
4. Integrated verification and release documentation.

---

## Phase 1: Feature and data contracts

### Objective

Add the default-off P2.2 flag, typed cursor/page contracts, and an additive migration skeleton.

### Tasks

- [x] Add `NEXT_PUBLIC_P2_REVIEW_QUEUE_PAGINATION` and dependency validation.
- [x] Add cursor/page/item parser tests before adapters.
- [x] Add membership lifecycle fields, operation journal, queue index, and event constraint.

### Success Criteria

Invalid flags/cursors fail closed; flag OFF preserves P2.1 behavior; migration is additive.

---

## Phase 2: Reviewer lifecycle operations

### Objective

Replace ad-hoc membership mutation with an idempotent service-role-only contract.

### Tasks

- [x] Implement `manage_project_reviewer` for add/revoke/restore.
- [x] Release revoked reviewer claims and append audit events atomically.
- [x] Enforce last-active-reviewer safety and explicit break glass.
- [x] Revoke service-role direct membership/journal mutation.
- [x] Add dry-run-by-default `reviewer:ops` CLI and redaction-focused unit tests.

### Success Criteria

Browser roles cannot invoke operations; retries do not duplicate events; no Auth user/snapshot/history deletion occurs.

---

## Phase 3: Bounded queue and reclaim UI

### Objective

Serve deterministic active pages and expose safe reclaim for inactive assignees.

### Tasks

- [x] Implement reviewer-only immutable-keyset page RPC (`N+1`, max 25).
- [x] Add browser adapter/parser tests.
- [x] Add previous/next navigation with stale-request protection.
- [x] Refresh page one after claim/decision.
- [x] Show reclaim only when the assignee is missing/revoked.

### Success Criteria

No page exceeds the bound; cursors do not overlap; active claims cannot be stolen; revoked claims are reclaimable.

---

## Phase 4: Integrated verification and release boundary

### Objective

Prove security, replay, rollback, and content/build integrity.

### Tasks

- [x] Add transactional SQL proof for grants, pagination, lifecycle, idempotency, and last-reviewer guard.
- [x] Add E2E flag-on/flag-off assertions and staging canary suites.
- [x] Run `pnpm check`, local DB/E2E, and dependency audit.
- [x] Record local verification, migration order, rollout, rollback, and human gates.

### Success Criteria

All automated gates pass with zero fixture residue. Rollback disables only P2.2 and leaves P2.1 review/history operational.

## Post-Implementation

- [ ] Protected PR and post-merge CI.
- [ ] Backup and dry-run before staging migration.
- [ ] P2.2 dedicated/full/rollback/restore canaries.
- [ ] Named reviewer-operations usability and release sign-off.

## Notes

- No reviewer-admin browser UI is added; Auth/service-role authority remains trusted-operator only.
- No public portfolio/sharing, grading, certification, URL fetching, or learner-code execution is added.
