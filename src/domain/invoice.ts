import { eq, sql } from "drizzle-orm";
import { invoice, invoiceCounter } from "@/db/schema";
import type { AppDb } from "@/db/types";
import { grossCents, vatCents } from "@/domain/money";
import { yearInTimeZone } from "@/lib/timezone";

export function formatInvoiceNumber(year: number, n: number): string {
  return `RE-${year}-${String(n).padStart(3, "0")}`;
}

export async function issueInvoice(
  db: AppDb,
  input: {
    eventId: string;
    netCents: number;
    now: Date;
    kind?: "invoice" | "storno";
    stornoOfId?: string | null;
  },
) {
  const year = yearInTimeZone(input.now);
  const netCents = input.netCents;
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      insert into invoice_counter (year, last_n)
      values (${year}, 0)
      on conflict (year) do nothing
    `);
    const locked = await tx.execute(sql`
      select last_n from invoice_counter where year = ${year} for update
    `);
    const rows = locked as unknown as { last_n: number }[];
    const lastN = Number(rows[0]?.last_n ?? 0);
    const next = lastN + 1;
    await tx
      .update(invoiceCounter)
      .set({ lastN: next })
      .where(eq(invoiceCounter.year, year));
    const [row] = await tx
      .insert(invoice)
      .values({
        eventId: input.eventId,
        number: formatInvoiceNumber(year, next),
        kind: input.kind ?? "invoice",
        stornoOfId: input.stornoOfId ?? null,
        netCents,
        vatCents: vatCents(netCents),
        grossCents: grossCents(netCents),
      })
      .returning();
    if (!row) {
      throw new Error("invoice insert returned no row");
    }
    return row;
  });
}

export async function stornoInvoice(
  db: AppDb,
  invoiceId: string,
  opts: { now: Date },
) {
  const [original] = await db
    .select()
    .from(invoice)
    .where(eq(invoice.id, invoiceId));
  if (!original) {
    throw new Error("invoice not found");
  }
  if (original.kind === "storno") {
    throw new Error("cannot storno a storno");
  }
  return issueInvoice(db, {
    eventId: original.eventId,
    netCents: -original.netCents,
    now: opts.now,
    kind: "storno",
    stornoOfId: original.id,
  });
}
