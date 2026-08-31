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
import { bookSaturday, expireOfferHold, holdOfferWeekend } from "@/domain/calendar";
import { isSaturdayYmd } from "@/domain/calendar-month";

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  new: "Neu",
  viewing: "Besichtigung",
  offer: "Angebot",
  booked: "Gebucht",
  planning: "Planung",
  done: "Erledigt",
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
  email?: string | null;
  phone?: string | null;
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

/** One-line Verloren card copy: the reason text itself, otherwise nothing. */
export function boardLostReason(
  inquiry: Pick<Inquiry, "status" | "lostReason">,
): string | null {
  if (inquiry.status !== "lost") {
    return null;
  }
  return emptyToNull(inquiry.lostReason);
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

  const email = emptyToNull(input.email);
  const phone = emptyToNull(input.phone);
  if (!email && !phone) {
    throw new Error("email or phone required");
  }

  return createEvent(db, {
    coupleAName,
    coupleBName,
    status: "new",
    eventDate: emptyToNull(input.eventDate),
    guestCount,
    source,
    note: emptyToNull(input.note),
    email,
    phone,
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
  const current = await getInquiry(db, eventId);
  if (!current) {
    throw new Error("event not found");
  }
  if (
    status === "booked" &&
    current.status !== "booked" &&
    current.eventDate &&
    isSaturdayYmd(current.eventDate)
  ) {
    await bookSaturday(db, eventId, current.eventDate);
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

export async function updateEventNote(
  db: AppSession,
  eventId: string,
  note: string | null,
) {
  const [updated] = await db
    .update(eventTable)
    .set({ note: emptyToNull(note) })
    .where(eq(eventTable.id, eventId))
    .returning();
  if (!updated) {
    throw new Error("event not found");
  }
  return updated;
}

export async function setReservedUntil(
  db: AppDb,
  eventId: string,
  reservedUntil: Date | null,
  opts: { now: Date },
) {
  const [updated] = await db
    .update(eventTable)
    .set({ reservedUntil })
    .where(eq(eventTable.id, eventId))
    .returning();
  if (!updated) {
    throw new Error("event not found");
  }
  if (updated.eventDate) {
    await holdOfferWeekend(db, eventId, updated.eventDate, opts);
  } else {
    await expireOfferHold(db, eventId, opts);
  }
  return updated;
}
