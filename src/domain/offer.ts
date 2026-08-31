import { asc, eq } from "drizzle-orm";
import { event as eventTable, offer, offerLine } from "@/db/schema";
import type { AppSession } from "@/db/types";
import {
  BELEG_SENDER,
  OFFER_BELEG_TERMS,
  belegCoupleNames,
  type BelegPdfModel,
} from "@/domain/beleg";
import { bookedLocationWindowCopy } from "@/domain/calendar";
import { formatOfferNumber, grossCents, vatCents } from "@/domain/money";
import { formatCalendarDate } from "@/lib/timezone";

export type OfferLineInput = {
  description: string;
  quantity: number;
  unitNetCents: number;
};

export type OfferTotals = {
  netCents: number;
  vatCents: number;
  grossCents: number;
};

/**
 * Catalog until Vanessa sends packages: the sample 21062026 lines only.
 * Location is 2000 € net. Remaining Beleg total is one adjustable line,
 * not invented named packages.
 */
export const SAMPLE_OFFER_21062026 = {
  number: "21062026",
  issuedOn: "2026-06-21",
  eventDate: "2027-07-24",
  coupleAName: "Jana Hermes",
  coupleBName: "Raphael Gerhards",
  locationName: "Alte Hettnerfabrik",
  lines: [
    {
      description: "Location Alte Hettnerfabrik, Fr 11:00 bis So 11:00",
      quantity: 1,
      unitNetCents: 200_000,
    },
    {
      description: "Service und Ausstattung",
      quantity: 1,
      unitNetCents: 435_000,
    },
  ],
} as const satisfies {
  number: string;
  issuedOn: string;
  eventDate: string;
  coupleAName: string;
  coupleBName: string;
  locationName: string;
  lines: readonly OfferLineInput[];
};

export const SAMPLE_CATALOG_LINES: OfferLineInput[] =
  SAMPLE_OFFER_21062026.lines.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    unitNetCents: line.unitNetCents,
  }));

export function lineNetCents(
  line: Pick<OfferLineInput, "quantity" | "unitNetCents">,
): number {
  if (!Number.isInteger(line.quantity) || line.quantity < 1) {
    throw new Error("quantity must be a positive integer");
  }
  if (!Number.isInteger(line.unitNetCents) || line.unitNetCents < 0) {
    throw new Error("money must be integer cents");
  }
  return line.quantity * line.unitNetCents;
}

export function offerTotals(
  lines: readonly Pick<OfferLineInput, "quantity" | "unitNetCents">[],
): OfferTotals {
  const netCents = lines.reduce((sum, line) => sum + lineNetCents(line), 0);
  const vat = vatCents(netCents);
  return {
    netCents,
    vatCents: vat,
    grossCents: grossCents(netCents),
  };
}

function parseIssuedOn(issuedOn: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issuedOn)) {
    throw new Error("invalid calendar date");
  }
  formatOfferNumber(issuedOn);
  return issuedOn;
}

/** First offer of the day is DDMMYYYY. A second offer that day gets -2, then -3. */
export function nextOfferNumber(
  issuedOn: string,
  taken: readonly string[],
  keep: string | null = null,
): string {
  const base = formatOfferNumber(issuedOn);
  const keepMatch = keep ? /^(\d{8})(?:-\d+)?$/.exec(keep) : null;
  if (keepMatch?.[1] === base) {
    return keep as string;
  }
  const relevant = new Set(
    taken.filter((number) => number === base || number.startsWith(`${base}-`)),
  );
  if (!relevant.has(base)) {
    return base;
  }
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!relevant.has(candidate)) {
      return candidate;
    }
  }
}

function normalizedLines(lines: OfferLineInput[]): OfferLineInput[] {
  if (lines.length === 0) {
    throw new Error("offer lines required");
  }
  return lines.map((line) => {
    const description = line.description.trim();
    if (!description) {
      throw new Error("offer line description required");
    }
    lineNetCents(line);
    return {
      description,
      quantity: line.quantity,
      unitNetCents: line.unitNetCents,
    };
  });
}

export async function saveOffer(
  db: AppSession,
  eventId: string,
  input: { issuedOn: string; lines: OfferLineInput[] },
) {
  const issuedOn = parseIssuedOn(input.issuedOn);
  const lines = normalizedLines(input.lines);
  const totals = offerTotals(lines);

  return db.transaction(async (tx) => {
    const [eventRow] = await tx
      .select()
      .from(eventTable)
      .where(eq(eventTable.id, eventId));
    if (!eventRow) {
      throw new Error("event not found");
    }

    const [existing] = await tx
      .select()
      .from(offer)
      .where(eq(offer.eventId, eventId));

    const taken = (
      await tx.select({ id: offer.id, number: offer.number }).from(offer)
    )
      .filter((row) => row.id !== existing?.id)
      .map((row) => row.number);
    const number = nextOfferNumber(issuedOn, taken, existing?.number ?? null);

    let offerRow;
    if (existing) {
      await tx.delete(offerLine).where(eq(offerLine.offerId, existing.id));
      const [updated] = await tx
        .update(offer)
        .set({
          number,
          issuedOn,
          netCents: totals.netCents,
          vatCents: totals.vatCents,
          grossCents: totals.grossCents,
          updatedAt: new Date(),
        })
        .where(eq(offer.id, existing.id))
        .returning();
      if (!updated) {
        throw new Error("offer update returned no row");
      }
      offerRow = updated;
    } else {
      const [inserted] = await tx
        .insert(offer)
        .values({
          eventId,
          number,
          issuedOn,
          netCents: totals.netCents,
          vatCents: totals.vatCents,
          grossCents: totals.grossCents,
        })
        .returning();
      if (!inserted) {
        throw new Error("offer insert returned no row");
      }
      offerRow = inserted;
    }

    await tx.insert(offerLine).values(
      lines.map((line, index) => ({
        offerId: offerRow.id,
        position: index + 1,
        description: line.description,
        quantity: line.quantity,
        unitNetCents: line.unitNetCents,
      })),
    );

    await tx
      .update(eventTable)
      .set({ quotedNetCents: totals.netCents })
      .where(eq(eventTable.id, eventId));

    return offerRow;
  });
}

export async function getOfferForEvent(db: AppSession, eventId: string) {
  const [eventRow] = await db
    .select()
    .from(eventTable)
    .where(eq(eventTable.id, eventId));
  if (!eventRow) {
    return null;
  }
  const [offerRow] = await db
    .select()
    .from(offer)
    .where(eq(offer.eventId, eventId));
  if (!offerRow) {
    return null;
  }
  const lines = await db
    .select()
    .from(offerLine)
    .where(eq(offerLine.offerId, offerRow.id))
    .orderBy(asc(offerLine.position));
  return { ...offerRow, lines, event: eventRow };
}

export type OfferWithEvent = NonNullable<
  Awaited<ReturnType<typeof getOfferForEvent>>
>;

export type OfferPdfSource = {
  number: string;
  issuedOn: string;
  netCents: number;
  vatCents: number;
  grossCents: number;
  lines: Array<{
    description: string;
    quantity: number;
    unitNetCents: number;
  }>;
  event: {
    coupleAName: string;
    coupleBName: string;
    eventDate: string | null;
  };
};

export function offerPdfModel(record: OfferPdfSource): BelegPdfModel {
  return {
    heading: `Angebot ${record.number}`,
    number: record.number,
    issuedOnLabel: formatCalendarDate(record.issuedOn),
    coupleNames: belegCoupleNames(
      record.event.coupleAName,
      record.event.coupleBName,
    ),
    eventDateLabel: record.event.eventDate
      ? formatCalendarDate(record.event.eventDate)
      : null,
    locationName: BELEG_SENDER.venue,
    locationWindow: bookedLocationWindowCopy(),
    lines: record.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitNetCents: line.unitNetCents,
      netCents: line.quantity * line.unitNetCents,
    })),
    netCents: record.netCents,
    vatCents: record.vatCents,
    grossCents: record.grossCents,
    vatPercent: 19,
    terms: OFFER_BELEG_TERMS,
    sender: BELEG_SENDER,
  };
}

export type OfferPdfModel = BelegPdfModel;
