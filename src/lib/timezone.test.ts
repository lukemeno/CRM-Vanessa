import { describe, expect, it } from "vitest";
import {
  APP_TIMEZONE,
  addCalendarDays,
  formatToday,
  yearInTimeZone,
  zonedInstant,
} from "@/lib/timezone";

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

  it("builds a Berlin instant for a calendar date and hour", () => {
    const instant = zonedInstant("2026-08-28", 11);
    expect(instant.toISOString()).toBe("2026-08-28T09:00:00.000Z");
  });

  it("adds whole calendar days without using a timezone clock", () => {
    expect(addCalendarDays("2026-08-29", -1)).toBe("2026-08-28");
    expect(addCalendarDays("2026-08-29", 1)).toBe("2026-08-30");
  });

  it("reads the calendar year in Europe/Berlin", () => {
    expect(yearInTimeZone(new Date("2026-12-31T23:30:00.000Z"))).toBe(2027);
  });
});
