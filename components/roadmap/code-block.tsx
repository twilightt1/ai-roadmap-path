"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { motion } from "motion/react";

/**
 * Bọc <pre> do rehype-pretty-code sinh ra, thêm nút copy.
 * Dùng làm component `pre` trong MDX.
 */
export function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Lấy text từ figure/pre — children là <code>
    const el = document.createElement("div");
    el.innerHTML = typeof children === "object" ? renderToString(children) : String(children);
    const text = el.textContent ?? "";
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="group relative">
      <motion.button
        type="button"
        onClick={handleCopy}
        aria-label="Sao chép code"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="absolute right-3 top-3 z-20 hidden h-6 w-6 items-center justify-center rounded border border-border bg-card/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-all hover:border-border hover:text-foreground group-hover:opacity-100 sm:flex"
      >
        {copied ? (
          <Check className="h-3 w-3 text-emerald-400" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </motion.button>
      <pre>{children}</pre>
    </div>
  );
}

/** Render đơn giản React node sang HTML string để trích text copy. */
function renderToString(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(renderToString).join("");
  if (typeof node === "object" && "props" in node) {
    const el = node as { props?: { children?: ReactNode } };
    return renderToString(el.props?.children);
  }
  return "";
}
