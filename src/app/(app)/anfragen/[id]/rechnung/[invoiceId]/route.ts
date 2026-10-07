import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { isEmailAllowed } from "@/lib/auth";
import { getInvoiceForEvent, invoicePdfModel } from "@/domain/invoice";
import { renderInvoicePdf } from "@/pdf/render-offer-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; invoiceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.email || !isEmailAllowed(session.user.email)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id, invoiceId } = await params;
  const record = await getInvoiceForEvent(db, id, invoiceId);
  if (!record) {
    notFound();
  }

  const pdf = await renderInvoicePdf(invoicePdfModel(record));
  const filename = `Rechnung-${record.number}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
