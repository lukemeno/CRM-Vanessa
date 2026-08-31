import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import { tstzrange } from "./tstzrange";

/** Auth.js tables plus v1 domain tables (event, offer, invoice, appointment, calendar_block). */

export const EVENT_STATUSES = [
  "new",
  "viewing",
  "offer",
  "booked",
  "planning",
  "done",
  "lost",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_SOURCES = [
  "website",
  "bridebook",
  "manual",
  "other",
] as const;
export type EventSource = (typeof EVENT_SOURCES)[number];

export const APPOINTMENT_KINDS = ["viewing", "planning"] as const;
export type AppointmentKind = (typeof APPOINTMENT_KINDS)[number];

export const CALENDAR_BLOCK_SOURCES = [
  "booked",
  "viewing",
  "planning",
  "reserved",
] as const;
export type CalendarBlockSource = (typeof CALENDAR_BLOCK_SOURCES)[number];

export const INVOICE_KINDS = ["invoice", "storno"] as const;
export type InvoiceKind = (typeof INVOICE_KINDS)[number];

export const eventStatusEnum = pgEnum("event_status", [...EVENT_STATUSES]);
export const eventSourceEnum = pgEnum("event_source", [...EVENT_SOURCES]);
export const appointmentKindEnum = pgEnum("appointment_kind", [
  ...APPOINTMENT_KINDS,
]);
export const calendarBlockSourceEnum = pgEnum("calendar_block_source", [
  ...CALENDAR_BLOCK_SOURCES,
]);
export const invoiceKindEnum = pgEnum("invoice_kind", [...INVOICE_KINDS]);
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ],
);

export const authenticators = pgTable(
  "authenticator",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: boolean("credentialBackedUp").notNull(),
    transports: text("transports"),
  },
  (authenticator) => [
    primaryKey({
      columns: [authenticator.userId, authenticator.credentialID],
    }),
  ],
);

const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

export const event = pgTable(
  "event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    coupleAName: text("couple_a_name").notNull(),
    coupleBName: text("couple_b_name").notNull(),
    status: eventStatusEnum("status").notNull().default("new"),
    lostReason: text("lost_reason"),
    reservedUntil: timestamptz("reserved_until"),
    guestCount: integer("guest_count"),
    quotedNetCents: integer("quoted_net_cents"),
    eventDate: date("event_date", { mode: "string" }),
    source: eventSourceEnum("source").notNull().default("manual"),
    note: text("note"),
    email: text("email"),
    phone: text("phone"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "event_lost_reason",
      sql`(
        (${table.status} = 'lost' AND ${table.lostReason} IS NOT NULL AND btrim(${table.lostReason}) <> '')
        OR
        (${table.status} <> 'lost' AND ${table.lostReason} IS NULL)
      )`,
    ),
    check(
      "event_guest_count_nonnegative",
      sql`${table.guestCount} IS NULL OR ${table.guestCount} >= 0`,
    ),
    check(
      "event_quoted_net_cents_nonnegative",
      sql`${table.quotedNetCents} IS NULL OR ${table.quotedNetCents} >= 0`,
    ),
  ],
);

export const appointment = pgTable(
  "appointment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    kind: appointmentKindEnum("kind").notNull(),
    period: tstzrange("period").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "appointment_viewing_is_60_minutes",
      sql`${table.kind} <> 'viewing' OR (upper(${table.period}) - lower(${table.period}) = interval '60 minutes')`,
    ),
  ],
);

/**
 * Sole overlap table. The gist exclusion lives in the SQL migration
 * (`EXCLUDE USING gist (period WITH &&) WHERE (blocks_calendar)`).
 * Range gist is built into Postgres; btree_gist is not required.
 */
export const calendarBlock = pgTable("calendar_block", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => event.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").references(() => appointment.id, {
    onDelete: "cascade",
  }),
  period: tstzrange("period").notNull(),
  blocksCalendar: boolean("blocks_calendar").notNull(),
  source: calendarBlockSourceEnum("source").notNull(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const invoiceCounter = pgTable("invoice_counter", {
  year: integer("year").primaryKey(),
  lastN: integer("last_n").notNull().default(0),
});

export const offer = pgTable(
  "offer",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .unique()
      .references(() => event.id, { onDelete: "cascade" }),
    number: text("number").notNull().unique(),
    issuedOn: date("issued_on", { mode: "string" }).notNull(),
    netCents: integer("net_cents").notNull(),
    vatCents: integer("vat_cents").notNull(),
    grossCents: integer("gross_cents").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "offer_gross_matches_parts",
      sql`${table.grossCents} = ${table.netCents} + ${table.vatCents}`,
    ),
    check(
      "offer_net_cents_nonnegative",
      sql`${table.netCents} >= 0`,
    ),
  ],
);

export const offerLine = pgTable(
  "offer_line",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offer.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull(),
    unitNetCents: integer("unit_net_cents").notNull(),
  },
  (table) => [
    check(
      "offer_line_quantity_positive",
      sql`${table.quantity} >= 1`,
    ),
    check(
      "offer_line_unit_net_cents_nonnegative",
      sql`${table.unitNetCents} >= 0`,
    ),
    check(
      "offer_line_description_present",
      sql`btrim(${table.description}) <> ''`,
    ),
  ],
);

export const invoice = pgTable(
  "invoice",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "restrict" }),
    number: text("number").notNull().unique(),
    kind: invoiceKindEnum("kind").notNull().default("invoice"),
    stornoOfId: uuid("storno_of_id"),
    netCents: integer("net_cents").notNull(),
    vatCents: integer("vat_cents").notNull(),
    grossCents: integer("gross_cents").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "invoice_storno_of",
      sql`(
        (${table.kind} = 'storno' AND ${table.stornoOfId} IS NOT NULL)
        OR
        (${table.kind} = 'invoice' AND ${table.stornoOfId} IS NULL)
      )`,
    ),
    check(
      "invoice_gross_matches_parts",
      sql`${table.grossCents} = ${table.netCents} + ${table.vatCents}`,
    ),
  ],
);
