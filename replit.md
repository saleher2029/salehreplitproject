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

### Admin Credentials
- Username: `admin`
- Password: `tawjihi2024`
(Configurable via ADMIN_USERNAME and ADMIN_PASSWORD env vars)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── tawjihi/            # React + Vite frontend (Arabic RTL)
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
- `exams` - الاختبارات (linked to unit)
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

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

Run migrations: `pnpm --filter @workspace/db run push`
