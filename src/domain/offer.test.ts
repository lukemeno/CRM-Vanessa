import { describe, expect, it } from "vitest";
import { grossCents, vatCents } from "@/domain/money";
import { SAMPLE_OFFER_21062026, nextOfferNumber, offerTotals } from "@/domain/offer";

describe("offer totals", () => {
  it("sums line qty × unit net cents at 19% MwSt", () => {
    const totals = offerTotals([
      { quantity: 2, unitNetCents: 10_000 },
      { quantity: 1, unitNetCents: 5_000 },
    ]);
    expect(totals.netCents).toBe(25_000);
    expect(totals.vatCents).toBe(vatCents(25_000));
    expect(totals.grossCents).toBe(grossCents(25_000));
    expect(totals.vatCents).toBe(4_750);
    expect(totals.grossCents).toBe(29_750);
  });

  it("reproduces sample 21062026 totals (6350 net / 7556.50 gross)", () => {
    const totals = offerTotals(SAMPLE_OFFER_21062026.lines);
    expect(totals.netCents).toBe(635_000);
    expect(totals.vatCents).toBe(120_650);
    expect(totals.grossCents).toBe(755_650);
  });

  it("keeps the location line at 200000 cents net", () => {
    const location = SAMPLE_OFFER_21062026.lines[0];
    expect(location?.description).toMatch(/Location/i);
    expect(location?.description).toMatch(/Fr 11:00/);
    expect(location?.unitNetCents).toBe(200_000);
    expect(location?.quantity).toBe(1);
  });
});

describe("nextOfferNumber", () => {
  it("keeps Jana's first offer of the day as 21062026", () => {
    expect(nextOfferNumber("2026-06-21", [])).toBe("21062026");
    expect(nextOfferNumber("2026-06-21", [], "21062026")).toBe("21062026");
  });

  it("suffixes -2 then -3 when another offer is issued the same day", () => {
    expect(nextOfferNumber("2026-06-21", ["21062026"])).toBe("21062026-2");
    expect(nextOfferNumber("2026-06-21", ["21062026", "21062026-2"])).toBe(
      "21062026-3",
    );
  });

  it("does not switch offers onto RE-YYYY-NNN", () => {
    expect(nextOfferNumber("2026-06-21", ["21062026"]).startsWith("RE-")).toBe(
      false,
    );
  });
});
