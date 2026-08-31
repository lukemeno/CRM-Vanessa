import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { calendarBlock, event as eventTable } from "@/db/schema";
import { holdOfferWeekend } from "@/domain/calendar";
import { createEvent, markLost } from "@/domain/event";
import { closeTestDb, getTestDb, resetDomainTables, type TestDb } from "@/domain/pg-test";

describe("event status", () => {
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

  it("requires lost_reason when status is lost", async () => {
    await expect(
      createEvent(db, {
        coupleAName: "Anna",
        coupleBName: "Ben",
        status: "lost",
      }),
    ).rejects.toThrow();
  });

  it("stores lost_reason when marking an event lost and deletes a reserved hold", async () => {
    const offer = await createEvent(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      eventDate: "2026-08-29",
      status: "offer",
      reservedUntil: new Date("2026-09-01T10:00:00.000Z"),
    });
    await holdOfferWeekend(db, offer.id, "2026-08-29", {
      now: new Date("2026-08-10T10:00:00.000Z"),
    });

    await markLost(db, offer.id, "Paar hat abgesagt");

    const [row] = await db
      .select()
      .from(eventTable)
      .where(eq(eventTable.id, offer.id));
    expect(row?.status).toBe("lost");
    expect(row?.lostReason).toBe("Paar hat abgesagt");

    const blocks = await db
      .select()
      .from(calendarBlock)
      .where(eq(calendarBlock.eventId, offer.id));
    expect(blocks).toHaveLength(0);
  });

  it("rejects a free-text status", async () => {
    await expect(
      createEvent(db, {
        coupleAName: "Anna",
        coupleBName: "Ben",
        status: "reserved" as never,
      }),
    ).rejects.toThrow();
  });
});
