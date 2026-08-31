import { describe, expect, it } from "vitest";
import { formatInvoiceNumber } from "@/domain/invoice";

describe("formatInvoiceNumber", () => {
  it("formats RE-YYYY-NNN with a gapless 3-digit sequence", () => {
    expect(formatInvoiceNumber(2026, 1)).toBe("RE-2026-001");
    expect(formatInvoiceNumber(2026, 12)).toBe("RE-2026-012");
    expect(formatInvoiceNumber(2026, 123)).toBe("RE-2026-123");
  });
});
