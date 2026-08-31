import { describe, expect, it } from "vitest";
import { offerPdfModel, SAMPLE_OFFER_21062026 } from "@/domain/offer";
import { formatEuroFromCents } from "@/domain/money";

describe("offer PDF model", () => {
  it("puts German couple, date, location window, MwSt and totals on the Beleg", () => {
    const model = offerPdfModel({
      number: SAMPLE_OFFER_21062026.number,
      issuedOn: SAMPLE_OFFER_21062026.issuedOn,
      netCents: 635_000,
      vatCents: 120_650,
      grossCents: 755_650,
      lines: [...SAMPLE_OFFER_21062026.lines],
      event: {
        coupleAName: SAMPLE_OFFER_21062026.coupleAName,
        coupleBName: SAMPLE_OFFER_21062026.coupleBName,
        eventDate: SAMPLE_OFFER_21062026.eventDate,
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
