import { describe, expect, it } from "vitest";
import {
  canIssueAnzahlung,
  hasOpenAnzahlung,
  invoiceLineLabel,
  invoicePdfModel,
} from "@/domain/invoice";

describe("invoice line labels", () => {
  it("does not treat a 1.000 € Restzahlung as an open Anzahlung", () => {
    const rest = {
      id: "00000000-0000-0000-0000-000000000001",
      kind: "invoice" as const,
      description: "Restzahlung",
      grossCents: 100_000,
      stornoOfId: null,
    };
    expect(hasOpenAnzahlung([rest])).toBe(false);
    expect(invoiceLineLabel(rest, [])).toBe("Restzahlung");
    expect(
      invoicePdfModel({
        ...rest,
        number: "RE-2026-002",
        netCents: 84_034,
        vatCents: 15_966,
        createdAt: new Date("2026-06-21T08:00:00.000Z"),
        event: {
          coupleAName: "Jana Hermes",
          coupleBName: "Raphael Gerhards",
          eventDate: "2027-07-24",
        },
        invoices: [{ id: rest.id, number: "RE-2026-002" }],
      }).heading,
    ).toBe("Rechnung RE-2026-002");
  });

  it("caps Anzahlung when remaining is below 1.000 €", () => {
    expect(canIssueAnzahlung([], null)).toBe(true);
    expect(canIssueAnzahlung([], 100_000)).toBe(true);
    expect(canIssueAnzahlung([], 99_999)).toBe(false);
    expect(
      canIssueAnzahlung(
        [
          {
            id: "1",
            kind: "invoice",
            description: "Anzahlung",
            grossCents: 100_000,
            stornoOfId: null,
          },
        ],
        655_650,
      ),
    ).toBe(false);
  });
});
