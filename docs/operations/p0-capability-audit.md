# P0 Capability Audit

Updated 2026-07-14 after local implementation verification on `codex/p0-integration`.
“Local verified” is not a release claim; approved CI, staging, reviewer, and canary evidence remain separate gates.

| Capability | Current status | Evidence | Remaining release action |
|---|---|---|---|
| Root quality | Local verified | `pnpm check`: content, typecheck, lint, 134 unit tests, production build, and Pagefind index all pass | Attach candidate-SHA CI run |
| CI | Implemented; remote proof pending | Frozen install, quality, DB, zero-skip local authenticated E2E, artifact upload, and production audit jobs in `.github/workflows/ci.yml` | Run on immutable candidate SHA and retain links |
| Content integrity | Local verified | 118 lessons, 118 quizzes, 35 challenge files, and 2 ladders validated; malformed/orphan fixture tests pass | Retain CI output |
| JavaScript worker | Local verified | Worker isolation, timeout, stale-response, and output-limit unit/E2E coverage | Canary with worker flag and diagnostics review |
| Python worker | Local verified | External Pyodide timeout E2E passes without freezing the page | Canary with worker flag and diagnostics review |
| SQL worker | Local verified | SQL.js worker E2E passes quoted-semicolon query; runtime adapter uses the real `Statement.get()` API | Canary with worker flag and diagnostics review |
| LWW item state | Local verified | Unit tests plus authenticated cross-context complete/uncomplete E2E pass | Staging migration/RPC prerequisite and LWW canary |
| Outbox | Local verified | Durable metadata, bounded backoff, idempotency, offline retry, and online-during-flush race regression pass | Staging authenticated E2E and diagnostics review |
| Multi-tab/context propagation | Local verified | Validated channel messages plus authenticated two-context E2E pass | Staging authenticated E2E |
| Remote RPC | Local verified | Batching, epoch conflicts, ownership derivation, idempotency, and reset behavior pass | Approved staging two-user proof |
| Migrations and RLS | Local verified; staging blocked | Disposable DB reset/backfill and 9 RLS/RPC assertions pass on all four migrations | Apply through approved staging process; repeat two-user/anon checks |
| Observability | Implemented; reviewer proof pending | Vendor-neutral adapter and redaction unit tests pass | Inspect sanitized staging/canary emissions and attach reviewer record |
| Feature switches | Local verified | Independent worker, LWW, and ladder flags parse/test successfully | Record exact deployed values at every canary stage |
| E2E smoke | Local verified | `pnpm test:e2e:local`: 11 passed, 0 skipped; disposable smoke user is removed in `finally` | Repeat against approved deployed target |
| Deploy and rollback runbook | Implemented | `docs/operations/p0-deploy-runbook.md` and verification template are present | Populate operator, reviewer, SHA, environment, and evidence links |
| Practice ladder and walkthrough | Local verified; canary pending | Anonymous ladder/walkthrough and authenticated bookmark/library journeys pass | Ladder canary plus manual post-migration notes/snippets regression |

Local execution details and unresolved release gates are recorded in
`docs/operations/p0-local-verification-2026-07-14.md`.
