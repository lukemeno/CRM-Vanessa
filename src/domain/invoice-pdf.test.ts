import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createEvent } from "@/domain/event";
import {
  getInvoiceForEvent,
  invoicePdfModel,
  issueAnzahlung,
} from "@/domain/invoice";
import { SAMPLE_OFFER_21062026 } from "@/domain/offer";
import { BELEG_SENDER } from "@/domain/beleg";
import { closeTestDb, getTestDb, resetDomainTables, type TestDb } from "@/domain/pg-test";

describe("invoice PDF model", () => {
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

  it("puts RE-YYYY-NNN, couple, event date, Anzahlung line and 19% MwSt on the Beleg", async () => {
    const event = await createEvent(db, {
      coupleAName: SAMPLE_OFFER_21062026.coupleAName,
      coupleBName: SAMPLE_OFFER_21062026.coupleBName,
      eventDate: SAMPLE_OFFER_21062026.eventDate,
      email: "jana@example.com",
    });
    const issued = await issueAnzahlung(db, event.id, {
      now: new Date("2026-06-21T08:00:00.000Z"),
    });
    const record = await getInvoiceForEvent(db, event.id, issued.id);
    expect(record).not.toBeNull();
    const model = invoicePdfModel(record!);

    expect(model.number).toBe("RE-2026-001");
    expect(model.number).toMatch(/^RE-\d{4}-\d{3}$/);
    expect(model.heading).toBe("Anzahlung RE-2026-001");
    expect(model.coupleNames).toBe("Jana Hermes & Raphael Gerhards");
    expect(model.eventDateLabel).toBe("24.07.2027");
    expect(model.eventDateLabel).not.toMatch(/Event/i);
    expect(model.lines[0]?.description).toBe("Anzahlung");
    expect(model.vatPercent).toBe(19);
    expect(model.netCents).toBe(84_034);
    expect(model.vatCents).toBe(15_966);
    expect(model.grossCents).toBe(100_000);
    expect(model.sender).toEqual(BELEG_SENDER);
  });
});
