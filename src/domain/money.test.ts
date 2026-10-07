import { describe, expect, it } from "vitest";
import {
  VAT_PERCENT,
  ANZAHLUNG_GROSS_CENTS,
  formatEuroFromCents,
  formatOfferNumber,
  grossCents,
  netFromGross,
  parseEuroToCents,
  centsToEuroInput,
  vatCents,
} from "@/domain/money";

describe("money", () => {
  it("uses 19% MwSt", () => {
    expect(VAT_PERCENT).toBe(19);
  });

  it("computes VAT as integer cents", () => {
    expect(vatCents(10_000)).toBe(1_900);
    expect(grossCents(10_000)).toBe(11_900);
  });

  it("rounds half up to the nearest cent", () => {
    expect(vatCents(1)).toBe(0);
    expect(vatCents(3)).toBe(1);
  });

  it("rejects non-integer cents", () => {
    expect(() => vatCents(10.5)).toThrow(/integer cents/);
  });

  it("splits 1000 EUR gross into 84034 net and 15966 MwSt", () => {
    expect(ANZAHLUNG_GROSS_CENTS).toBe(100_000);
    const net = netFromGross(ANZAHLUNG_GROSS_CENTS);
    expect(net).toBe(84_034);
    expect(vatCents(net)).toBe(15_966);
    expect(grossCents(net)).toBe(100_000);
  });

  it("formats integer cents as German EUR", () => {
    expect(formatEuroFromCents(0).replace(/\u00a0/g, " ")).toBe("0,00 €");
    expect(formatEuroFromCents(10_000).replace(/\u00a0/g, " ")).toBe(
      "100,00 €",
    );
    expect(formatEuroFromCents(123_456).replace(/\u00a0/g, " ")).toBe(
      "1.234,56 €",
    );
  });

  it("parses German EUR text to integer cents", () => {
    expect(parseEuroToCents("2.000,00")).toBe(200_000);
    expect(parseEuroToCents("2000,00 €")).toBe(200_000);
    expect(parseEuroToCents("6350")).toBe(635_000);
  });

  it("formats cents for a German euro input", () => {
    expect(centsToEuroInput(200_000)).toBe("2000,00");
    expect(centsToEuroInput(755_650)).toBe("7556,50");
  });
});

describe("offer numbers", () => {
  it("uses the issue date in DDMMYYYY, like sample 21062026", () => {
    expect(formatOfferNumber("2026-06-21")).toBe("21062026");
  });

  it("does not number an offer from the wedding date", () => {
    expect(formatOfferNumber("2027-07-24")).not.toBe("21062026");
    expect(formatOfferNumber("2027-07-24")).toBe("24072027");
  });
});
