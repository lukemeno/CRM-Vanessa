import { describe, expect, it } from "vitest";
import { SAMPLE_OFFER_21062026, offerPdfModel } from "@/domain/offer";
import { renderOfferPdf } from "@/pdf/render-offer-pdf";

describe("renderOfferPdf", () => {
  it("returns a German Beleg with sender, terms, date, and no English Event line", async () => {
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

    const pdf = await renderOfferPdf(model);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);

    const text = pdf.toString("latin1").replace(/\u0000/g, "");
    expect(text).toContain("Angebot 21062026");
    expect(text).toContain("Events by Vanessa");
    expect(text).toContain("Alte Landstra");
    expect(text).toContain("01573 8273034");
    expect(text).toContain("vanessa@events-altehettnerfabrik.de");
    expect(text).toContain("Die Anzahlung betr");
    expect(text).not.toContain("Event 24.07.2027");
  });
});
