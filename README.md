# AI Engineer Roadmap 2026 🧠

Website học AI Engineer theo lộ trình đầy đủ — từ Zero đến Production-Grade AI Systems. Hiển thị toàn bộ **17 phases + Capstone, 51 dự án thực hành, 3 skill tiers, 4 learning paths** và tài liệu tham khảo, dưới dạng timeline interactive dark modern.

Nguồn nội dung: [`AI_ENGINEER_ROADMAP.md`](./AI_ENGINEER_ROADMAP.md).

## ✨ Tính năng (v1 — showcase tĩnh)

- **Timeline dạng path** (như roadmap.dev): mở rộng từng phase xem chủ đề + dự án ngay tại chỗ.
- **Trang chi tiết phase** riêng biệt (`/phase/[slug]`) với accordion chủ đề đầy đủ.
- **Trang dự án** (`/projects`): 51 project nhóm theo độ khó 🟢 / 🟡 / 🔴.
- **Trang kỹ năng** (`/skills`): 3 tier theo nhu cầu thị trường 2026.
- **Trang con đường** (`/paths`): 4 lộ trình A (Product) / B (Research) / C (Architect) / D (Full stack).
- **Trang tài liệu** (`/resources`): bảng resources phân nhóm.
- **Command palette** (Ctrl/⌘ + K): tìm nhanh phase / dự án / trang.
- **Scroll progress bar**, dark modern theme, responsive mobile, SEO (sitemap, robots, OG metadata).

## 🛠 Tech Stack

| Mục | Công nghệ |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (base-ui) |
| Animation | Framer Motion (`motion`) |
| Icons | lucide-react |
| Search | cmdk |
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

# Lint
pnpm lint
```

Yêu cầu: Node 18.18+ (đã test trên Node 24), pnpm 10+.

## 📁 Cấu trúc thư mục

```
app/                      # App Router pages
├── layout.tsx            # Root layout: navbar, footer, search, scroll progress, SEO
├── page.tsx              # Landing (hero + overview + paths + CTA)
├── roadmap/page.tsx      # Timeline chính
├── phase/[slug]/page.tsx # Chi tiết từng phase (SSG)
├── projects/page.tsx     # 51 projects theo độ khó
├── skills/page.tsx       # 3 skill tiers
├── paths/page.tsx        # 4 learning paths
├── resources/page.tsx    # Bảng resources
├── not-found.tsx         # 404
├── sitemap.ts / robots.ts
└── globals.css

components/
├── layout/               # navbar, footer
├── roadmap/              # timeline, phase-node, topic-list, project-card
├── shared/               # phase-icon, search-command, search-trigger, scroll-progress
└── ui/                   # shadcn components

lib/
├── types.ts              # Kiểu dữ liệu (bám sát Prisma schema v2)
├── roadmap-data.ts       # Toàn bộ nội dung roadmap dạng structured data
└── theme.ts              # Map accent color + difficulty -> Tailwind classes

prisma/
└── schema.prisma         # Schema dự phòng cho v2 (User, Progress, Project, NextAuth)
```

## 🔮 Lộ trình v2 (chưa triển khai)

v1 là showcase tĩnh (không cần auth/DB). Khi nâng cấp lên v2 có tài khoản & lưu tiến độ:

- **Backend**: Prisma + NextAuth.js + PostgreSQL (xem `prisma/schema.prisma` đã soạn sẵn).
- Cấu trúc `lib/types.ts` bám sát Prisma model → dễ map dữ liệu sang seed.
- Bật đăng nhập, đánh dấu phase/project đã hoàn thành, dashboard cá nhân.

Hướng dẫn kích hoạt v2:

```bash
pnpm add prisma @prisma/client next-auth @auth/prisma-adapter
# Thiết lập DATABASE_URL trong .env
npx prisma migrate dev --name init
npx prisma db seed   # seed dữ liệu từ lib/roadmap-data.ts
```

## 📄 Giấy phép

Nội dung roadmap dựa trên "Ultimate AI Engineer Roadmap 2026". Code scaffold thuộc về bạn.
