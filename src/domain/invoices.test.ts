import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { invoice as invoiceTable } from "@/db/schema";
import { createEvent } from "@/domain/event";
import {
  issueAnzahlung,
  issueBalanceInvoice,
  issueInvoice,
  listInvoicesForEvent,
  remainingGrossCents,
  stornoInvoice,
} from "@/domain/invoice";
import { ANZAHLUNG_GROSS_CENTS, netFromGross, vatCents } from "@/domain/money";
import { SAMPLE_OFFER_21062026, saveOffer } from "@/domain/offer";
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

  it("issues Anzahlung as 1000 EUR gross (84034 net / 15966 MwSt)", async () => {
    const record = await createEvent(db, {
      coupleAName: SAMPLE_OFFER_21062026.coupleAName,
      coupleBName: SAMPLE_OFFER_21062026.coupleBName,
      eventDate: SAMPLE_OFFER_21062026.eventDate,
      email: "jana@example.com",
    });
    const issued = await issueAnzahlung(db, record.id, {
      now: new Date("2026-06-21T08:00:00.000Z"),
    });

    expect(issued.number).toBe("RE-2026-001");
    expect(issued.netCents).toBe(84_034);
    expect(issued.vatCents).toBe(15_966);
    expect(issued.grossCents).toBe(ANZAHLUNG_GROSS_CENTS);
    expect(issued.kind).toBe("invoice");
  });

  it("issues the remaining balance after Anzahlung against the offer gross", async () => {
    const record = await createEvent(db, {
      coupleAName: SAMPLE_OFFER_21062026.coupleAName,
      coupleBName: SAMPLE_OFFER_21062026.coupleBName,
      eventDate: SAMPLE_OFFER_21062026.eventDate,
      email: "jana@example.com",
    });
    await saveOffer(db, record.id, {
      issuedOn: SAMPLE_OFFER_21062026.issuedOn,
      lines: [...SAMPLE_OFFER_21062026.lines],
    });
    await issueAnzahlung(db, record.id, {
      now: new Date("2026-06-21T08:00:00.000Z"),
    });
    const rest = await issueBalanceInvoice(db, record.id, {
      now: new Date("2026-06-21T09:00:00.000Z"),
    });

    const remaining = 755_650 - ANZAHLUNG_GROSS_CENTS;
    expect(remainingGrossCents(755_650, [{ grossCents: ANZAHLUNG_GROSS_CENTS }])).toBe(
      remaining,
    );
    expect(rest.number).toBe("RE-2026-002");
    expect(rest.netCents).toBe(netFromGross(remaining));
    expect(rest.vatCents).toBe(vatCents(netFromGross(remaining)));
    expect(rest.grossCents).toBe(remaining);
    expect(rest.kind).toBe("invoice");
  });

  it("does not issue a second Anzahlung while one is open", async () => {
    const record = await createEvent(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      eventDate: "2026-08-29",
      email: "anna@example.com",
    });
    await issueAnzahlung(db, record.id, {
      now: new Date("2026-08-10T08:00:00.000Z"),
    });
    await expect(
      issueAnzahlung(db, record.id, {
        now: new Date("2026-08-10T09:00:00.000Z"),
      }),
    ).rejects.toThrow(/anzahlung already issued/);
    const rows = await listInvoicesForEvent(db, record.id);
    expect(rows).toHaveLength(1);
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
