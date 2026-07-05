/** Một câu hỏi trắc nghiệm trong quiz cuối bài. */
export interface QuizQuestion {
  /** Định danh ngắn, dùng làm React key — vd "q1". */
  id: string;
  /** Nội dung câu hỏi (tiếng Việt). */
  prompt: string;
  /** Các đáp án, đúng theo thứ tự hiển thị (không shuffle trong pilot). */
  options: string[];
  /** Index của đáp án đúng trong `options` (0-based). */
  answerIndex: number;
  /** Giải thích ngắn hiển thị sau khi nộp bài (optional). */
  explanation?: string;
}

/** Một quiz cuối bài — gắn với 1 topic qua tên file `{topicId}.json`. */
export interface Quiz {
  questions: QuizQuestion[];
}

/** Ngưỡng vượt qua quiz: tỷ lệ câu đúng ≥ 70%. */
export const QUIZ_PASS_THRESHOLD = 0.7;
