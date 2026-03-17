# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: JWT (jsonwebtoken + bcryptjs)

## Project: امتحانات توجيهي

A full Arabic Tawjihi (high school final exam) practice platform.

### Features
- Login page with Guest/Email/Admin options
- Specialization selection (علمي, أدبي, صناعي, شرعي, زراعي)
- Subject, Unit, and Exam hierarchy
- Multiple choice exam-taking with auto-correction
- Score display with percentage
- "امتحاناتي" personal exam history page
- **Onboarding modal**: after first login, users choose a display name
- **Settings drawer**: edit name, password reset, WhatsApp support, logout
- **Single device session**: only one device per account at a time (sessionToken in JWT+DB)
- **Password reset via email**: forgot-password + reset-password pages with secure tokens
- **Email service**: nodemailer with SMTP env vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SITE_URL); returns devLink if SMTP not configured
- Admin dashboard for full CRUD management
- Subscription system with WhatsApp contact
- Fully Arabic RTL interface
- **Exam progress saving**: localStorage saves progress per user/exam (survives network drops/page reload)
- **Image zoom modal**: click any question image to open full-screen zoom overlay
- **Bookmark (star) per question**: mark questions as important (orange dot in grid); stored and sent with submission
- **Difficulty rating**: after exam, student rates difficulty (سهل/متوسط/صعب) sent to API
- **Student notes**: textarea after exam for student feedback, stored in DB, visible to admin
- **Admin "ملاحظات الطلبة" page**: `/admin/notes` shows all notes with difficulty stats, expandable cards
- **Bookmarked questions section** in exam result page showing the student's starred questions
- **Multi-specialization exam linking**: admin selects multiple specializations when creating an exam; the exam is linked (not duplicated) to matching units in other specs via `POST /api/exams/:id/link-to-specs`. One exam record serves all linked specs via `exam_target_units` junction table. Students see the exam under each linked unit.

### Admin Credentials
- Username: `admin`
- Password: `tawjihi2024`
(Configurable via ADMIN_USERNAME and ADMIN_PASSWORD env vars)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   ├── tawjihi/            # React + Vite frontend (Arabic RTL)
│   └── tawjihi-mobile/     # Expo React Native mobile app (Arabic RTL)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema

- `users` - User accounts (roles: admin, supervisor, student, guest)
- `specializations` - التخصصات (علمي, أدبي, etc.)
- `subjects` - المواد (linked to specialization)
- `units` - الوحدات (linked to subject)
- `exams` - الاختبارات (linked to primary unit)
- `exam_target_units` - ربط الاختبار بوحدات إضافية في تخصصات أخرى (many-to-many)
- `questions` - الأسئلة (linked to exam, 4 options A/B/C/D)
- `exam_results` - نتائج الاختبارات (user exam scores)
- `answer_details` - تفاصيل الإجابات (per-question correctness)
- `site_settings` - WhatsApp number, subscription info

## TypeScript & Composite Projects

- `lib/*` packages are composite and emit declarations via `tsc --build`.
- `artifacts/*` are leaf workspace packages checked with `tsc --noEmit`.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build`
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes in `src/routes/`, auth middleware in `src/lib/auth.ts`.

### `artifacts/tawjihi` (`@workspace/tawjihi`)

React + Vite frontend. Full Arabic RTL. Pages: login, specializations, subjects, units, exams, take-exam, exam-result, my-exams, admin dashboard.

### `artifacts/tawjihi-mobile` (`@workspace/tawjihi-mobile`)

Expo React Native mobile app. Full Arabic RTL. Shares API with web frontend.
- Theme: `ThemeContext` → `useAppTheme()` hook → `{ isDark, C }` colors
- Colors: Primary `#10B77F`, Secondary `#E7AF08`, Background `#F5FAF8`
- Auth routing: admin/supervisor → `/(admin)` group, student → `/(main)` group
- Admin screens: `(admin)/index.tsx` (dashboard), `(admin)/content.tsx` (hierarchical CRUD), `(admin)/users.tsx` (user management, admin-only), `(admin)/profile.tsx`
- Content management: Specs → Subjects → Units → Exams → Questions with breadcrumb navigation

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

Run migrations: `pnpm --filter @workspace/db run push`

## Real-Time Sync

- **SSE (Server-Sent Events)**: API server broadcasts change events after mutations
- **Web**: `use-server-events.ts` uses native `EventSource`, invalidates React Query caches
- **Mobile**: `fetch()+ReadableStream` with reconnect-on-disconnect
- SSE endpoint: `GET /api/events` (text/event-stream)
