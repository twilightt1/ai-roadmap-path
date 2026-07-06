"use client";

import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { javascript } from "@codemirror/lang-javascript";
import { cobalt } from "thememirror";
import type { Lang } from "@/lib/runner";

/**
 * CodeMirror editor cho playground. Client-only — mount vào ref qua useEffect
 * để tránh chạm DOM ở server. Caller nên import qua `next/dynamic({ ssr:false })`.
 */
function langExtension(lang: Lang) {
  switch (lang) {
    case "python":
      return python();
    case "sql":
      return sql();
    case "javascript":
      return javascript();
  }
}

export function CodeEditor({
  value,
  onChange,
  lang,
  minHeight = "200px",
}: {
  value: string;
  onChange: (value: string) => void;
  lang: Lang;
  minHeight?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Giữ callback mới nhất mà không cần re-create editor mỗi lần.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          langExtension(lang),
          cobalt,
          EditorView.lineWrapping,
          EditorView.theme({
            "&": { height: "100%", fontSize: "12.5px" },
            ".cm-scroller": {
              fontFamily: "var(--font-mono, monospace)",
              lineHeight: "1.55",
            },
            ".cm-gutters": { border: "none" },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
      parent: containerRef.current,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Chỉ re-create khi đổi ngôn ngữ. `value` chỉ dùng init — không sync ngược
    // từ parent để tránh caret jump khi user đang gõ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-lg ring-1 ring-foreground/10 [&_.cm-editor]:rounded-lg"
      style={{ minHeight }}
    />
  );
}
