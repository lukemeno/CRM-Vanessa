import { eq } from "drizzle-orm";
import { event as eventTable } from "@/db/schema";
import type { AppSession } from "@/db/types";
import { BOOKED_WEEKEND } from "@/domain/calendar";
import {
  addCalendarDays,
  addCalendarMonths,
  calendarYmd,
  formatCalendarDate,
} from "@/lib/timezone";

export const GUEST_COUNT_LOCK_DAYS = 10;
export const STORNO_FULL_REFUND_MONTHS = 3;

export const GUEST_COUNT_LOCKED_COPY =
  "Die Gästezahl kann bis 10 Tage vor dem Event geändert werden. Danach ist sie fest.";

const WEEKDAY_SHORT_DE: Record<string, string> = {
  monday: "Mo",
  tuesday: "Di",
  wednesday: "Mi",
  thursday: "Do",
  friday: "Fr",
  saturday: "Sa",
  sunday: "So",
};

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** Venue occupation copy from BOOKED_WEEKEND, not a settings row. */
export function bookedLocationWindowCopy(): string {
  const startDay =
    WEEKDAY_SHORT_DE[BOOKED_WEEKEND.startWeekday] ?? BOOKED_WEEKEND.startWeekday;
  const endDay =
    WEEKDAY_SHORT_DE[BOOKED_WEEKEND.endWeekday] ?? BOOKED_WEEKEND.endWeekday;
  return `${startDay} ${hourLabel(BOOKED_WEEKEND.startHour)} bis ${endDay} ${hourLabel(BOOKED_WEEKEND.endHour)}`;
}

export function guestCountLockOn(eventDate: string): string {
  return addCalendarDays(eventDate, -GUEST_COUNT_LOCK_DAYS);
}

export function isGuestCountLocked(
  eventDate: string | null,
  now: Date,
): boolean {
  if (!eventDate) {
    return false;
  }
  return calendarYmd(now) >= guestCountLockOn(eventDate);
}

export function stornoCutoffOn(eventDate: string): string {
  return addCalendarMonths(eventDate, -STORNO_FULL_REFUND_MONTHS);
}

export function isFullRefundUntil(eventDate: string, now: Date): boolean {
  return calendarYmd(now) <= stornoCutoffOn(eventDate);
}

export function stornoWindowCopy(eventDate: string): string {
  return `Volle Rückerstattung bis ${formatCalendarDate(stornoCutoffOn(eventDate))}. Danach bleibt die Anzahlung.`;
}

export async function updateGuestCount(
  db: AppSession,
  eventId: string,
  guestCount: number | null,
  opts: { now: Date },
) {
  const [row] = await db
    .select()
    .from(eventTable)
    .where(eq(eventTable.id, eventId));
  if (!row) {
    throw new Error("event not found");
  }
  if (isGuestCountLocked(row.eventDate, opts.now)) {
    throw new Error("guest_count locked");
  }
  if (guestCount != null && (!Number.isInteger(guestCount) || guestCount < 0)) {
    throw new Error("guest_count must be a non-negative integer");
  }
  const [updated] = await db
    .update(eventTable)
    .set({ guestCount })
    .where(eq(eventTable.id, eventId))
    .returning();
  if (!updated) {
    throw new Error("event not found");
  }
  return updated;
}
