import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import {
  appointment,
  event as eventTable,
  invoice,
  offer,
} from "@/db/schema";
import type { AppSession } from "@/db/types";
import { APPOINTMENT_KIND_LABELS } from "@/domain/calendar";
import {
  coupleTitle,
  eventakteHref,
  invoiceTaskYmd,
  shouldShowInvoiceTask,
} from "@/domain/calendar-month";
import { remainingGrossCents } from "@/domain/invoice";
import { formatEuroFromCents } from "@/domain/money";
import {
  addCalendarDays,
  calendarYmd,
  formatBerlinTime,
  formatCalendarDate,
  zonedInstant,
} from "@/lib/timezone";

export type HeuteItem = {
  href: string;
  title: string;
  detail: string | null;
  calendarHref?: string;
  boardHref?: string;
};

export type HeuteModel = {
  appointments: HeuteItem[];
  nextEvents: HeuteItem[];
  unpaid: HeuteItem[];
  newInquiries: HeuteItem[];
};

function monthHref(ymd: string): string {
  return `/kalender?month=${ymd.slice(0, 7)}`;
}

export async function loadHeute(
  db: AppSession,
  now: Date,
): Promise<HeuteModel> {
  const today = calendarYmd(now);
  const dayStart = zonedInstant(today, 0, 0);
  const dayEnd = zonedInstant(addCalendarDays(today, 1), 0, 0);

  const appointmentRows = await db
    .select({
      eventId: appointment.eventId,
      kind: appointment.kind,
      period: appointment.period,
      coupleAName: eventTable.coupleAName,
      coupleBName: eventTable.coupleBName,
    })
    .from(appointment)
    .innerJoin(eventTable, eq(appointment.eventId, eventTable.id))
    .where(
      sql`lower(${appointment.period}) < ${dayEnd.toISOString()}::timestamptz
          and upper(${appointment.period}) > ${dayStart.toISOString()}::timestamptz`,
    );

  const appointments: HeuteItem[] = appointmentRows.map((row) => ({
    href: eventakteHref(row.eventId),
    title: coupleTitle(row.coupleAName, row.coupleBName),
    detail: `${APPOINTMENT_KIND_LABELS[row.kind]} · ${formatBerlinTime(row.period.start)}`,
    calendarHref: monthHref(today),
  }));

  const datedEvents = await db
    .select()
    .from(eventTable)
    .where(and(ne(eventTable.status, "lost"), gte(eventTable.eventDate, today)));

  const candidates = await db
    .select()
    .from(eventTable)
    .where(ne(eventTable.status, "lost"));
  const eventIds = candidates.map((row) => row.id);
  const offers =
    eventIds.length === 0
      ? []
      : await db.select().from(offer);
  const invoices =
    eventIds.length === 0
      ? []
      : await db.select().from(invoice);
  const offerByEvent = new Map(offers.map((row) => [row.eventId, row]));
  const invoicesByEvent = new Map<string, typeof invoices>();
  for (const row of invoices) {
    const list = invoicesByEvent.get(row.eventId) ?? [];
    list.push(row);
    invoicesByEvent.set(row.eventId, list);
  }

  for (const row of candidates) {
    if (!row.eventDate) {
      continue;
    }
    if (invoiceTaskYmd(row.eventDate) !== today) {
      continue;
    }
    const offerRow = offerByEvent.get(row.id);
    const remaining = offerRow
      ? remainingGrossCents(
          offerRow.grossCents,
          invoicesByEvent.get(row.id) ?? [],
        )
      : null;
    if (!shouldShowInvoiceTask({ status: row.status, remainingGrossCents: remaining })) {
      continue;
    }
    appointments.push({
      href: eventakteHref(row.id),
      title: coupleTitle(row.coupleAName, row.coupleBName),
      detail: "Aufgabe · Rechnung",
      calendarHref: monthHref(today),
    });
  }

  const nextEvents: HeuteItem[] = datedEvents
    .filter((row) => row.eventDate)
    .sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? ""))
    .map((row) => ({
      href: eventakteHref(row.id),
      title: coupleTitle(row.coupleAName, row.coupleBName),
      detail: row.eventDate ? formatCalendarDate(row.eventDate) : null,
      calendarHref: monthHref(row.eventDate ?? today),
    }));

  const unpaid: HeuteItem[] = [];
  for (const row of candidates) {
    const offerRow = offerByEvent.get(row.id);
    if (!offerRow) {
      continue;
    }
    const remaining = remainingGrossCents(
      offerRow.grossCents,
      invoicesByEvent.get(row.id) ?? [],
    );
    if (remaining <= 0) {
      continue;
    }
    unpaid.push({
      href: eventakteHref(row.id),
      title: coupleTitle(row.coupleAName, row.coupleBName),
      detail: formatEuroFromCents(remaining),
    });
  }

  const newRows = await db
    .select()
    .from(eventTable)
    .where(eq(eventTable.status, "new"))
    .orderBy(desc(eventTable.createdAt));

  const newInquiries: HeuteItem[] = newRows.map((row) => ({
    href: eventakteHref(row.id),
    title: coupleTitle(row.coupleAName, row.coupleBName),
    detail: row.eventDate ? formatCalendarDate(row.eventDate) : null,
    boardHref: "/anfragen",
  }));

  return { appointments, nextEvents, unpaid, newInquiries };
}
