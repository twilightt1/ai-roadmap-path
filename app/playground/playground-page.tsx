"use client";

import { useState, useEffect } from "react";
import { Playground } from "@/components/playground/playground";
import { LANG_LABELS, type Lang } from "@/lib/runner";
import { Code2 } from "lucide-react";

/** Code mẫu mặc định cho mỗi ngôn ngữ. */
const DEFAULT_CODE: Record<Lang, string> = {
  python: `# Python chạy trong browser qua Pyodide
# Thử sửa code rồi bấm Run!

numbers = [1, 2, 3, 4, 5]
squares = [x ** 2 for x in numbers]
print("Bình phương:", squares)

# Pyodide tự load numpy khi thấy import
import numpy as np
arr = np.array(numbers)
print("Mean:", arr.mean())
print("Std:", arr.std().round(3))`,
  sql: `-- SQL chạy trên SQLite (sql.js) trong browser
-- Mỗi run tạo DB mới

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER
);

INSERT INTO users (name, age) VALUES
  ('Alice', 30),
  ('Bob', 25),
  ('Carol', 35);

SELECT name, age FROM users
WHERE age >= 30
ORDER BY age DESC;`,
  javascript: `// JavaScript chạy native trong browser
// console.log được gom vào output panel

const numbers = [1, 2, 3, 4, 5];
const squares = numbers.map((x) => x ** 2);
console.log("Bình phương:", squares);

const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
console.log("Mean:", mean);

// Object hiện đẹp
console.log({ user: "Alice", score: 95 });`,
};

const PLAYGROUND_LS_KEY = "ai-roadmap:playground:v1";

/**
 * Trang /playground — editor full-width + chọn ngôn ngữ.
 * Đọc lang/code từ URL deep-link (query) hoặc localStorage; lưu lại khi đổi.
 */
export function PlaygroundPage({
  initialLang,
  initialCode,
}: {
  initialLang?: string;
  initialCode?: string;
}) {
  // Deep-link (URL query) ưu tiên; nếu không có, khôi phục từ localStorage.
  const [lang, setLang] = useState<Lang>(() => {
    if (
      initialLang === "python" ||
      initialLang === "sql" ||
      initialLang === "javascript"
    ) {
      return initialLang;
    }
    // Khôi phục từ localStorage (lazy init — tránh setState trong effect).
    if (!initialCode) {
      try {
        const saved = localStorage.getItem(PLAYGROUND_LS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as { lang?: Lang };
          if (parsed.lang) return parsed.lang;
        }
      } catch {
        /* ignore */
      }
    }
    return "python";
  });
  const [code, setCode] = useState(() => {
    if (initialCode) return initialCode;
    try {
      const saved = localStorage.getItem(PLAYGROUND_LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { code?: string };
        if (parsed.code) return parsed.code;
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_CODE["python"];
  });

  // Lưu state vào localStorage khi thay đổi.
  useEffect(() => {
    try {
      localStorage.setItem(
        PLAYGROUND_LS_KEY,
        JSON.stringify({ lang, code })
      );
    } catch {
      /* ignore */
    }
  }, [lang, code]);

  const switchLang = (newLang: Lang) => {
    setLang(newLang);
    setCode(DEFAULT_CODE[newLang]);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-border">
            <Code2 className="h-5 w-5 text-primary" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Playground
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Chạy Python, SQL, JavaScript ngay trong browser — không cần cài đặt
            </p>
          </div>
        </div>
      </div>

      {/* Lang selector */}
      <div className="mb-6 flex gap-2">
        {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
          <button
            key={l}
            onClick={() => switchLang(l)}
            className={`rounded-lg border px-4 py-2 text-xs font-mono font-semibold transition-colors ${
              lang === l
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-foreground/5 text-muted-foreground hover:bg-foreground/10"
            }`}
          >
            {LANG_LABELS[l]}
          </button>
        ))}
      </div>

      {/* Playground — full width, persist vào localStorage */}
      <Playground
        key={lang}
        lang={lang}
        initialCode={code}
        title={`Playground · ${LANG_LABELS[lang]}`}
      />
    </div>
  );
}
