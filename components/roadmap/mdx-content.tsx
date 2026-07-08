import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode, { type Options as PrettyCodeOptions } from "rehype-pretty-code";
import { remarkPlayable } from "@/lib/remark-playable";
import { createMdxComponents } from "./mdx-components";

const prettyCodeOptions: PrettyCodeOptions = {
  theme: "github-dark-default",
  keepBackground: false,
  defaultLang: { block: "plaintext", inline: "plaintext" },
  onVisitLine(node) {
    // mỗi line là 1 span để style được
    if (node.properties) {
      node.properties["data-line"] = node.position?.start.line;
    }
  },
};

type MdxContentProps = {
  source: string;
  lessonSlug?: string;
  lessonTitle?: string;
};

/**
 * Render nội dung MDX của một topic.
 * Server component — nhận source string đã đọc từ filesystem.
 */
export function MdxContent({ source, lessonSlug, lessonTitle }: MdxContentProps) {
  return (
    <div className="prose-ai">
      <MDXRemote
        source={source}
        components={createMdxComponents({ lessonSlug, lessonTitle })}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm, remarkPlayable],
            rehypePlugins: [rehypeSlug, [rehypePrettyCode, prettyCodeOptions]],
          },
        }}
      />
    </div>
  );
}
