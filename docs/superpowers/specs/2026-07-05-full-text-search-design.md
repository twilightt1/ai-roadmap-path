# Full-Text Search — Design

**Date:** 2026-07-05
**Status:** Approved
**Sub-project:** 2 of 4 (Quiz, Code playground, Track projects, Full-text search)

## 1. Overview & Goals

### Goal

Let learners search **inside** the 118 MDX lesson files (plus 51 project pages and static pages) with ranked results and highlighted snippets — content the existing command palette can't reach because it only searches metadata (phase titles, project titles, page links).

### In scope

- **Pagefind** as the search engine — build-time index over the static HTML in `.next/server/app/`, run as a `postbuild` npm script.
- Content-area scoping via `data-pagefind-body` on the root `<main>` so navbar/footer aren't indexed.
- New `/search` route (server component) wrapping a client component that lazy-loads Pagefind UI at runtime.
- Search page UI: search input + Pagefind's ranked results with highlighted snippets. No filters (per user decision).
- Command palette (Ctrl/⌘+K) keeps its navigation role; add a "Tìm trong bài học →" item linking to `/search`.
- `package.json`: add `postbuild` script.
- `.gitignore`: ignore `public/pagefind/` (build artifact).

### Out of scope

- Filters (by phase, content type) — explicitly chose "no filters".
- `pnpm dev` support — chose "build-time only". Dev shows a "run pnpm build" message.
- Custom Pagefind UI theming beyond CSS-variable overrides — keep default Pagefind UI, theme via CSS vars.
- Analytics / "no results" tracking.
- In-context term highlighting on the destination page (Pagefind supports it; we link to the result URL and don't instrument further).
- Changing the existing command palette's navigation behavior — it stays metadata-only.
- v2 (auth/DB) integration — search is purely client-side, no backend.

## 2. Pagefind Setup

### 2.1 Dependency

`pagefind` is a build-time CLI tool, not a runtime dependency:

```bash
pnpm add -D pagefind
```

### 2.2 Postbuild index

`package.json` scripts:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "postbuild": "pagefind --site .next/server/app --output-path public/pagefind",
  "start": "next start",
  "lint": "eslint"
}
```

`postbuild` runs automatically after `pnpm build`. It reads static HTML from `.next/server/app/`, builds a compact index, and writes the result to `public/pagefind/` so Next.js serves it at `/pagefind/...`.

`.gitignore` must ignore `public/pagefind/` (generated build output, not committed).

### 2.3 Content scoping

Add `data-pagefind-body` to the `<main>` element in `app/layout.tsx`:

```tsx
<main className="flex-1" data-pagefind-body>{children}</main>
```

This includes only the page content in the index. Navbar (`<header>`), footer (`<footer>`), SearchCommand (modal), and ScrollProgress (overlay) are siblings of `<main>` and excluded automatically.

Pagefind reads `<title>` and `<meta name="description">` by default for result title and excerpt. Every page in this app already sets these via `generateMetadata`, so results display correctly without extra work.

**Page-types indexed by `<main>` scoping:**
- `/phase/[slug]/[topic]` — 118 topic pages (lessons with MDX content; 61 "coming soon" topics still index the "Bạn sẽ học gì" header + fallback)
- `/phase/[slug]` — 19 phase detail pages (goal, summary)
- `/projects/[id]` — 51 project pages (description, features, stack)
- `/projects`, `/skills`, `/paths`, `/resources`, `/roadmap` — navigation/listing pages
- `/` — landing page (hero copy)
- `/dashboard` — skeleton placeholders in static HTML (acceptable; won't match real queries)

This is intentional and simple. If a dynamic page ever needs exclusion, add `data-pagefind-ignore` on that page's root element (no extra setup now).

### 2.4 URL handling — verified behavior + mitigation

Per [Pagefind docs](https://pagefind.app/docs/config-options): "By default, a file at `animals/cat/index.html` will be given the URL `/animals/cat/`" — only `index.html` is stripped. Non-index files like `python-fundamentals.html` keep the `.html` extension in result URLs (e.g., `/phase/phase-1-programming/python-fundamentals.html`), which **404 on `next dev` / `next start`** because App Router serves the same page at the extensionless `/phase/phase-1-programming/python-fundamentals`.

**Mitigation: add `redirects()` rules to `next.config.ts`** that 302-redirect any `.html`-suffixed content URL to its extensionless form. Deterministic, independent of Pagefind internals, works in both `next dev` and `next start`:

```ts
async redirects() {
  return [
    { source: '/phase/:slug/:topic.html', destination: '/phase/:slug/:topic', permanent: false },
    { source: '/phase/:slug.html', destination: '/phase/:slug', permanent: false },
    { source: '/projects/:id.html', destination: '/projects/:id', permanent: false },
    { source: '/:page.html', destination: '/:page', permanent: false },
  ];
}
```

`permanent: false` (302) is chosen so `pnpm dev` and `pnpm start` behave identically; cache concerns are minimal because the redirect is a same-host path rewrite. The `/phase/:slug.html` rule is technically subsumed by `/:page.html` for one-segment paths, but explicit rules make the intent obvious and avoid collisions with unknown future single-segment routes.

**Verification step (in plan):** after first `pnpm build` + `postbuild`, `grep -r ".html" public/pagefind/pagefind-index/ | head` to confirm URLs are `.html`-suffixed (verifying the redirect is load-bearing). Also test by clicking a search result in the browser and confirming no 404 / no double-redirect.

### 2.5 Keep "static" non-content pages out of results quality

Pagefind's default ranking weights fewer matches in longer documents. Navigation pages ("Dự ánthực hành", "Tài liệu tham khảo") are short page descriptions. They'll surface when the query matches their nav text but won't dominate real lesson results.

## 3. UI

### 3.1 `app/search/page.tsx` (new — server component)

Light server component:

```tsx
import type { Metadata } from "next";
import { SearchPageClient } from "@/components/search/search-page-client";

export const metadata: Metadata = {
  title: "Tìm kiếm",
  description: "Tìm trong 118 bài học và 51 dự án của AI Engineer Roadmap 2026.",
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
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

### 3.2 `components/search/search-page-client.tsx` (new — client component)

The core. A client component that:

1. Has a `useRef<HTMLDivElement>` for the Pagefind mount point.
2. In `useEffect` (mount only, `[]` deps): dynamically `import("/pagefind/pagefind-entry.js")`.
   - On success: call `import.meta`-style `await window.pagefind.init()` then `await window.pagefind.ui({ element: ref.current, showImages: false })` (verify exact API in implementation — Pagefind's API is `window.pagefind = await import(...)`, then `await pagefind.ui()` or use Pagefind's prebuilt UI element).
   - ⚠️ The plan must verify the exact Pagefind UI API from Pagefind docs at implementation time. The high-level flow is: dynamic import the entry → `await pagefind.init()` → `await pagefind.ui({ element, ... })` to render the prebuilt UI inside the ref div.
   - Set a state flag `loaded = true` on success.
   - Catch errors: set `error = true`.
3. Cleanup on unmount: Pagefind UI doesn't require explicit teardown; just let the element unmount.
4. Render:
   - If `loaded`: the `<div ref={mountRef} />` (Pagefind UI injected here).
   - If `error`: a friendly message — *"Chỉ mục tìm kiếm chưa được xây dựng. Chạy `pnpm build` để bật tìm kiếm."* plus a Link to `/roadmap`.
   - While neither (loading): a small skeleton.
5. SSR-safe: the dynamic import only fires in `useEffect` (client-only). The server renders the loading skeleton.

### 3.3 `components/shared/search-command.tsx` (modify)

Add a new `CommandItem` at the top of the existing "Trang" group (or insert a new short hint above it):

```tsx
<CommandItem
  value="search tìm kiếm bài học content"
  onSelect={() => onSelect("/search")}
>
  <Search className="h-3.5 w-3.5 text-muted-foreground" />
  <span className="ml-2">Tìm trong bài học</span>
  <span className="ml-auto text-[9px] text-muted-foreground/70">→</span>
</CommandItem>
```

`Search` icon must be added to the existing `lucide-react` imports.

## 4. Styling Integration

Pagefind UI ships with its own CSS. We need it to match the dark modern theme:

1. Add `:root` and `.dark` overrides in `app/globals.css` mapping Pagefind CSS variables to our design tokens:

```css
:root, .dark {
  --pagefind-ui-primary: hsl(var(--primary));
  --pagefind-ui-text: hsl(var(--foreground));
  --pagefind-ui-secondary-text: hsl(var(--muted-foreground));
  --pagefind-ui-background: hsl(var(--card));
  --pagefind-ui-secondary-background: hsl(var(--muted));
  --pagefind-ui-border: hsl(var(--border));
  --pagefind-ui-tag: hsl(var(--muted));
  --pagefind-ui-border-width: 1px;
  --pagefind-ui-border-radius: 0.5rem;
  --pagefind-ui-font: var(--font-sans);
  --pagefind-ui-font-size: 0.875rem;
}
```

(Exact variable names verified at implementation time against Pagefind's CSS — Pagefind is `--pagefind-ui-*` for the default UI.)

2. Pagefind UI CSS (`pagefind-ui.css`) is auto-loaded by `pagefind-entry.js`. Don't import it manually.

3. Keep customization minimal — token-mapping, not full re-theme.

## 5. Edge Cases

- **`pnpm dev` no index:** dynamic import fails → shows "run pnpm build" message.
- **Coming-soon topics (no MDX):** 61 topics without MDX content still have a topic page with "Bạn sẽ học gì" header + "Nội dung đang hoàn thiện" fallback. Pagefind indexes that header text, so users can still discover the page. Acceptable.
- **Theme switching (light/dark):** Pagefind UI must respond. Define the `:root` block once without a `.dark` qualifier is risky because `next-themes` adds `.dark` class to `<html>`. Solution: put overrides in `:root, .dark { ... }` so the same overrides apply regardless of theme. (Specific values use CSS variables that themselves change with theme.)
- **Navbar/footer leak:** excluded by `data-pagefind-body` on `<main>`.
- **`public/pagefind/` committed:** Add `public/pagefind/` to `.gitignore`.
- **Future Next.js upgrades:** if `.next/server/app/` path changes, the postbuild script breaks. Fix by re-verifying path after upgrade. Low risk — Next.js has used this path for several major versions.
- **Empty index / no content:** Pagefind runs even if pages are minimal; results just empty for matching queries. The default "no results" message comes from Pagefind UI.
- **`/dashboard` static HTML has skeleton pulse placeholders:** these don't match real query terms, so they don't pollute results. Acceptable.

## 6. Architecture

```
pnpm build
   │
   ├── next build → .next/server/app/*.html
   │
   └── postbuild: pagefind --site .next/server/app --output-path public/pagefind
                            │
                            ▼
                  public/pagefind/
                  ├── pagefind-entry.js     (entry point, loaded at runtime)
                  ├── pagefind-ui.css       (default UI styles)
                  ├── pagefind-ui.js        (default UI logic)
                  └── pagefind-index/...    (_FRAGMENT_*.pf fragments)

Served at URL: /pagefind/... (via public/)

User flow:
   (Ctrl/⌘+K) palette → "Tìm trong bài học →" → /search
                          ↓
   /search page (server component) → wraps SearchPageClient
                          ↓
   SearchPageClient → useEffect → import("/pagefind/pagefind-entry.js")
                          ↓
   Pagefind UI rendered into mountRef div → query index → results
                          ↓
   Click result → router.push(result.url) → /phase/[slug]/[topic]
```

## 7. Testing

### 7.1 Manual test checklist

- [ ] `pnpm build` succeeds; `public/pagefind/` contains `pagefind-entry.js`.
- [ ] `pnpm start` → visit `/search`. Search UI shows.
- [ ] Type `gradient` → results from Phase 2 (Optimization) and Phase 3 (Hyperparameter Tuning) with highlighted snippets.
- [ ] Click a result → navigates to the correct topic page. **Verify the URL is extensionless** (no `.html`). If `.html`, apply one of the mitigations from §2.4.
- [ ] `Ctrl/⌘+K` → "Tìm trong bài học" item shows at top of list, navigates to `/search`.
- [ ] `pnpm dev` → `/search` shows "Chỉ mục tìm kiếm chưa được xây dựng. Chạy `pnpm build` để bật tìm kiếm."
- [ ] Toggle light/dark theme → Pagefind UI responds correctly (colors change).
- [ ] `git status` shows `public/pagefind/` is ignored.
- [ ] Vietnamese content searchable, e.g. "tham chiếu", "hồi quy".
- [ ] Searching for a project name (e.g. "TODO API") returns the project page at `/projects/p1-easy`.

### 7.2 Unit tests

Not applicable — everything is integration; no pure functions to test. Project has no test runner.

## 8. Migration Path (v2 / future)

- Add phase filter (checkboxes) if content grows or users request it.
- Add in-context term highlighting on destination page.
- Search analytics (what people search, zero-result queries).
- Search-as-you-type in command palette if `cmdk` allows async results.

No v2 (auth/DB) impact — search is entirely client-side and read-only against a static index.
