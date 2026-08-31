import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { StatusForm } from "@/app/(app)/anfragen/status-form";
import { AddAppointmentForm } from "@/app/(app)/anfragen/[id]/add-appointment-form";
import { GuestCountForm } from "@/app/(app)/anfragen/[id]/guest-count-form";
import { NoteForm } from "@/app/(app)/anfragen/[id]/note-form";
import { ReservedUntilForm } from "@/app/(app)/anfragen/[id]/reserved-until-form";
import { OfferForm } from "@/app/(app)/anfragen/[id]/offer-form";
import { db } from "@/db/client";
import {
  APPOINTMENT_KIND_LABELS,
  listAppointments,
} from "@/domain/calendar";
import {
  bookedLocationWindowCopy,
  isGuestCountLocked,
  stornoWindowCopy,
} from "@/domain/eventakte";
import {
  EVENT_SOURCE_LABELS,
  EVENT_STATUS_LABELS,
  getInquiry,
} from "@/domain/inquiry";
import { SAMPLE_CATALOG_LINES, getOfferForEvent } from "@/domain/offer";
import {
  calendarYmd,
  formatBerlinDateTime,
  formatBerlinTime,
  formatCalendarDate,
} from "@/lib/timezone";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inquiry = await getInquiry(db, id);
  if (!inquiry) {
    return { title: "Eventakte" };
  }
  return {
    title: `${inquiry.coupleAName} & ${inquiry.coupleBName}`,
  };
}

export default async function EventaktePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inquiry = await getInquiry(db, id);
  if (!inquiry) {
    notFound();
  }

  const now = new Date();
  const appointments = await listAppointments(db, inquiry.id);
  const guestLocked = isGuestCountLocked(inquiry.eventDate, now);
  const booked = inquiry.status === "booked" || inquiry.status === "planning" || inquiry.status === "done";
  const offer = await getOfferForEvent(db, inquiry.id);

  return (
    <>
      <p className="text-sm text-olive/80">
        <Link href="/anfragen" className="hover:text-olive-dark">
          ← Anfragen
        </Link>
      </p>
      <p className="mt-4 font-script text-2xl text-olive">Eventakte</p>
      <h1 className="mt-1 font-serif text-3xl text-olive">
        {inquiry.coupleAName} & {inquiry.coupleBName}
      </h1>
      <p className="mt-2 text-sm text-foreground/80">
        Status: {EVENT_STATUS_LABELS[inquiry.status]}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-5 max-lg:grid-cols-1">
        <PaperCard title="Paar">
          <dl className="space-y-3">
            <SummaryRow
              label="Datum"
              value={
                inquiry.eventDate
                  ? formatCalendarDate(inquiry.eventDate)
                  : "Kein Datum."
              }
            />
            <SummaryRow
              label="Quelle"
              value={EVENT_SOURCE_LABELS[inquiry.source]}
            />
            <SummaryRow
              label="E-Mail"
              value={inquiry.email?.trim() || "Keine E-Mail."}
            />
            <SummaryRow
              label="Telefon"
              value={inquiry.phone?.trim() || "Kein Telefon."}
            />
            {inquiry.status === "lost" ? (
              <SummaryRow
                label="Grund"
                value={inquiry.lostReason?.trim() || "—"}
              />
            ) : null}
          </dl>
          <div className="mt-6">
            <GuestCountForm
              eventId={inquiry.id}
              guestCount={inquiry.guestCount}
              locked={guestLocked}
            />
          </div>
        </PaperCard>

        <PaperCard title="Status">
          <StatusForm eventId={inquiry.id} status={inquiry.status} />
          {inquiry.status === "offer" ? (
            <div className="mt-8 border-t border-olive/10 pt-6">
              <ReservedUntilForm
                eventId={inquiry.id}
                reservedUntil={inquiry.reservedUntil}
              />
            </div>
          ) : inquiry.reservedUntil ? (
            <p className="mt-4 text-sm text-olive/80">
              Reserviert bis{" "}
              {formatBerlinDateTime(inquiry.reservedUntil)}
            </p>
          ) : null}
        </PaperCard>

        <PaperCard title="Angebot" wide>
          <OfferForm
            eventId={inquiry.id}
            issuedOn={offer?.issuedOn ?? calendarYmd(now)}
            offerNumber={offer?.number ?? null}
            lines={
              offer
                ? offer.lines.map((line) => ({
                    description: line.description,
                    quantity: line.quantity,
                    unitNetCents: line.unitNetCents,
                  }))
                : SAMPLE_CATALOG_LINES
            }
          />
        </PaperCard>

        <PaperCard title="Standort und Storno">
          {booked && inquiry.eventDate ? (
            <p className="text-sm text-olive-dark">
              Standortfenster: {bookedLocationWindowCopy()}
            </p>
          ) : (
            <p className="text-sm text-olive/70">Noch nicht gebucht.</p>
          )}
          {inquiry.eventDate ? (
            <p className="mt-3 text-sm text-olive-dark">
              {stornoWindowCopy(inquiry.eventDate)}
            </p>
          ) : (
            <p className="mt-3 text-sm text-olive/70">
              Storno-Frist erscheint nach dem Eventdatum.
            </p>
          )}
        </PaperCard>

        <PaperCard title="Termine">
          {appointments.length === 0 ? (
            <p className="text-sm text-olive/70">Keine Termine.</p>
          ) : (
            <ul className="space-y-3">
              {appointments.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-olive/10 bg-cream px-4 py-3"
                >
                  <p className="text-sm font-medium text-olive-dark">
                    {APPOINTMENT_KIND_LABELS[item.kind]}
                  </p>
                  <p className="mt-1 text-sm text-olive/80">
                    {formatBerlinDateTime(item.period.start)} –{" "}
                    {formatBerlinTime(item.period.end)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <AddAppointmentForm eventId={inquiry.id} />
        </PaperCard>

        <PaperCard title="Notiz">
          <NoteForm eventId={inquiry.id} note={inquiry.note} />
        </PaperCard>
      </div>
    </>
  );
}

function PaperCard({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl bg-paper px-6 py-5 shadow-[0_10px_30px_rgba(90,80,50,0.06)] ${wide ? "col-span-2 max-lg:col-span-1" : ""}`}
    >
      <h2 className="font-serif text-xl text-olive">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
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
