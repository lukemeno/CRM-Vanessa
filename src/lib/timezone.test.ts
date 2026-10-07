import { describe, expect, it } from "vitest";
import { APP_TIMEZONE, formatToday } from "@/lib/timezone";

describe("timezone", () => {
  it("uses Europe/Berlin as the default timezone", () => {
    expect(APP_TIMEZONE).toBe("Europe/Berlin");
  });

  it("formats a calendar date in German", () => {
    const formatted = formatToday(
      new Date("2026-08-31T12:00:00.000Z"),
      "Europe/Berlin",
    );
    expect(formatted).toContain("August");
    expect(formatted).toContain("2026");
  });
});
