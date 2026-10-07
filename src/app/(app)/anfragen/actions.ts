"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { EVENT_SOURCES, EVENT_STATUSES } from "@/db/schema";
import { changeInquiryStatus, createInquiry } from "@/domain/inquiry";

export type InquiryFormState = {
  error?: string;
};

const createInquirySchema = z.object({
  coupleAName: z.string().trim().min(1, "Bitte Name A angeben."),
  coupleBName: z.string().trim().min(1, "Bitte Name B angeben."),
  eventDate: z.string().optional(),
  guestCount: z.string().optional(),
  source: z.enum(EVENT_SOURCES),
  note: z.string().optional(),
});

const changeStatusSchema = z.object({
  id: z.string().uuid("Ungültige Anfrage."),
  status: z.enum(EVENT_STATUSES),
  lostReason: z.string().optional(),
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

function germanDomainError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("lost_reason")) {
    return "Bitte einen Grund angeben, wenn die Anfrage verloren ist.";
  }
  if (message.includes("couple names")) {
    return "Bitte beide Namen angeben.";
  }
  if (message.includes("guest_count")) {
    return "Die Gästezahl muss eine ganze Zahl ab 0 sein.";
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

  revalidatePath("/anfragen");
  revalidatePath(`/anfragen/${parsed.data.id}`);
  redirect("/anfragen");
}
