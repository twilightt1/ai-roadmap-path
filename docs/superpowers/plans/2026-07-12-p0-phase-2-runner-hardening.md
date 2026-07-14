# P0 Phase 2 Runner Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolate all learner code from the application window and enforce deterministic lifecycle, timeout, stale-response, and output limits for Python, JavaScript, and SQL.

**Architecture:** A single typed `ExecutionWorkerClient` owns request correlation and worker lifecycle. Each language adapter supplies a dedicated worker; workers execute language-specific code and return bounded, structured `RunResult` payloads.

**Tech Stack:** TypeScript, browser Web Workers, Vitest fake workers, Pyodide, sql.js.

---

### Task 1: Harden the worker protocol and lifecycle client

**Files:**
- Modify: `lib/runner/worker-protocol.ts`
- Modify: `lib/runner/execution-worker-client.ts`
- Modify: `lib/runner/execution-worker-client.test.ts`
- Create: `lib/runner/runner-limits.ts`
- Create: `lib/runner/runner-limits.test.ts`

- [ ] **Step 1: Add failing tests for stale results, worker errors, concurrent rejection, and output limits**

Add tests that assert:

```ts
it("ignores a result for an unknown request id", ...);
it("rejects and recreates after a worker error event", ...);
it("rejects a second execution while one request owns the worker", ...);
it("truncates stdout and stderr at configured byte limits", ...);
it("caps SQL rows and cell serialization", ...);
```

- [ ] **Step 2: Run focused tests to verify failure**

Run:

```bash
pnpm exec vitest run lib/runner/execution-worker-client.test.ts lib/runner/runner-limits.test.ts
```

Expected: FAIL for missing error listener, concurrency rule, and limit helpers.

- [ ] **Step 3: Extend the worker abstraction**

Add:

```ts
addEventListener(type: "error", listener: (event: ErrorEvent) => void): void;
```

and a `busy` guard. P0 uses one in-flight execution per language client; the second call rejects with kind `busy` rather than sharing mutable runtime stdout handlers.

- [ ] **Step 4: Define normalized worker errors**

Use:

```ts
export type WorkerExecutionErrorKind =
  | "runtime-load"
  | "timeout"
  | "canceled"
  | "execution"
  | "output-limit"
  | "busy";
```

- [ ] **Step 5: Implement limits**

In `runner-limits.ts` define:

```ts
export const RUNNER_LIMITS = {
  stdoutBytes: 64 * 1024,
  stderrBytes: 64 * 1024,
  errorBytes: 16 * 1024,
  sqlRows: 1_000,
  sqlColumns: 100,
  sqlCellBytes: 8 * 1024,
} as const;
```

Provide UTF-8-aware truncation helpers that append `\n… output truncated`.

- [ ] **Step 6: Ensure timeout/cancel/error rejects all state safely**

`disposeWorker()` must:

1. terminate once;
2. clear timers and abort listeners;
3. reject only the owned pending request;
4. null the worker before future `execute()`;
5. ignore later messages from the terminated instance.

- [ ] **Step 7: Run focused tests**

Run:

```bash
pnpm exec vitest run lib/runner/execution-worker-client.test.ts lib/runner/runner-limits.test.ts
```

Expected: PASS.

### Task 2: Bound JavaScript worker execution

**Files:**
- Modify: `lib/runner/javascript.worker.ts`
- Modify: `lib/runner/js-runner.ts`
- Create: `lib/runner/javascript.worker.test.ts`

- [ ] **Step 1: Write failing isolation and output tests**

Test worker source through an extracted `executeJavaScript(code)` function:

```ts
expect(await executeJavaScript("console.log(typeof window)")).toMatchObject({ stdout: "undefined" });
expect(await executeJavaScript("console.log(typeof localStorage)")).toMatchObject({ stdout: "undefined" });
expect((await executeJavaScript("while(true){}", { timeoutMs: 10 })).errorCode).toBe("RUNNER_TIMEOUT");
expect(hugeOutput.stdout.endsWith("… output truncated")).toBe(true);
```

The infinite-loop assertion belongs to the worker-client/E2E boundary; unit tests should not execute it on the test thread.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm exec vitest run lib/runner/javascript.worker.test.ts lib/runner/execution-worker-client.test.ts
```

- [ ] **Step 3: Extract pure console formatting and bounded append helpers**

Do not expose page globals to `new Function`. Keep execution inside the worker and pass only the bounded console argument.

- [ ] **Step 4: Return typed error codes from the adapter**

Extend `RunResult` with optional:

```ts
errorCode?: "RUNNER_LOAD_FAILED" | "RUNNER_TIMEOUT" | "RUNNER_EXECUTION_FAILED" | "RUNNER_OUTPUT_LIMIT";
```

Map `WorkerExecutionError.kind` deterministically in `js-runner.ts`.

- [ ] **Step 5: Run JavaScript runner tests**

Run:

```bash
pnpm exec vitest run lib/runner/javascript.worker.test.ts lib/runner/execution-worker-client.test.ts
```

Expected: PASS.

### Task 3: Bound Python worker execution and package loading

**Files:**
- Modify: `lib/runner/pyodide.worker.ts`
- Modify: `lib/runner/pyodide-runner.ts`
- Create: `lib/runner/pyodide-runner.test.ts`

- [ ] **Step 1: Write failing adapter tests**

Mock `ExecutionWorkerClient` and assert:

- default load timeout is 60 seconds;
- execution timeout is 10 seconds;
- cancel and timeout preserve typed `errorCode`;
- a second run after timeout uses a fresh worker;
- stdout/stderr limits apply before posting a result.

- [ ] **Step 2: Run focused tests**

Run:

```bash
pnpm exec vitest run lib/runner/pyodide-runner.test.ts
```

Expected: FAIL for typed error mapping and bounded output.

- [ ] **Step 3: Bound stdout/stderr while collecting**

Use the shared byte limiter during `setStdout`/`setStderr`; stop appending after the cap instead of retaining unbounded strings and truncating only at the end.

- [ ] **Step 4: Distinguish runtime load from execution failure**

Track whether runtime and package loading completed; emit `runtime-error` only before `executing` and `execution-error` after it.

- [ ] **Step 5: Run Python tests**

Run:

```bash
pnpm exec vitest run lib/runner/pyodide-runner.test.ts lib/runner/execution-worker-client.test.ts
```

Expected: PASS.

### Task 4: Move SQL into a worker and fix statement lifecycle

**Files:**
- Create: `lib/runner/sql.worker.ts`
- Create: `lib/runner/sql-execution.ts`
- Modify: `lib/runner/sql-runner.ts`
- Modify: `lib/runner/index.ts`
- Create: `lib/runner/sql-execution.test.ts`
- Create: `lib/runner/sql-runner.test.ts`

- [ ] **Step 1: Write failing SQL parser/lifecycle tests**

Cover:

```ts
expect(splitSqlStatements("select ';' as value; select 2;")).toEqual([
  "select ';' as value",
  "select 2",
]);
expect(statement.free).toHaveBeenCalledOnce();
expect(result.rows).toHaveLength(RUNNER_LIMITS.sqlRows);
```

- [ ] **Step 2: Run tests to verify current failures**

Run:

```bash
pnpm exec vitest run lib/runner/sql-execution.test.ts lib/runner/sql-runner.test.ts
```

Expected: FAIL; current runner splits string semicolons, runs on the main thread, and frees non-select statements twice.

- [ ] **Step 3: Implement a quote/comment-aware statement splitter**

Support semicolons inside single/double-quoted strings and `--`/`/* */` comments. Stored procedures/triggers remain out of scope and must produce a documented unsupported-syntax error rather than incorrect execution.

- [ ] **Step 4: Extract SQL execution into a worker-safe module**

`sql-execution.ts` accepts an initialized sql.js module and returns bounded `RunResult`. Each prepared statement is freed exactly once in `finally`; each database closes exactly once.

- [ ] **Step 5: Add the SQL worker and adapter**

Load sql.js with `importScripts` inside `sql.worker.ts`. `sql-runner.ts` becomes an `ExecutionWorkerClient` adapter with default 5-second load and execution timeouts.

- [ ] **Step 6: Run SQL tests**

Run:

```bash
pnpm exec vitest run lib/runner/sql-execution.test.ts lib/runner/sql-runner.test.ts lib/runner/execution-worker-client.test.ts
```

Expected: PASS.

### Task 5: Integrate cancellation and honest trust copy

**Files:**
- Modify: `components/playground/playground.tsx`
- Modify: `components/challenge/challenge-editor.tsx`
- Modify: `components/challenge/test-results.tsx`
- Modify: `lib/challenge-types.ts`
- Modify: `README.md`
- Test: component/helper tests and content grep

- [ ] **Step 1: Add a cancel controller to every execution UI**

Before each run:

```ts
controllerRef.current?.abort();
const controller = new AbortController();
controllerRef.current = controller;
await runCode(lang, code, { signal: controller.signal, onStatus: setRunnerStatus });
```

Abort on unmount and expose a Cancel button while running.

- [ ] **Step 2: Rename hidden-test user copy**

Keep the JSON field for backward compatibility in P0, but UI and docs must say `additional client-side test`, never imply secrecy. On failure, do not print expected values for `hidden === true`; show only the numbered additional test and error class.

- [ ] **Step 3: Add a trust-boundary README section**

State explicitly:

- browser tests are inspectable;
- results are practice-grade, not verified assessment;
- worker isolation protects the application UI/session but is not a hostile multi-tenant server sandbox.

- [ ] **Step 4: Run runner and source checks**

Run:

```bash
pnpm exec vitest run lib/runner components/challenge components/playground
rg -n "secure hidden|hidden tests are secure|verified assessment" README.md app components lib
pnpm typecheck
pnpm lint
pnpm build
```

Expected: tests/build pass; grep returns no misleading claim.

- [ ] **Step 5: Phase 2 exit gate**

Run:

```bash
git diff --check
pnpm test:unit
pnpm check
```

Expected: PASS; capability audit marks all three runners Accepted.
