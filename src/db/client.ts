import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL ist nicht gesetzt. Kopiere .env.example nach .env.local.",
    );
  }
  return url;
}

const globalForDb = globalThis as unknown as {
  postgres?: ReturnType<typeof postgres>;
};

function getClient() {
  if (!globalForDb.postgres) {
    globalForDb.postgres = postgres(requireDatabaseUrl());
  }
  return globalForDb.postgres;
}

export const db = drizzle(getClient(), { schema });
