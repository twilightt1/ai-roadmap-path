# AI Engineer Roadmap 2026 🧠

Website học AI Engineer theo lộ trình đầy đủ — từ Zero đến Production-Grade AI Systems. Hiển thị toàn bộ **17 phases + Capstone, 51 dự án thực hành, 3 skill tiers, 4 learning paths** và tài liệu tham khảo, dưới dạng timeline interactive dark modern.

Nguồn nội dung: [`AI_ENGINEER_ROADMAP.md`](./AI_ENGINEER_ROADMAP.md).

## ✨ Tính năng

- **Timeline dạng path** (như roadmap.dev): mở rộng từng phase xem chủ đề + dự án ngay tại chỗ.
- **Trang chi tiết phase** riêng biệt (`/phase/[slug]`) với accordion chủ đề đầy đủ.
- **Trang dự án** (`/projects`): 51 project nhóm theo độ khó 🟢 / 🟡 / 🔴.
- **Trang kỹ năng** (`/skills`): 3 tier theo nhu cầu thị trường 2026.
- **Trang con đường** (`/paths`): 4 lộ trình A (Product) / B (Research) / C (Architect) / D (Full stack).
- **Trang tài liệu** (`/resources`): bảng resources phân nhóm.
- **Command palette** (Ctrl/⌘ + K): tìm nhanh phase / dự án / trang.
- **Scroll progress bar**, dark modern theme, responsive mobile, SEO (sitemap, robots, OG metadata).
- **Phase 1 user data**: Supabase Auth + Supabase PostgreSQL lưu tiến độ người dùng, trong khi nội dung học vẫn là static content trong repo.

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
```

Yêu cầu: Node 18.18+ (đã test trên Node 24), pnpm 10+.

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

### Supabase migration

Schema Phase 1 nằm tại:

```txt
supabase/migrations/202607060001_user_data.sql
```

Migration này tạo các bảng user-owned, trigger cập nhật timestamp/profile bootstrap và RLS policies. Sau khi apply migration lên Supabase project, cần verify RLS thủ công bằng ít nhất 2 user khác nhau:

- User A chỉ đọc/ghi được profile và progress/attempt/library records của User A.
- User B không đọc/sửa/xoá được records của User A bằng browser Supabase client.
- Anonymous user không ghi trực tiếp vào các bảng Supabase user data.
- Browser không bao giờ có `SUPABASE_SERVICE_ROLE_KEY`.

## 💾 Dữ liệu lưu trong Supabase

Supabase là source of truth cho dữ liệu đăng nhập trong Phase 1:

- `profiles`: hồ sơ app gắn với Supabase Auth user (`display_name`, `avatar_url`, role tối thiểu learner/admin).
- `user_progress_state`: snapshot tổng hợp để giữ tương thích với progress UI hiện tại (`completed`, `project_features`, `quiz_results`, `challenge_results`, `started_at`, `last_visit`).
- `lesson_progress` và `topic_progress`: lesson/topic progress chuẩn hoá theo slug static content.
- `project_feature_progress`: tiến độ từng feature trong project.
- `quiz_attempts`: lịch sử lượt làm quiz, điểm số, tổng câu, answers JSONB và thời gian hoàn thành. Authenticated quiz submissions có thể insert remote attempt rows; anonymous full attempt history hiện chưa được replay thành lịch sử attempt rows khi login.
- `challenge_attempts`: lịch sử lượt làm challenge, status, language/code, test results JSONB và thời gian submit. Authenticated challenge submissions có thể insert remote attempt rows; anonymous full attempt history hiện chưa được replay thành lịch sử attempt rows khi login.
- `bookmarks`: schema/RLS-ready cho nội dung đã lưu theo `target_type` + `target_slug` ở UI layer tiếp theo; runtime/UI hiện tại chưa đọc/ghi/merge bookmarks.
- `notes`: schema/RLS-ready cho ghi chú cá nhân theo lesson ở UI layer tiếp theo; runtime/UI hiện tại chưa đọc/ghi/merge notes.
- `saved_snippets`: schema/RLS-ready cho code snippets cá nhân ở UI layer tiếp theo; runtime/UI hiện tại chưa đọc/ghi/merge snippets.

Các bảng user-owned đều phải bật RLS để user chỉ truy cập records của chính mình. Riêng bookmarks/notes/saved snippets mới sẵn sàng ở tầng schema + RLS trong Phase 1, chưa phải tính năng runtime hoàn chỉnh.

## 🧭 Anonymous localStorage và login merge

Người dùng chưa đăng nhập vẫn dùng được app ở chế độ local-first. Progress/project features/quiz summary/challenge summary anonymous được lưu trong `localStorage` để không chặn việc đọc nội dung.

Khi user đăng nhập:

1. App đọc dữ liệu local anonymous hiện có.
2. App đọc snapshot remote hiện có từ Supabase.
3. Merge các phần runtime hiện tại theo rule deterministic: completion/higher progress wins, project feature completion được union, quiz/challenge summaries giữ kết quả phù hợp nhất theo key hiện tại.
4. Upsert snapshot đã merge lên Supabase (`user_progress_state` và các bảng progress liên quan).
5. Giữ local data như fallback/cache thay vì xoá ngay lập tức.

Phạm vi merge hiện tại bao phủ progress, project features, quiz summaries và challenge summaries. Với user đã authenticated, quiz/challenge submissions có thể tạo remote attempt rows mới. Tuy nhiên, anonymous full attempt history không được replay thành lịch sử attempt rows trên Supabase khi login; bookmarks/notes/snippets cũng chưa tham gia runtime merge vì mới schema/RLS-ready.

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
├── search/page.tsx          # Search page
├── dashboard/page.tsx       # Progress dashboard
├── practice/page.tsx        # Practice hub
├── practice/[id]/page.tsx   # Quiz/challenge practice detail
├── roadmap/page.tsx         # Timeline chính
├── phase/[slug]/page.tsx    # Chi tiết từng phase (SSG)
├── projects/page.tsx        # 51 projects theo độ khó
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
