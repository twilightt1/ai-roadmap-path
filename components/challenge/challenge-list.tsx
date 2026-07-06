"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CheckCircle2, Trophy } from "lucide-react";
import {
  CHALLENGE_CATEGORIES,
  type ChallengeCategory,
  type ChallengeDifficulty,
} from "@/lib/challenge-types";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

type ChallengeMeta = {
  id: string;
  title: string;
  difficulty: ChallengeDifficulty;
  category: ChallengeCategory;
  tags: string[];
};

const DIFFICULTY_STYLES: Record<ChallengeDifficulty, string> = {
  easy: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
  medium: "border-amber-500/30 text-amber-400 bg-amber-500/5",
  hard: "border-rose-500/30 text-rose-400 bg-rose-500/5",
};

const DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/**
 * Trang list challenge — grid card + filter category/difficulty + solved check.
 */
export function ChallengeList({ challenges }: { challenges: ChallengeMeta[] }) {
  const [catFilter, setCatFilter] = useState<ChallengeCategory | "all">("all");
  const [diffFilter, setDiffFilter] = useState<ChallengeDifficulty | "all">(
    "all"
  );
  const { isChallengeSolved, hydrated } = useProgress();

  const filtered = useMemo(() => {
    return challenges.filter((c) => {
      if (catFilter !== "all" && c.category !== catFilter) return false;
      if (diffFilter !== "all" && c.difficulty !== diffFilter) return false;
      return true;
    });
  }, [challenges, catFilter, diffFilter]);

  const solvedCount = hydrated
    ? challenges.filter((c) => isChallengeSolved(c.id)).length
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-border">
            <Trophy className="h-5 w-5 text-primary" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Luyện tập
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Bài toán code kiểu LeetCode — NumPy, Pandas, ML, Python basics
            </p>
          </div>
        </div>

        {/* Progress summary */}
        {hydrated && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>
              Đã giải <strong className="text-foreground">{solvedCount}</strong>{" "}
              / {challenges.length} challenge
            </span>
            <div className="ml-2 h-2 w-32 overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full bg-emerald-400 transition-all"
                style={{
                  width: `${challenges.length === 0 ? 0 : (solvedCount / challenges.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        {/* Category filter */}
        <div className="flex gap-1.5">
          <FilterChip
            active={catFilter === "all"}
            onClick={() => setCatFilter("all")}
          >
            Tất cả
          </FilterChip>
          {(Object.keys(CHALLENGE_CATEGORIES) as ChallengeCategory[]).map(
            (c) => (
              <FilterChip
                key={c}
                active={catFilter === c}
                onClick={() => setCatFilter(c)}
              >
                {CHALLENGE_CATEGORIES[c].label}
              </FilterChip>
            )
          )}
        </div>
        {/* Difficulty filter */}
        <div className="ml-auto flex gap-1.5">
          <FilterChip
            active={diffFilter === "all"}
            onClick={() => setDiffFilter("all")}
          >
            Mọi độ khó
          </FilterChip>
          {(["easy", "medium", "hard"] as ChallengeDifficulty[]).map((d) => (
            <FilterChip
              key={d}
              active={diffFilter === d}
              onClick={() => setDiffFilter(d)}
            >
              {DIFFICULTY_LABELS[d]}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Không có challenge phù hợp bộ lọc.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const solved = hydrated && isChallengeSolved(c.id);
            const cat = CHALLENGE_CATEGORIES[c.category];
            return (
              <Link
                key={c.id}
                href={`/practice/${c.id}`}
                className={cn(
                  "group relative flex flex-col rounded-xl border border-border/60 bg-card/30 p-4 transition-all hover:border-border hover:bg-card/50 hover:shadow-sm",
                  solved && "border-emerald-500/20"
                )}
              >
                {/* Top row: category + difficulty */}
                <div className="mb-2 flex items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider",
                      cat.color,
                      "border-current/20"
                    )}
                  >
                    {cat.label}
                  </span>
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider",
                      DIFFICULTY_STYLES[c.difficulty]
                    )}
                  >
                    {DIFFICULTY_LABELS[c.difficulty]}
                  </span>
                  {solved && (
                    <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-400" />
                  )}
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                  {c.title}
                </h3>

                {/* Tags */}
                {c.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-foreground/5 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/70"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
