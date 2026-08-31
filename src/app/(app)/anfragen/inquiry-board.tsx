import Link from "next/link";
import { EVENT_STATUSES } from "@/db/schema";
import {
  EVENT_SOURCE_LABELS,
  EVENT_STATUS_LABELS,
  boardLostReason,
  type Inquiry,
} from "@/domain/inquiry";
import { formatCalendarDate } from "@/lib/timezone";

export function InquiryBoard({
  grouped,
}: {
  grouped: Record<(typeof EVENT_STATUSES)[number], Inquiry[]>;
}) {
  return (
    <div className="mt-8 flex min-h-[36rem] gap-3">
      {EVENT_STATUSES.map((status) => {
        const inquiries = grouped[status];
        return (
          <section
            key={status}
            className="flex w-52 shrink-0 flex-col rounded-2xl bg-paper px-3 py-4 shadow-[0_10px_30px_rgba(90,80,50,0.06)]"
          >
            <header className="flex items-baseline justify-between gap-2 px-1">
              <h2 className="font-serif text-lg text-olive">
                {EVENT_STATUS_LABELS[status]}
              </h2>
              <span className="text-xs text-olive/70">{inquiries.length}</span>
            </header>

            <ul className="mt-3 flex min-h-40 flex-1 flex-col gap-2">
              {inquiries.length === 0 ? (
                <li className="rounded-xl border border-dashed border-olive/15 px-3 py-4 text-sm text-olive/50">
                  Keine Anfragen
                </li>
              ) : (
                inquiries.map((inquiry) => (
                  <li key={inquiry.id}>
                    <InquiryCard inquiry={inquiry} />
                  </li>
                ))
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function InquiryCard({ inquiry }: { inquiry: Inquiry }) {
  const lostReason = boardLostReason(inquiry);
  return (
    <Link
      href={`/anfragen/${inquiry.id}`}
      className="block rounded-xl border border-olive/10 bg-cream px-3 py-3 text-sm text-olive-dark transition hover:border-olive/30 hover:bg-cream/80"
    >
      <p className="font-medium leading-snug">
        {inquiry.coupleAName} & {inquiry.coupleBName}
      </p>
      {inquiry.eventDate ? (
        <p className="mt-1 text-xs text-olive/80">
          {formatCalendarDate(inquiry.eventDate)}
        </p>
      ) : null}
      {inquiry.guestCount != null ? (
        <p className="mt-1 text-xs text-olive/80">{inquiry.guestCount} Gäste</p>
      ) : null}
      <p className="mt-1 text-xs text-olive/70">
        {EVENT_SOURCE_LABELS[inquiry.source]}
      </p>
      {inquiry.email ? (
        <p className="mt-1 truncate text-xs text-olive/80">{inquiry.email}</p>
      ) : null}
      {inquiry.phone ? (
        <p className="mt-1 truncate text-xs text-olive/80">{inquiry.phone}</p>
      ) : null}
      {lostReason ? (
        <p className="mt-1 truncate text-xs text-olive/80">{lostReason}</p>
      ) : null}
    </Link>
  );
}
