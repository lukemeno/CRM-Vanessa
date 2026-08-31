import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bookSaturday, holdOfferWeekend, schedulePlanning, scheduleViewing } from "@/domain/calendar";
import {
  CALENDAR_ITEM_KINDS,
  CALENDAR_ITEM_LABELS,
  INVOICE_TASK_DAYS_AFTER_EVENT,
  addYearMonth,
  calendarKindFromSource,
  chipsOnDay,
  coupleTitle,
  daysOverlappingPeriod,
  eventakteHref,
  formatYearMonthHeading,
  invoiceTaskYmd,
  listMonthChips,
  monthWeeks,
  parseYearMonth,
  shouldShowInvoiceTask,
} from "@/domain/calendar-month";
import { createEvent } from "@/domain/event";
import { changeInquiryStatus } from "@/domain/inquiry";
import { issueAnzahlung, issueBalanceInvoice } from "@/domain/invoice";
import { SAMPLE_OFFER_21062026, saveOffer } from "@/domain/offer";
import { closeTestDb, getTestDb, resetDomainTables, type TestDb } from "@/domain/pg-test";
import { bookedWeekendPeriod } from "@/domain/calendar";

describe("month grid", () => {
  it("builds Monday-first weeks covering August 2026", () => {
    const weeks = monthWeeks("2026-08");
    expect(weeks).toHaveLength(6);
    expect(weeks[0]?.[0]).toBe("2026-07-27");
    expect(weeks[0]?.[6]).toBe("2026-08-02");
    expect(weeks[0]?.[5]).toBe("2026-08-01");
    expect(weeks[5]?.[0]).toBe("2026-08-31");
    expect(weeks[5]?.[6]).toBe("2026-09-06");
  });

  it("parses a year-month or falls back to Berlin now", () => {
    expect(parseYearMonth("2026-08", new Date("2026-01-15T12:00:00.000Z"))).toBe(
      "2026-08",
    );
    expect(parseYearMonth("nope", new Date("2026-08-31T12:00:00.000Z"))).toBe(
      "2026-08",
    );
    expect(parseYearMonth(undefined, new Date("2026-08-31T22:30:00.000Z"))).toBe(
      "2026-09",
    );
  });

  it("steps a year-month without English copy", () => {
    expect(addYearMonth("2026-08", -1)).toBe("2026-07");
    expect(addYearMonth("2026-12", 1)).toBe("2027-01");
    expect(formatYearMonthHeading("2026-08")).toBe("August 2026");
  });
});

describe("occupancy mapping", () => {
  it("keeps the five calendar colors", () => {
    expect([...CALENDAR_ITEM_KINDS]).toEqual([
      "viewing",
      "planning",
      "booked",
      "blocked",
      "task",
    ]);
    expect(CALENDAR_ITEM_LABELS).toEqual({
      viewing: "Besichtigung",
      planning: "Planung",
      booked: "Gebucht",
      blocked: "Blockiert",
      task: "Aufgabe",
    });
    expect(calendarKindFromSource("viewing")).toBe("viewing");
    expect(calendarKindFromSource("planning")).toBe("planning");
    expect(calendarKindFromSource("booked")).toBe("booked");
    expect(calendarKindFromSource("reserved")).toBe("blocked");
  });

  it("opens the Eventakte, not a public booking page", () => {
    expect(eventakteHref("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toBe(
      "/anfragen/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    );
    expect(coupleTitle("Jana Hermes", "Raphael Gerhards")).toBe(
      "Jana Hermes & Raphael Gerhards",
    );
  });

  it("spreads a booked Saturday onto Fri, Sat and Sun in Berlin", () => {
    const days = daysOverlappingPeriod(bookedWeekendPeriod("2026-08-29"));
    expect(days).toEqual(["2026-08-28", "2026-08-29", "2026-08-30"]);
  });

  it("puts a 90-minute viewing block on its Berlin start day", () => {
    const days = daysOverlappingPeriod({
      start: new Date("2026-08-20T08:00:00.000Z"),
      end: new Date("2026-08-20T09:30:00.000Z"),
    });
    expect(days).toEqual(["2026-08-20"]);
  });

  it("places the invoice task two days after the event date", () => {
    expect(INVOICE_TASK_DAYS_AFTER_EVENT).toBe(2);
    expect(invoiceTaskYmd("2026-08-29")).toBe("2026-08-31");
    expect(
      shouldShowInvoiceTask({ status: "booked", remainingGrossCents: 1000 }),
    ).toBe(true);
    expect(
      shouldShowInvoiceTask({ status: "planning", remainingGrossCents: 1 }),
    ).toBe(true);
    expect(
      shouldShowInvoiceTask({ status: "done", remainingGrossCents: 500 }),
    ).toBe(true);
    expect(
      shouldShowInvoiceTask({ status: "booked", remainingGrossCents: 0 }),
    ).toBe(false);
    expect(
      shouldShowInvoiceTask({ status: "new", remainingGrossCents: 1000 }),
    ).toBe(false);
    expect(
      shouldShowInvoiceTask({ status: "lost", remainingGrossCents: 1000 }),
    ).toBe(false);
  });
});

describe("listMonthChips", () => {
  let db: TestDb;

  beforeAll(async () => {
    db = await getTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await resetDomainTables(db);
  });

  it("shows a booked weekend as Gebucht chips that link to the Eventakte", async () => {
    const inquiry = await createEvent(db, {
      coupleAName: "Jana Hermes",
      coupleBName: "Raphael Gerhards",
      eventDate: "2026-08-29",
    });
    await bookSaturday(db, inquiry.id, "2026-08-29");

    const chips = await listMonthChips(db, "2026-08");
    const saturday = chipsOnDay(chips, "2026-08-29");
    expect(saturday).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventId: inquiry.id,
          href: `/anfragen/${inquiry.id}`,
          kind: "booked",
          title: "Jana Hermes & Raphael Gerhards",
        }),
      ]),
    );
    expect(chipsOnDay(chips, "2026-08-28").some((chip) => chip.kind === "booked")).toBe(
      true,
    );
    expect(chipsOnDay(chips, "2026-08-30").some((chip) => chip.kind === "booked")).toBe(
      true,
    );
  });

  it("shows a viewing from scheduleViewing, not a public booking slot", async () => {
    const inquiry = await createEvent(db, {
      coupleAName: "Jana Hermes",
      coupleBName: "Raphael Gerhards",
    });
    await scheduleViewing(db, {
      eventId: inquiry.id,
      start: new Date("2026-08-20T08:00:00.000Z"),
    });

    const chips = chipsOnDay(await listMonthChips(db, "2026-08"), "2026-08-20");
    expect(chips).toEqual([
      expect.objectContaining({
        eventId: inquiry.id,
        href: `/anfragen/${inquiry.id}`,
        kind: "viewing",
        title: "Jana Hermes & Raphael Gerhards",
        timeLabel: "10:00",
      }),
    ]);
  });

  it("shows planning from schedulePlanning on the appointment period only", async () => {
    const inquiry = await createEvent(db, {
      coupleAName: "Clara",
      coupleBName: "David",
      eventDate: "2026-08-29",
      status: "booked",
    });
    await schedulePlanning(db, {
      eventId: inquiry.id,
      start: new Date("2026-08-18T07:00:00.000Z"),
      end: new Date("2026-08-18T09:00:00.000Z"),
    });

    const chips = chipsOnDay(await listMonthChips(db, "2026-08"), "2026-08-18");
    expect(chips.some((chip) => chip.kind === "planning")).toBe(true);
    expect(chips.find((chip) => chip.kind === "planning")?.timeLabel).toBe(
      "09:00–11:00",
    );
  });

  it("maps a reserved hold to Blockiert", async () => {
    const inquiry = await createEvent(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      eventDate: "2026-08-29",
      status: "offer",
      reservedUntil: new Date("2026-09-01T10:00:00.000Z"),
    });
    await holdOfferWeekend(db, inquiry.id, "2026-08-29", {
      now: new Date("2026-08-10T10:00:00.000Z"),
    });

    const chips = chipsOnDay(await listMonthChips(db, "2026-08"), "2026-08-29");
    expect(chips.some((chip) => chip.kind === "blocked")).toBe(true);
    expect(chips.find((chip) => chip.kind === "blocked")?.title).toBe(
      "Anna & Ben",
    );
  });

  it("adds an invoice task two days after a booked event while money is open", async () => {
    const inquiry = await createEvent(db, {
      coupleAName: "Jana Hermes",
      coupleBName: "Raphael Gerhards",
      eventDate: "2026-08-29",
      status: "booked",
    });
    await saveOffer(db, inquiry.id, {
      issuedOn: "2026-06-21",
      lines: [...SAMPLE_OFFER_21062026.lines],
    });

    const chips = chipsOnDay(await listMonthChips(db, "2026-08"), "2026-08-31");
    expect(chips).toEqual([
      expect.objectContaining({
        eventId: inquiry.id,
        href: `/anfragen/${inquiry.id}`,
        kind: "task",
        title: "Jana Hermes & Raphael Gerhards",
        timeLabel: "Rechnung",
      }),
    ]);

    await issueAnzahlung(db, inquiry.id, {
      now: new Date("2026-08-10T08:00:00.000Z"),
    });
    await issueBalanceInvoice(db, inquiry.id, {
      now: new Date("2026-08-10T08:00:00.000Z"),
    });
    const afterPay = chipsOnDay(
      await listMonthChips(db, "2026-08"),
      "2026-08-31",
    );
    expect(afterPay.some((chip) => chip.kind === "task")).toBe(false);
  });

  it("writes the booked weekend when the status becomes Gebucht", async () => {
    const inquiry = await createEvent(db, {
      coupleAName: "Jana Hermes",
      coupleBName: "Raphael Gerhards",
      eventDate: "2026-08-29",
      status: "offer",
    });
    await changeInquiryStatus(db, inquiry.id, "booked");

    const chips = chipsOnDay(await listMonthChips(db, "2026-08"), "2026-08-29");
    expect(chips.some((chip) => chip.kind === "booked")).toBe(true);
  });
});
