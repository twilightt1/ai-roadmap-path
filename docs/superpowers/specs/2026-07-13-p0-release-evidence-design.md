# P0 Release Runbook and Evidence Design

**Date:** 2026-07-13
**Status:** Approved design; awaiting written-spec review
**Target branch:** `feat/p0-full-stabilization`

## Purpose

Complete the remaining P0 release deliverables with two separate operational documents:

1. a reusable staging deployment and rollback runbook; and
2. a release-specific final verification report containing real, reviewable evidence.

P0 cannot be declared release-ready from local smoke coverage alone. The final report must include actual Supabase migration/RLS proof and authenticated end-to-end evidence from an approved local Supabase or staging environment.

## Scope

### In scope

- Staging preflight, migration, canary, promotion, rollback, and incident-handoff instructions.
- Independent rollout control for worker execution, LWW remote progress, and practice ladder feature flags.
- An evidence matrix covering every P0 acceptance criterion.
- Explicit recording of test commands, environment, timestamps, result, evidence location, and operator.
- A strict release conclusion based on verified results.

### Out of scope

- New deployment infrastructure or secret-management systems.
- Automated production deployment orchestration.
- Replacing existing CI checks, migrations, runners, or feature flags.
- Declaring P0 complete without staging/local-Supabase proof.

## Document boundaries

### `docs/operations/p0-deploy-runbook.md`

This is a reusable procedure. It tells an operator how to prepare, validate, stage, canary, promote, roll back, and hand off a P0 rollout. It does not claim that a particular rollout passed.

Required sections:

1. **Ownership and prerequisites**
   - Release operator, reviewer, deployed commit SHA, approved Supabase project/environment, and intended release window.
   - Credentials must be supplied through approved local/CI secret handling only. Browser bundles must not receive service-role credentials.
   - Record a non-destructive backup/export reference before migration.

2. **Preflight gates**
   - Run and require success for `pnpm check`, `pnpm audit:prod`, `pnpm test:db`, and `pnpm test:e2e`.
   - Record output locations and stop the rollout on any failed or blocked required gate.
   - Confirm the migration inventory is additive and in the intended order.

3. **Staging migration and security validation**
   - Apply migrations to the approved staging Supabase environment in filename order.
   - Run the database/RLS test suite against that environment.
   - Verify two independent authenticated users and RPC ownership behavior before enabling remote progress writes.
   - Do not attempt destructive schema rollback.

4. **Canary rollout**
   - Deploy the candidate application with all P0 feature switches initially disabled unless a tested default is already documented.
   - Enable in this order: worker execution, LWW remote progress, then practice ladder.
   - For each switch: run its smoke journey, inspect typed/redacted error signals, record a hold/promote decision, and stop on a blocking regression.

5. **Promotion and monitoring**
   - Promote only after every required gate and canary check passes.
   - Retain the deployed SHA, migration version, active flag values, and evidence references.

6. **Rollback and recovery**
   - Roll back application code to the prior compatible release or disable the specific failing feature flag.
   - Never drop additive P0 schema as rollback.
   - Preserve local outbox entries; do not clear client progress as a rollback action.
   - Record the symptom, feature state, SHA, migration state, operator, and next handoff action.

7. **Incident handoff checklist**
   - Include exact reproduction, affected users/environment, failed gates, logs/error codes, flag state, rollback status, and owner.

### `docs/operations/p0-verification-report.md`

This is a release-specific evidence record. It is a template until a named release fills it with real results. It must contain no fabricated results.

Required matrix fields:

| Field | Requirement |
|---|---|
| Criterion | Exact P0 acceptance criterion or grouped requirement |
| Procedure | Command or manual validation procedure |
| Environment | Local, local Supabase, or staging; include commit SHA and relevant flag values |
| Result | PASS, BLOCKED, or approved N/A only |
| Evidence | Link/path to logs, CI run, test output, or reviewer record |
| Operator/date | Person or automation identity and ISO timestamp |
| Notes | Limitations, retry context, or approver for N/A |

Required evidence groups:

- Repository quality, CI parity, content validation, production build, and dependency audit.
- Worker correlation, timeout/restart, JavaScript isolation, SQL isolation, output limits, stale-response handling, and user-facing error behavior.
- LWW complete/uncomplete ordering, offline outbox retry/idempotency, multi-tab propagation, anonymous-to-authenticated merge, and auth-generation invalidation.
- Additive migrations, RLS cross-user isolation, RPC ownership, role-escalation prevention, and legacy-progress compatibility.
- Anonymous learning and practice smoke flows plus authenticated library/progress synchronization E2E flows.
- Observability redaction and the absence of raw learner content/secrets in emitted platform diagnostics.
- Canary switch sequence and a non-destructive rollback rehearsal.

## Release conclusion rules

- **PASS** means the documented procedure completed successfully and the evidence reference is accessible to reviewers.
- **BLOCKED** means a required environment, credential, service, command, or validation result is unavailable or failed. A blocked required criterion prevents a P0-ready conclusion.
- **N/A** is permitted only for an objectively inapplicable criterion and requires an explicit justification plus reviewer approval. It cannot be used to bypass Supabase/RLS or authenticated-E2E proof.
- The report may state **P0 Ready for Release** only when every required criterion is PASS or an approved N/A, all migrations have been validated in the target staging environment, and the rollout/rollback evidence is recorded.
- Otherwise, the report must state **P0 Not Ready** and list each blocking criterion with its owner and next action.

## Error handling and safety

- A failed preflight, database/RLS test, authenticated E2E test, high/critical dependency audit result, or canary smoke test is a hard stop.
- Never paste credentials, tokens, cookies, raw learner code, raw notes, or Supabase service-role values into either document.
- Evidence links may reference protected CI/staging artifacts but must be accessible to release reviewers.
- Use stable platform error codes and redacted logs in incident records.

## Verification strategy

Before publishing a release-specific PASS report:

1. Review the runbook against the current feature flag names, migration inventory, and package scripts.
2. Perform the complete preflight against the candidate SHA.
3. Run database/RLS checks against an approved local Supabase or staging instance.
4. Configure smoke-user credentials and run authenticated E2E coverage against the same approved environment.
5. Perform the staged canary sequence and a rollback rehearsal.
6. Fill the evidence matrix with actual outputs, then obtain release-review sign-off.

## Acceptance criteria

This documentation work is complete when:

- The runbook is executable without hidden operational assumptions.
- It explicitly stops rollout on failed required gates.
- It defines a non-destructive schema and client-progress rollback path.
- The verification report distinguishes template status from real evidence.
- The report cannot truthfully mark P0 ready while staging RLS or authenticated E2E evidence is missing.
- Both documents align with the P0 Full Stabilization Design and its final exit gate.
