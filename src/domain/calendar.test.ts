import { describe, expect, it } from "vitest";
import {
  BOOKED_WEEKEND,
  bookedWeekendPeriod,
  planningBlockPeriod,
  viewingAppointmentPeriod,
  viewingCalendarBlockPeriod,
} from "@/domain/calendar";
import { APP_TIMEZONE } from "@/lib/timezone";

describe("BOOKED_WEEKEND", () => {
  it("is a Fri 11:00–Sun 11:00 Europe/Berlin code constant", () => {
    expect(BOOKED_WEEKEND).toEqual({
      startWeekday: "friday",
      startHour: 11,
      endWeekday: "sunday",
      endHour: 11,
      timeZone: APP_TIMEZONE,
    });
  });
});

describe("bookedWeekendPeriod", () => {
  it("covers Friday 11:00 to Sunday 11:00 in Berlin for a Saturday event", () => {
    const period = bookedWeekendPeriod("2026-08-29");
    expect(period.start.toISOString()).toBe("2026-08-28T09:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-08-30T09:00:00.000Z");
  });

  it("uses local Berlin offsets when the weekend spans the spring DST change", () => {
    const period = bookedWeekendPeriod("2026-03-28");
    expect(period.start.toISOString()).toBe("2026-03-27T10:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-03-29T09:00:00.000Z");
  });
});

describe("viewing periods", () => {
  it("books 60 minutes for the appointment and 30 extra minutes after on the calendar block", () => {
    const start = new Date("2026-08-20T08:00:00.000Z");
    const appointment = viewingAppointmentPeriod(start);
    const block = viewingCalendarBlockPeriod(start);

    expect(appointment.end.getTime() - appointment.start.getTime()).toBe(60 * 60 * 1000);
    expect(block.end.getTime() - block.start.getTime()).toBe(90 * 60 * 1000);
    expect(block.start.toISOString()).toBe(appointment.start.toISOString());
    expect(block.end.toISOString()).toBe("2026-08-20T09:30:00.000Z");
  });
});

describe("planning periods", () => {
  it("uses the appointment period with no extra buffer", () => {
    const start = new Date("2026-09-01T12:00:00.000Z");
    const end = new Date("2026-09-01T14:00:00.000Z");
    expect(planningBlockPeriod({ start, end })).toEqual({ start, end });
  });
});
