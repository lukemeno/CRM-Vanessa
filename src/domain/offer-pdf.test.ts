import { describe, expect, it } from "vitest";
import { offerPdfModel, SAMPLE_OFFER_21062026 } from "@/domain/offer";
import { formatEuroFromCents } from "@/domain/money";

describe("offer PDF model", () => {
  it("puts German couple, date, location window, MwSt and totals on the Beleg", () => {
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

    expect(model.number).toBe("21062026");
    expect(model.issuedOnLabel).toBe("21.06.2026");
    expect(model.coupleNames).toBe("Jana Hermes & Raphael Gerhards");
    expect(model.eventDateLabel).toBe("24.07.2027");
    expect(model.locationName).toBe("Alte Hettnerfabrik");
    expect(model.locationWindow).toBe("Fr 11:00 bis So 11:00");
    expect(model.vatPercent).toBe(19);
    expect(formatEuroFromCents(model.netCents).replace(/\u00a0/g, " ")).toBe(
      "6.350,00 €",
    );
    expect(formatEuroFromCents(model.grossCents).replace(/\u00a0/g, " ")).toBe(
      "7.556,50 €",
    );
  });
});
