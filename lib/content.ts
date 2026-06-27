import { promises as fs } from "fs";
import path from "path";
import GithubSlugger from "github-slugger";

const contentDir = path.join(process.cwd(), "content");

export interface TocItem {
  /** cấp 2 (##) hay cấp 3 (###) */
  level: 2 | 3;
  text: string;
  slug: string;
}

/**
 * Đọc nội dung MDX của một topic.
 * @returns source string, hoặc null nếu chưa có file (chưa tác giả).
 */
export async function getTopicContent(
  phaseNumber: number,
  topicId: string
): Promise<string | null> {
  const filePath = path.join(contentDir, `phase-${phaseNumber}`, `${topicId}.mdx`);
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/** Kiểm tra topic có nội dung MDX chưa (để hiển thị link/nút phù hợp). */
export async function hasTopicContent(
  phaseNumber: number,
  topicId: string
): Promise<boolean> {
  const content = await getTopicContent(phaseNumber, topicId);
  return content !== null;
}

/**
 * Trích mục lục từ MDX source (dựa trên ## và ###).
 * Slug khớp với rehype-slug (github-slugger) để anchor link hoạt động.
 */
export function getTableOfContents(mdxSource: string): TocItem[] {
  const slugger = new GithubSlugger();
  const lines = mdxSource.split("\n");
  const items: TocItem[] = [];

  let inCodeFence = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // bỏ qua heading bên trong code block
    if (trimmed.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    let match: RegExpMatchArray | null = null;
    if ((match = trimmed.match(/^###\s+(.+)$/))) {
      const text = match[1].trim();
      items.push({ level: 3, text, slug: slugger.slug(text) });
    } else if ((match = trimmed.match(/^##\s+(.+)$/))) {
      const text = match[1].trim();
      items.push({ level: 2, text, slug: slugger.slug(text) });
    }
  }

  return items;
}

/** Đường dẫn content directory (dùng cho generateStaticParams nếu cần list file). */
export { contentDir };
