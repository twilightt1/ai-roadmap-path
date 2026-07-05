# Full-Text Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full-text content search to the AI learning platform using Pagefind — search inside all 118 MDX lesson files plus 51 project pages, with a `/search` page and a palette link.

**Architecture:** Pagefind runs as a `postbuild` step indexing static HTML in `.next/server/app/`, writing the index bundle into `public/pagefind/`. The `/search` route is a server component wrapping a client component that lazy-loads Pagefind UI at runtime (SSR-safe via `useEffect`). Content is scoped via `data-pagefind-body` on the root `<main>`. `next.config.ts` redirects handle Pagefind's `.html`-suffixed result URLs (Pagefind only strips `index.html`, not arbitrary `.html` files — verified per [docs](https://pagefind.app/docs/config-options)).

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Pagefind (build-time CLI), lucide-react, motion/react, Tailwind v4. No test runner — verification is manual via `pnpm dev` / `pnpm start`.

---

## File Structure

### Files to create

| File | Responsibility |
|---|---|
| `app/search/page.tsx` | Server component — search page route. |
| `components/search/search-page-client.tsx` | Client component — Pagefind UI mount + loading/error states. |

### Files to modify

| File | Responsibility |
|---|---|
| `package.json` | Add `pagefind` devDependency, add `postbuild` script. |
| `.gitignore` | Ignore `public/pagefind/`. |
| `app/layout.tsx` | Add `data-pagefind-body` to `<main>`. |
| `next.config.ts` | Add `redirects()` for `.html`-suffixed content URLs. |
| `components/shared/search-command.tsx` | Add "Tìm trong bài học" item linking to `/search`. |
| `app/globals.css` | Add Pagefind UI CSS-variable overrides for theme integration. |

---

## Task 1: Add Pagefind dependency and postbuild script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add Pagefind devDependency**

Run:

```bash
cd "D:\ZCode Data\AI_learining_platform"
pnpm add -D pagefind
```

This adds `"pagefind": "^X.Y.Z"` to `devDependencies`. Verify with `cat package.json | grep pagefind`.

- [ ] **Step 2: Add `postbuild` script to package.json**

In `package.json`, find the existing `"scripts"` block:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
},
```

Replace with (add `postbuild` after `build`):

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "postbuild": "pagefind --site .next/server/app --output-path public/pagefind",
  "start": "next start",
  "lint": "eslint"
},
```

- [ ] **Step 3: Verify Pagefind binary works**

Run:

```bash
npx pagefind --version
```

Expected: Pagefind version string (e.g., `pagefind 1.x.x`). If error, ensure `pnpm install` ran.

- [ ] **Step 4: Test the postbuild runs**

Run:

```bash
pnpm build
```

Expected: `next build` succeeds, then `postbuild` script runs (visible in output). After it completes, verify the output exists:

```bash
ls public/pagefind/
```

Expected: contains `pagefind-entry.js`, `pagefind-ui.css`, `pagefind-ui.js`, and a `pagefind-index/` directory. If any are missing, the postbuild didn't run — check `pnpm build` exit code.

- [ ] **Step 5: Verify URLs in the index (sanity check for §2.4 mitigation)**

Run:

```bash
grep -r "\.html" public/pagefind/pagefind-index/ | head
```

Expected: matches with `.html`-suffixed URLs outside of `index.html` (confirming we need Task 4's redirect). If you see only `index.html` references, the redirect may not be needed — report and we'll consult the spec.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add pagefind devDependency and postbuild script"
```

---

## Task 2: Ignore `public/pagefind/` in git

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add the ignore line**

In `.gitignore`, find the existing block (already includes the superpowers line from earlier work):

```
# typescript
*.tsbuildinfo
next-env.d.ts

# superpowers brainstorming
.superpowers/
```

Add `public/pagefind/` as a new section right after the superpowers block:

```
# superpowers brainstorming
.superpowers/

# pagefind search index (built by postbuild, do not commit)
public/pagefind/
```

- [ ] **Step 2: Verify ignore takes effect**

```bash
git status --short | grep pagefind
```

Expected: empty (no `public/pagefind/` files reported as untracked). If they appear, check the .gitignore syntax — line must be exactly `public/pagefind/`.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore pagefind build output"
```

---

## Task 3: Mark content area with `data-pagefind-body`

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add the attribute to `<main>`**

In `app/layout.tsx`, find line 72:

```tsx
<main className="flex-1">{children}</main>
```

Replace with:

```tsx
<main className="flex-1" data-pagefind-body>{children}</main>
```

**Why:** This is the content-scoping attribute Pagefind reads. `<main>` only wraps `{children}` — navbar/header, footer, SearchCommand, ScrollProgress are all siblings of `<main>` and excluded automatically. When the same `layout.tsx` is rebuilt, Pagefind will only index the page content.

- [ ] **Step 2: Verify the build still works**

```bash
pnpm tsc --noEmit && pnpm build
```

Expected: build succeeds, `public/pagefind/pagefind-entry.js` exists.

- [ ] **Step 3: Verify Light/SEO still works (sanity)**

```bash
grep -c "data-pagefind-body" .next/server/app/phase/phase-1-programming/python-fundamentals.html
```

Expected: `1` (one occurrence — the `<main>` tag in the rendered HTML). If `0`, the attribute didn't make it into the static HTML — check the edit landed.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: scope search to main content via data-pagefind-body"
```

---

## Task 4: Add `.html` redirect rules to `next.config.ts`

**Files:**
- Modify: `next.config.ts`

Pagefind keeps the `.html` suffix in result URLs for non-index files (verified per docs — only `index.html` is stripped by default). Clicking such a result would 404 on App Router. This task adds redirects to map them to the extensionless routes.

- [ ] **Step 1: Add `redirects()` to the Next.js config**

Replace the entire file `next.config.ts` content with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.simpleicons.org",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/phase/:slug/:topic.html",
        destination: "/phase/:slug/:topic",
        permanent: false,
      },
      {
        source: "/phase/:slug.html",
        destination: "/phase/:slug",
        permanent: false,
      },
      {
        source: "/projects/:id.html",
        destination: "/projects/:id",
        permanent: false,
      },
      {
        source: "/:page.html",
        destination: "/:page",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
```

Notes:
- `permanent: false` → 302 redirect (works identically in `next dev` and `next start`; we don't want crawlers caching a redirect that's an artifact of search indexing).
- The `/:page.html` rule is a catch-all for single-segment pages (`/projects.html` → `/projects`, `/skills.html` → `/skills`, etc.). It does **not** collide with `/phase/...` or `/projects/...` because those have multiple segments and the earlier rules match first.
- `/:page.html` will also catch URLs like `/pagefind/anything.html`, but Pagefind's own assets live under `/pagefind/...` (none have a top-level `.html`), so this is safe.

- [ ] **Step 2: Verify the build still works**

```bash
pnpm tsc --noEmit && pnpm build
```

Expected: build succeeds, redirects parsed. The build output may list 4 added redirect routes.

- [ ] **Step 3: Verify redirect at runtime**

Start the server:

```bash
pnpm start
```

In a separate terminal / browser, test:

```bash
curl -I http://localhost:3000/phase/phase-1-programming/python-fundamentals.html
```

Expected: `HTTP/1.1 308` or `307/302` with `location: /phase/phase-1-programming/python-fundamentals`. Stop the server with Ctrl-C when done.

(App Router uses 307/308 for temporary/permanent; we asked for `permanent: false` so it should be 307 or 302.)

- [ ] **Step 4: Commit**

```bash
git add next.config.ts
git commit -m "feat: redirect .html-suffixed search result URLs"
```

---

## Task 5: Create the search page route

**Files:**
- Create: `app/search/page.tsx`

- [ ] **Step 1: Create the page file**

Create `app/search/page.tsx` with exactly this content:

```tsx
import type { Metadata } from "next";
import { SearchPageClient } from "@/components/search/search-page-client";

export const metadata: Metadata = {
  title: "Tìm kiếm",
  description:
    "Tìm trong 118 bài học và 51 dự án của AI Engineer Roadmap 2026.",
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
          Tìm trong bài học
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tìm nội dung bên trong 118 bài học và 51 dự án. Kết quả kèm đoạn trích phù hợp.
        </p>
      </header>
      <SearchPageClient />
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles (will fail until Task 6 — expected)**

```bash
pnpm tsc --noEmit
```

Expected: error about missing `@/components/search/search-page-client`. That's correct — Task 6 creates it. Don't commit yet — wait for Task 6 to land and commit together.

---

## Task 6: Create the search client component

**Files:**
- Create: `components/search/search-page-client.tsx`

The core. Lazy-loads Pagefind UI in `useEffect` (SSR-safe). Handles success, error (dev mode without index), and loading states.

- [ ] **Step 1: Create the component file**

Create `components/search/search-page-client.tsx` with exactly this content:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

/**
 * Search page client — lazy-loads Pagefind UI at runtime.
 * SSR-safe: the dynamic import only fires in useEffect.
 */
export function SearchPageClient() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Dynamic import — fails gracefully if the index wasn't built (e.g. pnpm dev).
        // @ts-expect-error — Pagefind is loaded at runtime, no type declarations.
        const pagefind = await import("/pagefind/pagefind-entry.js");
        if (cancelled) return;
        // Pagefind UI exposes a `PagefindUI` global constructor after the entry runs.
        // See https://pagefind.app/docs/ui
        // @ts-expect-error — PagefindUI is injected by the imported script.
        await new window.PagefindUI({
          element: mountRef.current,
          showImages: false,
        });
        if (!cancelled) setStatus("loaded");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "error") {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/5 border border-border">
          <Search className="h-5 w-5 text-muted-foreground/70" />
        </div>
        <h2 className="text-base font-bold text-foreground">
          Chỉ mục tìm kiếm chưa được xây dựng
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
          Chạy <code className="rounded bg-foreground/5 px-1.5 py-0.5 text-[11px] font-mono">pnpm build</code> để tạo chỉ mục tìm kiếm, sau đó mở lại trang này.
        </p>
        <Link
          href="/roadmap"
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-3.5 py-2 text-xs font-mono font-semibold text-muted-foreground transition-colors hover:bg-foreground/10"
        >
          Vào lộ trình <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div ref={mountRef} aria-busy={status === "loading"} />
  );
}
```

Notes:
- The `@ts-expect-error` directives silence TypeScript on the runtime-loaded Pagefind API. If you prefer typed imports, you can install `@types/pagefind` or write a tiny `.d.ts` shim — not required for v1.
- `new window.PagefindUI({ element, showImages: false })` is the canonical Pagefind UI usage per docs. The `await` is technically a no-op for the synchronous constructor but harmless and future-safe if Pagefind ever returns a promise.
- We pass `mountRef.current` directly. Pagefind renders its UI inside this div, replacing the loading state.

- [ ] **Step 2: Verify the build works end-to-end**

```bash
pnpm tsc --noEmit && pnpm build
```

Expected: build + postbuild both succeed. `public/pagefind/pagefind-entry.js` exists.

- [ ] **Step 3: Test in dev mode (error path)**

```bash
pnpm dev
```

Open `http://localhost:3000/search`. Expected: the "Chỉ mục tìm kiếm chưa được xây dựng" message (because in dev, `public/pagefind/` has stale or no index — note: it may also have a leftover index from a prior build, that's fine; either it loads or shows the error). Stop the server with Ctrl-C.

- [ ] **Step 4: Test in production mode (success path)**

```bash
pnpm start
```

Open `http://localhost:3000/search`. Expected: search bar appears, typing `gradient` returns results from Phase 2 / Phase 3. Click a result → navigates to the topic page (the Task 4 redirect handles any `.html` URL).

- [ ] **Step 5: Commit**

```bash
git add app/search/page.tsx components/search/search-page-client.tsx
git commit -m "feat: add /search route with Pagefind UI"
```

---

## Task 7: Add Pagefind UI theme integration

**Files:**
- Modify: `app/globals.css`

Pagefind UI ships with `pagefind-ui.css` (auto-loaded by `pagefind-entry.js`). We map its CSS variables to our design tokens so the search UI matches the dark modern theme.

- [ ] **Step 1: Find where to add the CSS in globals.css**

Open `app/globals.css` and find a good insertion point — typically near the `:root` color definitions. Look for an existing `:root { ... }` block defining `--primary`, `--foreground`, `--card`, etc.

- [ ] **Step 2: Add Pagefind UI variable overrides**

Append this block at the end of `app/globals.css`:

```css
/* ------------------------------------------------------------------ */
/* Pagefind UI theme integration                                       */
/* Maps Pagefind's CSS variables to our design tokens so the default  */
/* search UI matches the dark modern theme.                            */
/* ------------------------------------------------------------------ */
:root,
.dark {
  --pagefind-ui-primary: var(--primary);
  --pagefind-ui-secondary-text: var(--muted-foreground);
  --pagefind-ui-text: var(--foreground);
  --pagefind-ui-background: var(--background);
  --pagefind-ui-secondary-background: var(--accent);
  --pagefind-ui-border: var(--border);
  --pagefind-ui-border-radius: 0.5rem;
  --pagefind-ui-border-width: 1px;
  --pagefind-ui-font: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
  --pagefind-ui-font-size: 0.875rem;
  --pagefind-ui-tag: var(--muted);
  --pagefind-ui-tag-active: var(--primary);
  --pagefind-ui-search-width: 100%;
}

/* Highlight color for matched terms in results */
:root,
.dark {
  --pagefind-ui-text-mark: hsl(var(--primary));
  --pagefind-ui-text-mark-bg: hsl(var(--primary) / 0.2);
}
```

Notes:
- We use `:root, .dark` (both selectors) so the overrides apply regardless of theme state — `next-themes` toggles the `.dark` class on `<html>`.
- We use `hsl(var(--primary))` for the mark colors because Tailwind v4 defines `--primary` as an HSL channel string (e.g., `--primary: 150 100% 30%`), so `hsl(var(--primary))` resolves correctly. If this project instead defines `--primary` as a full color, drop the `hsl()` wrapper. Verify by reading the existing `:root` block in `globals.css` before deciding — match whatever the existing usages do.

- [ ] **Step 3: Verify visual integration**

```bash
pnpm start
```

Open `http://localhost:3000/search`. Confirm:
- Search input has rounded corners, our border color.
- Result entries are readable in dark mode (text-foreground, not white-on-white or black-on-black).
- Highlighted query terms inside snippets are visible (primary color, semi-transparent bg).
- Toggle light/dark theme via navbar — Pagefind UI responds (colors shift).

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat: theme Pagefind UI with project design tokens"
```

---

## Task 8: Add palette link to `/search`

**Files:**
- Modify: `components/shared/search-command.tsx`

Add a "Tìm trong bài học" item to the existing "Trang" group that links to `/search`.

- [ ] **Step 1: Add `Search` to the icon imports**

Find the existing icon import (line 14):

```tsx
import { Map, Rocket, Award, Compass, BookOpen } from "lucide-react";
```

Add `Search`:

```tsx
import { Map, Rocket, Award, Compass, BookOpen, Search } from "lucide-react";
```

- [ ] **Step 2: Add the CommandItem at the top of the "Trang" group**

Find the existing "Trang" group (around line 92):

```tsx
        <CommandGroup heading="Trang">
          <CommandItem
            value="roadmap timeline lộ trình"
            onSelect={() => onSelect("/roadmap")}
          >
            <Map className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="ml-2">Timeline lộ trình</span>
          </CommandItem>
          ...
```

Replace the opening of that group, inserting the new item **first** (before the Roadmap item):

```tsx
        <CommandGroup heading="Trang">
          <CommandItem
            value="search tìm kiếm bài học content"
            onSelect={() => onSelect("/search")}
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="ml-2">Tìm trong bài học</span>
            <span className="ml-auto pl-2 text-[9px] text-muted-foreground/70">→</span>
          </CommandItem>
          <CommandItem
            value="roadmap timeline lộ trình"
            onSelect={() => onSelect("/roadmap")}
          >
            <Map className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="ml-2">Timeline lộ trình</span>
          </CommandItem>
          ...
```

(Leave all other existing "Trang" items — Rocket, Award, Compass, BookOpen — in their original order after the new item.)

- [ ] **Step 3: Verify the build works**

```bash
pnpm tsc --noEmit && pnpm build
```

Expected: no errors.

- [ ] **Step 4: Verify interactive**

```bash
pnpm start
```

- Open `http://localhost:3000`, press Ctrl/⌘+K, the palette opens.
- "Tìm trong bài học" appears at the top of the "Trang" group with a Search icon and → hint.
- Tab/arrow down to it, press Enter — navigates to `/search`. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add components/shared/search-command.tsx
git commit -m "feat: add palette link to /search"
```

---

## Task 9: Manual verification

**Files:**
- No files — verification only, in a browser.

- [ ] **Step 1: Run full build with postbuild**

```bash
pnpm build
```

Expected: build + postbuild both succeed. `public/pagefind/pagefind-entry.js` exists.

- [ ] **Step 2: Verify the search index content**

```bash
ls public/pagefind/
```

Expected: `pagefind-entry.js`, `pagefind-ui.css`, `pagefind-ui.js`, `pagefind-index/`.

- [ ] **Step 3: Verify the `.html` URL redirect**

```bash
pnpm start
# in another terminal:
curl -I http://localhost:3000/phase/phase-1-programming/python-fundamentals.html
```

Expected: HTTP redirect to `/phase/phase-1-programming/python-fundamentals`. Stop the server.

- [ ] **Step 4: Verify search works in production**

```bash
pnpm start
```

Open `http://localhost:3000/search`. Test each scenario:
- Typing `gradient` returns results from Phase 2 (Optimization) and Phase 3 (Hyperparameter Tuning) with highlighted snippets.
- Clicking a result navigates to the correct topic page (no 404, no double-redirect visible).
- Search for Vietnamese terms: `tham chiếu`, `hồi quy` — returns results.
- Search `TODO API` — returns the `/projects/p1-easy` page.
- Clear the search — Pagefind shows no results / empty state.

Stop the server.

- [ ] **Step 5: Verify dev mode shows the helpful error**

```bash
pnpm dev
```

Open `http://localhost:3000/search`. Expected: shows "Chỉ mục tìm kiếm chưa được xây dựng" message with a link to `/roadmap`. (If a stale `public/pagefind/` exists from a prior build, Pagefind may load — that's OK, the success path also works.) Stop the server.

- [ ] **Step 6: Verify theme switching**

`pnpm start` → `http://localhost:3000/search` → toggle theme via navbar. Expected: search bar, results, highlights all respond to the theme change.

- [ ] **Step 7: Verify the palette link**

`pnpm start` → `http://localhost:3000` → Ctrl/Cmd+K → type "tìm" or scroll to "Tìm trong bài học" → Enter. Expected: navigates to `/search`.

- [ ] **Step 8: Verify the gitignore**

```bash
git status --short | grep pagefind
```

Expected: empty.

- [ ] **Step 9: Final commit if any fixes were made**

If anything failed and required a fix:

```bash
git add -A
git commit -m "fix: address full-text search issues from manual verification"
```

---

## Self-Review Notes

- **Spec coverage:** All sections of the spec (`docs/superpowers/specs/2026-07-05-full-text-search-design.md`) are covered:
  - §2.1 dependency → Task 1
  - §2.2 postbuild script → Task 1
  - §2.3 content scoping (`data-pagefind-body`) → Task 3
  - §2.4 URL handling (verified) → Task 4
  - §2.5 no extra setup needed (defaults handle ranking)
  - §3.1 search page route → Task 5
  - §3.2 search client component → Task 6
  - §3.3 palette modification → Task 8
  - §4 styling integration → Task 7
  - §5 edge cases (dev mode, theme switch, gitignore) → Tasks 6 (dev error), 7 (theme), 8 (gitignore Task 2)
  - §6 architecture (no separate task — implemented across Tasks 1, 4, 6)
  - §7 testing → Task 9

- **Placeholder scan:** No "TBD", "TODO", or "implement later". All steps show concrete code/commands.

- **Type consistency:**
  - `SearchPageClient` (defined Task 6, imported Task 5) — name matches.
  - Pagefind UI API: `new window.PagefindUI({ element, showImages: false })` — consistent across Tasks 6 and 9.
  - Pagefind export path `public/pagefind/` is used in `.gitignore` (Task 2), `package.json` postbuild (Task 1), and the dynamic `import("/pagefind/pagefind-entry.js")` (Task 6). Public assets are served at root, so `/pagefind/pagefind-entry.js` matches `public/pagefind/pagefind-entry.js`.

- **Ordering rationale:** Task 1 (pagefind binary) before Task 3 (data-pagefind-body needs a build to verify the attribute made it into static HTML) before Task 4 (redirect verified against a real build). Tasks 5+6 are bundled into one commit because they depend on each other for the build to compile. Task 7 (theming) and Task 8 (palette) are independent polish steps after the core works.
