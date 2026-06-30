import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchTrigger } from "@/components/shared/search-trigger";

const navItems = [
  { href: "/roadmap", label: "Lộ trình" },
  { href: "/projects", label: "Dự án" },
  { href: "/skills", label: "Kỹ năng" },
  { href: "/paths", label: "Con đường" },
  { href: "/resources", label: "Tài liệu" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-background/65 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-background shadow-md shadow-emerald-500/10">
            <BrainCircuit className="h-5 w-5 text-black" strokeWidth={2.2} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight">
              AI Engineer Roadmap
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              2026
            </span>
          </span>
        </Link>
 
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground",
                "transition-colors hover:bg-secondary hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
 
        <div className="flex items-center gap-2">
          <SearchTrigger className="hidden sm:inline-flex" />
          <Link
            href="/roadmap"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-95"
          >
            Bắt đầu
          </Link>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border/40 px-3 py-2 md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
