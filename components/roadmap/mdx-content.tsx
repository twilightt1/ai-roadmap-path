import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode, { type Options as PrettyCodeOptions } from "rehype-pretty-code";
import { remarkPlayable } from "@/lib/remark-playable";
import { mdxComponents } from "./mdx-components";

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

/**
 * Render nội dung MDX của một topic.
 * Server component — nhận source string đã đọc từ filesystem.
 */
export function MdxContent({ source }: { source: string }) {
  return (
    <div className="prose-ai">
      <MDXRemote
        source={source}
        components={mdxComponents}
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
