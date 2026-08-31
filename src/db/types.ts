import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type {
  PostgresJsDatabase,
  PostgresJsQueryResultHKT,
} from "drizzle-orm/postgres-js";
import type * as schema from "./schema";

export type AppSchema = typeof schema;
export type AppDb = PostgresJsDatabase<AppSchema>;
export type AppTx = PgTransaction<
  PostgresJsQueryResultHKT,
  AppSchema,
  ExtractTablesWithRelations<AppSchema>
>;
export type AppSession = AppDb | AppTx;
