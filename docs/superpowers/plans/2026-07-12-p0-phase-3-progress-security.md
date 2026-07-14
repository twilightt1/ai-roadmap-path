# P0 Phase 3 Progress and Database Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make complete/uncomplete/reset converge safely across tabs, devices, offline retries, and authentication changes while proving Supabase ownership boundaries automatically.

**Architecture:** Keep explicit per-item LWW state and append-only attempts/events. A durable outbox carries retry metadata; epoch conflicts trigger authoritative reload and deterministic rebase instead of permanent failure. Supabase security-definer RPCs derive ownership from `auth.uid()` and are verified with local integration tests.

**Tech Stack:** TypeScript, Vitest, BroadcastChannel, localStorage, Supabase CLI/PostgreSQL, pgTAP or SQL assertions.

---

### Task 1: Validate and normalize local progress documents

**Files:**
- Modify: `lib/progress-local-storage.ts`
- Modify: `lib/progress-local-storage.test.ts`
- Modify: `lib/progress-types.ts`
- Create: `lib/progress-document.ts`
- Create: `lib/progress-document.test.ts`

- [ ] **Step 1: Write failing malformed-document and practice-event tests**

Assert that invalid dates, non-UUID mutation IDs, malformed practice events, negative epochs, and invalid quiz/challenge summaries are rejected without throwing.

```ts
expect(parseProgressDocument({ schemaVersion: 2, itemStates: [{ clientUpdatedAt: "bad" }] })).toBeNull();
expect(parseProgressDocument({ schemaVersion: 2, pendingPracticeEvents: [{ eventId: 1 }] })).toBeNull();
```

- [ ] **Step 2: Run focused tests**

Run:

```bash
pnpm exec vitest run lib/progress-document.test.ts lib/progress-local-storage.test.ts
```

Expected: FAIL because V2 currently validates practice events only as an array and accepts weak item fields.

- [ ] **Step 3: Extract a pure document parser**

`progress-document.ts` owns:

```ts
export function parseProgressDocument(value: unknown): StoreState | null;
export function serializeProgressDocument(state: StoreState): LocalProgressDocumentV3;
```

Use schema version `3` to add retry metadata without mutating V2 documents in place.

- [ ] **Step 4: Preserve V1/V2 migration**

Load order:

1. parse V3;
2. parse V2 and immediately persist V3;
3. parse legacy keys and immediately persist V3;
4. fall back to empty state.

Never remove legacy keys until the V3 write succeeds.

- [ ] **Step 5: Run local persistence tests**

Run:

```bash
pnpm exec vitest run lib/progress-document.test.ts lib/progress-local-storage.test.ts
```

Expected: PASS.

### Task 2: Add durable retry metadata and bounded backoff

**Files:**
- Modify: `lib/progress-outbox.ts`
- Modify: `lib/progress-outbox.test.ts`
- Modify: `lib/progress-types.ts`

- [ ] **Step 1: Write failing retry scheduling tests**

Use:

```ts
expect(nextRetryDelayMs(0)).toBe(1_000);
expect(nextRetryDelayMs(1)).toBe(2_000);
expect(nextRetryDelayMs(20)).toBe(60_000);
expect(isRetryDue(entry, "2026-07-12T10:00:02.000Z")).toBe(true);
```

Also assert same-item deduplication retains the newer mutation and its retry count resets to zero.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm exec vitest run lib/progress-outbox.test.ts
```

- [ ] **Step 3: Define outbox entries**

```ts
export type ProgressOutboxEntry = {
  mutation: ProgressItemState;
  attemptCount: number;
  nextAttemptAt: string;
  lastErrorCode: string | null;
};
```

Use bounded delays `[1000, 2000, 4000, 8000, 16000, 30000, 60000]` plus at most 20% deterministic jitter injected in tests.

- [ ] **Step 4: Implement due selection, failure marking, and acknowledgement**

Keep pure functions. Network awareness and timers belong to the store/orchestrator task.

- [ ] **Step 5: Run outbox tests**

Run:

```bash
pnpm exec vitest run lib/progress-outbox.test.ts
```

Expected: PASS.

### Task 3: Validate multi-tab messages and prevent broadcast loops

**Files:**
- Modify: `lib/progress-channel.ts`
- Modify: `lib/progress-channel.test.ts`

- [ ] **Step 1: Write failing validation tests**

Assert malformed messages are ignored, the sender ID is included, and received mutations are not rebroadcast by the receiver.

- [ ] **Step 2: Run tests**

Run:

```bash
pnpm exec vitest run lib/progress-channel.test.ts
```

Expected: FAIL for missing payload validation/sender identity.

- [ ] **Step 3: Define the channel envelope**

```ts
export type ProgressChannelMessage = {
  version: 1;
  senderId: string;
  type: "mutation" | "reset";
  mutation?: ProgressItemState;
  resetEpoch?: number;
};
```

Validate every field before notifying subscribers.

- [ ] **Step 4: Add storage-event fallback**

When `BroadcastChannel` is unavailable, use a short-lived localStorage event key. Ignore messages from the same `senderId`.

- [ ] **Step 5: Run channel tests**

Run:

```bash
pnpm exec vitest run lib/progress-channel.test.ts
```

Expected: PASS.

### Task 4: Extract and test the progress sync state machine

**Files:**
- Create: `lib/progress-store.ts`
- Create: `lib/progress-store.test.ts`
- Modify: `lib/progress.ts`
- Modify: `lib/progress-sync.ts`
- Modify: `lib/progress-sync.test.ts`

- [ ] **Step 1: Write failing state-machine tests**

Cover:

1. local mutation updates UI, persists, broadcasts, and queues once;
2. offline error schedules retry;
3. `online` event flushes due entries;
4. epoch mismatch reloads authoritative state, rebases pending mutations, and retries once;
5. auth generation change prevents acknowledgement into the next user;
6. remote reset clears old pending operations and publishes reset epoch;
7. external mutation is applied but not rebroadcast;
8. no concurrent flush uses the same stale expected epoch.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm exec vitest run lib/progress-store.test.ts lib/progress-sync.test.ts
```

Expected: FAIL; current orchestration is module-global in `progress.ts`, epoch mismatch becomes `failed`, and retry requires manual action.

- [ ] **Step 3: Implement injected store dependencies**

```ts
export type ProgressStoreDependencies = {
  loadLocal(userId?: string | null): StoreState;
  persistLocal(state: StoreState, userId?: string | null): void;
  loadRemote(client: SupabaseClient): Promise<RemoteProgressSnapshot>;
  applyRemote(client: SupabaseClient, epoch: number, entries: ProgressOutboxEntry[]): Promise<ApplyResult>;
  now(): string;
  setTimer(callback: () => void, delayMs: number): unknown;
};
```

Do not let React imports enter `progress-store.ts`.

- [ ] **Step 4: Implement epoch conflict classification**

In `progress-remote.ts`, map PostgreSQL `P0001`/message `progress epoch mismatch` to a typed `ProgressEpochConflictError`. The store catches only this class for authoritative reload/rebase; other errors use backoff.

- [ ] **Step 5: Rebase on authoritative state**

On conflict:

1. load latest epoch/items;
2. merge pending local item mutations using LWW;
3. keep only entries newer than authoritative item rows;
4. retry once with the latest epoch;
5. if conflict repeats, back off and emit `SYNC_CONFLICT`.

- [ ] **Step 6: Make reset an explicit channel/auth operation**

A successful reset returns `nextEpoch`, clears local item/outbox/event state, persists it, and broadcasts `{ type: "reset", resetEpoch: nextEpoch }`. A tab receiving a newer reset drops operations from earlier epochs.

- [ ] **Step 7: Keep `useProgress()` as a compatibility facade**

`lib/progress.ts` subscribes to one store instance and exposes the existing component API. Quiz/challenge attempt APIs remain append-only; lesson/project checkbox state uses the store.

- [ ] **Step 8: Run state and legacy tests**

Run:

```bash
pnpm exec vitest run lib/progress-store.test.ts lib/progress-sync.test.ts lib/progress-local-storage.test.ts lib/progress-item-state.test.ts lib/progress-outbox.test.ts lib/progress-channel.test.ts
```

Expected: PASS.

### Task 5: Harden RPC input, legacy projection, and reset semantics

**Files:**
- Create: `supabase/migrations/202607120001_p0_progress_hardening.sql`
- Modify: `lib/progress-remote.ts`
- Modify: `lib/progress-remote.test.ts`

- [ ] **Step 1: Add failing remote adapter tests**

Assert:

- epoch conflict produces `ProgressEpochConflictError`;
- malformed timestamps/UUIDs from remote rows are skipped and reported;
- mutation RPC batches are capped at 100 entries;
- successful mutation updates the compatibility snapshot projection;
- quiz answers/raw challenge code are not put into observability metadata.

- [ ] **Step 2: Run focused tests**

Run:

```bash
pnpm exec vitest run lib/progress-remote.test.ts
```

- [ ] **Step 3: Add migration validation and limits**

The additive migration must:

- reject arrays larger than 100 mutations or 100 events;
- reject future timestamps beyond 24 hours and item keys over 500 characters;
- enforce enum values and required event fields before cast;
- update `user_progress_state.completed/project_features` from canonical item rows after accepted mutations;
- recreate an empty compatibility snapshot after reset instead of deleting the user row permanently;
- retain `security definer`, `set search_path = public, pg_temp`, revoke public/anon, and grant only authenticated;
- avoid accepting a browser-provided user ID.

- [ ] **Step 4: Add an updated-at trigger for new tables**

Reuse `public.set_updated_at()` for `user_progress_sync`; no browser execute grant is added.

- [ ] **Step 5: Run migration locally**

Run:

```bash
pnpm exec supabase db reset
pnpm exec supabase migration list --local
```

Expected: all migrations apply in order without warning/error.

### Task 6: Add automated Supabase ownership and migration tests

**Files:**
- Create: `supabase/tests/p0_progress_rls.test.sql`
- Create: `scripts/run-supabase-tests.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Write SQL tests that initially fail without test wiring**

The SQL test must create two auth users and prove:

- User A sees only A sync/items/events;
- User B cannot update/delete A through table access;
- anon cannot execute mutation/reset/event RPCs;
- authenticated RPC uses `auth.uid()`;
- learner profile role cannot become admin;
- retrying the same mutation/event ID is idempotent;
- newer explicit uncomplete wins;
- legacy snapshot rows were backfilled;
- reset increments epoch and prevents old-epoch mutation.

- [ ] **Step 2: Add `test:db`**

```json
"test:db": "node scripts/run-supabase-tests.mjs"
```

The runner checks `supabase status`, applies/reset migrations in the disposable local project, and executes the SQL test with `psql` using the local connection string. It exits nonzero on any failed assertion.

- [ ] **Step 3: Run database tests**

Run:

```bash
pnpm exec supabase start
pnpm test:db
```

Expected: PASS with named assertions for both users and anonymous role.

- [ ] **Step 4: Add a CI database job**

Use Supabase CLI in a separate job, start local services, run `pnpm test:db`, and always stop services.

- [ ] **Step 5: Phase 3 exit gate**

Run:

```bash
pnpm test:unit
pnpm test:db
pnpm check
git diff --check
```

Expected: PASS; capability audit marks progress, migration, RPC, and RLS Accepted.
