import { describe, expect, it } from "vitest";
import { VAT_PERCENT, formatOfferNumber, grossCents, vatCents } from "@/domain/money";

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
});

describe("offer numbers", () => {
  it("keeps the sample offer date style 21062026", () => {
    expect(formatOfferNumber("2026-06-21")).toBe("21062026");
  });
});
