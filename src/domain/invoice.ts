import { asc, eq, sql } from "drizzle-orm";
import { event as eventTable, invoice, invoiceCounter } from "@/db/schema";
import type { AppDb, AppSession } from "@/db/types";
import {
  BELEG_SENDER,
  belegCoupleNames,
  type BelegPdfModel,
} from "@/domain/beleg";
import { bookedLocationWindowCopy } from "@/domain/calendar";
import {
  ANZAHLUNG_GROSS_CENTS,
  grossCents,
  netFromGross,
  vatCents,
} from "@/domain/money";
import { getOfferForEvent } from "@/domain/offer";
import {
  calendarYmd,
  formatCalendarDate,
  yearInTimeZone,
} from "@/lib/timezone";

export const ANZAHLUNG_LINE = "Anzahlung";
export const RESTZAHLUNG_LINE = "Restzahlung";

export function formatInvoiceNumber(year: number, n: number): string {
  return `RE-${year}-${String(n).padStart(3, "0")}`;
}

export async function issueInvoice(
  db: AppDb,
  input: {
    eventId: string;
    netCents: number;
    now: Date;
    kind?: "invoice" | "storno";
    stornoOfId?: string | null;
  },
) {
  const year = yearInTimeZone(input.now);
  const netCents = input.netCents;
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      insert into invoice_counter (year, last_n)
      values (${year}, 0)
      on conflict (year) do nothing
    `);
    const locked = await tx.execute(sql`
      select last_n from invoice_counter where year = ${year} for update
    `);
    const rows = locked as unknown as { last_n: number }[];
    const lastN = Number(rows[0]?.last_n ?? 0);
    const next = lastN + 1;
    await tx
      .update(invoiceCounter)
      .set({ lastN: next })
      .where(eq(invoiceCounter.year, year));
    const [row] = await tx
      .insert(invoice)
      .values({
        eventId: input.eventId,
        number: formatInvoiceNumber(year, next),
        kind: input.kind ?? "invoice",
        stornoOfId: input.stornoOfId ?? null,
        netCents,
        vatCents: vatCents(netCents),
        grossCents: grossCents(netCents),
      })
      .returning();
    if (!row) {
      throw new Error("invoice insert returned no row");
    }
    return row;
  });
}

export async function stornoInvoice(
  db: AppDb,
  invoiceId: string,
  opts: { now: Date },
) {
  const [original] = await db
    .select()
    .from(invoice)
    .where(eq(invoice.id, invoiceId));
  if (!original) {
    throw new Error("invoice not found");
  }
  if (original.kind === "storno") {
    throw new Error("cannot storno a storno");
  }
  const invoices = await listInvoicesForEvent(db, original.eventId);
  if (invoices.some((row) => row.stornoOfId === original.id)) {
    throw new Error("invoice already stornoed");
  }
  return issueInvoice(db, {
    eventId: original.eventId,
    netCents: -original.netCents,
    now: opts.now,
    kind: "storno",
    stornoOfId: original.id,
  });
}

export async function listInvoicesForEvent(db: AppSession, eventId: string) {
  return db
    .select()
    .from(invoice)
    .where(eq(invoice.eventId, eventId))
    .orderBy(asc(invoice.createdAt), asc(invoice.number));
}

export function invoicedGrossCents(
  invoices: readonly { grossCents: number }[],
): number {
  return invoices.reduce((sum, row) => sum + row.grossCents, 0);
}

export function remainingGrossCents(
  offerGrossCents: number,
  invoices: readonly { grossCents: number }[],
): number {
  return offerGrossCents - invoicedGrossCents(invoices);
}

function stornoedIds(
  invoices: readonly { kind: string; stornoOfId: string | null }[],
): Set<string> {
  const ids = new Set<string>();
  for (const row of invoices) {
    if (row.kind === "storno" && row.stornoOfId) {
      ids.add(row.stornoOfId);
    }
  }
  return ids;
}

export function hasOpenAnzahlung(
  invoices: readonly {
    id: string;
    kind: string;
    grossCents: number;
    stornoOfId: string | null;
  }[],
): boolean {
  const stornoed = stornoedIds(invoices);
  return invoices.some(
    (row) =>
      row.kind === "invoice" &&
      row.grossCents === ANZAHLUNG_GROSS_CENTS &&
      !stornoed.has(row.id),
  );
}

export function invoiceLineLabel(
  row: {
    id: string;
    kind: string;
    grossCents: number;
    stornoOfId: string | null;
  },
  invoices: readonly { id: string; number: string }[],
): string {
  if (row.kind === "storno") {
    const original = invoices.find((item) => item.id === row.stornoOfId);
    return original ? `Storno zu ${original.number}` : "Storno";
  }
  if (Math.abs(row.grossCents) === ANZAHLUNG_GROSS_CENTS) {
    return ANZAHLUNG_LINE;
  }
  return RESTZAHLUNG_LINE;
}

export async function issueAnzahlung(
  db: AppDb,
  eventId: string,
  opts: { now: Date },
) {
  const [eventRow] = await db
    .select()
    .from(eventTable)
    .where(eq(eventTable.id, eventId));
  if (!eventRow) {
    throw new Error("event not found");
  }
  const invoices = await listInvoicesForEvent(db, eventId);
  if (hasOpenAnzahlung(invoices)) {
    throw new Error("anzahlung already issued");
  }
  return issueInvoice(db, {
    eventId,
    netCents: netFromGross(ANZAHLUNG_GROSS_CENTS),
    now: opts.now,
  });
}

export async function issueBalanceInvoice(
  db: AppDb,
  eventId: string,
  opts: { now: Date },
) {
  const offer = await getOfferForEvent(db, eventId);
  if (!offer) {
    throw new Error("offer required");
  }
  const invoices = await listInvoicesForEvent(db, eventId);
  const remaining = remainingGrossCents(offer.grossCents, invoices);
  if (remaining <= 0) {
    throw new Error("nothing remaining");
  }
  return issueInvoice(db, {
    eventId,
    netCents: netFromGross(remaining),
    now: opts.now,
  });
}

export async function getInvoiceForEvent(
  db: AppSession,
  eventId: string,
  invoiceId: string,
) {
  const [eventRow] = await db
    .select()
    .from(eventTable)
    .where(eq(eventTable.id, eventId));
  if (!eventRow) {
    return null;
  }
  const [row] = await db.select().from(invoice).where(eq(invoice.id, invoiceId));
  if (!row || row.eventId !== eventId) {
    return null;
  }
  const invoices = await listInvoicesForEvent(db, eventId);
  return { ...row, event: eventRow, invoices };
}

export type InvoicePdfSource = {
  id: string;
  number: string;
  kind: "invoice" | "storno";
  stornoOfId: string | null;
  netCents: number;
  vatCents: number;
  grossCents: number;
  createdAt: Date;
  event: {
    coupleAName: string;
    coupleBName: string;
    eventDate: string | null;
  };
  invoices: Array<{ id: string; number: string }>;
};

export function invoicePdfModel(record: InvoicePdfSource): BelegPdfModel {
  const line = invoiceLineLabel(record, record.invoices);
  const heading =
    record.kind === "storno"
      ? `Storno ${record.number}`
      : line === ANZAHLUNG_LINE
        ? `Anzahlung ${record.number}`
        : `Rechnung ${record.number}`;
  return {
    heading,
    number: record.number,
    issuedOnLabel: formatCalendarDate(calendarYmd(record.createdAt)),
    coupleNames: belegCoupleNames(
      record.event.coupleAName,
      record.event.coupleBName,
    ),
    eventDateLabel: record.event.eventDate
      ? formatCalendarDate(record.event.eventDate)
      : null,
    locationName: BELEG_SENDER.venue,
    locationWindow: bookedLocationWindowCopy(),
    lines: [
      {
        description: line,
        quantity: 1,
        unitNetCents: record.netCents,
        netCents: record.netCents,
      },
    ],
    netCents: record.netCents,
    vatCents: record.vatCents,
    grossCents: record.grossCents,
    vatPercent: 19,
    terms: [],
    sender: BELEG_SENDER,
  };
}
