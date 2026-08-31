# Progress

## PR-1 — Scaffold the operator app

- [x] Next.js App Router, TypeScript, Tailwind, pnpm
- [x] Desktop-first shell (Heute, Anfragen, Kalender stubs)
- [x] German login, olive brand, allowlist magic link
- [x] Auth.js + Drizzle auth tables (no domain tables)
- [x] Ionos SMTP module for the magic-link mail
- [x] `/api/health` Postgres probe
- [x] CLAUDE.md, README hosting note, `.env.example`
- [x] Gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`

## PR-2 — Domain model (events, money, calendar blocks)

- [x] `event` with couple names, enum status, lost_reason, reserved_until, guest_count, quoted_net_cents, event_date
- [x] `invoice_counter` + append-only `invoice` (RE-YYYY-NNN, Storno as a new row)
- [x] `appointment` (viewing 60 min / planning) without exclusion
- [x] `calendar_block` gist exclusion; booked Fri 11–Sun 11 Berlin; viewing 60+30; planning/reserved period only
- [x] Collision tests: double-booked weekend, viewing vs booked, overlapping viewing buffers, expired reserve
- [x] Gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`

## Later PRs

- Anfragen board, Kalender UI, Angebote PDFs, IMAP, Heute content
