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
  remainingInvoiceParts,
  stornoInvoice,
} from "@/domain/invoice";
import { ANZAHLUNG_GROSS_CENTS, grossCents, vatCents } from "@/domain/money";
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
    expect(issued.description).toBe("Anzahlung");
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

    const remaining = remainingInvoiceParts(
      { netCents: 635_000, vatCents: 120_650, grossCents: 755_650 },
      [{ netCents: 84_034, vatCents: 15_966, grossCents: ANZAHLUNG_GROSS_CENTS }],
    );
    expect(remainingGrossCents(755_650, [{ grossCents: ANZAHLUNG_GROSS_CENTS }])).toBe(
      remaining.grossCents,
    );
    expect(rest.number).toBe("RE-2026-002");
    expect(rest.description).toBe("Restzahlung");
    expect(rest.netCents).toBe(635_000 - 84_034);
    expect(rest.vatCents).toBe(120_650 - 15_966);
    expect(rest.grossCents).toBe(755_650 - ANZAHLUNG_GROSS_CENTS);
    expect(rest.netCents + rest.vatCents).toBe(rest.grossCents);
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

  it("issues Restzahlung from offer parts when leftover gross cannot invert", async () => {
    const record = await createEvent(db, {
      coupleAName: "Lea",
      coupleBName: "Paul",
      eventDate: "2027-08-14",
      email: "lea@example.com",
    });
    await saveOffer(db, record.id, {
      issuedOn: "2026-06-21",
      lines: [
        {
          description: "Location Alte Hettnerfabrik, Fr 11:00 bis So 11:00",
          quantity: 1,
          unitNetCents: 100_005,
        },
      ],
    });
    await issueAnzahlung(db, record.id, {
      now: new Date("2026-06-21T08:00:00.000Z"),
    });
    const rest = await issueBalanceInvoice(db, record.id, {
      now: new Date("2026-06-21T09:00:00.000Z"),
    });

    expect(rest.description).toBe("Restzahlung");
    expect(rest.netCents).toBe(100_005 - 84_034);
    expect(rest.vatCents).toBe(vatCents(100_005) - 15_966);
    expect(rest.grossCents).toBe(grossCents(100_005) - ANZAHLUNG_GROSS_CENTS);
    expect(rest.netCents + rest.vatCents).toBe(rest.grossCents);
  });

  it("does not issue Anzahlung when remaining is below 1.000 €", async () => {
    const record = await createEvent(db, {
      coupleAName: "Mira",
      coupleBName: "Jonas",
      eventDate: "2027-08-14",
      email: "mira@example.com",
    });
    await saveOffer(db, record.id, {
      issuedOn: SAMPLE_OFFER_21062026.issuedOn,
      lines: [...SAMPLE_OFFER_21062026.lines],
    });
    await issueBalanceInvoice(db, record.id, {
      now: new Date("2026-06-21T08:00:00.000Z"),
    });
    await expect(
      issueAnzahlung(db, record.id, {
        now: new Date("2026-06-21T09:00:00.000Z"),
      }),
    ).rejects.toThrow(/nothing remaining/);
  });

  it("keeps a 1.000 € Restzahlung labeled Restzahlung", async () => {
    const record = await createEvent(db, {
      coupleAName: "Eva",
      coupleBName: "Tim",
      eventDate: "2027-08-14",
      email: "eva@example.com",
    });
    await saveOffer(db, record.id, {
      issuedOn: "2026-06-21",
      lines: [
        {
          description: "Location Alte Hettnerfabrik, Fr 11:00 bis So 11:00",
          quantity: 1,
          unitNetCents: 84_034,
        },
      ],
    });
    const rest = await issueBalanceInvoice(db, record.id, {
      now: new Date("2026-06-21T08:00:00.000Z"),
    });
    expect(rest.description).toBe("Restzahlung");
    expect(rest.grossCents).toBe(ANZAHLUNG_GROSS_CENTS);
    const rows = await listInvoicesForEvent(db, record.id);
    expect(rows[0]?.description).toBe("Restzahlung");
  });

  it("rejects a second storno of the same invoice at the unique constraint", async () => {
    const record = await createEvent(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      eventDate: "2026-08-29",
      email: "anna@example.com",
    });
    const original = await issueInvoice(db, {
      eventId: record.id,
      netCents: 10_000,
      now: new Date("2026-08-10T08:00:00.000Z"),
    });
    await stornoInvoice(db, original.id, {
      now: new Date("2026-08-10T09:00:00.000Z"),
    });
    await expect(
      stornoInvoice(db, original.id, {
        now: new Date("2026-08-10T10:00:00.000Z"),
      }),
    ).rejects.toThrow(/already stornoed/);

    let thrown: unknown;
    try {
      await db.insert(invoiceTable).values({
        eventId: record.id,
        number: "RE-2026-009",
        kind: "storno",
        stornoOfId: original.id,
        description: `Storno zu ${original.number}`,
        netCents: -10_000,
        vatCents: -1_900,
        grossCents: -11_900,
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();
  });

  it("rejects updates to invoice description", async () => {
    const record = await createEvent(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      eventDate: "2026-08-29",
      email: "anna@example.com",
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
        .set({ description: "Geändert" })
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
