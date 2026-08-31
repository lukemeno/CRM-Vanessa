import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bookSaturday, scheduleViewing } from "@/domain/calendar";
import { createEvent } from "@/domain/event";
import { loadHeute } from "@/domain/heute";
import { createInquiry } from "@/domain/inquiry";
import { issueAnzahlung, issueBalanceInvoice } from "@/domain/invoice";
import { SAMPLE_OFFER_21062026, saveOffer } from "@/domain/offer";
import { closeTestDb, getTestDb, resetDomainTables, type TestDb } from "@/domain/pg-test";

describe("loadHeute", () => {
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

  it("returns empty lists when nothing is due", async () => {
    const heute = await loadHeute(db, new Date("2026-08-31T10:00:00.000Z"));
    expect(heute.appointments).toEqual([]);
    expect(heute.nextEvents).toEqual([]);
    expect(heute.unpaid).toEqual([]);
    expect(heute.newInquiries).toEqual([]);
  });

  it("lists today's viewing and links to the Eventakte", async () => {
    const inquiry = await createInquiry(db, {
      coupleAName: "Jana Hermes",
      coupleBName: "Raphael Gerhards",
      email: "jana@example.com",
    });
    await scheduleViewing(db, {
      eventId: inquiry.id,
      start: new Date("2026-08-20T08:00:00.000Z"),
    });

    const heute = await loadHeute(db, new Date("2026-08-20T12:00:00.000Z"));
    expect(heute.appointments).toEqual([
      expect.objectContaining({
        href: `/anfragen/${inquiry.id}`,
        title: "Jana Hermes & Raphael Gerhards",
        detail: "Besichtigung · 10:00",
        calendarHref: "/kalender?month=2026-08",
      }),
    ]);
  });

  it("lists upcoming events and new inquiries with Akte and board links", async () => {
    const upcoming = await createInquiry(db, {
      coupleAName: "Clara",
      coupleBName: "David",
      email: "clara@example.com",
      eventDate: "2026-09-12",
    });
    const neu = await createInquiry(db, {
      coupleAName: "Elena",
      coupleBName: "Felix",
      phone: "01573 8273034",
    });
    const past = await createEvent(db, {
      coupleAName: "Alt",
      coupleBName: "Paar",
      eventDate: "2026-08-01",
      status: "done",
      email: "alt@example.com",
    });

    const heute = await loadHeute(db, new Date("2026-08-31T10:00:00.000Z"));
    expect(heute.nextEvents.map((item) => item.title)).toEqual([
      "Clara & David",
    ]);
    expect(heute.nextEvents[0]).toEqual(
      expect.objectContaining({
        href: `/anfragen/${upcoming.id}`,
        detail: "12.09.2026",
        calendarHref: "/kalender?month=2026-09",
      }),
    );
    expect(heute.newInquiries.map((item) => item.href)).toEqual([
      `/anfragen/${neu.id}`,
      `/anfragen/${upcoming.id}`,
    ]);
    expect(heute.newInquiries[0]?.boardHref).toBe("/anfragen");
    expect(heute.nextEvents.some((item) => item.href.includes(past.id))).toBe(
      false,
    );
  });

  it("lists unpaid remaining money and a Rechnung task two days after the event", async () => {
    const booked = await createInquiry(db, {
      coupleAName: "Jana Hermes",
      coupleBName: "Raphael Gerhards",
      email: "jana@example.com",
      eventDate: "2026-08-29",
    });
    await bookSaturday(db, booked.id, "2026-08-29");
    await saveOffer(db, booked.id, {
      issuedOn: "2026-06-21",
      lines: [...SAMPLE_OFFER_21062026.lines],
    });

    const heute = await loadHeute(db, new Date("2026-08-31T10:00:00.000Z"));
    expect(heute.appointments).toEqual([
      expect.objectContaining({
        href: `/anfragen/${booked.id}`,
        title: "Jana Hermes & Raphael Gerhards",
        detail: "Aufgabe · Rechnung",
        calendarHref: "/kalender?month=2026-08",
      }),
    ]);
    expect(heute.unpaid).toEqual([
      expect.objectContaining({
        href: `/anfragen/${booked.id}`,
        title: "Jana Hermes & Raphael Gerhards",
      }),
    ]);
    expect(heute.unpaid[0]?.detail).toMatch(/€/);

    await issueAnzahlung(db, booked.id, {
      now: new Date("2026-08-10T08:00:00.000Z"),
    });
    await issueBalanceInvoice(db, booked.id, {
      now: new Date("2026-08-10T08:00:00.000Z"),
    });
    const paid = await loadHeute(db, new Date("2026-08-31T10:00:00.000Z"));
    expect(paid.unpaid).toEqual([]);
    expect(paid.appointments.some((item) => item.detail?.includes("Rechnung"))).toBe(
      false,
    );
  });
});
