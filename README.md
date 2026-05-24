# Pulse — AI Fitness Companion

A personal AI fitness PWA. Runs at $0/month on the free tiers of **Vercel + Supabase + Gemini**.

- **Frontend**: Next.js 16 + React 19 + Tailwind 4 + PWA, installable on iPhone home screen.
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions).
- **AI**: Gemini 2.5 Flash (free tier).
- **Health data**: Weekly Apple Health XML upload (manual export from iPhone Health app).
- **Auth**: Google Sign-In only.

---

## Quick start (5 minutes — UI only, mock data)

You can see the dashboard + design system **without** setting up Supabase or Google OAuth.

```bash
cd apps/web
npm run dev
```

Open <http://localhost:3000>. The dashboard renders with mock metrics so you can validate the design system.

---

## Full setup (auth + database, all free)

### 1. Create a Supabase project (free)

1. Go to <https://app.supabase.com> → New project.
2. Region: pick the one closest to you.
3. Save the **anon public key** and **project URL** (Settings → API).
4. SQL Editor → run each file under `supabase/migrations/` in order (`0001` → `0002` → `0003`).

### 2. Create Google OAuth credentials (free)

1. Go to <https://console.cloud.google.com/apis/credentials> → Create credentials → OAuth client ID.
2. Application type: **Web application**.
3. Authorized redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`.
4. Copy the **Client ID** and **Client Secret**.

### 3. Enable Google in Supabase

Supabase dashboard → Authentication → Providers → Google → enable, paste Client ID + Secret.

### 4. Get a free Gemini API key

1. Go to <https://aistudio.google.com/apikey>.
2. Create API key (no credit card required).
3. Save it.

### 5. Fill in `.env.local`

```bash
cd apps/web
cp .env.local.example .env.local
# Edit .env.local with the values from steps 1 + 4
```

### 6. Run it

```bash
npm run dev
```

Sign in with Google. You're in.

---

## Apple Health import (weekly workflow)

> **Why manual?** Web apps cannot read HealthKit. Native iOS would require a $99/year Apple Developer account. Manual XML export is the $0 alternative and captures ~95% of HealthKit value.

1. On your iPhone, open the **Health app** → tap your profile photo → **Export All Health Data**.
2. Wait ~30 seconds for the `export.zip` to generate.
3. Share it to yourself (AirDrop to Mac, or email).
4. In Pulse → **Settings → Import Apple Health** → upload the `.zip`.
5. The Edge Function parses it and updates your `daily_metrics` table.
6. Your weekly plan is regenerated automatically.

Do this **once per week** (Sunday evening works well).

---

## Project structure

```
.
├── apps/web/                      Next.js PWA
│   ├── app/
│   │   ├── (auth)/login/         Public auth route
│   │   ├── (app)/                Protected app routes (dashboard, workouts, etc.)
│   │   └── auth/callback/        OAuth callback handler
│   ├── components/ui/            MetricCard, RingProgress, etc.
│   ├── lib/
│   │   ├── supabase/             Browser + server clients
│   │   ├── design/               Pulse design tokens
│   │   └── ai/                   Gemini adapter (later)
│   └── proxy.ts                  Route guard (Next.js 16 renamed middleware → proxy)
├── supabase/
│   ├── migrations/               SQL schema + RLS
│   ├── functions/                Edge Functions (later: parse-health-export, chat, weekly-plan)
│   └── config.toml
└── scripts/
    └── seed-exercise-db.ts       One-off import of free-exercise-db (Week 2)
```

---

## What's built so far (v0.1 foundation)

- [x] Next.js 16 scaffold with Tailwind 4
- [x] Pulse design system (tokens, components: MetricCard, RingProgress, PrimaryButton, ExerciseCard, ChatBubble, MetricTrendPill)
- [x] Supabase clients (browser + server) using `@supabase/ssr`
- [x] Proxy-based route guard (Next.js 16)
- [x] Google OAuth login page
- [x] OAuth callback handler
- [x] Dashboard skeleton with mock data
- [x] Bottom tab bar navigation (mobile-first)
- [x] Database schema + RLS policies (profiles, daily_metrics, workouts, exercises, meals, chat, plans)
- [x] Audit log infrastructure
- [x] pgvector for RAG

## Coming next

- [ ] Apple Health XML parser (Edge Function)
- [ ] Manual workout logger UI
- [ ] Exercise catalog seed from free-exercise-db
- [ ] Weekly plan generator (Gemini)
- [ ] Chat assistant (streaming + RAG + safety guardrails)
- [ ] PWA manifest + service worker
- [ ] "Delete my data" flow

---

## Cost

| Phase | Cost |
|---|---|
| Personal use | **$0/month** |
| Future beta (paid Gemini required to avoid training on user data) | ~$10–35/month |
| Production 1k–5k users | ~$80–250/month |

---

## Security & privacy

- RLS on every user table.
- Service-role key only used inside Edge Functions, never in the browser.
- Apple Health imports stored encrypted at rest; original zip deleted after parse.
- AI chat: pre/post-filter for medical questions; user input wrapped as untrusted.
- "Delete my data" → soft-delete → 30-day grace → hard purge.

See the full plan: `/Users/supernova/.claude/plans/yeah-use-web-app-shimmering-pinwheel.md`
