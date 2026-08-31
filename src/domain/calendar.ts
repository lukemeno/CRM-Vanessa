import { and, asc, eq } from "drizzle-orm";
import {
  appointment,
  calendarBlock,
  event as eventTable,
  type AppointmentKind,
} from "@/db/schema";
import type { AppDb, AppSession } from "@/db/types";
import type { TstzRange } from "@/db/tstzrange";
import { throwIfCalendarConflict } from "@/domain/errors";
import { APP_TIMEZONE, addCalendarDays, zonedInstant } from "@/lib/timezone";

export const VIEWING_DURATION_MS = 60 * 60 * 1000;
export const VIEWING_BUFFER_AFTER_MS = 30 * 60 * 1000;

export const APPOINTMENT_KIND_LABELS: Record<AppointmentKind, string> = {
  viewing: "Besichtigung",
  planning: "Planung",
};

/** Venue occupation for a booked Saturday. Not a settings row. */
export const BOOKED_WEEKEND = {
  startWeekday: "friday",
  startHour: 11,
  endWeekday: "sunday",
  endHour: 11,
  timeZone: APP_TIMEZONE,
} as const;

export function bookedWeekendPeriod(saturdayYmd: string): TstzRange {
  const friday = addCalendarDays(saturdayYmd, -1);
  const sunday = addCalendarDays(saturdayYmd, 1);
  return {
    start: zonedInstant(
      friday,
      BOOKED_WEEKEND.startHour,
      0,
      BOOKED_WEEKEND.timeZone,
    ),
    end: zonedInstant(
      sunday,
      BOOKED_WEEKEND.endHour,
      0,
      BOOKED_WEEKEND.timeZone,
    ),
  };
}

export function viewingAppointmentPeriod(start: Date): TstzRange {
  return {
    start,
    end: new Date(start.getTime() + VIEWING_DURATION_MS),
  };
}

export function viewingCalendarBlockPeriod(start: Date): TstzRange {
  return {
    start,
    end: new Date(
      start.getTime() + VIEWING_DURATION_MS + VIEWING_BUFFER_AFTER_MS,
    ),
  };
}

export function planningBlockPeriod(period: TstzRange): TstzRange {
  return period;
}

async function insertBlockingRow(
  db: AppSession,
  values: typeof calendarBlock.$inferInsert,
) {
  try {
    const [row] = await db.insert(calendarBlock).values(values).returning();
    if (!row) {
      throw new Error("calendar_block insert returned no row");
    }
    return row;
  } catch (error) {
    throwIfCalendarConflict(error);
  }
}

async function deleteReservedBlocks(db: AppSession, eventId: string) {
  await db
    .delete(calendarBlock)
    .where(
      and(
        eq(calendarBlock.eventId, eventId),
        eq(calendarBlock.source, "reserved"),
      ),
    );
}

export async function bookSaturday(
  db: AppDb,
  eventId: string,
  saturdayYmd: string,
) {
  await db.transaction(async (tx) => {
    await deleteReservedBlocks(tx, eventId);
    await insertBlockingRow(tx, {
      eventId,
      period: bookedWeekendPeriod(saturdayYmd),
      blocksCalendar: true,
      source: "booked",
    });
    await tx
      .update(eventTable)
      .set({
        status: "booked",
        reservedUntil: null,
        eventDate: saturdayYmd,
      })
      .where(eq(eventTable.id, eventId));
  });
}

export async function scheduleViewing(
  db: AppDb,
  input: { eventId: string; start: Date },
) {
  return db.transaction(async (tx) => {
    const period = viewingAppointmentPeriod(input.start);
    const [row] = await tx
      .insert(appointment)
      .values({
        eventId: input.eventId,
        kind: "viewing",
        period,
      })
      .returning();
    if (!row) {
      throw new Error("appointment insert returned no row");
    }
    const block = await insertBlockingRow(tx, {
      eventId: input.eventId,
      appointmentId: row.id,
      period: viewingCalendarBlockPeriod(input.start),
      blocksCalendar: true,
      source: "viewing",
    });
    return { appointment: row, block };
  });
}

export async function schedulePlanning(
  db: AppDb,
  input: { eventId: string; start: Date; end: Date },
) {
  if (!(input.end.getTime() > input.start.getTime())) {
    throw new Error("planning period requires end after start");
  }
  return db.transaction(async (tx) => {
    const period = planningBlockPeriod({ start: input.start, end: input.end });
    const [row] = await tx
      .insert(appointment)
      .values({
        eventId: input.eventId,
        kind: "planning",
        period,
      })
      .returning();
    if (!row) {
      throw new Error("appointment insert returned no row");
    }
    const block = await insertBlockingRow(tx, {
      eventId: input.eventId,
      appointmentId: row.id,
      period,
      blocksCalendar: true,
      source: "planning",
    });
    return { appointment: row, block };
  });
}

function holdIsActive(reservedUntil: Date | null, now: Date): boolean {
  return reservedUntil !== null && reservedUntil.getTime() > now.getTime();
}

export async function holdOfferWeekend(
  db: AppDb,
  eventId: string,
  saturdayYmd: string,
  opts: { now: Date },
) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(eventTable)
      .where(eq(eventTable.id, eventId));
    if (!holdIsActive(row?.reservedUntil ?? null, opts.now)) {
      await deleteReservedBlocks(tx, eventId);
      return;
    }
    await deleteReservedBlocks(tx, eventId);
    await insertBlockingRow(tx, {
      eventId,
      period: bookedWeekendPeriod(saturdayYmd),
      blocksCalendar: true,
      source: "reserved",
    });
  });
}

export async function expireOfferHold(
  db: AppDb,
  eventId: string,
  opts: { now: Date },
) {
  const [row] = await db
    .select()
    .from(eventTable)
    .where(eq(eventTable.id, eventId));
  if (!holdIsActive(row?.reservedUntil ?? null, opts.now)) {
    await deleteReservedBlocks(db, eventId);
  }
}

export async function listAppointments(db: AppSession, eventId: string) {
  return db
    .select()
    .from(appointment)
    .where(eq(appointment.eventId, eventId))
    .orderBy(asc(appointment.createdAt));
}
