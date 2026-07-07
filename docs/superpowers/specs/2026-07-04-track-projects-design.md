# Track 51 Projects — Design

**Date:** 2026-07-04
**Status:** Approved
**Sub-project:** 1 of 4 (Quiz, Code playground, Track projects, Full-text search)

## 1. Overview & Goals

### Goal

Let learners track their progress on the 51 projects, by checking off individual features in each project. A project is "done" when all its features are checked. Project completion shows up in the dashboard as a separate stat.

### In scope

- New route `/projects/[id]` — a project detail page with the feature checklist, progress bar, and "Mark as done" (auto-computed)
- New `/projects` card update — the card on `/projects` links to the project detail page instead of the phase page
- New "Projects" section in the dashboard's `ProgressOverview` — overall X/51 + per-phase project breakdown
- Extend the existing `progress.ts` store with a new `Set<string>` of checked feature keys

### Out of scope

- Auth + production DB — deferred for this 2026-07-04 project-tracking slice (localStorage only). **Superseded for current Phase 1 direction by `docs/superpowers/specs/2026-07-06-production-db-hybrid-design.md`: production auth/user-data now uses Supabase Auth + Supabase PostgreSQL; Prisma is legacy/future/reference only.**
- Repo/demo link storage — deferred to v2 (you picked "done status only" + "feature checklist")
- Self-rating, notes — deferred to v2
- Project content (MDX content for projects) — deferred to v2
- Quiz, code playground, full-text search — these are the other 3 sub-features, designed separately

## 2. Data Model

### 2.1 Store extension (`lib/progress.ts`)

Add a new `Set<string>` to `StoreState`:

```ts
type StoreState = {
  completed: Set<string>;          // existing — topic keys: `${phaseSlug}/${topicId}`
  projectFeatures: Set<string>;    // NEW — feature keys: `${projectId}/${featureIndex}`
  startedAt: string | null;
  lastVisit: string | null;
};
```

New localStorage key: `ai-roadmap:project-features:v1` → `JSON.stringify([...projectFeatures])`.

### 2.2 Key design — `featureIndex` not `featureText`

Feature keys use the **index** (`0, 1, 2, ...`) of the feature in the `project.features` array, not the feature text.

**Why:** The feature text is in Vietnamese and may contain special characters. Using the index is simpler, more stable, and matches the array order. If the feature list changes in `roadmap-data.ts`, the index still maps to the same position. If a feature is removed, the `Set` will have a stale key that's never read — acceptable for v1.

### 2.3 New helper functions

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

`allProjects` is a flat array of all 51 projects, derived from `phases` (see `lib/roadmap-data.ts`).

### 2.4 `computeStats` extension

Add `projectProgress` to the existing `ProgressStats`:

```ts
export type ProgressStats = {
  // ... existing fields
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
};
```

`projectProgress` is computed per-phase (same shape as the existing `phaseProgress`), but `completed` counts projects where all features are checked, not topics.

### 2.5 New API on `useProgress` hook

```ts
return {
  // ... existing fields
  toggleFeature: (projectId: string, featureIndex: number) => void;
  setFeature: (projectId: string, featureIndex: number, value: boolean) => void;
  isFeatureDone: (projectId: string, featureIndex: number) => boolean;
  isProjectDone: (projectId: string) => boolean;
  projectStats: { completed: number; total: number; percent: number };
};
```

### 2.6 `reset` behavior

The existing `reset()` clears topic completion and `startedAt`. The new `reset()` also clears `projectFeatures` (remove `ai-roadmap:project-features:v1` from localStorage).

## 3. UI Components

### 3.1 `components/roadmap/feature-checklist.tsx` (new)

A client component that renders the feature checklist for a project:

- **Props:** `projectId: string`, `features: string[]`
- **Renders:** a list of checkboxes, each with a feature label
- **Behavior:** each checkbox toggles `toggleFeature(projectId, index)`
- **Progress bar:** at the top, showing `checkedFeatures / totalFeatures`
- **Done state:** when all features are checked, shows a "Done" state with a subtle animation
- **Hydration:** disabled until `hydrated` (matching the existing `ProgressToggle` pattern)

### 3.2 `components/roadmap/project-progress-section.tsx` (new)

A client component for the dashboard's "Projects" section:

- **Renders:** the overall project progress (X/51) with a progress bar, and a per-phase project breakdown
- **Per-phase row:** each phase row shows `completed/total` and a progress bar (same shape as the existing phase breakdown)
- **Reads:** `useProgress().stats.projectProgress`

### 3.3 `components/shared/progress-toggle.tsx` (no change)

The existing `ProgressToggle` is for topic completion. We don't change it — project completion is auto-computed from the feature checklist, not a separate toggle.

## 4. Pages

### 4.1 `/projects/[id]` (new route)

A new page at `app/projects/[id]/page.tsx`:

- **Server component** — reads `project.id` from the URL, finds the project in `allProjects`
- **404:** if the project doesn't exist, returns `notFound()`
- **Renders:**
  - Back link to `/projects`
  - Project title, difficulty badge, phase number
  - Description
  - Feature checklist (client component)
  - Tech stack
  - Link to the parent phase (`/phase/[slug]`)
- **"Mark as done" status indicator:** auto-computed — not a manual toggle. When all features are checked, the status shows "Đã hoàn thành" (done state). When not all features are checked, the status shows the progress (e.g., "Đang làm: 3/5") — the feature checklist is the only way to mark progress, so the status indicator is not clickable.

### 4.2 `/projects` (existing page — modify)

The existing `ProjectCard` needs to be updated to link to the project detail page instead of the phase detail page:

- Change the `Link` from `href={phaseHref}` to `href={`/projects/${project.id}`}`
- Add a small "checklist" indicator on the card (e.g., `3/5` if the user has checked 3 features, or a checkmark if done)

## 5. Edge Cases

- **Project with 0 features:** All 51 projects have ≥3 features (verified via `grep -c "features: \[\]"` = 0). So `isProjectDone` always returns false when no features are checked, which is correct.
- **Hydration mismatch:** The store uses `useSyncExternalStore` with `getServerSnapshot` returning `emptyState`. The checklist UI is disabled until `hydrated` (matching the existing `ProgressToggle` pattern).
- **Project not found:** `/projects/[id]` returns `notFound()` if the project doesn't exist.
- **Reset clears projects:** `reset()` clears both topic completion and project feature checks.
- **Stale data:** If a project's features change in `roadmap-data.ts`, the index-based keys still map correctly. If a feature is removed, the `Set` will have a stale key that's never read — acceptable for v1.

## 6. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  localStorage                                           │
│  - ai-roadmap:completed:v1      (topic keys)            │
│  - ai-roadmap:project-features:v1  (NEW — feature keys) │
│  - ai-roadmap:started:v1        (existing)              │
│  - ai-roadmap:progress:v1       (existing)              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  lib/progress.ts (single store, useSyncExternalStore)   │
│  - useProgress() hook                                    │
│    - toggle, setCompleted, isCompleted (existing)       │
│    - toggleFeature, setFeature, isFeatureDone,          │
│      isProjectDone (NEW)                                 │
│    - stats (existing)                                    │
│    - projectProgress (NEW)                               │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌─────────────────┐  ┌──────────────┐
│ /projects/   │  │ /projects       │  │ /            │
│   [id]       │  │ (ProjectCard)   │  │ (Dashboard)  │
│              │  │                 │  │              │
│ FeatureCheck │  │ ProjectCard    │  │ ProjectProgress│
│  list        │  │  (link to [id])│  │  Section     │
│              │  │                 │  │              │
└──────────────┘  └─────────────────┘  └──────────────┘
```

## 7. Testing

### 7.1 Manual test checklist

- [ ] Visit `/projects` — cards link to `/projects/[id]` (not the phase page)
- [ ] Visit `/projects/[id]` — feature checklist renders, checkboxes toggle
- [ ] Toggle a feature — refresh the page — the feature is still checked
- [ ] Toggle all features — the project is marked done, shows "Đã hoàn thành"
- [ ] Visit `/projects` — the card shows `X/5` or checkmark if done
- [ ] Visit `/` — the dashboard shows "Projects" section with overall X/51 + per-phase breakdown
- [ ] Reset progress — both topic completion and project feature checks are cleared
- [ ] Visit a non-existent project ID — shows 404

### 7.2 Unit tests (optional)

The project does not currently have a test runner (no `vitest`, `jest`, or `__tests__` directory). Unit tests are optional for this implementation. If the user wants to add a test runner, the following functions would be the highest-value targets:

- `featureKey` — builds correct key format
- `isProjectDone` — returns true when all features checked, false otherwise
- `computeStats` — `projectProgress` correctly counts done projects per phase
- `reset` — clears both `completed` and `projectFeatures`

## 8. Migration Path (v2)

**Superseded production DB note (2026-07-06):** The original version of this historical project-tracking spec described a future v2 auth/DB path in Prisma-first terms. That direction is now superseded by `docs/superpowers/specs/2026-07-06-production-db-hybrid-design.md`. Current Phase 1 production auth/user-data uses **Supabase Auth + Supabase PostgreSQL**. Prisma references in this project-tracking spec should be treated as legacy/future/reference context only, not the active Phase 1 implementation direction.

For this 2026-07-04 localStorage-first slice, the forward-compatible migration intent remains:

- `ai-roadmap:project-features:v1` → a Supabase PostgreSQL-backed user-project completion record (for example, a `UserProject`-equivalent row with `completedAt` when all features are checked)
- The `featureKey` index-based keys can be migrated to a per-feature user-project table if needed (the earlier Prisma schema comparison is legacy/reference only and should not drive Phase 1 production design)

This remains a forward-compatible design: when production sync is added, migration should be a localStorage → Supabase user-data sync aligned with the 2026-07-06 production DB hybrid design.
