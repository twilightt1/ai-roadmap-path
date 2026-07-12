# Challenge Solution Walkthrough Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a progressive solution walkthrough to code challenges that unlocks after 3 submit attempts or immediately after solving.

**Architecture:** Keep the initial challenge payload solution-safe by continuing to strip solution data from `getChallenge(id)`. Add a server-only solution accessor plus an API route that returns only the solution payload, and gate fetching/rendering in a client panel based on existing challenge progress attempts. Structured walkthrough metadata is optional so existing challenges keep working while content is added incrementally.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, static JSON challenge content, existing progress store, existing shadcn/base UI components.

---

## File Structure

- Modify `lib/challenge-types.ts`
  - Add `SolutionWalkthrough` and `ChallengeSolutionPayload` types.
  - Add optional `solutionWalkthrough` to `Challenge`.
- Modify `lib/challenge.ts`
  - Validate optional walkthrough metadata.
  - Keep default challenge payload free of `solution` and `solutionWalkthrough`.
  - Add `getChallengeSolution(id)` server-side accessor.
- Create `lib/challenge.test.ts`
  - Cover default stripping, solution accessor, missing challenge behavior, and walkthrough loading.
- Create `lib/challenge-solution.ts`
  - Hold unlock threshold and pure unlock-state helper.
- Create `lib/challenge-solution.test.ts`
  - Cover locked, failed-attempt, threshold, and solved states.
- Modify `vitest.config.ts`
  - Add `@` alias support for route-handler tests that import App Router files.
- Create `app/api/challenges/[id]/solution/route.ts`
  - Return solution payload as JSON or 404.
- Create `app/api/challenges/[id]/solution/route.test.ts`
  - Cover 200 and 404 route behavior.
- Create `components/challenge/solution-walkthrough-panel.tsx`
  - Render locked state, fetch-on-open unlocked state, fallback walkthrough, and reference solution.
- Modify `components/challenge/challenge-view.tsx`
  - Compute unlock state from existing progress and render the panel.
- Modify `content/challenges/python-fibonacci.json`
  - Add the first structured walkthrough example.

---

### Task 1: Add Challenge Solution Payload Types and Server Accessor

**Files:**
- Create: `lib/challenge.test.ts`
- Modify: `lib/challenge-types.ts`
- Modify: `lib/challenge.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/challenge.test.ts` with this content:

```ts
import { describe, expect, it } from "vitest";
import { getChallenge, getChallengeSolution } from "./challenge";

describe("challenge loader", () => {
  it("keeps solution data out of the default challenge payload", async () => {
    const challenge = await getChallenge("python-fibonacci");

    expect(challenge).not.toBeNull();
    expect(challenge).not.toHaveProperty("solution");
    expect(challenge).not.toHaveProperty("solutionWalkthrough");
  });

  it("returns a focused solution payload server-side", async () => {
    const payload = await getChallengeSolution("python-fibonacci");

    expect(payload).toMatchObject({ id: "python-fibonacci" });
    expect(payload?.solution).toContain("def solve");
    expect(payload).not.toHaveProperty("testCases");
    expect(payload).not.toHaveProperty("starterCode");
  });

  it("returns null for a missing challenge solution", async () => {
    await expect(getChallengeSolution("missing-challenge")).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm vitest run lib/challenge.test.ts
```

Expected: FAIL because `getChallengeSolution` is not exported from `lib/challenge.ts`.

- [ ] **Step 3: Replace `lib/challenge-types.ts` with the extended types**

```ts
/**
 * Types cho practice challenges (kiểu LeetCode cho AI/Python).
 * Dùng chung cho loader, runner, UI, progress store.
 */

/** Difficulty — tái dùng pattern từ Project.difficulty. */
export type ChallengeDifficulty = "easy" | "medium" | "hard";

/** Category — nhóm challenge theo thư viện/kỹ năng. */
export type ChallengeCategory = "numpy" | "pandas" | "python" | "ml";

/** Label + màu cho mỗi category (dùng ở UI list + filter). */
export const CHALLENGE_CATEGORIES: Record<
  ChallengeCategory,
  { label: string; icon: string; color: string }
> = {
  numpy: { label: "NumPy", icon: "Sigma", color: "text-sky-400" },
  pandas: { label: "Pandas", icon: "Table", color: "text-emerald-400" },
  python: { label: "Python", icon: "FileCode", color: "text-amber-400" },
  ml: { label: "ML", icon: "BrainCircuit", color: "text-fuchsia-400" },
};

/**
 * Cách so sánh output của `solve()` với expected.
 * - `exact`: == (số nguyên, str, list, dict)
 * - `approx`: float so gần đúng (tol 1e-9) — cho kết quả thực
 * - `np_array`: numpy array — np.array_equal (không so dtype)
 * - `pd_frame`: pandas DataFrame — df.equals
 * - `pd_series`: pandas Series — series.equals
 */
export type CompareMode =
  | "exact"
  | "approx"
  | "np_array"
  | "pd_frame"
  | "pd_series";

/** Một test case — gọi `solve(call)`, so với `expected`. */
export type TestCase = {
  /** Tên hiển thị (vd "Ví dụ", "Edge case"). */
  name: string;
  /** Biểu thức Python gọi solve, vd `solve(np.array([1,2,3]))`. */
  call: string;
  /** Giá trị expected — biểu thức Python, vd `3.0` hoặc `np.array([1,4,9])`. */
  expected: string;
  /** Cách so sánh. */
  compare: CompareMode;
  /** Test ẩn — LeetCode ẩn khi fail; MVP hiện hết để debug. */
  hidden?: boolean;
};

/** Structured explanation shown only after solution unlock. */
export type SolutionWalkthrough = {
  approach: string;
  steps: string[];
  edgeCases?: string[];
  complexity?: string;
};

/** Minimal server payload returned by the solution API after client-side unlock. */
export type ChallengeSolutionPayload = {
  id: string;
  solution: string;
  solutionWalkthrough?: SolutionWalkthrough;
};

/** Schema challenge — file `content/challenges/{id}.json`. */
export type Challenge = {
  /** Slug — cũng là tên file + URL. */
  id: string;
  title: string;
  difficulty: ChallengeDifficulty;
  category: ChallengeCategory;
  tags: string[];
  /** Markdown (GFM) — render qua MdxContent. */
  description: string;
  /** Code ban đầu user thấy trong editor. */
  starterCode: string;
  testCases: TestCase[];
  /** Lời giải mẫu — không gửi về client mặc định. */
  solution?: string;
  /** Walkthrough có cấu trúc — không gửi về client mặc định. */
  solutionWalkthrough?: SolutionWalkthrough;
  hint?: string;
};

/** Kết quả chạy 1 test case. */
export type TestCaseResult = {
  name: string;
  passed: boolean;
  /** Chuỗi repr của actual output (cho hiển thị khi fail). */
  actual?: string;
  /** Chuỗi repr của expected (cho hiển thị khi fail). */
  expected?: string;
  /** Lỗi runtime nếu test crash (vd NameError, TypeError). */
  error?: string;
  hidden?: boolean;
  durationMs?: number;
};

/** Kết quả chạy toàn bộ challenge. */
export type ChallengeRunResult = {
  results: TestCaseResult[];
  allPassed: boolean;
  /** Stdout ngoài marker (vd print trong solve). */
  stdout: string;
  stderr: string;
  /** Lỗi harness (syntax error trong user code, v.v.). */
  error?: string;
  durationMs?: number;
};

/** Lưu trong progress store — theo dõi đã giải. */
export type ChallengeResult = {
  solvedAt: string | null;
  attempts: number;
  lastPassed: boolean;
};
```

- [ ] **Step 4: Replace `lib/challenge.ts` with the solution-aware loader**

```ts
import { promises as fs } from "fs";
import { readdirSync, existsSync, readFileSync } from "fs";
import path from "path";
import type {
  Challenge,
  ChallengeCategory,
  ChallengeDifficulty,
  ChallengeSolutionPayload,
  CompareMode,
  SolutionWalkthrough,
} from "./challenge-types";

// Re-export types để code khác import từ "./challenge".
export type {
  Challenge,
  TestCase,
  CompareMode,
  ChallengeDifficulty,
  ChallengeCategory,
  ChallengeSolutionPayload,
  SolutionWalkthrough,
} from "./challenge-types";
export { CHALLENGE_CATEGORIES } from "./challenge-types";

const contentDir = path.join(process.cwd(), "content");
const challengesDir = path.join(contentDir, "challenges");

const VALID_DIFFICULTIES: ChallengeDifficulty[] = ["easy", "medium", "hard"];
const VALID_CATEGORIES: ChallengeCategory[] = ["numpy", "pandas", "python", "ml"];
const VALID_COMPARES: CompareMode[] = [
  "exact",
  "approx",
  "np_array",
  "pd_frame",
  "pd_series",
];

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isValidSolutionWalkthrough(value: unknown): value is SolutionWalkthrough {
  if (!value || typeof value !== "object") return false;
  const walkthrough = value as Record<string, unknown>;
  if (typeof walkthrough.approach !== "string" || walkthrough.approach.trim() === "") {
    return false;
  }
  if (!isStringArray(walkthrough.steps) || walkthrough.steps.length === 0) {
    return false;
  }
  if (walkthrough.edgeCases !== undefined && !isStringArray(walkthrough.edgeCases)) {
    return false;
  }
  if (walkthrough.complexity !== undefined && typeof walkthrough.complexity !== "string") {
    return false;
  }
  return true;
}

/** Validate schema tối thiểu — trả về true nếu OK. */
function isValidChallenge(c: unknown): c is Challenge {
  if (!c || typeof c !== "object") return false;
  const ch = c as Record<string, unknown>;
  if (typeof ch.id !== "string" || !ch.id) return false;
  if (typeof ch.title !== "string") return false;
  if (!VALID_DIFFICULTIES.includes(ch.difficulty as ChallengeDifficulty)) return false;
  if (!VALID_CATEGORIES.includes(ch.category as ChallengeCategory)) return false;
  if (!Array.isArray(ch.tags)) return false;
  if (typeof ch.description !== "string") return false;
  if (typeof ch.starterCode !== "string") return false;
  if (!Array.isArray(ch.testCases) || ch.testCases.length === 0) return false;
  for (const tc of ch.testCases as Record<string, unknown>[]) {
    if (typeof tc.name !== "string") return false;
    if (typeof tc.call !== "string") return false;
    if (typeof tc.expected !== "string") return false;
    if (!VALID_COMPARES.includes(tc.compare as CompareMode)) return false;
  }
  if (
    ch.solutionWalkthrough !== undefined &&
    !isValidSolutionWalkthrough(ch.solutionWalkthrough)
  ) {
    return false;
  }
  return true;
}

/**
 * Đọc một challenge theo id.
 * `includeSolution` = false mặc định — không gửi solution/walkthrough về client.
 */
export async function getChallenge(
  id: string,
  includeSolution = false
): Promise<Challenge | null> {
  const filePath = path.join(challengesDir, `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!isValidChallenge(parsed)) return null;
    if (!includeSolution) {
      const c = parsed as Challenge;
      const {
        id,
        title,
        difficulty,
        category,
        tags,
        description,
        starterCode,
        testCases,
        hint,
      } = c;
      return {
        id,
        title,
        difficulty,
        category,
        tags,
        description,
        starterCode,
        testCases,
        hint,
      } as Challenge;
    }
    return parsed as Challenge;
  } catch {
    return null;
  }
}

/** Đọc payload lời giải tối thiểu cho API unlock. */
export async function getChallengeSolution(
  id: string
): Promise<ChallengeSolutionPayload | null> {
  const challenge = await getChallenge(id, true);
  if (!challenge?.solution) return null;

  return {
    id: challenge.id,
    solution: challenge.solution,
    ...(challenge.solutionWalkthrough
      ? { solutionWalkthrough: challenge.solutionWalkthrough }
      : {}),
  };
}

/**
 * Liệt kê tất cả challenge (metadata + description, KHÔNG include test cases chi tiết
 * hay solution/walkthrough — cho trang list). Test cases được load riêng ở trang detail.
 */
export function getAllChallenges(): Omit<
  Challenge,
  "testCases" | "solution" | "solutionWalkthrough"
>[] {
  if (!existsSync(challengesDir)) return [];
  const files = readdirSync(challengesDir).filter((f) => f.endsWith(".json"));
  const list: Omit<Challenge, "testCases" | "solution" | "solutionWalkthrough">[] = [];
  for (const file of files) {
    try {
      const raw = readFileSync(path.join(challengesDir, file), "utf-8");
      const parsed = JSON.parse(raw);
      if (!isValidChallenge(parsed)) continue;
      const c = parsed as Challenge;
      const meta: Omit<Challenge, "testCases" | "solution" | "solutionWalkthrough"> = {
        id: c.id,
        title: c.title,
        difficulty: c.difficulty,
        category: c.category,
        tags: c.tags,
        description: c.description,
        starterCode: c.starterCode,
        hint: c.hint,
      };
      list.push(meta);
    } catch {
      /* skip invalid */
    }
  }
  // Sắp xếp: theo category rồi difficulty.
  const catOrder: ChallengeCategory[] = ["numpy", "pandas", "python", "ml"];
  const diffOrder: ChallengeDifficulty[] = ["easy", "medium", "hard"];
  list.sort((a, b) => {
    const ca = catOrder.indexOf(a.category);
    const cb = catOrder.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    return diffOrder.indexOf(a.difficulty) - diffOrder.indexOf(b.difficulty);
  });
  return list;
}

/** Params cho generateStaticParams. */
export function allChallengeParams(): { id: string }[] {
  return getAllChallenges().map((c) => ({ id: c.id }));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
pnpm vitest run lib/challenge.test.ts
```

Expected: PASS with 3 tests.

- [ ] **Step 6: Checkpoint**

Run:

```bash
git status --short
```

Expected: shows modified `lib/challenge-types.ts`, `lib/challenge.ts`, and new `lib/challenge.test.ts`.

If the user has explicitly approved commits for this implementation session, run:

```bash
git add lib/challenge-types.ts lib/challenge.ts lib/challenge.test.ts
git commit -m "feat: add challenge solution loader"
```

---

### Task 2: Add Challenge Solution API Route

**Files:**
- Modify: `vitest.config.ts`
- Create: `app/api/challenges/[id]/solution/route.test.ts`
- Create: `app/api/challenges/[id]/solution/route.ts`

- [ ] **Step 1: Write the failing route tests**

Create `app/api/challenges/[id]/solution/route.test.ts` with this content:

```ts
import { describe, expect, it } from "vitest";
import { GET } from "./route";

const context = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe("GET /api/challenges/[id]/solution", () => {
  it("returns solution payload for an existing challenge", async () => {
    const response = await GET(
      new Request("http://localhost/api/challenges/python-fibonacci/solution"),
      context("python-fibonacci")
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ id: "python-fibonacci" });
    expect(body.solution).toContain("def solve");
    expect(body.testCases).toBeUndefined();
  });

  it("returns 404 for a missing challenge", async () => {
    const response = await GET(
      new Request("http://localhost/api/challenges/missing-challenge/solution"),
      context("missing-challenge")
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Challenge solution not found",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm vitest run 'app/api/challenges/[id]/solution/route.test.ts'
```

Expected: FAIL because `app/api/challenges/[id]/solution/route.ts` does not exist.

- [ ] **Step 3: Update Vitest alias config**

Replace `vitest.config.ts` with:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    globals: false,
  },
});
```

- [ ] **Step 4: Implement the route handler**

Create `app/api/challenges/[id]/solution/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { getChallengeSolution } from "@/lib/challenge";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const payload = await getChallengeSolution(id);

  if (!payload) {
    return NextResponse.json(
      { error: "Challenge solution not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(payload);
}
```

- [ ] **Step 5: Run route tests to verify they pass**

Run:

```bash
pnpm vitest run 'app/api/challenges/[id]/solution/route.test.ts'
```

Expected: PASS with 2 tests.

- [ ] **Step 6: Run loader tests again**

Run:

```bash
pnpm vitest run lib/challenge.test.ts
```

Expected: PASS with 3 tests.

- [ ] **Step 7: Checkpoint**

Run:

```bash
git status --short
```

Expected: shows modified `vitest.config.ts` and new route files.

If the user has explicitly approved commits for this implementation session, run:

```bash
git add vitest.config.ts app/api/challenges/[id]/solution/route.ts app/api/challenges/[id]/solution/route.test.ts
git commit -m "feat: add challenge solution api"
```

---

### Task 3: Add Unlock State Helper

**Files:**
- Create: `lib/challenge-solution.test.ts`
- Create: `lib/challenge-solution.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `lib/challenge-solution.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import {
  SOLUTION_UNLOCK_FAILED_ATTEMPTS,
  getChallengeSolutionUnlockState,
} from "./challenge-solution";

describe("challenge solution unlock state", () => {
  it("uses 3 submit attempts as the default unlock threshold", () => {
    expect(SOLUTION_UNLOCK_FAILED_ATTEMPTS).toBe(3);
  });

  it("is locked with no progress", () => {
    expect(getChallengeSolutionUnlockState(undefined)).toEqual({
      attempts: 0,
      solved: false,
      unlocked: false,
      remainingAttempts: 3,
    });
  });

  it("tracks remaining attempts before threshold", () => {
    expect(
      getChallengeSolutionUnlockState({
        solvedAt: null,
        attempts: 2,
        lastPassed: false,
      })
    ).toEqual({
      attempts: 2,
      solved: false,
      unlocked: false,
      remainingAttempts: 1,
    });
  });

  it("unlocks at the failed attempt threshold", () => {
    expect(
      getChallengeSolutionUnlockState({
        solvedAt: null,
        attempts: 3,
        lastPassed: false,
      })
    ).toEqual({
      attempts: 3,
      solved: false,
      unlocked: true,
      remainingAttempts: 0,
    });
  });

  it("unlocks immediately when solved", () => {
    expect(
      getChallengeSolutionUnlockState({
        solvedAt: "2026-07-08T00:00:00.000Z",
        attempts: 1,
        lastPassed: true,
      })
    ).toEqual({
      attempts: 1,
      solved: true,
      unlocked: true,
      remainingAttempts: 0,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm vitest run lib/challenge-solution.test.ts
```

Expected: FAIL because `lib/challenge-solution.ts` does not exist.

- [ ] **Step 3: Implement the unlock helper**

Create `lib/challenge-solution.ts` with:

```ts
import type { ChallengeResult } from "./challenge-types";

export const SOLUTION_UNLOCK_FAILED_ATTEMPTS = 3;

export type ChallengeSolutionUnlockState = {
  attempts: number;
  solved: boolean;
  unlocked: boolean;
  remainingAttempts: number;
};

export function getChallengeSolutionUnlockState(
  result: ChallengeResult | undefined,
  threshold = SOLUTION_UNLOCK_FAILED_ATTEMPTS
): ChallengeSolutionUnlockState {
  const attempts = result?.attempts ?? 0;
  const solved = result?.solvedAt != null;
  const unlocked = solved || attempts >= threshold;

  return {
    attempts,
    solved,
    unlocked,
    remainingAttempts: unlocked ? 0 : Math.max(threshold - attempts, 0),
  };
}
```

- [ ] **Step 4: Run helper tests to verify they pass**

Run:

```bash
pnpm vitest run lib/challenge-solution.test.ts
```

Expected: PASS with 5 tests.

- [ ] **Step 5: Checkpoint**

Run:

```bash
git status --short
```

Expected: shows new `lib/challenge-solution.ts` and `lib/challenge-solution.test.ts`.

If the user has explicitly approved commits for this implementation session, run:

```bash
git add lib/challenge-solution.ts lib/challenge-solution.test.ts
git commit -m "feat: add challenge solution unlock helper"
```

---

### Task 4: Add First Structured Walkthrough Content

**Files:**
- Modify: `lib/challenge.test.ts`
- Modify: `content/challenges/python-fibonacci.json`

- [ ] **Step 1: Add a failing content assertion**

Append this test inside the existing `describe("challenge loader", () => { ... })` block in `lib/challenge.test.ts`:

```ts
  it("loads structured walkthrough metadata when present", async () => {
    const payload = await getChallengeSolution("python-fibonacci");

    expect(payload?.solutionWalkthrough).toEqual({
      approach:
        "Dùng cách lặp với hai biến để giữ hai số Fibonacci gần nhất, tránh đệ quy exponential.",
      steps: [
        "Khởi tạo `a = 0` và `b = 1`, tương ứng với F(0) và F(1).",
        "Lặp đúng `n` lần; mỗi vòng cập nhật cặp `(a, b)` thành `(b, a + b)`.",
        "Sau vòng lặp, `a` là F(n), nên trả về `a`.",
      ],
      edgeCases: [
        "`n = 0` phải trả về 0 vì vòng lặp không chạy.",
        "`n = 1` phải trả về 1 sau một lần cập nhật.",
        "Không dùng recursion không memoization vì dễ chậm khi n tăng.",
      ],
      complexity: "Time O(n), space O(1).",
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm vitest run lib/challenge.test.ts
```

Expected: FAIL because `python-fibonacci.json` does not yet contain `solutionWalkthrough`.

- [ ] **Step 3: Replace `content/challenges/python-fibonacci.json` with structured walkthrough content**

```json
{
  "id": "python-fibonacci",
  "title": "Fibonacci thứ n",
  "difficulty": "medium",
  "category": "python",
  "tags": ["fibonacci", "loop", "math"],
  "description": "## Đề bài\n\nViết hàm `solve(n)` trả về số Fibonacci thứ `n`, với quy ước `F(0) = 0`, `F(1) = 1` và `F(n) = F(n-1) + F(n-2)`.\n\nGiới hạn: `0 <= n <= 30`. Khuyến khích dùng cách lặp (iterative) thay vì đệ quy để tránh chậm.\n\n## Ví dụ\n\n```python\nsolve(10)  # → 55\nsolve(0)   # → 0\nsolve(1)   # → 1\n```",
  "starterCode": "def solve(n):\n    # code here\n    pass",
  "testCases": [
    { "name": "Ví dụ F(10)", "call": "solve(10)", "expected": "55", "compare": "exact", "hidden": false },
    { "name": "F(0)", "call": "solve(0)", "expected": "0", "compare": "exact", "hidden": true },
    { "name": "F(1)", "call": "solve(1)", "expected": "1", "compare": "exact", "hidden": true },
    { "name": "F(2)", "call": "solve(2)", "expected": "1", "compare": "exact", "hidden": true },
    { "name": "F(7)", "call": "solve(7)", "expected": "13", "compare": "exact", "hidden": true },
    { "name": "F(15)", "call": "solve(15)", "expected": "610", "compare": "exact", "hidden": true }
  ],
  "solution": "def solve(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a",
  "solutionWalkthrough": {
    "approach": "Dùng cách lặp với hai biến để giữ hai số Fibonacci gần nhất, tránh đệ quy exponential.",
    "steps": [
      "Khởi tạo `a = 0` và `b = 1`, tương ứng với F(0) và F(1).",
      "Lặp đúng `n` lần; mỗi vòng cập nhật cặp `(a, b)` thành `(b, a + b)`.",
      "Sau vòng lặp, `a` là F(n), nên trả về `a`."
    ],
    "edgeCases": [
      "`n = 0` phải trả về 0 vì vòng lặp không chạy.",
      "`n = 1` phải trả về 1 sau một lần cập nhật.",
      "Không dùng recursion không memoization vì dễ chậm khi n tăng."
    ],
    "complexity": "Time O(n), space O(1)."
  },
  "hint": "Dùng hai biến `a, b = 0, 1` và lặp `n` lần với `a, b = b, a + b`."
}
```

- [ ] **Step 4: Run content tests to verify they pass**

Run:

```bash
pnpm vitest run lib/challenge.test.ts
```

Expected: PASS with 4 tests.

- [ ] **Step 5: Checkpoint**

Run:

```bash
git status --short
```

Expected: shows modified `lib/challenge.test.ts` and `content/challenges/python-fibonacci.json`.

If the user has explicitly approved commits for this implementation session, run:

```bash
git add lib/challenge.test.ts content/challenges/python-fibonacci.json
git commit -m "content: add fibonacci solution walkthrough"
```

---

### Task 5: Build the Solution Walkthrough Panel

**Files:**
- Create: `components/challenge/solution-walkthrough-panel.tsx`

- [ ] **Step 1: Create the client component**

Create `components/challenge/solution-walkthrough-panel.tsx` with:

```tsx
"use client";

import { useEffect, useId, useState } from "react";
import {
  BookOpenCheck,
  ChevronDown,
  Code2,
  KeyRound,
  Lightbulb,
  ListChecks,
  Loader2,
  Lock,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { SaveSnippetButton } from "@/components/library/save-snippet-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ChallengeSolutionPayload } from "@/lib/challenge-types";
import { cn } from "@/lib/utils";

type SolutionWalkthroughPanelProps = {
  challengeId: string;
  unlocked: boolean;
  attempts: number;
  unlockThreshold: number;
  solved: boolean;
  hint?: string;
  challengeTitle?: string;
};

function solutionErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function SolutionWalkthroughPanel({
  challengeId,
  unlocked,
  attempts,
  unlockThreshold,
  solved,
  hint,
  challengeTitle,
}: SolutionWalkthroughPanelProps) {
  const contentId = useId();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<ChallengeSolutionPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!unlocked || !open || payload || loading) return;

    const controller = new AbortController();
    let active = true;

    async function loadSolution() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/challenges/${encodeURIComponent(challengeId)}/solution`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Không tải được lời giải (${response.status})`);
        }

        const data = (await response.json()) as ChallengeSolutionPayload;
        if (active) setPayload(data);
      } catch (e) {
        if (controller.signal.aborted) return;
        if (active) setError(solutionErrorMessage(e));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSolution();

    return () => {
      active = false;
      controller.abort();
    };
  }, [challengeId, loading, open, payload, retryToken, unlocked]);

  const cappedAttempts = Math.min(attempts, unlockThreshold);
  const progressPercent =
    unlockThreshold === 0 ? 100 : Math.round((cappedAttempts / unlockThreshold) * 100);
  const walkthrough = payload?.solutionWalkthrough;
  const fallbackApproach = walkthrough?.approach ?? hint;

  if (!unlocked) {
    return (
      <Card className="gap-0 border-border/60 bg-card/30 p-0">
        <div className="flex items-start gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
            <Lock className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">Solution walkthrough</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Lời giải từng bước sẽ mở sau khi bạn submit sai đủ {unlockThreshold} lần,
              hoặc mở ngay khi bạn giải đúng challenge.
            </p>
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>
                  {cappedAttempts}/{unlockThreshold} submit attempts
                </span>
                <span>{Math.max(unlockThreshold - cappedAttempts, 0)} lần nữa</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-0 border-border/60 bg-card/30 p-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-foreground/[0.03]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
          <BookOpenCheck className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">Solution walkthrough</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {solved
              ? "Đã mở vì bạn đã giải đúng challenge."
              : `Đã mở sau ${attempts} submit attempts.`}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div id={contentId} className="border-t border-border/60 p-4">
          {loading && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Đang tải lời giải…
            </div>
          )}

          {error && (
            <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <div className="flex items-center gap-2">
                <TriangleAlert className="h-3.5 w-3.5" />
                <span>{error}</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setError(null);
                  setRetryToken((value) => value + 1);
                }}
              >
                Thử tải lại
              </Button>
            </div>
          )}

          {payload && (
            <div className="space-y-4">
              <WalkthroughSection icon={Lightbulb} title="Approach">
                <p>{fallbackApproach ?? "Challenge này chưa có walkthrough chi tiết."}</p>
              </WalkthroughSection>

              {walkthrough?.steps && walkthrough.steps.length > 0 && (
                <WalkthroughSection icon={ListChecks} title="Steps">
                  <ol className="list-decimal space-y-1.5 pl-4">
                    {walkthrough.steps.map((step, index) => (
                      <li key={`${index}-${step}`}>{step}</li>
                    ))}
                  </ol>
                </WalkthroughSection>
              )}

              {walkthrough?.edgeCases && walkthrough.edgeCases.length > 0 && (
                <WalkthroughSection icon={KeyRound} title="Edge cases">
                  <ul className="list-disc space-y-1.5 pl-4">
                    {walkthrough.edgeCases.map((edgeCase, index) => (
                      <li key={`${index}-${edgeCase}`}>{edgeCase}</li>
                    ))}
                  </ul>
                </WalkthroughSection>
              )}

              {walkthrough?.complexity && (
                <WalkthroughSection icon={Sparkles} title="Complexity">
                  <p>{walkthrough.complexity}</p>
                </WalkthroughSection>
              )}

              <div className="rounded-lg border border-border bg-foreground/[0.02]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Code2 className="h-3.5 w-3.5 text-primary" />
                    Reference solution
                  </div>
                  <SaveSnippetButton
                    language="python"
                    code={payload.solution}
                    challengeSlug={challengeId}
                    defaultTitle={
                      challengeTitle
                        ? `${challengeTitle} reference solution`
                        : `${challengeId} reference solution`
                    }
                  />
                </div>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap p-3 text-xs leading-relaxed text-muted-foreground">
                  <code>{payload.solution}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

type WalkthroughSectionProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
};

function WalkthroughSection({ icon: Icon, title, children }: WalkthroughSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-foreground/[0.02] p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {title}
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
```

- [ ] **Step 2: Run typecheck for the new component**

Run:

```bash
pnpm typecheck
```

Expected: PASS. If it fails on an import or prop type in `solution-walkthrough-panel.tsx`, fix that exact TypeScript error before continuing.

- [ ] **Step 3: Checkpoint**

Run:

```bash
git status --short
```

Expected: shows new `components/challenge/solution-walkthrough-panel.tsx`.

If the user has explicitly approved commits for this implementation session, run:

```bash
git add components/challenge/solution-walkthrough-panel.tsx
git commit -m "feat: add solution walkthrough panel"
```

---

### Task 6: Integrate Walkthrough Panel into Challenge View

**Files:**
- Modify: `components/challenge/challenge-view.tsx`

- [ ] **Step 1: Update imports**

In `components/challenge/challenge-view.tsx`, add these imports:

```ts
import { SolutionWalkthroughPanel } from "./solution-walkthrough-panel";
import {
  SOLUTION_UNLOCK_FAILED_ATTEMPTS,
  getChallengeSolutionUnlockState,
} from "@/lib/challenge-solution";
```

- [ ] **Step 2: Update progress destructuring and unlock state**

Replace the current progress line:

```ts
  const { isChallengeSolved, setChallengeResult, hydrated } = useProgress();
```

with:

```ts
  const {
    isChallengeSolved,
    setChallengeResult,
    getChallengeResult,
    hydrated,
  } = useProgress();
```

Then replace:

```ts
  const solved = hydrated && isChallengeSolved(challenge.id);
  const cat = CHALLENGE_CATEGORIES[challenge.category];
```

with:

```ts
  const challengeResult = hydrated ? getChallengeResult(challenge.id) : undefined;
  const unlockState = getChallengeSolutionUnlockState(challengeResult);
  const solved = hydrated && isChallengeSolved(challenge.id);
  const cat = CHALLENGE_CATEGORIES[challenge.category];
```

- [ ] **Step 3: Render the walkthrough panel in the left column**

In the left column, after the existing Status block:

```tsx
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {solved ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Bạn đã giải challenge này</span>
              </>
            ) : (
              <>
                <Circle className="h-4 w-4 text-muted-foreground/40" />
                <span>Chưa giải — submit để ghi nhận</span>
              </>
            )}
          </div>
```

add:

```tsx
          <SolutionWalkthroughPanel
            challengeId={challenge.id}
            challengeTitle={challenge.title}
            hint={challenge.hint}
            unlocked={hydrated && unlockState.unlocked}
            attempts={hydrated ? unlockState.attempts : 0}
            unlockThreshold={SOLUTION_UNLOCK_FAILED_ATTEMPTS}
            solved={hydrated && unlockState.solved}
          />
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Run targeted tests**

Run:

```bash
pnpm vitest run lib/challenge-solution.test.ts lib/challenge.test.ts 'app/api/challenges/[id]/solution/route.test.ts'
```

Expected: PASS for all targeted tests.

- [ ] **Step 6: Checkpoint**

Run:

```bash
git status --short
```

Expected: shows modified `components/challenge/challenge-view.tsx`.

If the user has explicitly approved commits for this implementation session, run:

```bash
git add components/challenge/challenge-view.tsx
git commit -m "feat: integrate challenge solution walkthrough"
```

---

### Task 7: Final Validation and Manual QA

**Files:**
- No new files.
- Validate the full changed set.

- [ ] **Step 1: Run all tests**

Run:

```bash
pnpm test:run
```

Expected: PASS for the full Vitest suite.

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint
```

Expected: PASS with no ESLint errors.

- [ ] **Step 3: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 4: Run production build**

Run:

```bash
pnpm build
```

Expected: PASS. The build should complete Next.js compilation and Pagefind postbuild.

- [ ] **Step 5: Manual QA in the browser**

Run the dev server:

```bash
pnpm dev
```

Open:

```txt
http://localhost:3000/practice/python-fibonacci
```

Verify these states:

1. Fresh/no attempts:
   - `Solution walkthrough` panel is locked.
   - It shows `0/3 submit attempts`.
   - The browser Network tab does not show a request to `/api/challenges/python-fibonacci/solution` before unlock.

2. Submit wrong code three times:
   - Attempts progress shows `1/3`, then `2/3`.
   - After the third submit, the panel unlocks.
   - Opening the panel fetches `/api/challenges/python-fibonacci/solution`.
   - The panel shows Approach, Steps, Edge cases, Complexity, and Reference solution.

3. Solve the challenge:
   - The challenge shows `Đã giải`.
   - The panel remains unlocked after refresh.

4. Fallback behavior:
   - Open a challenge without `solutionWalkthrough`, such as `/practice/numpy-mean-array`.
   - Unlock it by solving or by three failed submits.
   - The panel shows a fallback approach from `hint` if present and still shows Reference solution.

Stop the dev server after QA.

- [ ] **Step 6: Inspect final diff**

Run:

```bash
git diff --stat
git diff -- docs/superpowers/specs/2026-07-08-challenge-solution-walkthrough-design.md docs/superpowers/plans/2026-07-08-challenge-solution-walkthrough.md lib/challenge-types.ts lib/challenge.ts lib/challenge.test.ts lib/challenge-solution.ts lib/challenge-solution.test.ts vitest.config.ts app/api/challenges/[id]/solution/route.ts app/api/challenges/[id]/solution/route.test.ts components/challenge/solution-walkthrough-panel.tsx components/challenge/challenge-view.tsx content/challenges/python-fibonacci.json
```

Expected: diff matches this plan and does not include unrelated changes.

- [ ] **Step 7: Final checkpoint**

If the user has explicitly approved commits for this implementation session, run:

```bash
git add docs/superpowers/specs/2026-07-08-challenge-solution-walkthrough-design.md docs/superpowers/plans/2026-07-08-challenge-solution-walkthrough.md lib/challenge-types.ts lib/challenge.ts lib/challenge.test.ts lib/challenge-solution.ts lib/challenge-solution.test.ts vitest.config.ts app/api/challenges/[id]/solution/route.ts app/api/challenges/[id]/solution/route.test.ts components/challenge/solution-walkthrough-panel.tsx components/challenge/challenge-view.tsx content/challenges/python-fibonacci.json
git commit -m "feat: add challenge solution walkthrough"
```

If commits have not been approved, leave the working tree uncommitted and report the changed files.

---

## Plan Self-Review

- Spec coverage: covered data model, server accessor, API route, unlock helper, panel UI, challenge integration, one structured content example, tests, and manual QA.
- Placeholder scan: no unresolved placeholder markers or unspecified implementation steps.
- Type consistency: `SolutionWalkthrough`, `ChallengeSolutionPayload`, `SOLUTION_UNLOCK_FAILED_ATTEMPTS`, `getChallengeSolution`, and `getChallengeSolutionUnlockState` names are consistent across tasks.
- Scope check: excludes AI feedback, server-side anti-cheat, run history, adaptive recommendations, and full 35-challenge content migration.
