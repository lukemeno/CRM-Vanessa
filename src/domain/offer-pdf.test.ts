import { describe, expect, it } from "vitest";
import {
  BELEG_SENDER,
  OFFER_BELEG_TERMS,
  OLIVE_LEAF_ASSET,
  belegSenderLines,
} from "@/domain/beleg";
import { offerPdfModel, SAMPLE_OFFER_21062026 } from "@/domain/offer";
import { formatEuroFromCents } from "@/domain/money";
import { readFileSync } from "node:fs";
import path from "node:path";

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
    expect(model.heading).toBe("Angebot 21062026");
    expect(model.issuedOnLabel).toBe("21.06.2026");
    expect(model.coupleNames).toBe("Jana Hermes & Raphael Gerhards");
    expect(model.eventDateLabel).toBe("24.07.2027");
    expect(model.eventDateLabel).not.toMatch(/Event/i);
    expect(model.locationName).toBe("Alte Hettnerfabrik");
    expect(model.locationWindow).toBe("Fr 11:00 bis So 11:00");
    expect(model.vatPercent).toBe(19);
    expect(formatEuroFromCents(model.netCents).replace(/\u00a0/g, " ")).toBe(
      "6.350,00 €",
    );
    expect(formatEuroFromCents(model.grossCents).replace(/\u00a0/g, " ")).toBe(
      "7.556,50 €",
    );
    expect(model.terms).toEqual([...OFFER_BELEG_TERMS]);
    expect(model.terms[0]).toMatch(/1\.000 €/);
    expect(model.terms[1]).toMatch(/stornofrei/);
    expect(model.terms[2]).toMatch(/10 Tage/);
    expect(model.sender).toEqual(BELEG_SENDER);
    expect(belegSenderLines()).toEqual([
      "Alte Landstraße 23",
      "53902 Bad Münstereifel",
      "Tel 01573 8273034",
      "vanessa@events-altehettnerfabrik.de",
    ]);
  });

  it("keeps a botanical leaf PNG in public/brand, not ellipse marks", () => {
    const png = readFileSync(path.resolve(OLIVE_LEAF_ASSET));
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    const source = readFileSync(path.resolve("src/pdf/offer-leaf.tsx"), "utf8");
    expect(source).not.toMatch(/Ellipse/);
    expect(source).toMatch(/Image/);
  });
});
