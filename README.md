# AI Engineer Roadmap 2026 🧠

Website học AI Engineer theo lộ trình đầy đủ — từ Zero đến Production-Grade AI Systems. Hiển thị toàn bộ **17 phases + Capstone, 52 dự án thực hành, 3 skill tiers, 4 learning paths** và tài liệu tham khảo, dưới dạng timeline interactive dark modern.

Nguồn nội dung: [`AI_ENGINEER_ROADMAP.md`](./AI_ENGINEER_ROADMAP.md).

## ✨ Tính năng

- **Timeline dạng path** (như roadmap.dev): mở rộng từng phase xem chủ đề + dự án ngay tại chỗ.
- **Trang chi tiết phase** riêng biệt (`/phase/[slug]`) với accordion chủ đề đầy đủ.
- **Trang dự án** (`/projects`): 52 project nhóm theo độ khó 🟢 / 🟡 / 🔴.
- **Trang kỹ năng** (`/skills`): 3 tier theo nhu cầu thị trường 2026.
- **Trang con đường** (`/paths`): 4 lộ trình A (Product) / B (Research) / C (Architect) / D (Full stack).
- **Trang tài liệu** (`/resources`): bảng resources phân nhóm.
- **Command palette** (Ctrl/⌘ + K): tìm nhanh phase / dự án / trang.
- **Scroll progress bar**, dark modern theme, responsive mobile, SEO (sitemap, robots, OG metadata).
- **Phase 1 user data**: Supabase Auth + Supabase PostgreSQL lưu tiến độ người dùng, trong khi nội dung học vẫn là static content trong repo.
- **Personal Learning Workspace** (`/library`): authenticated bookmarks, lesson notes, and saved code snippets backed by Supabase RLS.
- **P1 Learning Loop** (`/diagnostic`, `/dashboard`): diagnostic nền tảng, đề xuất học tiếp deterministic, weekly goals và mastery estimate có confidence riêng.
- **P2 Project Evidence** (`/projects/[id]`): rubric deterministic và bản nháp bằng chứng riêng tư gồm repository, demo, reflection.

## 🛠 Tech Stack

| Mục | Công nghệ |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (base-ui) |
| Animation | Framer Motion (`motion`) |
| Icons | lucide-react |
| Search | cmdk |
| Auth + user data | Supabase Auth + Supabase PostgreSQL |
| Font | Geist / Geist Mono |

## 🚀 Chạy dự án

```bash
# Cài dependency
pnpm install

# Chạy dev (http://localhost:3000)
pnpm dev

# Build production
pnpm build

# Chạy production
pnpm start

# Typecheck / lint / tests
pnpm typecheck
pnpm lint
pnpm test:run

# Full quality gate
pnpm check

# Disposable local Supabase gates (test:db resets local DB)
pnpm exec supabase start
pnpm test:db
pnpm test:e2e:local
pnpm exec supabase stop
```

Yêu cầu: Node 22.13+ (đã test trên Node 24), pnpm 11.13.0 (được pin trong `packageManager`).

## 🧪 Challenge execution trust boundary

Challenge tests execute in the browser and are inspectable. Their results are practice-grade feedback, not a verified assessment. Worker isolation protects the application UI and session from learner code, but it is not a hostile multi-tenant server sandbox.

## 🔐 Cấu hình production user data

Phase 1 dùng **Supabase Auth + Supabase PostgreSQL** cho dữ liệu thuộc về người dùng. Nội dung học, roadmap, lesson body, quiz/challenge definitions và Pagefind search index vẫn là static content trong repo/build output.

Biến môi trường bắt buộc cho auth/sync:

```env
# Supabase browser/client config
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Biến môi trường tuỳ chọn:

```env
# Production URL dùng cho metadata, sitemap/robots và auth redirects.
# Nếu không set, app fallback về http://localhost:3000.
NEXT_PUBLIC_SITE_URL=https://your-domain.example

# Optional, server-only/admin workflows. Không expose biến này ra browser/client bundle.
SUPABASE_SERVICE_ROLE_KEY=
```

Ghi chú bảo mật: client/browser chỉ dùng anon key và dựa vào Row Level Security (RLS). Service role key là optional, chỉ dùng ở server-side trusted code khi thật sự cần quyền admin/bypass RLS, và không bao giờ được dùng trong browser.

### Capability flags (P0/P1/P2)

Các capability P0/P1/P2 được rollout và rollback độc lập bằng biến public environment. Giá trị hợp lệ là `true`/`false` hoặc `1`/`0`; giá trị không hợp lệ làm build khởi động thất bại thay vì âm thầm bật capability.

```env
# Default: true. false disables Run/Submit with a maintenance message; execution never
# falls back to the browser's main window.
NEXT_PUBLIC_P0_WORKER_EXECUTION=true

# Default: false. false keeps all learner progress local and avoids remote progress
# mutation RPCs (including practice events and attempt writes).
NEXT_PUBLIC_P0_LWW_PROGRESS=false

# Default: false. false serves challenges normally but omits the practice ladder.
NEXT_PUBLIC_P0_PRACTICE_LADDER=false

# Default: false. Requires the P1 learning_profiles migration and its RLS/RPC proof.
NEXT_PUBLIC_P1_LEARNING_LOOP=false

# Default: false. Requires the P2 project_evidence migration and its RLS/RPC proof.
NEXT_PUBLIC_P2_PROJECT_EVIDENCE=false
```

For rollback, deploy or restart with only the affected flag set to `false`. Do not replace LWW with legacy full-snapshot writes, and do not discard local progress/outbox data while the flag is disabled.

### Supabase migration

Schema user data/P0/P1/P2 được áp theo thứ tự:

```txt
supabase/migrations/202607060001_user_data.sql
supabase/migrations/202607110001_progress_lww_practice_events.sql
supabase/migrations/202607110002_fix_progress_rpc_security.sql
supabase/migrations/202607120001_p0_progress_hardening.sql
supabase/migrations/202607140001_p1_learning_profiles.sql
supabase/migrations/202607150001_p2_project_evidence.sql
```

Các migration tạo bảng user-owned, canonical LWW progress/practice events, trigger profile/bootstrap, owner-scoped RPC và RLS policies. Sau khi apply migration lên Supabase project, cần verify RLS thủ công bằng ít nhất 2 user khác nhau:

- User A chỉ đọc/ghi được profile và progress/attempt/library records của User A.
- User B không đọc/sửa/xoá được records của User A bằng browser Supabase client.
- Anonymous user không ghi trực tiếp vào các bảng Supabase user data.
- Browser không bao giờ có `SUPABASE_SERVICE_ROLE_KEY`.

## 💾 Dữ liệu lưu trong Supabase

Supabase là source of truth cho dữ liệu đăng nhập trong Phase 1:

- `profiles`: hồ sơ app gắn với Supabase Auth user (`display_name`, `avatar_url`, role tối thiểu learner/admin).
- `user_progress_state`: snapshot tổng hợp để giữ tương thích với progress UI hiện tại (`completed`, `project_features`, `quiz_results`, `challenge_results`, `started_at`, `last_visit`).
- `user_progress_sync`: epoch đồng bộ/reset của từng user.
- `user_progress_items`: trạng thái hoàn thành item-level theo LWW tuple `(client_updated_at, mutation_id)`.
- `practice_events`: sự kiện practice append-only, idempotent theo `(user_id, event_id)`.
- `learning_profiles`: weekly goal và diagnostic aggregate theo field-level LWW; owner chỉ đọc record của mình và chỉ ghi qua authenticated RPC.
- `project_evidence`: bản nháp repository/demo/reflection riêng theo user và project; owner chỉ đọc record của mình và chỉ ghi qua authenticated field-level LWW RPC.
- `lesson_progress` và `topic_progress`: lesson/topic progress chuẩn hoá theo slug static content.
- `project_feature_progress`: tiến độ từng feature trong project.
- `quiz_attempts`: lịch sử lượt làm quiz, điểm số, tổng câu, answers JSONB và thời gian hoàn thành. Authenticated quiz submissions có thể insert remote attempt rows; anonymous full attempt history hiện chưa được replay thành lịch sử attempt rows khi login.
- `challenge_attempts`: lịch sử lượt làm challenge, status, language/code, test results JSONB và thời gian submit. Authenticated challenge submissions có thể insert remote attempt rows; anonymous full attempt history hiện chưa được replay thành lịch sử attempt rows khi login.
- `bookmarks`: dữ liệu Personal Learning Workspace cho authenticated users; lưu lessons/projects/challenges đã bookmark và hiển thị trong `/library`.
- `notes`: dữ liệu Personal Learning Workspace cho authenticated users; ghi chú lesson được hiển thị/quản lý trên lesson pages và `/library`.
- `saved_snippets`: dữ liệu Personal Learning Workspace cho authenticated users; code snippets lưu từ playground/challenges và hiển thị trong `/library`.

Các bảng user-owned đều phải bật RLS để user chỉ truy cập records của chính mình. Bookmarks/notes/saved snippets là dữ liệu Personal Learning Workspace chỉ dành cho user đã đăng nhập và không có anonymous localStorage merge trong Phase 1.

## 🧭 Anonymous localStorage và login merge

Người dùng chưa đăng nhập vẫn dùng được app ở chế độ local-first. Progress/project features/quiz summary/challenge summary anonymous được lưu trong `localStorage` để không chặn việc đọc nội dung.

Khi user đăng nhập:

1. App đọc anonymous document và user-scoped local document hiện có.
2. App đọc canonical item state + sync epoch từ Supabase.
3. Merge item-level theo LWW tuple `(client_updated_at, mutation_id)`; explicit uncomplete không bị biến thành “không có dữ liệu”.
4. Chuyển mutation anonymous còn pending sang durable authenticated outbox, flush theo batch và retry/backoff; RPC chỉ lấy ownership từ `auth.uid()`.
5. Persist user-scoped local document rồi mới xoá anonymous document đã chuyển giao; compatibility snapshot được cập nhật trong transaction RPC.
6. P1 learning profile merge riêng từng field theo timestamp; diagnostic chỉ chứa score/topic aggregates, không chứa đáp án đã chọn.
7. P2 project evidence merge repository/demo/reflection riêng từng field; anonymous draft chỉ được xoá sau khi đã materialize dưới user key.

Phạm vi merge bao phủ lesson/project-feature progress cùng quiz/challenge summaries. Với user đã authenticated, quiz/challenge submissions có thể tạo remote attempt rows mới. Tuy nhiên, anonymous full attempt history không được replay thành lịch sử attempt rows trên Supabase khi login; bookmarks/notes/snippets là dữ liệu login-only và không merge từ anonymous localStorage.

Mục tiêu là anonymous mode không mất snapshot tiến độ chính, còn authenticated mode sync được các progress state hiện có cross-device.

## 🗄 MongoDB direction

MongoDB **không nằm trong Phase 1 runtime path** và không dùng để đọc lesson/quiz/challenge production hiện tại.

Vai trò MongoDB chỉ là future-only/optional cho các nhu cầu phù hợp document database hơn, ví dụ:

- content drafts trước khi publish,
- AI-generated study plans,
- AI chat/session transcripts,
- generated quiz variants,
- raw/flexible event payloads cho analytics pipeline tương lai.

Nếu bổ sung MongoDB sau này, nên có workflow publish/review rõ ràng thay vì trộn trực tiếp dynamic draft content vào SEO/static learning pages.

## 📁 Cấu trúc thư mục

Repo tree dưới đây chỉ liệt kê **các phần chính** (không phải danh sách đầy đủ mọi route/component):

```
app/                         # App Router pages
├── layout.tsx               # Root layout: navbar, footer, search, scroll progress, SEO
├── page.tsx                 # Landing (hero + overview + paths + CTA)
├── login/page.tsx           # Login/auth UI
├── library/page.tsx         # Personal library: bookmarks, notes, saved snippets
├── search/page.tsx          # Search page
├── dashboard/page.tsx       # Progress dashboard
├── practice/page.tsx        # Practice hub
├── practice/[id]/page.tsx   # Quiz/challenge practice detail
├── roadmap/page.tsx         # Timeline chính
├── phase/[slug]/page.tsx    # Chi tiết từng phase (SSG)
├── projects/page.tsx        # 52 projects theo độ khó
├── skills/page.tsx          # 3 skill tiers
├── paths/page.tsx           # 4 learning paths
├── resources/page.tsx       # Bảng resources
├── not-found.tsx            # 404
├── sitemap.ts / robots.ts
└── globals.css

components/
├── auth/                    # auth button + login form
├── challenge/               # challenge list/editor/view/test results
├── layout/                  # navbar, footer, theme provider/toggle
├── library/                 # bookmarks, lesson notes, saved snippets, library page UI
├── quiz/                    # quiz cards/runtime UI
├── roadmap/                 # timeline, phase-node, topic-list, project-card, MDX helpers
├── search/                  # search page client
├── shared/                  # progress UI, command palette trigger, scroll progress
└── ui/                      # shadcn/base UI components

content/
├── phase-*/                 # Static MDX lesson/topic content
└── challenges/*.json        # Static challenge definitions

lib/
├── types.ts                 # Kiểu dữ liệu nội dung roadmap/static content
├── roadmap-data.ts          # Toàn bộ nội dung roadmap dạng structured data
├── quiz-data.ts             # Static quiz definitions/runtime helpers
├── challenge.ts             # Static challenge loader/helpers
├── progress-*               # Local/remote progress types, storage và sync helpers
├── supabase/                # Supabase browser/server/middleware clients
└── site-url.ts              # NEXT_PUBLIC_SITE_URL normalization

supabase/
└── migrations/202607060001_user_data.sql # Supabase Auth user-data schema + RLS
```

## 🔮 Production DB direction

Hướng production hiện tại là **Supabase-first cho auth và user data**, không phải Prisma/NextAuth-first:

- Supabase Auth quản lý identity/session.
- Supabase PostgreSQL lưu dữ liệu người dùng có RLS.
- Static learning content vẫn nằm trong repo để giữ build/search/SEO đơn giản.
- Prisma schema cũ, nếu còn trong repo, chỉ là tham khảo/future experiment và không phải hướng Phase 1.
- MongoDB chỉ là future-only cho draft/generated/flexible content workflows.

## 📄 Giấy phép

Nội dung roadmap dựa trên "Ultimate AI Engineer Roadmap 2026". Code scaffold thuộc về bạn.
