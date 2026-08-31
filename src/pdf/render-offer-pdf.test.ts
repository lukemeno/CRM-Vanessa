import { describe, expect, it } from "vitest";
import { SAMPLE_OFFER_21062026, offerPdfModel } from "@/domain/offer";
import { renderOfferPdf } from "@/pdf/render-offer-pdf";

describe("renderOfferPdf", () => {
  it("returns a PDF for sample offer 21062026", async () => {
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
  });
});
