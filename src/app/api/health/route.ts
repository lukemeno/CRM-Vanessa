import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, postgres: "connected" });
  } catch {
    return NextResponse.json(
      { ok: false, postgres: "disconnected" },
      { status: 503 },
    );
  }
}
