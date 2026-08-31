"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { APPOINTMENT_KINDS, EVENT_SOURCES, EVENT_STATUSES } from "@/db/schema";
import {
  schedulePlanning,
  scheduleViewing,
} from "@/domain/calendar";
import { CalendarConflictError } from "@/domain/errors";
import { GUEST_COUNT_LOCKED_COPY, updateGuestCount, updateEventContact } from "@/domain/eventakte";
import {
  changeInquiryStatus,
  createInquiry,
  setReservedUntil,
  updateEventNote,
} from "@/domain/inquiry";
import { parseDateTimeLocal } from "@/lib/timezone";
import { parseEuroToCents } from "@/domain/money";
import { saveOffer } from "@/domain/offer";

export type InquiryFormState = {
  error?: string;
};

const createInquirySchema = z.object({
  coupleAName: z.string().trim().min(1, "Bitte beide Namen angeben."),
  coupleBName: z.string().trim().min(1, "Bitte beide Namen angeben."),
  eventDate: z.string().optional(),
  guestCount: z.string().optional(),
  source: z.enum(EVENT_SOURCES),
  note: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
});

const changeStatusSchema = z.object({
  id: z.string().uuid("Ungültige Anfrage."),
  status: z.enum(EVENT_STATUSES),
  lostReason: z.string().optional(),
});

const eventIdSchema = z.object({
  id: z.string().uuid("Ungültige Anfrage."),
});

const guestCountSchema = eventIdSchema.extend({
  guestCount: z.string().optional(),
});

const contactSchema = eventIdSchema.extend({
  email: z.string().optional(),
  phone: z.string().optional(),
});

const noteSchema = eventIdSchema.extend({
  note: z.string().optional(),
});

const reservedUntilSchema = eventIdSchema.extend({
  reservedUntil: z.string().optional(),
});

const saveOfferSchema = eventIdSchema.extend({
  issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte ein Datum angeben."),
});

const appointmentSchema = eventIdSchema.extend({
  kind: z.enum(APPOINTMENT_KINDS),
  start: z.string().trim().min(1, "Bitte einen Beginn angeben."),
  end: z.string().optional(),
});

function parseOptionalDate(raw: string | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (!value) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("invalid date");
  }
  return value;
}

function parseOptionalGuests(raw: string | undefined): number | null {
  const value = raw?.trim() ?? "";
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("invalid guests");
  }
  return parsed;
}

function revalidateEventakte(id: string) {
  revalidatePath("/anfragen");
  revalidatePath(`/anfragen/${id}`);
}

function germanDomainError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (error instanceof CalendarConflictError || message.includes("calendar_block")) {
    return "Dieser Termin überschneidet sich mit einem bestehenden Kalenderblock.";
  }
  if (message.includes("guest_count locked")) {
    return GUEST_COUNT_LOCKED_COPY;
  }
  if (message.includes("lost_reason")) {
    return "Bitte einen Grund angeben, wenn die Anfrage verloren ist.";
  }
  if (message.includes("couple names")) {
    return "Bitte beide Namen angeben.";
  }
  if (message.includes("email or phone")) {
    return "Bitte E-Mail oder Telefon angeben.";
  }
  if (message.includes("guest_count")) {
    return "Die Gästezahl muss eine ganze Zahl ab 0 sein.";
  }
  if (message.includes("planning period")) {
    return "Das Planungsende muss nach dem Beginn liegen.";
  }
  if (message.includes("invalid datetime")) {
    return "Datum oder Uhrzeit ist ungültig.";
  }
  if (message.includes("offer lines required")) {
    return "Bitte mindestens eine Position angeben.";
  }
  if (message.includes("offer line description")) {
    return "Bitte eine Beschreibung für jede Position angeben.";
  }
  if (message.includes("quantity")) {
    return "Die Menge muss eine ganze Zahl ab 1 sein.";
  }
  if (message.includes("integer cents") || message.includes("invalid euro")) {
    return "Bitte Beträge als Euro angeben.";
  }
  if (message.includes("invalid calendar date")) {
    return "Das Ausstellungsdatum ist ungültig.";
  }
  return "Die Anfrage konnte nicht gespeichert werden.";
}

export async function createInquiryAction(
  _prev: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  const parsed = createInquirySchema.safeParse({
    coupleAName: formData.get("coupleAName"),
    coupleBName: formData.get("coupleBName"),
    eventDate: String(formData.get("eventDate") ?? ""),
    guestCount: String(formData.get("guestCount") ?? ""),
    source: formData.get("source") || "manual",
    note: String(formData.get("note") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen.",
    };
  }

  let eventDate: string | null;
  let guestCount: number | null;
  try {
    eventDate = parseOptionalDate(parsed.data.eventDate);
    guestCount = parseOptionalGuests(parsed.data.guestCount);
  } catch {
    return { error: "Datum oder Gästezahl ist ungültig." };
  }

  try {
    await createInquiry(db, {
      coupleAName: parsed.data.coupleAName,
      coupleBName: parsed.data.coupleBName,
      eventDate,
      guestCount,
      source: parsed.data.source,
      note: parsed.data.note,
      email: parsed.data.email,
      phone: parsed.data.phone,
    });
  } catch (error) {
    return { error: germanDomainError(error) };
  }

  revalidatePath("/anfragen");
  redirect("/anfragen");
}

export async function changeInquiryStatusAction(
  _prev: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  const parsed = changeStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    lostReason: String(formData.get("lostReason") ?? ""),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen.",
    };
  }

  try {
    await changeInquiryStatus(
      db,
      parsed.data.id,
      parsed.data.status,
      parsed.data.lostReason,
    );
  } catch (error) {
    return { error: germanDomainError(error) };
  }

  revalidateEventakte(parsed.data.id);
  redirect(`/anfragen/${parsed.data.id}`);
}

export async function updateGuestCountAction(
  _prev: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  const parsed = guestCountSchema.safeParse({
    id: formData.get("id"),
    guestCount: String(formData.get("guestCount") ?? ""),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen.",
    };
  }

  let guestCount: number | null;
  try {
    guestCount = parseOptionalGuests(parsed.data.guestCount);
  } catch {
    return { error: "Die Gästezahl muss eine ganze Zahl ab 0 sein." };
  }

  try {
    await updateGuestCount(db, parsed.data.id, guestCount, { now: new Date() });
  } catch (error) {
    return { error: germanDomainError(error) };
  }

  revalidateEventakte(parsed.data.id);
  return {};
}

export async function updateEventContactAction(
  _prev: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  const parsed = contactSchema.safeParse({
    id: formData.get("id"),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen.",
    };
  }

  try {
    await updateEventContact(db, parsed.data.id, {
      email: parsed.data.email,
      phone: parsed.data.phone,
    });
  } catch (error) {
    return { error: germanDomainError(error) };
  }

  revalidateEventakte(parsed.data.id);
  return {};
}

export async function updateNoteAction(
  _prev: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  const parsed = noteSchema.safeParse({
    id: formData.get("id"),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen.",
    };
  }

  try {
    await updateEventNote(db, parsed.data.id, parsed.data.note ?? null);
  } catch (error) {
    return { error: germanDomainError(error) };
  }

  revalidateEventakte(parsed.data.id);
  return {};
}

export async function setReservedUntilAction(
  _prev: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  const parsed = reservedUntilSchema.safeParse({
    id: formData.get("id"),
    reservedUntil: String(formData.get("reservedUntil") ?? ""),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen.",
    };
  }

  const raw = parsed.data.reservedUntil?.trim() ?? "";
  let reservedUntil: Date | null = null;
  if (raw) {
    try {
      reservedUntil = parseDateTimeLocal(raw);
    } catch {
      return { error: "Datum oder Uhrzeit ist ungültig." };
    }
  }

  try {
    await setReservedUntil(db, parsed.data.id, reservedUntil, {
      now: new Date(),
    });
  } catch (error) {
    return { error: germanDomainError(error) };
  }

  revalidateEventakte(parsed.data.id);
  return {};
}

export async function createAppointmentAction(
  _prev: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  const parsed = appointmentSchema.safeParse({
    id: formData.get("id"),
    kind: formData.get("kind"),
    start: String(formData.get("start") ?? ""),
    end: String(formData.get("end") ?? ""),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen.",
    };
  }

  let start: Date;
  try {
    start = parseDateTimeLocal(parsed.data.start);
  } catch {
    return { error: "Datum oder Uhrzeit ist ungültig." };
  }

  try {
    if (parsed.data.kind === "viewing") {
      await scheduleViewing(db, { eventId: parsed.data.id, start });
    } else {
      const endRaw = parsed.data.end?.trim() ?? "";
      if (!endRaw) {
        return { error: "Bitte ein Ende für die Planung angeben." };
      }
      const end = parseDateTimeLocal(endRaw);
      await schedulePlanning(db, {
        eventId: parsed.data.id,
        start,
        end,
      });
    }
  } catch (error) {
    return { error: germanDomainError(error) };
  }

  revalidateEventakte(parsed.data.id);
  return {};
}

export async function saveOfferAction(
  _prev: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  const parsed = saveOfferSchema.safeParse({
    id: formData.get("id"),
    issuedOn: String(formData.get("issuedOn") ?? ""),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen.",
    };
  }

  const descriptions = formData.getAll("description").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const unitNets = formData.getAll("unitNet").map(String);
  const count = Math.max(
    descriptions.length,
    quantities.length,
    unitNets.length,
  );

  const lines = [];
  for (let index = 0; index < count; index += 1) {
    const description = descriptions[index]?.trim() ?? "";
    const quantityRaw = quantities[index]?.trim() ?? "";
    const unitRaw = unitNets[index]?.trim() ?? "";
    if (!description && !quantityRaw && !unitRaw) {
      continue;
    }
    let quantity: number;
    let unitNetCents: number;
    try {
      quantity = Number(quantityRaw);
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error("quantity must be a positive integer");
      }
      unitNetCents = parseEuroToCents(unitRaw);
    } catch (error) {
      return { error: germanDomainError(error) };
    }
    lines.push({ description, quantity, unitNetCents });
  }

  try {
    await saveOffer(db, parsed.data.id, {
      issuedOn: parsed.data.issuedOn,
      lines,
    });
  } catch (error) {
    return { error: germanDomainError(error) };
  }

  revalidateEventakte(parsed.data.id);
  return {};
}
