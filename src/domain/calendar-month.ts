import { eq, inArray, isNotNull, sql } from "drizzle-orm";
import {
  calendarBlock,
  event as eventTable,
  invoice,
  offer,
  type CalendarBlockSource,
  type EventStatus,
} from "@/db/schema";
import type { TstzRange } from "@/db/tstzrange";
import type { AppSession } from "@/db/types";
import { remainingGrossCents } from "@/domain/invoice";
import {
  addCalendarDays,
  calendarYmd,
  formatBerlinTime,
  zonedInstant,
} from "@/lib/timezone";

export const CALENDAR_ITEM_KINDS = [
  "viewing",
  "planning",
  "booked",
  "blocked",
  "task",
] as const;
export type CalendarItemKind = (typeof CALENDAR_ITEM_KINDS)[number];

export const CALENDAR_ITEM_LABELS: Record<CalendarItemKind, string> = {
  viewing: "Besichtigung",
  planning: "Planung",
  booked: "Gebucht",
  blocked: "Blockiert",
  task: "Aufgabe",
};

export const WEEKDAY_HEADERS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

export const INVOICE_TASK_DAYS_AFTER_EVENT = 2;

export type CalendarChip = {
  eventId: string;
  href: string;
  kind: CalendarItemKind;
  title: string;
  timeLabel: string | null;
  ymd: string;
};

export function eventakteHref(eventId: string): string {
  return `/anfragen/${eventId}`;
}

export function coupleTitle(coupleAName: string, coupleBName: string): string {
  return `${coupleAName} & ${coupleBName}`;
}

export function calendarKindFromSource(
  source: CalendarBlockSource,
): Exclude<CalendarItemKind, "task"> {
  if (source === "reserved") {
    return "blocked";
  }
  return source;
}

export function parseYearMonth(
  raw: string | undefined | null,
  now: Date,
): string {
  if (raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) {
    return raw;
  }
  return calendarYmd(now).slice(0, 7);
}

export function addYearMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatYearMonthHeading(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function isSaturdayYmd(ymd: string): boolean {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 6;
}

export function monthWeeks(yearMonth: string): string[][] {
  const first = `${yearMonth}-01`;
  const [year, month, day] = first.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  let cursor = addCalendarDays(first, -mondayOffset);
  const weeks: string[][] = [];
  for (let week = 0; week < 6; week += 1) {
    const days: string[] = [];
    for (let dow = 0; dow < 7; dow += 1) {
      days.push(cursor);
      cursor = addCalendarDays(cursor, 1);
    }
    weeks.push(days);
  }
  return weeks;
}

export function monthGridRange(yearMonth: string): TstzRange {
  const weeks = monthWeeks(yearMonth);
  const startYmd = weeks[0]?.[0];
  const endYmd = weeks[weeks.length - 1]?.[6];
  if (!startYmd || !endYmd) {
    throw new Error(`invalid year month: ${yearMonth}`);
  }
  return {
    start: zonedInstant(startYmd, 0, 0),
    end: zonedInstant(addCalendarDays(endYmd, 1), 0, 0),
  };
}

export function daysOverlappingPeriod(period: TstzRange): string[] {
  const startYmd = calendarYmd(period.start);
  const endYmd = calendarYmd(period.end);
  const endsOnDayStart =
    zonedInstant(endYmd, 0, 0).getTime() === period.end.getTime();
  const lastYmd = endsOnDayStart ? addCalendarDays(endYmd, -1) : endYmd;
  if (lastYmd < startYmd) {
    return [startYmd];
  }
  const days: string[] = [];
  let cursor = startYmd;
  while (cursor <= lastYmd) {
    days.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return days;
}

export function invoiceTaskYmd(eventDate: string): string {
  return addCalendarDays(eventDate, INVOICE_TASK_DAYS_AFTER_EVENT);
}

export function shouldShowInvoiceTask(opts: {
  status: EventStatus;
  remainingGrossCents: number | null;
}): boolean {
  if (opts.remainingGrossCents == null || opts.remainingGrossCents <= 0) {
    return false;
  }
  return (
    opts.status === "booked" ||
    opts.status === "planning" ||
    opts.status === "done"
  );
}

export function chipsOnDay(chips: CalendarChip[], ymd: string): CalendarChip[] {
  return chips.filter((chip) => chip.ymd === ymd);
}

function timeLabelForBlock(
  kind: Exclude<CalendarItemKind, "task">,
  period: TstzRange,
): string | null {
  if (kind === "viewing") {
    return formatBerlinTime(period.start);
  }
  if (kind === "planning") {
    return `${formatBerlinTime(period.start)}–${formatBerlinTime(period.end)}`;
  }
  return null;
}

function periodOverlaps(a: TstzRange, b: TstzRange): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

async function remainingGrossByEvent(
  db: AppSession,
  eventIds: string[],
): Promise<Map<string, number | null>> {
  const map = new Map<string, number | null>();
  for (const id of eventIds) {
    map.set(id, null);
  }
  if (eventIds.length === 0) {
    return map;
  }
  const offers = await db
    .select()
    .from(offer)
    .where(inArray(offer.eventId, eventIds));
  const invoices = await db
    .select()
    .from(invoice)
    .where(inArray(invoice.eventId, eventIds));
  const invoicesByEvent = new Map<string, typeof invoices>();
  for (const row of invoices) {
    const list = invoicesByEvent.get(row.eventId) ?? [];
    list.push(row);
    invoicesByEvent.set(row.eventId, list);
  }
  for (const row of offers) {
    map.set(
      row.eventId,
      remainingGrossCents(row.grossCents, invoicesByEvent.get(row.eventId) ?? []),
    );
  }
  return map;
}

export async function listMonthChips(
  db: AppSession,
  yearMonth: string,
): Promise<CalendarChip[]> {
  const window = monthGridRange(yearMonth);
  const weeks = monthWeeks(yearMonth);
  const gridStart = weeks[0]?.[0];
  const gridEnd = weeks[weeks.length - 1]?.[6];
  if (!gridStart || !gridEnd) {
    throw new Error(`invalid year month: ${yearMonth}`);
  }

  const blockRows = await db
    .select({
      eventId: calendarBlock.eventId,
      source: calendarBlock.source,
      period: calendarBlock.period,
      coupleAName: eventTable.coupleAName,
      coupleBName: eventTable.coupleBName,
    })
    .from(calendarBlock)
    .innerJoin(eventTable, eq(calendarBlock.eventId, eventTable.id))
    .where(
      sql`lower(${calendarBlock.period}) < ${window.end.toISOString()}::timestamptz
          and upper(${calendarBlock.period}) > ${window.start.toISOString()}::timestamptz`,
    );

  const chips: CalendarChip[] = [];
  for (const row of blockRows) {
    if (!periodOverlaps(row.period, window)) {
      continue;
    }
    const kind = calendarKindFromSource(row.source);
    const title = coupleTitle(row.coupleAName, row.coupleBName);
    const timeLabel = timeLabelForBlock(kind, row.period);
    for (const ymd of daysOverlappingPeriod(row.period)) {
      if (ymd < gridStart || ymd > gridEnd) {
        continue;
      }
      chips.push({
        eventId: row.eventId,
        href: eventakteHref(row.eventId),
        kind,
        title,
        timeLabel,
        ymd,
      });
    }
  }

  const candidates = await db
    .select()
    .from(eventTable)
    .where(isNotNull(eventTable.eventDate));
  const remaining = await remainingGrossByEvent(
    db,
    candidates.map((row) => row.id),
  );
  for (const row of candidates) {
    if (!row.eventDate) {
      continue;
    }
    const due = invoiceTaskYmd(row.eventDate);
    if (due < gridStart || due > gridEnd) {
      continue;
    }
    if (
      !shouldShowInvoiceTask({
        status: row.status,
        remainingGrossCents: remaining.get(row.id) ?? null,
      })
    ) {
      continue;
    }
    chips.push({
      eventId: row.id,
      href: eventakteHref(row.id),
      kind: "task",
      title: coupleTitle(row.coupleAName, row.coupleBName),
      timeLabel: "Rechnung",
      ymd: due,
    });
  }

  const kindOrder = new Map(
    CALENDAR_ITEM_KINDS.map((kind, index) => [kind, index]),
  );
  chips.sort((a, b) => {
    if (a.ymd !== b.ymd) {
      return a.ymd.localeCompare(b.ymd);
    }
    return (kindOrder.get(a.kind) ?? 0) - (kindOrder.get(b.kind) ?? 0);
  });
  return chips;
}
