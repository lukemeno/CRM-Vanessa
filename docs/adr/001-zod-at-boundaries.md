# ADR 001 — Zod at request boundaries

Add `zod` to parse magic-link JSON/form input.

Server actions and `/api/auth/magic` must not trust raw strings. Domain tables and money still come later; this is only the login boundary.
