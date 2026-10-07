import { and, eq } from "drizzle-orm";
import {
  calendarBlock,
  event as eventTable,
  type EventStatus,
} from "@/db/schema";
import type { AppDb, AppSession } from "@/db/types";

export type CreateEventInput = {
  coupleAName: string;
  coupleBName: string;
  status?: EventStatus;
  lostReason?: string | null;
  reservedUntil?: Date | null;
  guestCount?: number | null;
  quotedNetCents?: number | null;
  eventDate?: string | null;
};

export async function createEvent(db: AppSession, input: CreateEventInput) {
  const [row] = await db
    .insert(eventTable)
    .values({
      coupleAName: input.coupleAName,
      coupleBName: input.coupleBName,
      status: input.status ?? "new",
      lostReason: input.lostReason ?? null,
      reservedUntil: input.reservedUntil ?? null,
      guestCount: input.guestCount ?? null,
      quotedNetCents: input.quotedNetCents ?? null,
      eventDate: input.eventDate ?? null,
    })
    .returning();
  if (!row) {
    throw new Error("event insert returned no row");
  }
  return row;
}

export async function markLost(db: AppDb, eventId: string, reason: string) {
  const lostReason = reason.trim();
  if (!lostReason) {
    throw new Error("lost_reason required when status is lost");
  }
  await db.transaction(async (tx) => {
    await tx
      .update(eventTable)
      .set({
        status: "lost",
        lostReason,
        reservedUntil: null,
      })
      .where(eq(eventTable.id, eventId));
    await tx
      .delete(calendarBlock)
      .where(
        and(
          eq(calendarBlock.eventId, eventId),
          eq(calendarBlock.source, "reserved"),
        ),
      );
  });
}
