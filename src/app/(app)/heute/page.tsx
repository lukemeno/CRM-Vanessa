import { HeuteSection } from "@/app/(app)/heute/heute-section";
import { db } from "@/db/client";
import { loadHeute } from "@/domain/heute";
import { calendarYmd } from "@/lib/timezone";

export const metadata = {
  title: "Heute",
};

export const dynamic = "force-dynamic";

export default async function HeutePage() {
  const now = new Date();
  const heute = await loadHeute(db, now);
  const calendarHref = `/kalender?month=${calendarYmd(now).slice(0, 7)}`;

  return (
    <>
      <h1 className="font-serif text-3xl text-olive">Heute</h1>

      <div className="mt-8 grid grid-cols-2 gap-5 max-lg:grid-cols-1">
        <HeuteSection
          title="Termine"
          empty="Heute stehen keine Termine an."
          href={calendarHref}
          items={heute.appointments}
        />
        <HeuteSection
          title="Nächste Veranstaltungen"
          empty="Keine anstehenden Veranstaltungen."
          href={calendarHref}
          items={heute.nextEvents}
        />
        <HeuteSection
          title="Offene Zahlungen"
          empty="Keine offenen Zahlungen."
          href="/anfragen"
          items={heute.unpaid}
        />
        <HeuteSection
          title="Neue Anfragen"
          empty="Keine neuen Anfragen."
          href="/anfragen"
          items={heute.newInquiries}
        />
      </div>
    </>
  );
}
