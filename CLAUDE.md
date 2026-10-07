# CRM-Vanessa — agent notes

Operator app for **Events by Vanessa** (Vanessa Düster, Alte Hettnerfabrik). UI language: German. Brand olive `#5c6540`. Desktop-first: `md`/`lg` is the canvas. Phone must not break; it is not the spec.

The App Router lives under `src/` (already committed in PR-1). Do not move to repo-root `app/` for taste.

## Stack

- Next.js App Router, TypeScript, Tailwind, pnpm
- Drizzle ORM + Postgres (EU)
- Auth.js / NextAuth magic link, allowlist only (`AUTH_ALLOWLIST`)
- Ionos SMTP for the one magic-link mail (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`)
- Default timezone `Europe/Berlin`

## Commands

```bash
pnpm install
pnpm db:migrate
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
```

## Conventions

- Prefer **server actions** over extra API routes. The health probe and Auth.js/magic endpoints are the exceptions.
- **Zod at HTTP/form boundaries.** No `any`.
- Money (later PRs) is integer **cents**, never floats.
- Dates: `date` for calendar days, `timestamptz` for instants. Display in `Europe/Berlin`.
- Domain tables (Eventakte, Anfragen, Angebote, Rechnungen, Kalender) are **not** in PR-1.

## Forbidden

- Schema change without a Drizzle migration
- New dependency without a note in `docs/adr/`
- IMAP in this PR (env placeholders only)
- Mobile-first layout as the design source
- Vercel Hobby for commercial hosting
