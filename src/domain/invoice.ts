import { asc, eq, sql } from "drizzle-orm";
import { event as eventTable, invoice, invoiceCounter } from "@/db/schema";
import type { AppDb, AppSession, AppTx } from "@/db/types";
import {
  BELEG_SENDER,
  belegCoupleNames,
  type BelegPdfModel,
} from "@/domain/beleg";
import { bookedLocationWindowCopy } from "@/domain/calendar";
import {
  ANZAHLUNG_GROSS_CENTS,
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

type IssueInvoiceInput = {
  eventId: string;
  netCents: number;
  now: Date;
  kind?: "invoice" | "storno";
  stornoOfId?: string | null;
  description?: string;
  vatCents?: number;
  grossCents?: number;
};

function preparedInvoice(input: IssueInvoiceInput) {
  const netCents = input.netCents;
  const vat = input.vatCents ?? vatCents(netCents);
  const gross = input.grossCents ?? netCents + vat;
  if (gross !== netCents + vat) {
    throw new Error("money must be integer cents");
  }
  const description = (input.description ?? "Rechnung").trim();
  if (!description) {
    throw new Error("invoice description required");
  }
  return {
    year: yearInTimeZone(input.now),
    netCents,
    vat,
    gross,
    description,
    kind: input.kind ?? "invoice",
    stornoOfId: input.stornoOfId ?? null,
    eventId: input.eventId,
  };
}

async function lockEventInvoices(tx: AppTx, eventId: string) {
  await tx.execute(sql`
    select id from event where id = ${eventId} for update
  `);
  await tx.execute(sql`
    select id from offer where event_id = ${eventId} for update
  `);
  await tx.execute(sql`
    select id from invoice where event_id = ${eventId} for update
  `);
}

async function issueInvoiceInTx(tx: AppTx, input: IssueInvoiceInput) {
  const prepared = preparedInvoice(input);
  await lockEventInvoices(tx, prepared.eventId);
  await tx.execute(sql`
    insert into invoice_counter (year, last_n)
    values (${prepared.year}, 0)
    on conflict (year) do nothing
  `);
  const locked = await tx.execute(sql`
    select last_n from invoice_counter where year = ${prepared.year} for update
  `);
  const rows = locked as unknown as { last_n: number }[];
  const lastN = Number(rows[0]?.last_n ?? 0);
  const next = lastN + 1;
  await tx
    .update(invoiceCounter)
    .set({ lastN: next })
    .where(eq(invoiceCounter.year, prepared.year));
  const [row] = await tx
    .insert(invoice)
    .values({
      eventId: prepared.eventId,
      number: formatInvoiceNumber(prepared.year, next),
      kind: prepared.kind,
      stornoOfId: prepared.stornoOfId,
      description: prepared.description,
      netCents: prepared.netCents,
      vatCents: prepared.vat,
      grossCents: prepared.gross,
    })
    .returning();
  if (!row) {
    throw new Error("invoice insert returned no row");
  }
  return row;
}

export async function issueInvoice(db: AppDb, input: IssueInvoiceInput) {
  return db.transaction(async (tx) => issueInvoiceInTx(tx, input));
}

export async function stornoInvoice(
  db: AppDb,
  invoiceId: string,
  opts: { now: Date },
) {
  return db.transaction(async (tx) => {
    const [original] = await tx
      .select()
      .from(invoice)
      .where(eq(invoice.id, invoiceId));
    if (!original) {
      throw new Error("invoice not found");
    }
    if (original.kind === "storno") {
      throw new Error("cannot storno a storno");
    }
    await lockEventInvoices(tx, original.eventId);
    const invoices = await listInvoicesForEvent(tx, original.eventId);
    if (invoices.some((row) => row.stornoOfId === original.id)) {
      throw new Error("invoice already stornoed");
    }
    try {
      return await issueInvoiceInTx(tx, {
        eventId: original.eventId,
        netCents: -original.netCents,
        vatCents: -original.vatCents,
        grossCents: -original.grossCents,
        now: opts.now,
        kind: "storno",
        stornoOfId: original.id,
        description: `Storno zu ${original.number}`,
      });
    } catch (error) {
      const text =
        error instanceof Error
          ? `${error.message} ${String(error.cause)}`
          : String(error);
      if (text.includes("invoice_storno_of_id_unique")) {
        throw new Error("invoice already stornoed");
      }
      throw error;
    }
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

function invoicedPart(
  invoices: readonly {
    netCents?: number;
    vatCents?: number;
    grossCents: number;
  }[],
  field: "netCents" | "vatCents",
): number {
  return invoices.reduce((sum, row) => sum + (row[field] ?? 0), 0);
}

export function remainingInvoiceParts(
  offer: { netCents: number; vatCents: number; grossCents: number },
  invoices: readonly {
    netCents?: number;
    vatCents?: number;
    grossCents: number;
  }[],
) {
  return {
    netCents: offer.netCents - invoicedPart(invoices, "netCents"),
    vatCents: offer.vatCents - invoicedPart(invoices, "vatCents"),
    grossCents: remainingGrossCents(offer.grossCents, invoices),
  };
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
    description?: string | null;
    grossCents: number;
    stornoOfId: string | null;
  }[],
): boolean {
  const stornoed = stornoedIds(invoices);
  return invoices.some(
    (row) =>
      row.kind === "invoice" &&
      row.description === ANZAHLUNG_LINE &&
      !stornoed.has(row.id),
  );
}

export function canIssueAnzahlung(
  invoices: Parameters<typeof hasOpenAnzahlung>[0],
  remainingGross: number | null,
): boolean {
  if (hasOpenAnzahlung(invoices)) {
    return false;
  }
  if (remainingGross == null) {
    return true;
  }
  return remainingGross >= ANZAHLUNG_GROSS_CENTS;
}

export function invoiceLineLabel(
  row: {
    kind: string;
    description?: string | null;
    stornoOfId: string | null;
    grossCents: number;
  },
  invoices: readonly { id: string; number: string }[],
): string {
  const stored = row.description?.trim();
  if (stored) {
    return stored;
  }
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
  return db.transaction(async (tx) => {
    const [eventRow] = await tx
      .select()
      .from(eventTable)
      .where(eq(eventTable.id, eventId));
    if (!eventRow) {
      throw new Error("event not found");
    }
    await lockEventInvoices(tx, eventId);
    const invoices = await listInvoicesForEvent(tx, eventId);
    if (hasOpenAnzahlung(invoices)) {
      throw new Error("anzahlung already issued");
    }
    const offer = await getOfferForEvent(tx, eventId);
    if (offer) {
      const remaining = remainingGrossCents(offer.grossCents, invoices);
      if (remaining < ANZAHLUNG_GROSS_CENTS) {
        throw new Error("nothing remaining");
      }
    }
    return issueInvoiceInTx(tx, {
      eventId,
      netCents: netFromGross(ANZAHLUNG_GROSS_CENTS),
      now: opts.now,
      description: ANZAHLUNG_LINE,
    });
  });
}

export async function issueBalanceInvoice(
  db: AppDb,
  eventId: string,
  opts: { now: Date },
) {
  return db.transaction(async (tx) => {
    await lockEventInvoices(tx, eventId);
    const offer = await getOfferForEvent(tx, eventId);
    if (!offer) {
      throw new Error("offer required");
    }
    const invoices = await listInvoicesForEvent(tx, eventId);
    const remaining = remainingInvoiceParts(offer, invoices);
    if (
      remaining.grossCents <= 0 ||
      remaining.netCents + remaining.vatCents !== remaining.grossCents
    ) {
      throw new Error("nothing remaining");
    }
    return issueInvoiceInTx(tx, {
      eventId,
      netCents: remaining.netCents,
      vatCents: remaining.vatCents,
      grossCents: remaining.grossCents,
      now: opts.now,
      description: RESTZAHLUNG_LINE,
    });
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
  description?: string | null;
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
