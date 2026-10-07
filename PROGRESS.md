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

## PR-3 — Anfragen board

- [x] `/anfragen` German board grouped by Neu / Besichtigung / Angebot / Gebucht / Planung / Erledigt / Verloren
- [x] Create inquiry (two names, optional date/guests/note, source) lands in `new`
- [x] `event.source` (`website | bridebook | manual | other`, default `manual`) + optional `note`
- [x] Moving to lost requires a reason; empty columns stay visible
- [x] Thin Eventakte at `/anfragen/[id]` deepened in PR-4
- [x] Gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`

## PR-4 — Eventakte

- [x] `/anfragen/[id]` is the Eventakte (board still links there; not a second CRM)
- [x] Couple names, date, guests, status (Erledigt), quoted EUR from cents, source, note, email, phone
- [x] Location window from BOOKED_WEEKEND (Fr 11:00 bis So 11:00); Storno full refund until 3 months before event_date
- [x] Guest count editable until 10 days before event_date, then locked
- [x] Appointments list + add form using viewing 60+30 / planning period writers
- [x] Verloren cards show the lost reason; create inquiry requires email or phone
- [x] Gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`

## Later PRs

- Kalender UI, Angebote PDFs, IMAP, Heute content
