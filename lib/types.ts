/**
 * Kiểu dữ liệu cho AI Engineer Roadmap.
 *
 * Phase 1 production auth/user-data path: Supabase Auth + Supabase PostgreSQL.
 * Các type runtime bên dưới vẫn là source-of-truth cho UI/content hiện tại.
 * prisma/schema.prisma chỉ là schema legacy/future/reference, không phải hướng triển khai Phase 1.
 */

export type Difficulty = "easy" | "medium" | "hard";

/** Một chủ đề con trong phase, ví dụ: "1.1 Python Fundamentals" */
export interface Topic {
  /** Slug id, ví dụ "python-fundamentals" — cũng là tên file MDX (content/phase-{n}/{id}.mdx) */
  id: string;
  /** Mã hiển thị, ví dụ "1.1" */
  code: string;
  /** Tiêu đề, ví dụ "Python Fundamentals" */
  title: string;
  /** 1 câu tóm tắt làm lead-in cho trang đọc */
  description?: string;
  /** Mục tiêu học tập "Bạn sẽ học gì" (hiển thị ở overview + đầu bài) */
  items: string[];
}

/** Một dự án thực hành trong phase */
export interface Project {
  /** Slug id */
  id: string;
  title: string;
  difficulty: Difficulty;
  /** Mô tả ngắn */
  description: string;
  /** Tính năng cần làm */
  features: string[];
  /** Tech stack */
  stack: string[];
  /** Số phase sở hữu project, ví dụ 1 */
  phase: number;
}

/** Một giai đoạn của lộ trình (Phase 0 -> 17) */
export interface Phase {
  /** Số phase, ví dụ 0, 1, ..., 17. Capstone = 18 */
  number: number;
  /** Slug cho URL, ví dụ "phase-1-programming" */
  slug: string;
  title: string;
  /** Icon name trong lucide-react */
  icon: string;
  /** Mục tiêu của phase (sau ">" trong MD) */
  goal: string;
  /** Tóm tắt 1 dòng cho card/thumbnail */
  summary: string;
  /** Màu accent chính (tailwind class token: violet/cyan/emerald/amber/rose) */
  accent: AccentColor;
  topics: Topic[];
  projects: Project[];
  /** Đúng với Capstone project cuối cùng */
  isCapstone?: boolean;
}

export type AccentColor =
  | "violet"
  | "cyan"
  | "emerald"
  | "amber"
  | "rose"
  | "sky"
  | "fuchsia";

/** Tier kỹ năng theo nhu cầu thị trường 2026 */
export interface SkillTier {
  tier: 1 | 2 | 3;
  name: string;
  /** Mô tả ngắn về nhóm */
  subtitle: string;
  skills: string[];
}

/** Một con đường học tập (Path A/B/C/D) */
export interface LearningPath {
  /** "A" | "B" | "C" | "D" */
  id: string;
  name: string;
  focus: string;
  /** Số phase cần đi qua theo thứ tự */
  phases: number[];
  timeline: string;
  description: string;
  accent: AccentColor;
}

/** Một mục tài liệu tham khảo */
export interface Resource {
  topic: string;
  resource: string;
}

/** Nhóm tài liệu tham khảo */
export interface ResourceGroup {
  id: string;
  title: string;
  items: Resource[];
}
