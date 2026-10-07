import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { invoice as invoiceTable } from "@/db/schema";
import { createEvent } from "@/domain/event";
import { issueInvoice, stornoInvoice } from "@/domain/invoice";
import { closeTestDb, getTestDb, resetDomainTables, type TestDb } from "@/domain/pg-test";

describe("invoices", () => {
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

  it("locks the yearly counter and issues gapless RE-YYYY-NNN numbers", async () => {
    const record = await createEvent(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      eventDate: "2026-08-29",
    });
    const now = new Date("2026-08-10T08:00:00.000Z");

    const first = await issueInvoice(db, {
      eventId: record.id,
      netCents: 10_000,
      now,
    });
    const second = await issueInvoice(db, {
      eventId: record.id,
      netCents: 2_000,
      now,
    });

    expect(first.number).toBe("RE-2026-001");
    expect(second.number).toBe("RE-2026-002");
    expect(first.netCents).toBe(10_000);
    expect(first.vatCents).toBe(1_900);
    expect(first.grossCents).toBe(11_900);
  });

  it("creates a storno as a new row and leaves the original amounts unchanged", async () => {
    const record = await createEvent(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      eventDate: "2026-08-29",
    });
    const now = new Date("2026-08-10T08:00:00.000Z");
    const original = await issueInvoice(db, {
      eventId: record.id,
      netCents: 10_000,
      now,
    });
    const credit = await stornoInvoice(db, original.id, { now });

    expect(credit.number).toBe("RE-2026-002");
    expect(credit.kind).toBe("storno");
    expect(credit.stornoOfId).toBe(original.id);
    expect(credit.netCents).toBe(-10_000);
    expect(credit.vatCents).toBe(-1_900);
    expect(credit.grossCents).toBe(-11_900);

    const [unchanged] = await db
      .select()
      .from(invoiceTable)
      .where(eq(invoiceTable.id, original.id));
    expect(unchanged?.netCents).toBe(10_000);
    expect(unchanged?.grossCents).toBe(11_900);
  });

  it("rejects updates to invoice amounts", async () => {
    const record = await createEvent(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      eventDate: "2026-08-29",
    });
    const issued = await issueInvoice(db, {
      eventId: record.id,
      netCents: 10_000,
      now: new Date("2026-08-10T08:00:00.000Z"),
    });

    let thrown: unknown;
    try {
      await db
        .update(invoiceTable)
        .set({ netCents: 1 })
        .where(eq(invoiceTable.id, issued.id));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();
    const text =
      thrown instanceof Error
        ? `${thrown.message} ${String(thrown.cause)}`
        : String(thrown);
    expect(text).toMatch(/append-only/i);
  });
});
