import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createEvent } from "@/domain/event";
import { SAMPLE_OFFER_21062026, getOfferForEvent, saveOffer } from "@/domain/offer";
import { formatOfferNumber } from "@/domain/money";
import { offer as offerTable } from "@/db/schema";
import { closeTestDb, getTestDb, resetDomainTables, type TestDb } from "@/domain/pg-test";

describe("saveOffer", () => {
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

  it("stores a date-style number from the issue date, not the wedding date", async () => {
    const event = await createEvent(db, {
      coupleAName: SAMPLE_OFFER_21062026.coupleAName,
      coupleBName: SAMPLE_OFFER_21062026.coupleBName,
      eventDate: SAMPLE_OFFER_21062026.eventDate,
      email: "jana@example.com",
    });

    const saved = await saveOffer(db, event.id, {
      issuedOn: SAMPLE_OFFER_21062026.issuedOn,
      lines: [...SAMPLE_OFFER_21062026.lines],
    });

    expect(saved.number).toBe("21062026");
    expect(saved.number).toBe(formatOfferNumber(SAMPLE_OFFER_21062026.issuedOn));
    expect(saved.number).not.toBe(
      formatOfferNumber(SAMPLE_OFFER_21062026.eventDate),
    );
    expect(saved.number.startsWith("RE-")).toBe(false);
    expect(saved.netCents).toBe(635_000);
    expect(saved.vatCents).toBe(120_650);
    expect(saved.grossCents).toBe(755_650);

    const loaded = await getOfferForEvent(db, event.id);
    expect(loaded?.lines).toHaveLength(SAMPLE_OFFER_21062026.lines.length);
    expect(loaded?.event.coupleAName).toBe("Jana Hermes");
    expect(loaded?.event.coupleBName).toBe("Raphael Gerhards");
    expect(loaded?.event.eventDate).toBe("2027-07-24");
  });

  it("replaces lines when Vanessa adjusts the offer by hand", async () => {
    const event = await createEvent(db, {
      coupleAName: "Jana Hermes",
      coupleBName: "Raphael Gerhards",
      eventDate: "2027-07-24",
      email: "jana@example.com",
    });
    await saveOffer(db, event.id, {
      issuedOn: "2026-06-21",
      lines: [...SAMPLE_OFFER_21062026.lines],
    });

    const updated = await saveOffer(db, event.id, {
      issuedOn: "2026-06-21",
      lines: [
        {
          description: "Location Alte Hettnerfabrik, Fr 11:00 bis So 11:00",
          quantity: 1,
          unitNetCents: 200_000,
        },
        {
          description: "Service und Ausstattung",
          quantity: 1,
          unitNetCents: 400_000,
        },
      ],
    });

    expect(updated.netCents).toBe(600_000);
    expect(updated.vatCents).toBe(114_000);
    expect(updated.grossCents).toBe(714_000);

    const loaded = await getOfferForEvent(db, event.id);
    expect(loaded?.lines.map((line) => line.description)).toEqual([
      "Location Alte Hettnerfabrik, Fr 11:00 bis So 11:00",
      "Service und Ausstattung",
    ]);
  });

  it("gives a second offer issued the same day a unique -2 suffix", async () => {
    const jana = await createEvent(db, {
      coupleAName: SAMPLE_OFFER_21062026.coupleAName,
      coupleBName: SAMPLE_OFFER_21062026.coupleBName,
      eventDate: SAMPLE_OFFER_21062026.eventDate,
      email: "jana@example.com",
    });
    const mira = await createEvent(db, {
      coupleAName: "Mira",
      coupleBName: "Jonas",
      eventDate: "2027-08-14",
      email: "mira@example.com",
    });

    const first = await saveOffer(db, jana.id, {
      issuedOn: SAMPLE_OFFER_21062026.issuedOn,
      lines: [...SAMPLE_OFFER_21062026.lines],
    });
    const second = await saveOffer(db, mira.id, {
      issuedOn: SAMPLE_OFFER_21062026.issuedOn,
      lines: [...SAMPLE_OFFER_21062026.lines],
    });

    expect(first.number).toBe("21062026");
    expect(second.number).toBe("21062026-2");
    expect(second.number.startsWith("RE-")).toBe(false);

    let thrown: unknown;
    try {
      await db.insert(offerTable).values({
        eventId: (
          await createEvent(db, {
            coupleAName: "Lea",
            coupleBName: "Paul",
            email: "lea@example.com",
          })
        ).id,
        number: "21062026",
        issuedOn: "2026-06-21",
        netCents: 1000,
        vatCents: 190,
        grossCents: 1190,
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();
  });
});
