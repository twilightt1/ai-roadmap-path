import Link from "next/link";
import { BrainCircuit, ExternalLink, Code2 } from "lucide-react";

const footerLinks = [
  { href: "/roadmap", label: "Lộ trình" },
  { href: "/projects", label: "Dự án" },
  { href: "/skills", label: "Kỹ năng" },
  { href: "/paths", label: "Con đường" },
  { href: "/resources", label: "Tài liệu" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-background shadow-md shadow-emerald-500/10">
                <BrainCircuit className="h-4 w-4 text-black" strokeWidth={2.2} />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-semibold">AI Engineer Roadmap 2026</span>
                <span className="text-xs text-muted-foreground">
                  Từ zero đến production-grade AI systems
                </span>
              </span>
            </Link>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Khám phá
            </h3>
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Resources */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Kết nối
            </h3>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Code2 className="h-4 w-4" /> GitHub
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" /> Góp ý
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>Xây dựng với Next.js · Tailwind · shadcn/ui</p>
          <p>© {new Date().getFullYear()} · Ultimate AI Engineer Roadmap 2026</p>
        </div>
      </div>
    </footer>
  );
}
