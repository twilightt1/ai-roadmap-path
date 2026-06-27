import Link from "next/link";
import { BrainCircuit, ExternalLink, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/40">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-background">
              <BrainCircuit className="h-4 w-4" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">AI Engineer Roadmap 2026</span>
              <span className="text-xs text-muted-foreground">
                Từ zero đến production-grade AI systems
              </span>
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link href="/roadmap" className="hover:text-foreground">Lộ trình</Link>
            <Link href="/projects" className="hover:text-foreground">Dự án</Link>
            <Link href="/skills" className="hover:text-foreground">Kỹ năng</Link>
            <Link href="/paths" className="hover:text-foreground">Con đường</Link>
            <Link href="/resources" className="hover:text-foreground">Tài liệu</Link>
          </nav>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border/40 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p className="flex items-center gap-1.5">
            Xây dựng với <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" /> bằng Next.js · Tailwind · shadcn/ui
          </p>
          <p>© {new Date().getFullYear()} · Ultimate AI Engineer Roadmap 2026</p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" /> GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
