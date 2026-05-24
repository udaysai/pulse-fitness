# Contributing to Pulse

Thanks for your interest in helping build Pulse! This is a personal-first AI fitness PWA that runs at $0/month. Contributions of any size are welcome.

## Quick start

```bash
git clone <repo-url>
cd pulse
cd apps/web
npm install
cp .env.local.example .env.local      # fill in keys (see README)
npm run dev
```

Open <http://localhost:3000>. The dashboard renders with mock data even without Supabase keys, so you can iterate on UI without backend setup.

## Project layout

See `README.md` for the full project structure.

## Branching

- `main` is always deployable.
- Branch naming: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`.
- Open a PR against `main`. Squash merge.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(dashboard): add sleep ring to hero
fix(auth): redirect to /dashboard after Google sign-in
chore(deps): bump @supabase/ssr to 0.11
docs(readme): clarify Apple Health export step
```

## Code style

- TypeScript strict mode — no `any` unless justified.
- Functional React components only; no class components.
- Tailwind utility classes; design tokens live in `lib/design/`.
- Files: `kebab-case` for routes (Next.js convention), `PascalCase` for components.

Run before committing:

```bash
cd apps/web
npm run lint
npm run build
```

## Pull request checklist

- [ ] `npm run build` passes locally
- [ ] `npm run lint` passes locally
- [ ] No secrets committed (check `.env.local` is gitignored)
- [ ] If schema changed: new file added to `supabase/migrations/` with the next number
- [ ] If a new component added: it uses Pulse design tokens, not raw hex colors
- [ ] README or relevant doc updated if the change is user-facing

## Security

If you find a security issue, **do not open a public issue**. Email the maintainer or open a private security advisory on GitHub.

Health data is sensitive. Before submitting a feature touching `daily_metrics`, `workouts`, `chat_messages`, or `health_imports`:

1. Confirm RLS policies still scope reads/writes to `auth.uid()`.
2. Confirm no user data is logged in plaintext.
3. Confirm AI prompts wrap user free-text as untrusted (never inlined into system prompt).

## License

By contributing, you agree your contributions are licensed under the MIT License (see `LICENSE`).
