import { desc, eq } from "drizzle-orm";
import {
  EVENT_SOURCES,
  EVENT_STATUSES,
  event as eventTable,
  type EventSource,
  type EventStatus,
} from "@/db/schema";
import type { AppDb, AppSession } from "@/db/types";
import { createEvent, markLost } from "@/domain/event";

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  new: "Neu",
  viewing: "Besichtigung",
  offer: "Angebot",
  booked: "Gebucht",
  planning: "Planung",
  done: "Fertig",
  lost: "Verloren",
};

export const EVENT_SOURCE_LABELS: Record<EventSource, string> = {
  website: "Website",
  bridebook: "Bridebook",
  manual: "Manuell",
  other: "Sonstiges",
};

export type CreateInquiryInput = {
  coupleAName: string;
  coupleBName: string;
  eventDate?: string | null;
  guestCount?: number | null;
  source?: EventSource;
  note?: string | null;
};

export type Inquiry = typeof eventTable.$inferSelect;

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function groupInquiriesByStatus(
  inquiries: Inquiry[],
): Record<EventStatus, Inquiry[]> {
  const grouped = Object.fromEntries(
    EVENT_STATUSES.map((status) => [status, [] as Inquiry[]]),
  ) as Record<EventStatus, Inquiry[]>;

  for (const inquiry of inquiries) {
    grouped[inquiry.status].push(inquiry);
  }

  return grouped;
}

export async function createInquiry(db: AppSession, input: CreateInquiryInput) {
  const coupleAName = input.coupleAName.trim();
  const coupleBName = input.coupleBName.trim();
  if (!coupleAName || !coupleBName) {
    throw new Error("couple names required");
  }

  const source = input.source ?? "manual";
  if (!EVENT_SOURCES.includes(source)) {
    throw new Error("invalid event source");
  }

  const guestCount = input.guestCount ?? null;
  if (guestCount != null && (!Number.isInteger(guestCount) || guestCount < 0)) {
    throw new Error("guest_count must be a non-negative integer");
  }

  return createEvent(db, {
    coupleAName,
    coupleBName,
    status: "new",
    eventDate: emptyToNull(input.eventDate),
    guestCount,
    source,
    note: emptyToNull(input.note),
  });
}

export async function listInquiries(db: AppSession) {
  return db
    .select()
    .from(eventTable)
    .orderBy(desc(eventTable.createdAt));
}

export async function getInquiry(db: AppSession, id: string) {
  const [row] = await db
    .select()
    .from(eventTable)
    .where(eq(eventTable.id, id));
  return row ?? null;
}

export async function changeInquiryStatus(
  db: AppDb,
  eventId: string,
  status: EventStatus,
  lostReason?: string | null,
) {
  if (!EVENT_STATUSES.includes(status)) {
    throw new Error("invalid status");
  }
  if (status === "lost") {
    await markLost(db, eventId, lostReason ?? "");
    return;
  }
  await db
    .update(eventTable)
    .set({
      status,
      lostReason: null,
    })
    .where(eq(eventTable.id, eventId));
}
