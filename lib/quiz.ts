import { promises as fs } from "fs";
import path from "path";
import type { Quiz } from "./quiz-types";

// Re-export types + hằng số để code cũ import từ "./quiz" vẫn hoạt động,
// đồng thời giữ phần fs loader ở file server-only này.
export { QUIZ_PASS_THRESHOLD } from "./quiz-types";
export type { Quiz, QuizQuestion } from "./quiz-types";

const contentDir = path.join(process.cwd(), "content");
const quizzesDir = path.join(contentDir, "quizzes");

/**
 * Đọc quiz của một topic.
 * @returns Quiz, hoặc null nếu chưa có file (chưa tác giả) hoặc JSON lỗi.
 * Bắt lỗi parse/schema im lặng để UI luôn an toàn — quiz đơn giản là "không có".
 */
export async function getQuiz(
  phaseNumber: number,
  topicId: string
): Promise<Quiz | null> {
  const filePath = path.join(quizzesDir, `${topicId}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Quiz;
    // Validate tối thiểu: phải có câu hỏi, mỗi câu đủ options + answerIndex hợp lệ.
    if (!parsed.questions || !Array.isArray(parsed.questions)) return null;
    for (const q of parsed.questions) {
      if (
        !q.options ||
        q.options.length < 2 ||
        q.answerIndex < 0 ||
        q.answerIndex >= q.options.length
      ) {
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Kiểm tra topic có quiz chưa (dùng cho generateStaticParams / hiển thị badge nếu cần). */
export async function hasQuiz(
  phaseNumber: number,
  topicId: string
): Promise<boolean> {
  const quiz = await getQuiz(phaseNumber, topicId);
  return quiz !== null;
}
