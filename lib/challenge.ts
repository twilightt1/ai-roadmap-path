import { promises as fs } from "fs";
import { readdirSync, existsSync, readFileSync } from "fs";
import path from "path";
import type {
  Challenge,
  ChallengeCategory,
  ChallengeDifficulty,
  CompareMode,
  TestCase,
} from "./challenge-types";

// Re-export types để code khác import từ "./challenge".
export type {
  Challenge,
  TestCase,
  CompareMode,
  ChallengeDifficulty,
  ChallengeCategory,
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
  return true;
}

/**
 * Đọc một challenge theo id.
 * `includeSolution` = false mặc định — không gửi solution về client.
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
      // Strip solution trước khi trả về client — tránh lộ đáp án.
      const c = parsed as Challenge;
      const { solution: _omit, ...rest } = c;
      return rest as Challenge;
    }
    return parsed as Challenge;
  } catch {
    return null;
  }
}

/**
 * Liệt kê tất cả challenge (metadata + description, KHÔNG include test cases chi tiết
 * hay solution — cho trang list). Test cases được load riêng ở trang detail.
 */
export function getAllChallenges(): Omit<
  Challenge,
  "testCases" | "solution"
>[] {
  if (!existsSync(challengesDir)) return [];
  const files = readdirSync(challengesDir).filter((f) => f.endsWith(".json"));
  const list: Omit<Challenge, "testCases" | "solution">[] = [];
  for (const file of files) {
    try {
      const raw = readFileSync(path.join(challengesDir, file), "utf-8");
      const parsed = JSON.parse(raw);
      if (!isValidChallenge(parsed)) continue;
      const c = parsed as Challenge;
      const meta: Omit<Challenge, "testCases" | "solution"> = {
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
