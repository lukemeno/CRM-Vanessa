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

- Prefer **server actions** over extra API routes. The health probe, Auth.js/magic, and the offer PDF download are the exceptions.
- **Zod at HTTP/form boundaries.** No `any`.
- Money is integer **cents**, never floats. VAT is 19% MwSt (`quoted_net_cents` on event; offer and invoice store net/vat/gross).
- Dates: `date` for calendar days, `timestamptz` / `tstzrange` for instants. Display in `Europe/Berlin`.
- `calendar_block` is the only overlap table (`EXCLUDE USING gist (period WITH &&) WHERE (blocks_calendar)`). Do not put `now()` in that predicate.
- Invoice numbers are `RE-YYYY-NNN` from `invoice_counter` (`SELECT FOR UPDATE`). Amounts are append-only; Storno is a new row. Offer numbers are the issue date as `DDMMYYYY` (`21062026` = 21.06.2026). Not the wedding date. Not `RE-`.
- One offer per event (`offer` + `offer_line`). Lines are description, qty, unit net cents; totals are integer cents at 19% MwSt. Catalog until packages arrive is the sample 21062026 lines.
- Status values are only `new|viewing|offer|booked|planning|done|lost`. German label for `done` is **Erledigt**. `reserved_until` is a field, not a status. Lost requires `lost_reason`.
- Inquiry source is only `website|bridebook|manual|other` (default `manual`).
- Event contact is `event.email` and `event.phone` (nullable text, no contacts table). Creating an inquiry requires at least one.
- Guest count is editable through the calendar day 10 days before `event_date`; lock starts the next day. Storno: full refund until 3 months before `event_date`, then Anzahlung kept.
- Eventakte is a sheet at `/anfragen/[id]` (couple names as heading). Email and phone are editable there after create. Do not add a second CRM at `/events/[id]`.

## Forbidden

- Schema change without a Drizzle migration
- New dependency without a note in `docs/adr/`
- IMAP (env placeholders only; no worker)
- Mobile-first layout as the design source
- Vercel Hobby for commercial hosting
- `tenant_id`, public booking routes, calendar UI pages
