import { describe, expect, it } from "vitest";
import { BELEG_SENDER, belegCoupleNames } from "@/domain/beleg";
import { invoicePdfModel } from "@/domain/invoice";
import { renderInvoicePdf } from "@/pdf/render-offer-pdf";

describe("renderInvoicePdf", () => {
  it("embeds the RE-YYYY-NNN number on a German Anzahlung Beleg", async () => {
    const model = invoicePdfModel({
      id: "00000000-0000-0000-0000-000000000001",
      number: "RE-2026-001",
      kind: "invoice",
      stornoOfId: null,
      netCents: 84_034,
      vatCents: 15_966,
      grossCents: 100_000,
      description: "Anzahlung",
      createdAt: new Date("2026-06-21T08:00:00.000Z"),
      event: {
        coupleAName: "Jana Hermes",
        coupleBName: "Raphael Gerhards",
        eventDate: "2027-07-24",
      },
      invoices: [
        {
          id: "00000000-0000-0000-0000-000000000001",
          number: "RE-2026-001",
        },
      ],
    });

    expect(model.number).toBe("RE-2026-001");
    expect(model.coupleNames).toBe(
      belegCoupleNames("Jana Hermes", "Raphael Gerhards"),
    );
    expect(model.sender).toEqual(BELEG_SENDER);

    const pdf = await renderInvoicePdf(model);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const text = pdf.toString("latin1").replace(/\u0000/g, "");
    expect(text).toContain("RE-2026-001");
    expect(text).toContain("24.07.2027");
    expect(text).not.toContain("Event 24.07.2027");
    expect(text).toMatch(/\/Subtype\s*\/Image/);
  });
});
