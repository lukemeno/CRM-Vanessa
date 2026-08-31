# CRM Vanessa

Betriebs-App für **Events by Vanessa** (Vanessa Düster, Alte Hettnerfabrik, Bad Münstereifel). Nach dem Anmelden landet die Operatorin auf `/heute`.

Diese Version ist das Gerüst plus das Fachmodell in Postgres: Magic-Link-Login (Allowlist), eine leere Desktop-Shell (Heute, Anfragen, Kalender) und Tabellen für Eventakte, Termine, Kalenderblöcke und Rechnungen. Anfragenboard, Kalenderinhalt, Angebot-PDFs, IMAP und Heute-Inhalt kommen später.

Die Oberfläche ist **desktop-first** (`md`/`lg`). Vanessa arbeitet am Rechner; Handy und Tablet bleiben lesbar, sind aber der Fallback, nicht die Vorlage.

## Voraussetzungen

- Node.js 20 oder neuer
- [pnpm](https://pnpm.io/) 10
- PostgreSQL in der **EU**

Zielkosten unter **25 EUR/Monat**. Postgres nicht in den USA hosten. In der Connection-URL `sslmode=require` setzen, sobald der Host TLS verlangt.

**Hosting:** Vercel Hobby ist für kommerzielle Nutzung nicht lizenziert. Bevorzugt **Hetzner VPS + Coolify** oder **Vercel Pro**. Dieses Repo deployt nichts.

## Lokal starten

```bash
pnpm install
cp .env.example .env.local
```

In `.env.local`:

1. `DATABASE_URL` auf deine Postgres-Instanz setzen.
2. `AUTH_SECRET` erzeugen: `npx auth secret` (oder eine lange Zufallszeichenkette eintragen).
3. `AUTH_ALLOWLIST` auf die echten Adressen von Vanessa und Luke setzen (kommagetrennt).
4. `AUTH_URL` auf `http://localhost:3000` lassen.
5. Optional: `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` für echten Mailversand.

Dann Schema anlegen und den Dev-Server starten:

```bash
pnpm db:migrate
pnpm dev
```

Öffne [http://localhost:3000](http://localhost:3000). Die Anmeldeseite ist auf Deutsch. Nach einem gültigen Magic-Link geht es weiter nach `/heute`.

## Magic-Link und Allowlist

- Nur E-Mail-Adressen in `AUTH_ALLOWLIST` dürfen sich anmelden.
- Unbekannte Adressen erhalten eine deutsche Fehlermeldung. Es wird **keine** Mail verschickt.
- In Produktion sendet Ionos-SMTP den einen Anmeldelink (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`).

## Local-Dev-Bypass (kein SMTP)

Damit du lokal ohne Mailserver anmelden kannst:

```
AUTH_DEV_BYPASS=1
```

**Wirkt ausschließlich, wenn `NODE_ENV=development`.** In jedem anderen Umfeld ignoriert die App den Schalter — auch wenn die Variable gesetzt ist. Niemals in Produktion aktivieren.

Bei aktivem Bypass schreibt der Server den Magic-Link in die Konsole, statt eine Mail zu senden. Postgres bleibt nötig: Auth.js speichert den Verifizierungstoken in der Datenbank.

## Skripte

| Befehl | Zweck |
| --- | --- |
| `pnpm dev` | Dev-Server |
| `pnpm build` | Produktionsbuild |
| `pnpm typecheck` | TypeScript |
| `pnpm test` | Unit-Tests |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` | Drizzle-Migrationen anwenden |

## Datenbank

Drizzle + Postgres. Auth.js-Tabellen (User, Account, Session, Verification Token) plus Fachtabellen `event`, `appointment`, `calendar_block`, `invoice`, `invoice_counter`. Überlappungen prüft nur `calendar_block` (`EXCLUDE USING gist`).

`GET /api/health` meldet, ob Postgres erreichbar ist.

## Was später kommt

Nicht in diesem PR:

- Anfragenboard
- Angebote und PDFs
- Kalender-UI
- Inhalt der Heute-Kacheln
- Kundenportal
