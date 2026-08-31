import path from "node:path";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@/db/schema";

const DEFAULT_TEST_DATABASE_URL =
  "postgres://postgres:postgres@127.0.0.1:5432/crm_vanessa_test";

export function testDatabaseUrl(): string {
  return process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
}

export type TestDb = ReturnType<typeof drizzle<typeof schema, postgres.Sql>>;

let client: ReturnType<typeof postgres> | undefined;
let db: TestDb | undefined;
let migrated = false;

export async function getTestDb(): Promise<TestDb> {
  if (!client) {
    client = postgres(testDatabaseUrl(), { max: 8, onnotice: () => {} });
    db = drizzle(client, { schema });
  }
  if (!db) {
    throw new Error("test db client failed to initialise");
  }
  if (!migrated) {
    await migrate(db, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    });
    migrated = true;
  }
  return db;
}

export async function resetDomainTables(database: TestDb): Promise<void> {
  await database.execute(sql`
    truncate table
      "calendar_block",
      "appointment",
      "offer_line",
      "offer",
      "invoice",
      "invoice_counter",
      "event"
    restart identity cascade
  `);
}

export async function closeTestDb(): Promise<void> {
  if (client) {
    await client.end();
    client = undefined;
    db = undefined;
    migrated = false;
  }
}
