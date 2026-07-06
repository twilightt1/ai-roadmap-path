import { visit } from "unist-util-visit";
import type { Code, Root } from "mdast";

/**
 * Remark plugin: chuyển fenced code block có meta chứa `playable` thành
 * node JSX `<Playground lang="..." code="...">` để MDX render component
 * tương tác thay vì CodeBlock read-only.
 *
 * Ví dụ MDX:
 *   ```python playable
 *   print([x**2 for x in range(5)])
 *   ```
 *
 * Chạy TRƯỚC rehype-pretty-code → node code không còn ở hast → shiki bỏ qua.
 *
 * `Playground` phải được đăng ký trong `mdxComponents` map (mdx-components.tsx).
 */

// Map alias fence-lang → Lang chuẩn của playground.
const LANG_MAP: Record<string, "python" | "sql" | "javascript"> = {
  python: "python",
  py: "python",
  sql: "sql",
  javascript: "javascript",
  js: "javascript",
  ts: "javascript",
  typescript: "javascript",
};

export function remarkPlayable() {
  return (tree: Root) => {
    visit(tree, "code", (node: Code, index, parent) => {
      if (index === undefined || index === null || !parent) return;
      const idx = index;
      const meta = node.meta ?? "";
      if (!/\bplayable\b/.test(meta)) return;
      const lang = LANG_MAP[node.lang ?? ""] ?? "python";
      const rawCode = node.value ?? "";

      // Thay node code bằng JSX element <Playground lang={lang} code={rawCode} />
      // Dùng mdxFlowExpression qua hast structure — nhưng với next-mdx-remote/rsc
      // ta cần node mdxJsxFlowElement. Tạo thủ công theo spec mdast-mdx.
      const jsxNode = {
        type: "mdxJsxFlowElement",
        name: "Playground",
        attributes: [
          {
            type: "mdxJsxAttribute",
            name: "lang",
            value: lang,
          },
          {
            type: "mdxJsxAttribute",
            name: "code",
            value: rawCode,
          },
          {
            type: "mdxJsxAttribute",
            name: "showOpenInPlayground",
            value: "true",
          },
        ],
        children: [],
        // position giữ để sourcemap không vỡ
        position: node.position,
      } as unknown as typeof parent.children[number];

      parent.children[idx] = jsxNode;
    });
  };
}
