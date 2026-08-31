import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { event as eventTable } from "@/db/schema";
import { bookSaturday, BOOKED_WEEKEND, scheduleViewing } from "@/domain/calendar";
import { CalendarConflictError } from "@/domain/errors";
import { createEvent } from "@/domain/event";
import {
  GUEST_COUNT_LOCKED_COPY,
  bookedLocationWindowCopy,
  guestCountLockOn,
  isFullRefundUntil,
  isGuestCountLocked,
  stornoCutoffOn,
  stornoWindowCopy,
  updateGuestCount,
} from "@/domain/eventakte";
import { createInquiry } from "@/domain/inquiry";
import { zonedInstant } from "@/lib/timezone";
import { closeTestDb, getTestDb, resetDomainTables, type TestDb } from "@/domain/pg-test";

describe("guest count lock", () => {
  it("locks on the day 10 days before the event date", () => {
    expect(guestCountLockOn("2026-09-20")).toBe("2026-09-10");
  });

  it("stays editable 11 days before and locks at 10 days", () => {
    expect(
      isGuestCountLocked("2026-09-20", zonedInstant("2026-09-09", 12)),
    ).toBe(false);
    expect(
      isGuestCountLocked("2026-09-20", zonedInstant("2026-09-10", 0)),
    ).toBe(true);
    expect(
      isGuestCountLocked("2026-09-20", zonedInstant("2026-09-19", 18)),
    ).toBe(true);
  });

  it("stays editable when no event date is set", () => {
    expect(isGuestCountLocked(null, zonedInstant("2026-09-10", 12))).toBe(
      false,
    );
  });
});

describe("storno cutoff", () => {
  it("is 3 calendar months before the event date", () => {
    expect(stornoCutoffOn("2026-09-12")).toBe("2026-06-12");
  });

  it("allows a full refund on the cutoff day and keeps the Anzahlung the day after", () => {
    expect(isFullRefundUntil("2026-09-12", zonedInstant("2026-06-12", 23))).toBe(
      true,
    );
    expect(isFullRefundUntil("2026-09-12", zonedInstant("2026-06-13", 0))).toBe(
      false,
    );
  });

  it("shows the cutoff date without extra legal text", () => {
    expect(stornoWindowCopy("2026-09-12")).toBe(
      "Volle Rückerstattung bis 12.06.2026. Danach bleibt die Anzahlung.",
    );
  });
});

describe("location window copy", () => {
  it("uses the booked-weekend constants, not a settings table", () => {
    expect(BOOKED_WEEKEND.startWeekday).toBe("friday");
    expect(BOOKED_WEEKEND.startHour).toBe(11);
    expect(BOOKED_WEEKEND.endWeekday).toBe("sunday");
    expect(BOOKED_WEEKEND.endHour).toBe(11);
    expect(bookedLocationWindowCopy()).toBe("Fr 11:00 bis So 11:00");
  });
});

describe("guest count lock copy", () => {
  it("explains the 10-day lock in German", () => {
    expect(GUEST_COUNT_LOCKED_COPY).toBe(
      "Die Gästezahl kann bis 10 Tage vor dem Event geändert werden. Danach ist sie fest.",
    );
  });
});

describe("updateGuestCount", () => {
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

  it("updates guests when more than 10 days remain", async () => {
    const row = await createInquiry(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      eventDate: "2026-09-20",
      guestCount: 80,
      email: "anna@example.com",
    });

    const updated = await updateGuestCount(db, row.id, 90, {
      now: zonedInstant("2026-09-09", 12),
    });
    expect(updated.guestCount).toBe(90);
  });

  it("rejects a guest-count change on the 10-day lock", async () => {
    const row = await createInquiry(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      eventDate: "2026-09-20",
      guestCount: 80,
      email: "anna@example.com",
    });

    await expect(
      updateGuestCount(db, row.id, 90, {
        now: zonedInstant("2026-09-10", 9),
      }),
    ).rejects.toThrow(/guest_count locked/);

    const [unchanged] = await db
      .select()
      .from(eventTable)
      .where(eq(eventTable.id, row.id));
    expect(unchanged?.guestCount).toBe(80);
  });
});

describe("viewing writer from the Eventakte", () => {
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

  it("still collides with a booked Saturday weekend", async () => {
    const booked = await createEvent(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      eventDate: "2026-08-29",
    });
    await bookSaturday(db, booked.id, "2026-08-29");

    const visitor = await createInquiry(db, {
      coupleAName: "Elena",
      coupleBName: "Felix",
      phone: "02253 123456",
    });

    await expect(
      scheduleViewing(db, {
        eventId: visitor.id,
        start: new Date("2026-08-29T12:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(CalendarConflictError);
  });
});
