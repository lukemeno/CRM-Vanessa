import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusForm } from "@/app/(app)/anfragen/status-form";
import { AddAppointmentForm } from "@/app/(app)/anfragen/[id]/add-appointment-form";
import { ContactForm } from "@/app/(app)/anfragen/[id]/contact-form";
import { GuestCountForm } from "@/app/(app)/anfragen/[id]/guest-count-form";
import { NoteForm } from "@/app/(app)/anfragen/[id]/note-form";
import { OfferForm } from "@/app/(app)/anfragen/[id]/offer-form";
import { ReservedUntilForm } from "@/app/(app)/anfragen/[id]/reserved-until-form";
import { db } from "@/db/client";
import {
  APPOINTMENT_KIND_LABELS,
  bookedLocationWindowCopy,
  listAppointments,
} from "@/domain/calendar";
import { isGuestCountLocked, stornoWindowCopy } from "@/domain/eventakte";
import { EVENT_SOURCE_LABELS, getInquiry } from "@/domain/inquiry";
import { getOfferForEvent } from "@/domain/offer";
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
    return { title: "Anfrage" };
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
  const booked =
    inquiry.status === "booked" ||
    inquiry.status === "planning" ||
    inquiry.status === "done";
  const offer = await getOfferForEvent(db, inquiry.id);

  return (
    <>
      <p className="text-sm text-olive/80">
        <Link href="/anfragen" className="hover:text-olive-dark">
          ← Anfragen
        </Link>
      </p>
      <h1 className="mt-6 font-serif text-3xl text-olive">
        {inquiry.coupleAName} & {inquiry.coupleBName}
      </h1>

      <div className="mt-8 rounded-2xl bg-paper px-10 py-8 shadow-[0_10px_30px_rgba(90,80,50,0.06)] max-lg:px-4 max-lg:py-5">
        <div className="grid grid-cols-2 gap-x-16 gap-y-8 max-lg:grid-cols-1">
          <div className="space-y-6">
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-olive-dark/80">Datum</dt>
                <dd className="mt-1 text-sm text-olive-dark">
                  {inquiry.eventDate
                    ? formatCalendarDate(inquiry.eventDate)
                    : "Kein Datum."}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-olive-dark/80">Quelle</dt>
                <dd className="mt-1 text-sm text-olive-dark">
                  {EVENT_SOURCE_LABELS[inquiry.source]}
                </dd>
              </div>
              {inquiry.status === "lost" ? (
                <div>
                  <dt className="text-sm text-olive-dark/80">Grund</dt>
                  <dd className="mt-1 text-sm text-olive-dark">
                    {inquiry.lostReason?.trim() || "—"}
                  </dd>
                </div>
              ) : null}
            </dl>
            <ContactForm
              eventId={inquiry.id}
              email={inquiry.email}
              phone={inquiry.phone}
            />
            <GuestCountForm
              eventId={inquiry.id}
              guestCount={inquiry.guestCount}
              locked={guestLocked}
            />
          </div>

          <div>
            <StatusForm eventId={inquiry.id} status={inquiry.status} />
            {inquiry.status === "offer" ? (
              <div className="mt-8">
                <ReservedUntilForm
                  eventId={inquiry.id}
                  reservedUntil={inquiry.reservedUntil}
                />
              </div>
            ) : inquiry.reservedUntil ? (
              <p className="mt-4 text-sm text-olive/80">
                Reserviert bis {formatBerlinDateTime(inquiry.reservedUntil)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-10 border-t border-olive/10 pt-8">
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
                : []
            }
          />
        </div>

        <div className="mt-10 grid grid-cols-2 gap-x-16 gap-y-8 border-t border-olive/10 pt-8 max-lg:grid-cols-1">
          <div className="space-y-3">
            {booked && inquiry.eventDate ? (
              <p className="text-sm text-olive-dark">
                Standortfenster: {bookedLocationWindowCopy()}
              </p>
            ) : null}
            {inquiry.eventDate ? (
              <p className="text-sm text-olive-dark">
                {stornoWindowCopy(inquiry.eventDate)}
              </p>
            ) : null}
          </div>

          <div>
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
          </div>
        </div>

        <div className="mt-10 border-t border-olive/10 pt-8">
          <NoteForm eventId={inquiry.id} note={inquiry.note} />
        </div>
      </div>
    </>
  );
}
