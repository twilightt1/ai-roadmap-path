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
  /** Legacy flag for an additional client-side test; browser content remains inspectable. */
  hidden?: boolean;
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
  /** Lời giải mẫu — không gửi về client (server-only, cho "show solution"). */
  solution?: string;
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
