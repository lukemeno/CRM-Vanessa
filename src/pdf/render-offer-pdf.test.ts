import { describe, expect, it } from "vitest";
import { SAMPLE_OFFER_21062026, offerPdfModel } from "@/domain/offer";
import { renderOfferPdf } from "@/pdf/render-offer-pdf";

describe("renderOfferPdf", () => {
  it("returns a PDF for sample offer 21062026", async () => {
    const model = offerPdfModel({
      id: "offer-id",
      eventId: "event-id",
      number: SAMPLE_OFFER_21062026.number,
      issuedOn: SAMPLE_OFFER_21062026.issuedOn,
      netCents: 635_000,
      vatCents: 120_650,
      grossCents: 755_650,
      createdAt: new Date("2026-06-21T10:00:00.000Z"),
      updatedAt: new Date("2026-06-21T10:00:00.000Z"),
      lines: SAMPLE_OFFER_21062026.lines.map((line, index) => ({
        id: `line-${index}`,
        offerId: "offer-id",
        position: index + 1,
        description: line.description,
        quantity: line.quantity,
        unitNetCents: line.unitNetCents,
      })),
      event: {
        id: "event-id",
        coupleAName: SAMPLE_OFFER_21062026.coupleAName,
        coupleBName: SAMPLE_OFFER_21062026.coupleBName,
        status: "offer",
        lostReason: null,
        reservedUntil: null,
        guestCount: 80,
        quotedNetCents: 635_000,
        eventDate: SAMPLE_OFFER_21062026.eventDate,
        source: "manual",
        note: null,
        email: "jana@example.com",
        phone: null,
        createdAt: new Date("2026-06-01T10:00:00.000Z"),
      },
    });

    const pdf = await renderOfferPdf(model);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
