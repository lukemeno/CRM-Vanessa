import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { calendarBlock, event as eventTable } from "@/db/schema";
import {
  bookSaturday,
  expireOfferHold,
  holdOfferWeekend,
  schedulePlanning,
  scheduleViewing,
} from "@/domain/calendar";
import { CalendarConflictError } from "@/domain/errors";
import { createEvent } from "@/domain/event";
import { closeTestDb, getTestDb, resetDomainTables, type TestDb } from "@/domain/pg-test";

const SATURDAY = "2026-08-29";

describe("calendar_block exclusion", () => {
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

  it("rejects two booked weekends on the same Saturday", async () => {
    const first = await createEvent(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      eventDate: SATURDAY,
    });
    const second = await createEvent(db, {
      coupleAName: "Clara",
      coupleBName: "David",
      eventDate: SATURDAY,
    });

    await bookSaturday(db, first.id, SATURDAY);
    await expect(bookSaturday(db, second.id, SATURDAY)).rejects.toBeInstanceOf(
      CalendarConflictError,
    );
  });

  it("rejects a viewing that collides with a booked weekend", async () => {
    const booked = await createEvent(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      eventDate: SATURDAY,
    });
    await bookSaturday(db, booked.id, SATURDAY);

    const visitor = await createEvent(db, {
      coupleAName: "Elena",
      coupleBName: "Felix",
    });
    await expect(
      scheduleViewing(db, {
        eventId: visitor.id,
        start: new Date("2026-08-29T12:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(CalendarConflictError);
  });

  it("rejects two viewings whose buffers overlap", async () => {
    const first = await createEvent(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
    });
    const second = await createEvent(db, {
      coupleAName: "Clara",
      coupleBName: "David",
    });

    await scheduleViewing(db, {
      eventId: first.id,
      start: new Date("2026-08-20T08:00:00.000Z"),
    });
    await expect(
      scheduleViewing(db, {
        eventId: second.id,
        start: new Date("2026-08-20T09:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(CalendarConflictError);
  });

  it("does not let an expired reserve block a later booking", async () => {
    const reserved = await createEvent(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      eventDate: SATURDAY,
      status: "offer",
      reservedUntil: new Date("2026-08-01T10:00:00.000Z"),
    });
    await holdOfferWeekend(db, reserved.id, SATURDAY, {
      now: new Date("2026-07-15T10:00:00.000Z"),
    });

    const later = new Date("2026-08-10T10:00:00.000Z");
    await expireOfferHold(db, reserved.id, { now: later });

    const booked = await createEvent(db, {
      coupleAName: "Clara",
      coupleBName: "David",
      eventDate: SATURDAY,
    });
    await bookSaturday(db, booked.id, SATURDAY);

    const blocks = await db
      .select()
      .from(calendarBlock)
      .where(eq(calendarBlock.eventId, booked.id));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.source).toBe("booked");
  });

  it("writes a reserved Fri–Sun hold while reserved_until is in the future", async () => {
    const offer = await createEvent(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      eventDate: SATURDAY,
      status: "offer",
      reservedUntil: new Date("2026-09-01T10:00:00.000Z"),
    });
    await holdOfferWeekend(db, offer.id, SATURDAY, {
      now: new Date("2026-08-10T10:00:00.000Z"),
    });

    const blocks = await db
      .select()
      .from(calendarBlock)
      .where(eq(calendarBlock.eventId, offer.id));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.source).toBe("reserved");
    expect(blocks[0]?.blocksCalendar).toBe(true);
  });

  it("replaces a reserved hold with a booked weekend on the same range", async () => {
    const offer = await createEvent(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      eventDate: SATURDAY,
      status: "offer",
      reservedUntil: new Date("2026-09-01T10:00:00.000Z"),
    });
    await holdOfferWeekend(db, offer.id, SATURDAY, {
      now: new Date("2026-08-10T10:00:00.000Z"),
    });
    await bookSaturday(db, offer.id, SATURDAY);

    const blocks = await db
      .select()
      .from(calendarBlock)
      .where(eq(calendarBlock.eventId, offer.id));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.source).toBe("booked");

    const [row] = await db
      .select()
      .from(eventTable)
      .where(eq(eventTable.id, offer.id));
    expect(row?.status).toBe("booked");
    expect(row?.reservedUntil).toBeNull();
  });

  it("stores a viewing appointment of 60 minutes and a block that already includes the 30-minute buffer", async () => {
    const inquiry = await createEvent(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
    });
    const start = new Date("2026-08-20T08:00:00.000Z");
    const { appointment: viewing, block } = await scheduleViewing(db, {
      eventId: inquiry.id,
      start,
    });

    expect(viewing.kind).toBe("viewing");
    expect(viewing.period.end.getTime() - viewing.period.start.getTime()).toBe(
      60 * 60 * 1000,
    );
    expect(block.period.end.getTime() - block.period.start.getTime()).toBe(
      90 * 60 * 1000,
    );
    expect(block.source).toBe("viewing");
    expect(block.appointmentId).toBe(viewing.id);
  });

  it("stores a planning block for the appointment period only", async () => {
    const booked = await createEvent(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      eventDate: SATURDAY,
      status: "booked",
    });
    const start = new Date("2026-08-18T07:00:00.000Z");
    const end = new Date("2026-08-18T09:00:00.000Z");
    const { appointment: planning, block } = await schedulePlanning(db, {
      eventId: booked.id,
      start,
      end,
    });

    expect(planning.kind).toBe("planning");
    expect(block.period.start.toISOString()).toBe(start.toISOString());
    expect(block.period.end.toISOString()).toBe(end.toISOString());
    expect(block.source).toBe("planning");
  });
});
