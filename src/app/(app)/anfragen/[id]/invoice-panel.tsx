"use client";

import { useActionState } from "react";
import {
  issueAnzahlungAction,
  issueBalanceInvoiceAction,
  stornoInvoiceAction,
  type InquiryFormState,
} from "@/app/(app)/anfragen/actions";
import { formatEuroFromCents } from "@/domain/money";
import { formatBerlinDateTime } from "@/lib/timezone";

const initialState: InquiryFormState = {};

type InvoiceRow = {
  id: string;
  number: string;
  kind: "invoice" | "storno";
  line: string;
  netCents: number;
  vatCents: number;
  grossCents: number;
  createdAt: Date;
  canStorno: boolean;
};

export function InvoicePanel({
  eventId,
  invoices,
  remainingGrossCents,
  canIssueAnzahlung,
  canIssueBalance,
}: {
  eventId: string;
  invoices: InvoiceRow[];
  remainingGrossCents: number | null;
  canIssueAnzahlung: boolean;
  canIssueBalance: boolean;
}) {
  const [issueState, issueAction, issuePending] = useActionState(
    issueAnzahlungAction,
    initialState,
  );
  const [balanceState, balanceAction, balancePending] = useActionState(
    issueBalanceInvoiceAction,
    initialState,
  );
  const [stornoState, stornoFormAction, stornoPending] = useActionState(
    stornoInvoiceAction,
    initialState,
  );
  const error =
    issueState.error ?? balanceState.error ?? stornoState.error ?? null;

  return (
    <div className="space-y-4">
      <p className="font-serif text-2xl text-olive">Rechnungen</p>

      {invoices.length === 0 ? (
        <p className="text-sm text-olive/70">Keine Rechnungen.</p>
      ) : (
        <ul className="space-y-3">
          {invoices.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-olive/10 bg-cream px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-serif text-lg text-olive">{row.number}</p>
                <p className="text-sm text-olive-dark">
                  {formatEuroFromCents(row.grossCents)}
                </p>
              </div>
              <p className="mt-1 text-sm text-olive-dark">{row.line}</p>
              <p className="mt-1 text-sm text-olive/80">
                {formatEuroFromCents(row.netCents)} netto ·{" "}
                {formatEuroFromCents(row.vatCents)} MwSt ·{" "}
                {formatBerlinDateTime(row.createdAt)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <a
                  href={`/anfragen/${eventId}/rechnung/${row.id}`}
                  className="text-sm text-olive hover:text-olive-dark"
                >
                  PDF herunterladen
                </a>
                {row.canStorno ? (
                  <form action={stornoFormAction}>
                    <input type="hidden" name="id" value={eventId} />
                    <input type="hidden" name="invoiceId" value={row.id} />
                    <button
                      type="submit"
                      disabled={stornoPending}
                      className="text-sm text-olive/80 hover:text-olive-dark disabled:opacity-60"
                    >
                      {stornoPending ? "Wird storniert…" : "Storno"}
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {remainingGrossCents != null ? (
        <p className="text-sm text-olive-dark">
          Offen: {formatEuroFromCents(remainingGrossCents)} brutto
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        {canIssueAnzahlung ? (
          <form action={issueAction}>
            <input type="hidden" name="id" value={eventId} />
            <button
              type="submit"
              disabled={issuePending}
              className="rounded-full bg-olive px-4 py-2 text-sm font-medium text-paper transition hover:bg-olive-dark disabled:opacity-60"
            >
              {issuePending ? "Wird ausgestellt…" : "Anzahlung ausstellen"}
            </button>
          </form>
        ) : null}
        {canIssueBalance ? (
          <form action={balanceAction}>
            <input type="hidden" name="id" value={eventId} />
            <button
              type="submit"
              disabled={balancePending}
              className="rounded-full border border-olive/30 bg-paper px-4 py-2 text-sm font-medium text-olive transition hover:border-olive hover:text-olive-dark disabled:opacity-60"
            >
              {balancePending ? "Wird ausgestellt…" : "Restrechnung ausstellen"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
