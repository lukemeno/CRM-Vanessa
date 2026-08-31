import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { EVENT_STATUSES, event as eventTable } from "@/db/schema";
import {
  boardLostReason,
  changeInquiryStatus,
  createInquiry,
  EVENT_SOURCE_LABELS,
  EVENT_STATUS_LABELS,
  groupInquiriesByStatus,
  listInquiries,
} from "@/domain/inquiry";
import { closeTestDb, getTestDb, resetDomainTables, type TestDb } from "@/domain/pg-test";

describe("groupInquiriesByStatus", () => {
  it("keeps all seven status columns even when empty", () => {
    const grouped = groupInquiriesByStatus([]);
    expect(Object.keys(grouped)).toEqual([...EVENT_STATUSES]);
    for (const status of EVENT_STATUSES) {
      expect(grouped[status]).toEqual([]);
    }
  });

  it("uses the German board labels", () => {
    expect(EVENT_STATUS_LABELS).toEqual({
      new: "Neu",
      viewing: "Besichtigung",
      offer: "Angebot",
      booked: "Gebucht",
      planning: "Planung",
      done: "Erledigt",
      lost: "Verloren",
    });
    expect(EVENT_SOURCE_LABELS.manual).toBe("Manuell");
    expect(EVENT_SOURCE_LABELS.website).toBe("Website");
    expect(EVENT_SOURCE_LABELS.bridebook).toBe("Bridebook");
    expect(EVENT_SOURCE_LABELS.other).toBe("Sonstiges");
  });

  it("shows the lost reason only for Verloren cards", () => {
    expect(
      boardLostReason({ status: "new", lostReason: null }),
    ).toBeNull();
    expect(
      boardLostReason({
        status: "viewing",
        lostReason: "should not appear",
      }),
    ).toBeNull();
    expect(
      boardLostReason({
        status: "lost",
        lostReason: "Paar hat abgesagt",
      }),
    ).toBe("Paar hat abgesagt");
  });
});

describe("create inquiry", () => {
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

  it("creates an inquiry in status new with default source manual", async () => {
    const row = await createInquiry(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      email: "anna@example.com",
    });

    expect(row.status).toBe("new");
    expect(row.coupleAName).toBe("Anna");
    expect(row.coupleBName).toBe("Ben");
    expect(row.source).toBe("manual");
    expect(row.eventDate).toBeNull();
    expect(row.guestCount).toBeNull();
    expect(row.note).toBeNull();
    expect(row.lostReason).toBeNull();
    expect(row.email).toBe("anna@example.com");
    expect(row.phone).toBeNull();
  });

  it("stores optional date, guests, source, and note", async () => {
    const row = await createInquiry(db, {
      coupleAName: "Clara",
      coupleBName: "Dana",
      eventDate: "2026-09-12",
      guestCount: 80,
      source: "website",
      note: "Über das Kontaktformular",
      email: "clara@example.com",
      phone: "02253 123456",
    });

    expect(row.eventDate).toBe("2026-09-12");
    expect(row.guestCount).toBe(80);
    expect(row.source).toBe("website");
    expect(row.note).toBe("Über das Kontaktformular");
    expect(row.status).toBe("new");
    expect(row.email).toBe("clara@example.com");
    expect(row.phone).toBe("02253 123456");
  });

  it("accepts phone without email", async () => {
    const row = await createInquiry(db, {
      coupleAName: "Eva",
      coupleBName: "Finn",
      phone: "0171 0000000",
    });
    expect(row.email).toBeNull();
    expect(row.phone).toBe("0171 0000000");
  });

  it("rejects blank couple names", async () => {
    await expect(
      createInquiry(db, {
        coupleAName: "  ",
        coupleBName: "Ben",
        email: "anna@example.com",
      }),
    ).rejects.toThrow(/couple names required/);
  });

  it("requires at least email or phone", async () => {
    await expect(
      createInquiry(db, {
        coupleAName: "Anna",
        coupleBName: "Ben",
      }),
    ).rejects.toThrow(/email or phone required/);

    await expect(
      createInquiry(db, {
        coupleAName: "Anna",
        coupleBName: "Ben",
        email: "  ",
        phone: "",
      }),
    ).rejects.toThrow(/email or phone required/);
  });
});

describe("inquiry status change", () => {
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

  it("requires lost_reason when moving to lost", async () => {
    const row = await createInquiry(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      email: "anna@example.com",
    });

    await expect(
      changeInquiryStatus(db, row.id, "lost"),
    ).rejects.toThrow(/lost_reason required/);

    await expect(
      changeInquiryStatus(db, row.id, "lost", "   "),
    ).rejects.toThrow(/lost_reason required/);

    const [unchanged] = await db
      .select()
      .from(eventTable)
      .where(eq(eventTable.id, row.id));
    expect(unchanged?.status).toBe("new");
    expect(unchanged?.lostReason).toBeNull();
  });

  it("stores lost_reason when moving to lost", async () => {
    const row = await createInquiry(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      email: "anna@example.com",
    });

    await changeInquiryStatus(db, row.id, "lost", "Paar hat abgesagt");

    const [lost] = await db
      .select()
      .from(eventTable)
      .where(eq(eventTable.id, row.id));
    expect(lost?.status).toBe("lost");
    expect(lost?.lostReason).toBe("Paar hat abgesagt");
  });

  it("clears lost_reason when leaving lost", async () => {
    const row = await createInquiry(db, {
      coupleAName: "Anna",
      coupleBName: "Ben",
      email: "anna@example.com",
    });
    await changeInquiryStatus(db, row.id, "lost", "Unsicher");

    await changeInquiryStatus(db, row.id, "viewing");

    const [again] = await db
      .select()
      .from(eventTable)
      .where(eq(eventTable.id, row.id));
    expect(again?.status).toBe("viewing");
    expect(again?.lostReason).toBeNull();
  });

  it("lists inquiries into all seven columns", async () => {
    await createInquiry(db, {
      coupleAName: "Eva",
      coupleBName: "Finn",
      email: "eva@example.com",
    });
    const viewing = await createInquiry(db, {
      coupleAName: "Gia",
      coupleBName: "Hugo",
      phone: "0171 1111111",
    });
    await changeInquiryStatus(db, viewing.id, "viewing");

    const grouped = groupInquiriesByStatus(await listInquiries(db));
    expect(grouped.new).toHaveLength(1);
    expect(grouped.viewing).toHaveLength(1);
    expect(grouped.offer).toHaveLength(0);
    expect(grouped.booked).toHaveLength(0);
    expect(grouped.planning).toHaveLength(0);
    expect(grouped.done).toHaveLength(0);
    expect(grouped.lost).toHaveLength(0);
  });
});
