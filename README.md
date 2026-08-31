# CRM Vanessa

Betriebs-App für **Events by Vanessa** (Vanessa Düster, Alte Hettnerfabrik, Bad Münstereifel). Nach dem Anmelden landet die Operatorin auf `/heute`.

Diese erste Version ist nur das Gerüst: Magic-Link-Login (Allowlist) und eine leere Heute-Ansicht. Anfragen, Angebote, Rechnungen und Kalender kommen in späteren PRs.

## Voraussetzungen

- Node.js 20 oder neuer
- [pnpm](https://pnpm.io/) 10
Postgres in der **EU** — vorgesehen sind [Fly Postgres](https://fly.io/docs/postgres/) oder [Railway](https://railway.app/) in **Frankfurt**. Nicht in den USA hosten. In der Connection-URL `sslmode=require` setzen, sobald der Host TLS verlangt. Dieses Repo deployt nichts.

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

Dann Schema anlegen und den Dev-Server starten:

```bash
pnpm db:migrate
pnpm dev
```

Öffne [http://localhost:3000](http://localhost:3000). Die Anmeldeseite ist auf Deutsch. Nach einem gültigen Magic-Link geht es weiter nach `/heute`.

## Magic-Link und Allowlist

- Nur E-Mail-Adressen in `AUTH_ALLOWLIST` dürfen sich anmelden.
- Unbekannte Adressen erhalten eine deutsche Fehlermeldung. Es wird **keine** Mail verschickt.
- In Produktion den Link per SMTP versenden (`EMAIL_SERVER`, `EMAIL_FROM`).

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
| `pnpm test` | Unit-Tests |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` | Drizzle-Migrationen anwenden |

## Datenbank

Drizzle + Postgres. PR-1 enthält nur die Auth.js-Tabellen (User, Account, Session, Verification Token), damit Magic-Links funktionieren. Fachliche Tabellen (Geld, Anfragen, Angebote, Rechnungen, Kalender) gehören in spätere PRs.

## Was später kommt

Nicht in diesem PR:

- Eventakte
- Anfragenboard
- Angebote und PDFs
- Rechnungen
- Kalender
- Inhalt der Heute-Kacheln
- Kundenportal
- Festlegung auf Vercel
