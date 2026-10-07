import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { StatusForm } from "@/app/(app)/anfragen/status-form";
import {
  EVENT_SOURCE_LABELS,
  EVENT_STATUS_LABELS,
  getInquiry,
} from "@/domain/inquiry";
import { formatCalendarDate } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inquiry = await getInquiry(db, id);
  if (!inquiry) {
    return { title: "Anfrage" };
  }
  return {
    title: `${inquiry.coupleAName} & ${inquiry.coupleBName}`,
  };
}

export default async function AnfragePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inquiry = await getInquiry(db, id);
  if (!inquiry) {
    notFound();
  }

  return (
    <>
      <p className="text-sm text-olive/80">
        <Link href="/anfragen" className="hover:text-olive-dark">
          ← Anfragen
        </Link>
      </p>
      <h1 className="mt-3 font-serif text-3xl text-olive">
        {inquiry.coupleAName} & {inquiry.coupleBName}
      </h1>
      <p className="mt-2 text-sm text-foreground/80">
        Status: {EVENT_STATUS_LABELS[inquiry.status]}
      </p>

      <dl className="mt-8 max-w-xl space-y-3 rounded-2xl bg-paper px-6 py-5 shadow-[0_10px_30px_rgba(90,80,50,0.06)]">
        <SummaryRow
          label="Datum"
          value={
            inquiry.eventDate ? formatCalendarDate(inquiry.eventDate) : "—"
          }
        />
        <SummaryRow
          label="Gäste"
          value={
            inquiry.guestCount != null ? String(inquiry.guestCount) : "—"
          }
        />
        <SummaryRow
          label="Quelle"
          value={EVENT_SOURCE_LABELS[inquiry.source]}
        />
        <SummaryRow label="Notiz" value={inquiry.note?.trim() || "—"} />
        {inquiry.status === "lost" ? (
          <SummaryRow label="Grund" value={inquiry.lostReason ?? "—"} />
        ) : null}
      </dl>

      <StatusForm eventId={inquiry.id} status={inquiry.status} />
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-olive/70">{label}</dt>
      <dd className="mt-1 text-sm text-olive-dark">{value}</dd>
    </div>
  );
}
