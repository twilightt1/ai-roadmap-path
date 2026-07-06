"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BrainCircuit, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchTrigger } from "@/components/shared/search-trigger";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const navItems = [
  { href: "/roadmap", label: "Lộ trình" },
  { href: "/practice", label: "Luyện tập" },
  { href: "/projects", label: "Dự án" },
  { href: "/skills", label: "Kỹ năng" },
  { href: "/paths", label: "Con đường" },
  { href: "/resources", label: "Tài liệu" },
  { href: "/dashboard", label: "Tiến độ" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/65 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-background shadow-md shadow-emerald-500/10 transition-transform group-hover:scale-105">
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
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <SearchTrigger className="hidden sm:inline-flex" />
          <ThemeToggle />
          <Link
            href="/roadmap"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Bắt đầu
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label="Menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-foreground/5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            id="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden border-t border-border px-4 md:hidden"
          >
            <motion.div
              className="flex flex-col gap-1 py-3"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
                visible: { transition: { staggerChildren: 0.05 } },
              }}
            >
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <motion.div
                    key={item.href}
                    variants={{
                      hidden: { opacity: 0, x: -8 },
                      visible: { opacity: 1, x: 0 },
                    }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        isActive
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
