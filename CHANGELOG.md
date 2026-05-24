# Changelog

All notable changes to Pulse will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Week 1 foundation
- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 PWA scaffolding.
- "Pulse" design system: design tokens, color accents per domain (workout / nutrition / recovery / sleep / energy), dark-first with light variant.
- Core UI components: `MetricCard`, `RingProgress`, `PrimaryButton`, `ExerciseCard`, `ChatBubble`, `MetricTrendPill`.
- Supabase clients (browser + server) via `@supabase/ssr`.
- Google OAuth login page and OAuth callback handler.
- Next.js 16 Proxy (formerly Middleware) for route protection; gracefully degrades to UI-only mode when Supabase is not yet configured.
- Dashboard skeleton with mock data — hero ring, mini rings, metric grid, today's plan.
- Bottom tab bar navigation (mobile-first).
- Database schema: `profiles`, `user_consents`, `health_imports`, `daily_metrics`, `exercises`, `workouts`, `workout_exercises`, `exercise_sets`, `meal_logs`, `foods`, `chat_threads`, `chat_messages`, `weekly_plans`, `daily_plans`.
- Row-Level Security on every user-keyed table.
- Append-only audit log infrastructure (`audit.events`) with triggers on sensitive tables.
- pgvector schema for RAG; `match_user_embeddings` similarity helper.
- Setup README + `.env.local.example`.
- MIT License + CONTRIBUTING guide.
