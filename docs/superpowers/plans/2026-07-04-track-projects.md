# Track 51 Projects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let learners track progress on the 51 projects by checking off individual features in each project, with a "done" state computed when all features are checked, and a dashboard "Projects" section showing overall + per-phase project breakdown.

**Architecture:** Extend the existing `lib/progress.ts` localStorage store with a new `Set<string>` of feature keys (`${projectId}/${featureIndex}`). Add a new `/projects/[id]` route (server component) that renders a feature checklist (client component). Update the dashboard's `ProgressOverview` with a new "Projects" section. Update the existing `ProjectCard` to link to the detail page and show a progress indicator.

**Tech Stack:** Next.js 15 (App Router), React 19, `useSyncExternalStore`, TypeScript, Tailwind CSS, motion/react, lucide-react, base-ui. No test runner (no vitest/jest) — verification is manual via `pnpm dev` and `pnpm build`.

---

## File Structure

### Files to create

| File | Responsibility |
|---|---|
| `app/projects/[id]/page.tsx` | Server component — project detail page. Renders title, difficulty badge, phase number, description, feature checklist, tech stack, link to parent phase. |
| `components/roadmap/feature-checklist.tsx` | Client component — renders the feature checklist with checkboxes, progress bar, and "done" state. |
| `components/roadmap/project-progress-section.tsx` | Client component — renders the "Projects" section in the dashboard: overall X/51 + per-phase project breakdown. |

### Files to modify

| File | Responsibility |
|---|---|
| `lib/progress.ts` | Add `projectFeatures: Set<string>` to `StoreState`, new localStorage key, `featureKey`/`isProjectDone` helpers, `toggleFeature`/`setFeature`/`isFeatureDone`/`projectStats` API on `useProgress`, extend `computeStats` with `projectProgress`, update `reset`. |
| `components/roadmap/project-card.tsx` | Change the "Xem phase" link to `/projects/[id]`, add a small progress indicator (X/5 or checkmark). |
| `components/shared/progress-overview.tsx` | Add `<ProjectProgressSection />` below the existing phase breakdown. |

---

## Task 1: Extend `lib/progress.ts` store with project feature tracking

**Files:**
- Modify: `lib/progress.ts`

This task extends the existing store with a new `Set<string>` of feature keys. No new files — the store is the single source of truth.

- [ ] **Step 1: Add the new localStorage key and update `StoreState`**

In `lib/progress.ts`, find the existing constants block (around line 17-19):

```ts
const STORAGE_KEY = "ai-roadmap:progress:v1";
const COMPLETED_KEY = "ai-roadmap:completed:v1";
const STARTED_KEY = "ai-roadmap:started:v1";
```

Add a new key after `STARTED_KEY`:

```ts
const PROJECT_FEATURES_KEY = "ai-roadmap:project-features:v1";
```

Then find the `StoreState` type (around line 38-42):

```ts
type StoreState = {
  completed: Set<string>;
  startedAt: string | null;
  lastVisit: string | null;
};
```

Replace it with:

```ts
type StoreState = {
  completed: Set<string>;
  projectFeatures: Set<string>;
  startedAt: string | null;
  lastVisit: string | null;
};
```

Then find the `emptyState` (around line 44-48):

```ts
const emptyState: StoreState = {
  completed: new Set(),
  startedAt: null,
  lastVisit: null,
};
```

Replace it with:

```ts
const emptyState: StoreState = {
  completed: new Set(),
  projectFeatures: new Set(),
  startedAt: null,
  lastVisit: null,
};
```

- [ ] **Step 2: Update `loadState` to read the new key**

Find the `loadState` function (around line 50-65):

```ts
function loadState(): StoreState {
  if (typeof window === "undefined") return emptyState;
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    const completed = raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>();
    const lastVisit = localStorage.getItem(STORAGE_KEY);
    const startedAt = localStorage.getItem(STARTED_KEY);
    return { completed, lastVisit, startedAt };
  } catch {
    return emptyState;
  }
}
```

Replace it with:

```ts
function loadState(): StoreState {
  if (typeof window === "undefined") return emptyState;
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    const completed = raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>();
    const featuresRaw = localStorage.getItem(PROJECT_FEATURES_KEY);
    const projectFeatures = featuresRaw
      ? new Set<string>(JSON.parse(featuresRaw) as string[])
      : new Set<string>();
    const lastVisit = localStorage.getItem(STORAGE_KEY);
    const startedAt = localStorage.getItem(STARTED_KEY);
    return { completed, projectFeatures, lastVisit, startedAt };
  } catch {
    return emptyState;
  }
}
```

- [ ] **Step 3: Update `persistState` to write the new key**

Find the `persistState` function (around line 67-78):

```ts
function persistState(s: StoreState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify([...s.completed]));
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, now);
    if (!s.startedAt) localStorage.setItem(STARTED_KEY, now);
  } catch {
    // ignore quota errors
  }
}
```

Replace it with:

```ts
function persistState(s: StoreState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify([...s.completed]));
    localStorage.setItem(PROJECT_FEATURES_KEY, JSON.stringify([...s.projectFeatures]));
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, now);
    if (!s.startedAt) localStorage.setItem(STARTED_KEY, now);
  } catch {
    // ignore quota errors
  }
}
```

- [ ] **Step 4: Add the import for `allProjects`**

At the top of the file, find the existing import (around line 3-5):

```ts
import { useCallback, useSyncExternalStore } from "react";
import { phases } from "./roadmap-data";
```

Add `allProjects` to the import:

```ts
import { useCallback, useSyncExternalStore } from "react";
import { phases, allProjects } from "./roadmap-data";
```

- [ ] **Step 5: Add `featureKey` and `isProjectDone` helpers**

Find the existing `topicKey` function (around line 90-92):

```ts
/** Build a topic key: `${phaseSlug}/${topicId}` */
export function topicKey(phaseSlug: string, topicId: string): string {
  return `${phaseSlug}/${topicId}`;
}
```

Add the new helpers right after `topicKey`:

```ts
/** Build a feature key: `${projectId}/${featureIndex}` */
export function featureKey(projectId: string, featureIndex: number): string {
  return `${projectId}/${featureIndex}`;
}

/** True if all features of a project are checked. */
export function isProjectDone(projectId: string): boolean {
  const project = allProjects.find((p) => p.id === projectId);
  if (!project || project.features.length === 0) return false;
  return project.features.every((_, i) => state.projectFeatures.has(featureKey(projectId, i)));
}
```

- [ ] **Step 6: Extend `ProgressStats` type with `projectProgress`**

Find the `ProgressStats` type (around line 7-22). After the existing `phaseProgress` array definition, add `completedProjects`, `totalProjects`, and `projectProgress`:

```ts
export type ProgressStats = {
  /** 0..100 */
  overall: number;
  completedTopics: number;
  totalTopics: number;
  completedPhases: number;
  totalPhases: number;
  phaseProgress: Array<{
    phase: number;
    slug: string;
    title: string;
    completed: number;
    total: number;
    percent: number;
    done: boolean;
  }>;
  completedProjects: number;
  totalProjects: number;
  projectProgress: Array<{
    phase: number;
    slug: string;
    title: string;
    completed: number;
    total: number;
    percent: number;
  }>;
  startedAt: string | null;
  lastVisit: string | null;
  /** Days since first activity — computed once when store loads */
  daysSinceStart: number;
};
```

- [ ] **Step 7: Extend `computeStats` to compute `projectProgress`**

Find the `computeStats` function (around line 94-130). It currently ends with:

```ts
  return {
    overall: totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100),
    completedTopics,
    totalTopics,
    completedPhases,
    totalPhases,
    phaseProgress,
    startedAt: s.startedAt,
    lastVisit: s.lastVisit,
    daysSinceStart,
  };
}
```

Add the `projectProgress` computation before the `return` statement, and update the return object:

```ts
  const projectProgress = phases.map((phase) => {
    const total = phase.projects.length;
    const completed = phase.projects.filter((p) => isProjectDone(p.id)).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return {
      phase: phase.number,
      slug: phase.slug,
      title: phase.title,
      completed,
      total,
      percent,
    };
  });

  const totalProjects = allProjects.length;
  const completedProjects = allProjects.filter((p) => isProjectDone(p.id)).length;

  return {
    overall: totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100),
    completedTopics,
    totalTopics,
    completedPhases,
    totalPhases,
    phaseProgress,
    completedProjects,
    totalProjects,
    projectProgress,
    startedAt: s.startedAt,
    lastVisit: s.lastVisit,
    daysSinceStart,
  };
}
```

Note: `isProjectDone` reads `state.projectFeatures` directly (module-level state), so it works inside `computeStats`. The `computeStats` function signature is `computeStats(completed: Set<string>, s: StoreState)` — `s` is the full state, so `isProjectDone` reads `state` (the module-level variable), which is the same object. This is consistent with the existing pattern.

- [ ] **Step 8: Add the new API methods to `useProgress`**

Find the `useProgress` function (around line 133-170). It currently has `toggle`, `setCompleted`, `isCompleted`, `reset`, and a `return` statement. Add the new methods after `isCompleted`:

```ts
  const toggleFeature = useCallback((projectId: string, featureIndex: number) => {
    const key = featureKey(projectId, featureIndex);
    const next = new Set(state.projectFeatures);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setState({ ...state, projectFeatures: next, lastVisit: new Date().toISOString() });
  }, []);

  const setFeature = useCallback((projectId: string, featureIndex: number, value: boolean) => {
    const key = featureKey(projectId, featureIndex);
    const next = new Set(state.projectFeatures);
    if (value) next.add(key);
    else next.delete(key);
    setState({ ...state, projectFeatures: next, lastVisit: new Date().toISOString() });
  }, []);

  const isFeatureDone = useCallback(
    (projectId: string, featureIndex: number) => state.projectFeatures.has(featureKey(projectId, featureIndex)),
    [state.projectFeatures]
  );

  const isProjectDoneCb = useCallback(
    (projectId: string) => {
      const project = allProjects.find((p) => p.id === projectId);
      if (!project || project.features.length === 0) return false;
      return project.features.every((_, i) => state.projectFeatures.has(featureKey(projectId, i)));
    },
    [state.projectFeatures]
  );

  const projectStats = {
    completed: allProjects.filter((p) => isProjectDone(p.id)).length,
    total: allProjects.length,
    percent:
      allProjects.length === 0
        ? 0
        : Math.round((allProjects.filter((p) => isProjectDone(p.id)).length / allProjects.length) * 100),
  };
```

Note: We name the callback `isProjectDoneCb` (not `isProjectDone`) to avoid shadowing the exported `isProjectDone` function. The hook returns `isProjectDoneCb` as the public `isProjectDone` method.

- [ ] **Step 9: Update the `return` statement of `useProgress`**

Find the `return` statement at the end of `useProgress` (around line 160-170):

```ts
  return {
    completed: store.completed,
    hydrated,
    stats,
    toggle,
    setCompleted,
    isCompleted,
    reset,
    startedAt: store.startedAt,
    lastVisit: store.lastVisit,
  };
```

Replace it with:

```ts
  return {
    completed: store.completed,
    projectFeatures: store.projectFeatures,
    hydrated,
    stats,
    toggle,
    setCompleted,
    isCompleted,
    reset,
    toggleFeature,
    setFeature,
    isFeatureDone,
    isProjectDone: isProjectDoneCb,
    projectStats,
    startedAt: store.startedAt,
    lastVisit: store.lastVisit,
  };
```

- [ ] **Step 10: Update `reset` to clear the new key**

Find the `reset` function (around line 150-155):

```ts
  const reset = useCallback(() => {
    setState({ ...emptyState, lastVisit: new Date().toISOString() });
    if (typeof window !== "undefined") {
      localStorage.removeItem(COMPLETED_KEY);
      localStorage.removeItem(STARTED_KEY);
    }
  }, []);
```

Replace it with:

```ts
  const reset = useCallback(() => {
    setState({ ...emptyState, lastVisit: new Date().toISOString() });
    if (typeof window !== "undefined") {
      localStorage.removeItem(COMPLETED_KEY);
      localStorage.removeItem(PROJECT_FEATURES_KEY);
      localStorage.removeItem(STARTED_KEY);
    }
  }, []);
```

- [ ] **Step 11: Verify the build compiles**

Run: `pnpm build` (or `pnpm tsc --noEmit` if build is slow)
Expected: No TypeScript errors. If there are errors, fix them before committing.

- [ ] **Step 12: Commit**

```bash
git add lib/progress.ts
git commit -m "feat: extend progress store with project feature tracking"
```

---

## Task 2: Create `components/roadmap/feature-checklist.tsx`

**Files:**
- Create: `components/roadmap/feature-checklist.tsx`

A client component that renders the feature checklist for a project. Uses `useProgress` to read and toggle features.

- [ ] **Step 1: Create the component file**

Create `components/roadmap/feature-checklist.tsx` with:

```tsx
"use client";

import { motion, AnimatePresence } from "motion/react";
import { Check, CheckCircle2, Trophy } from "lucide-react";
import { useProgress } from "@/lib/progress";

/**
 * Feature checklist for a project — shows progress bar and toggleable checkboxes.
 * A project is "done" when all features are checked.
 */
export function FeatureChecklist({
  projectId,
  features,
}: {
  projectId: string;
  features: string[];
}) {
  const { isFeatureDone, toggleFeature, hydrated } = useProgress();
  const total = features.length;
  const doneCount = features.filter((_, i) => isFeatureDone(projectId, i)).length;
  const allDone = doneCount === total;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">Tính năng cần làm</h3>
            <p className="text-[11px] font-mono text-muted-foreground/70">
              {doneCount}/{total} · {percent}%
            </p>
          </div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {allDone && (
            <motion.span
              key="done"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-mono font-semibold text-emerald-400"
            >
              <Trophy className="h-3.5 w-3.5" />
              Đã hoàn thành
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <motion.div
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full ${allDone ? "bg-emerald-500" : "bg-primary"}`}
        />
      </div>

      {/* Feature list */}
      <ul className="space-y-1.5">
        {features.map((f, i) => {
          const done = isFeatureDone(projectId, i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggleFeature(projectId, i)}
                disabled={!hydrated}
                aria-pressed={done}
                className={`group flex w-full items-start gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-all duration-200 disabled:opacity-50 ${
                  done
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border bg-foreground/5 hover:border-primary/30 hover:bg-foreground/10"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border bg-background text-transparent group-hover:border-primary/50"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span
                  className={`text-xs leading-relaxed ${done ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {f}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `pnpm build`
Expected: No errors. The component isn't used yet, but it should compile.

- [ ] **Step 3: Commit**

```bash
git add components/roadmap/feature-checklist.tsx
git commit -m "feat: add FeatureChecklist component"
```

---

## Task 3: Create `components/roadmap/project-progress-section.tsx`

**Files:**
- Create: `components/roadmap/project-progress-section.tsx`

A client component for the dashboard's "Projects" section. Shows overall X/51 + per-phase project breakdown.

- [ ] **Step 1: Create the component file**

Create `components/roadmap/project-progress-section.tsx` with:

```tsx
"use client";

import { motion } from "motion/react";
import { Rocket } from "lucide-react";
import { useProgress } from "@/lib/progress";

/**
 * Dashboard "Projects" section — overall X/51 + per-phase project breakdown.
 * Reads from `useProgress().stats.projectProgress`.
 */
export function ProjectProgressSection() {
  const { stats, hydrated } = useProgress();

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-border bg-card/40 p-6 animate-pulse">
        <div className="h-5 w-32 rounded bg-foreground/10" />
        <div className="mt-4 h-1.5 rounded-full bg-foreground/10" />
        <div className="mt-6 space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 rounded bg-foreground/5" />
          ))}
        </div>
      </div>
    );
  }

  const { completedProjects, totalProjects, projectProgress } = stats;
  const percent = totalProjects === 0 ? 0 : Math.round((completedProjects / totalProjects) * 100);

  // Only show phases that have at least one project.
  const phasesWithProjects = projectProgress.filter((p) => p.total > 0);

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-foreground">Tiến độ dự án</h3>
        </div>
        <span className="text-xs font-mono text-muted-foreground/70 tabular-nums">
          {completedProjects}/{totalProjects} · {percent}%
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <motion.div
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full bg-emerald-500"
        />
      </div>

      <div className="mt-5 space-y-2.5">
        {phasesWithProjects.map((p, i) => (
          <motion.div
            key={p.slug}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02, duration: 0.2 }}
            className="flex items-center gap-3"
          >
            <span className="w-8 text-right text-[10px] font-mono text-muted-foreground/70 tabular-nums">
              {p.phase}
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate text-muted-foreground">{p.title}</span>
                <span className="ml-2 font-mono tabular-nums text-muted-foreground/70">
                  {p.completed}/{p.total}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <motion.div
                  initial={false}
                  animate={{ width: `${p.percent}%` }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className={`h-full rounded-full ${
                    p.completed === p.total ? "bg-emerald-500" : "bg-primary"
                  }`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `pnpm build`
Expected: No errors. The component isn't used yet, but it should compile.

- [ ] **Step 3: Commit**

```bash
git add components/roadmap/project-progress-section.tsx
git commit -m "feat: add ProjectProgressSection component"
```

---

## Task 4: Create `app/projects/[id]/page.tsx`

**Files:**
- Create: `app/projects/[id]/page.tsx`

A server component that renders the project detail page. Reads `project.id` from the URL, finds the project, and renders the feature checklist.

- [ ] **Step 1: Create the page file**

Create `app/projects/[id]/page.tsx` with:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Cpu } from "lucide-react";
import { allProjects, getProjectById, phases } from "@/lib/roadmap-data";
import { difficultyMap, accentMap } from "@/lib/theme";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/shared/reveal";
import { FeatureChecklist } from "@/components/roadmap/feature-checklist";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return allProjects.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const project = getProjectById(id);
  if (!project) return {};
  return {
    title: `${project.title} · Dự án`,
    description: project.description,
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const project = getProjectById(id);
  if (!project) notFound();

  const d = difficultyMap[project.difficulty];
  const phase = phases.find((p) => p.number === project.phase);
  const a = phase ? accentMap[phase.accent] : null;
  const phaseLabel = phase?.isCapstone ? "Capstone" : `Phase ${project.phase}`;
  const phaseHref = phase ? `/phase/${phase.slug}` : "/projects";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Breadcrumb */}
      <Link
        href="/projects"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground/70 hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Quay lại dự án
      </Link>

      <Reveal>
        <div className="rounded-2xl border border-border bg-card/35 p-6 sm:p-8 relative overflow-hidden">
          <div
            className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${a ? a.bgSoft : "bg-foreground/5"} blur-3xl opacity-40`}
          />
          <div className="relative space-y-4">
            <div className="flex items-start justify-between gap-3">
              <Badge
                variant="secondary"
                className={`${d.bg} ${d.text} border ${d.border} gap-1.5 px-2 py-0 text-[10px]`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {d.label}
              </Badge>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
                {phaseLabel}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {project.title}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {project.description}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground/70">
                <Cpu className="h-3 w-3" /> Stack:
              </span>
              {project.stack.map((s) => (
                <span
                  key={s}
                  className="rounded bg-foreground/5 border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/70"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* Feature checklist */}
      <Reveal className="mt-6">
        <div className="rounded-2xl border border-border bg-card/40 p-6">
          <FeatureChecklist projectId={project.id} features={project.features} />
        </div>
      </Reveal>

      {/* Link to parent phase */}
      <div className="mt-6">
        <Link
          href={phaseHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Xem phase {phaseLabel} <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `pnpm build`
Expected: No errors. The page should statically generate for all 51 projects.

- [ ] **Step 3: Commit**

```bash
git add app/projects/[id]/page.tsx
git commit -m "feat: add project detail page route /projects/[id]"
```

---

## Task 5: Update `components/roadmap/project-card.tsx`

**Files:**
- Modify: `components/roadmap/project-card.tsx`

Change the "Xem phase" link to `/projects/[id]`, add a small progress indicator (X/5 or checkmark).

- [ ] **Step 1: Update the card to link to the project detail page and show progress**

The existing `ProjectCard` component is at `components/roadmap/project-card.tsx`. It's a client component. We need to:
1. Add `useProgress` to read the feature progress.
2. Change the `Link` from `href={phaseHref}` to `href={`/projects/${project.id}`}`.
3. Add a progress indicator (X/5 or checkmark).

Replace the entire file with:

```tsx
"use client";

import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { Project } from "@/lib/types";
import { useProgress } from "@/lib/progress";
import { difficultyMap } from "@/lib/theme";
import { Badge } from "@/components/ui/badge";

export function ProjectCard({ project }: { project: Project }) {
  const d = difficultyMap[project.difficulty];
  const reduce = useReducedMotion();
  const { isFeatureDone, isProjectDone, hydrated } = useProgress();

  const total = project.features.length;
  const doneCount = project.features.filter((_, i) => isFeatureDone(project.id, i)).length;
  const allDone = isProjectDone(project.id);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3 }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border ${d.border} ${d.bg} p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Badge
            variant="secondary"
            className={`${d.bg} ${d.text} border ${d.border} gap-1.5 py-0 px-2 text-[10px]`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {d.label}
          </Badge>
          <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70">
            Phase {project.phase}
          </span>
        </div>
        <div>
          <h4 className="text-sm font-bold leading-snug text-foreground group-hover:text-foreground transition-colors">
            {project.title}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {project.description}
          </p>
        </div>

        {project.features.length > 0 && (
          <ul className="space-y-1">
            {project.features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500/60" />
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-border space-y-3">
        <div className="flex flex-wrap items-center gap-1">
          {project.stack.map((s) => (
            <span
              key={s}
              className="rounded bg-foreground/5 border border-border px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground/70"
            >
              {s}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/projects/${project.id}`}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            Xem dự án <ArrowUpRight className="h-3 w-3" />
          </Link>

          {/* Progress indicator */}
          {hydrated && total > 0 && (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono tabular-nums ${
                allDone
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : doneCount > 0
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-foreground/5 text-muted-foreground/70"
              }`}
            >
              {allDone ? (
                <>
                  <Check className="h-3 w-3" />
                  Done
                </>
              ) : (
                <>{doneCount}/{total}</>
              )}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `pnpm build`
Expected: No errors. The `ProjectCard` is used on `/projects` and `/phase/[slug]`.

- [ ] **Step 3: Commit**

```bash
git add components/roadmap/project-card.tsx
git commit -m "feat: update ProjectCard to link to project detail page and show progress"
```

---

## Task 6: Update `components/shared/progress-overview.tsx`

**Files:**
- Modify: `components/shared/progress-overview.tsx`

Add the `<ProjectProgressSection />` below the existing phase breakdown.

- [ ] **Step 1: Add the import for `ProjectProgressSection`**

Find the existing imports at the top of the file (lines 1-6):

```tsx
"use client";

import { motion } from "motion/react";
import { Trophy, BookOpen, Target, Flame, TrendingUp } from "lucide-react";
import { useProgress } from "@/lib/progress";
import { ProgressRing } from "./progress-ring";
```

Add the new import after the `ProgressRing` import (line 6):

```tsx
import { ProjectProgressSection } from "@/components/roadmap/project-progress-section";
```

- [ ] **Step 2: Add the `<ProjectProgressSection />` to the render**

Find the `return` statement (around line 60). It currently starts with:

```tsx
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c, i) => (
          ...
        ))}
      </div>

      {/* Phase breakdown */}
      <div className="rounded-2xl border border-border bg-card/40 p-6">
        ...
      </div>
    </div>
  );
}
```

The closing `</div>` of the phase breakdown (line 130) is the last child before the closing `</div>` of the root (line 131). Add `<ProjectProgressSection />` between the phase breakdown's closing `</div>` and the root's closing `</div>`:

```tsx
      {/* Phase breakdown */}
      <div className="rounded-2xl border border-border bg-card/40 p-6">
        ... (existing content unchanged)
      </div>

      {/* Projects section */}
      <ProjectProgressSection />
    </div>
  );
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `pnpm build`
Expected: No errors. The dashboard should now render the "Projects" section.

- [ ] **Step 4: Commit**

```bash
git add components/shared/progress-overview.tsx
git commit -m "feat: add Projects section to dashboard"
```

---

## Task 7: Manual verification

**Files:**
- No files to modify — verification only.

- [ ] **Step 1: Run the dev server**

Run: `pnpm dev`
Expected: Server starts on http://localhost:3000

- [ ] **Step 2: Verify the project detail page**

1. Visit `http://localhost:3000/projects/p1-easy`
2. Expected: The page renders the project title, difficulty badge, phase number, description, feature checklist, tech stack, and link to the parent phase.
3. Click a checkbox in the feature checklist.
4. Expected: The checkbox toggles, the progress bar updates.
5. Refresh the page.
6. Expected: The checkbox is still checked (localStorage persistence works).

- [ ] **Step 3: Verify the "done" state**

1. On `http://localhost:3000/projects/p1-easy`, check all 3 features.
2. Expected: The "Đã hoàn thành" badge appears, the progress bar turns emerald, and the status shows "Đã hoàn thành".

- [ ] **Step 4: Verify the `/projects` card**

1. Visit `http://localhost:3000/projects`
2. Expected: The cards link to `/projects/[id]` (not the phase page). Click the "Xem dự án" link on a card.
3. Expected: Navigates to `/projects/[id]`.
4. Check the card of the project you just completed (p1-easy).
5. Expected: The card shows "Done" with a checkmark.

- [ ] **Step 5: Verify the dashboard**

1. Visit `http://localhost:3000`
2. Expected: The "Tiến độ của bạn" section shows the existing 4 cards + phase breakdown, and a new "Projects" section below the phase breakdown.
3. Expected: The "Projects" section shows overall `X/51` (where X is the number of completed projects) and a per-phase project breakdown.
4. The "Tiến độ tổng" percentage should still reflect only topic progress, not project progress (projects are separate).

- [ ] **Step 6: Verify reset**

1. Reset progress (if there's a reset button in the UI, or manually via DevTools).
2. Expected: Both topic completion and project feature checks are cleared.

- [ ] **Step 7: Verify 404**

1. Visit `http://localhost:3000/projects/non-existent-id`
2. Expected: 404 page.

- [ ] **Step 8: Final commit (if any fixes were made)**

If any fixes were made during verification, commit them:

```bash
git add -A
git commit -m "fix: address issues found during manual verification"
```

---

## Self-Review Notes

- **Spec coverage:** All 7 sections of the spec are covered by tasks:
  - §2.1-2.6 (data model) → Task 1
  - §3.1 (feature checklist) → Task 2
  - §3.2 (project progress section) → Task 3
  - §3.3 (progress toggle — no change) → no task needed (correctly omitted)
  - §4.1 (project detail page) → Task 4
  - §4.2 (project card update) → Task 5
  - §5 (dashboard) → Task 6
  - §7 (testing) → Task 7
- **Placeholder scan:** No "TBD", "TODO", or "implement later" in the plan.
- **Type consistency:** The `useProgress` return type is consistent across all tasks:
  - `toggleFeature`, `setFeature`, `isFeatureDone`, `isProjectDone`, `projectStats` (Task 1)
  - `isFeatureDone`, `toggleFeature`, `isProjectDone`, `hydrated` (used in Task 2 and 5)
  - `stats.projectProgress` (used in Task 3)
- **No placeholders:** All code blocks are complete.
