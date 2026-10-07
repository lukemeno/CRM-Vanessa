import { describe, expect, it } from "vitest";
import {
  APP_TIMEZONE,
  addCalendarDays,
  addCalendarMonths,
  calendarYmd,
  formatCalendarDate,
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

  it("formats a stored event date as dd.mm.yyyy", () => {
    expect(formatCalendarDate("2026-09-12")).toBe("12.09.2026");
  });

  it("builds a Berlin instant for a calendar date and hour", () => {
    const instant = zonedInstant("2026-08-28", 11);
    expect(instant.toISOString()).toBe("2026-08-28T09:00:00.000Z");
  });

  it("adds whole calendar days without using a timezone clock", () => {
    expect(addCalendarDays("2026-08-29", -1)).toBe("2026-08-28");
    expect(addCalendarDays("2026-08-29", 1)).toBe("2026-08-30");
  });

  it("subtracts whole calendar months and clamps the day", () => {
    expect(addCalendarMonths("2026-09-12", -3)).toBe("2026-06-12");
    expect(addCalendarMonths("2026-05-31", -3)).toBe("2026-02-28");
  });

  it("reads the calendar day in Europe/Berlin", () => {
    expect(calendarYmd(new Date("2026-06-12T21:30:00.000Z"))).toBe("2026-06-12");
    expect(calendarYmd(new Date("2026-06-12T22:30:00.000Z"))).toBe("2026-06-13");
  });

  it("reads the calendar year in Europe/Berlin", () => {
    expect(yearInTimeZone(new Date("2026-12-31T23:30:00.000Z"))).toBe(2027);
  });
});
