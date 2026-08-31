import Link from "next/link";
import { CalendarAppointmentForm } from "@/app/(app)/kalender/create-appointment-form";
import {
  CalendarLegend,
  MonthGrid,
} from "@/app/(app)/kalender/month-grid";
import { db } from "@/db/client";
import {
  addYearMonth,
  formatYearMonthHeading,
  listMonthChips,
  monthWeeks,
  parseYearMonth,
} from "@/domain/calendar-month";
import { listInquiries } from "@/domain/inquiry";
import { calendarYmd } from "@/lib/timezone";

export const metadata = {
  title: "Kalender",
};

export const dynamic = "force-dynamic";

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: rawMonth } = await searchParams;
  const now = new Date();
  const yearMonth = parseYearMonth(rawMonth, now);
  const weeks = monthWeeks(yearMonth);
  const chips = await listMonthChips(db, yearMonth);
  const events = (await listInquiries(db))
    .filter((inquiry) => inquiry.status !== "lost")
    .map((inquiry) => ({
      id: inquiry.id,
      coupleAName: inquiry.coupleAName,
      coupleBName: inquiry.coupleBName,
    }));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-olive">Kalender</h1>
          <p className="mt-2 text-sm text-olive/80">Alte Hettnerfabrik</p>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href={`/kalender?month=${addYearMonth(yearMonth, -1)}`}
            className="rounded-full border border-olive/20 px-4 py-2 text-sm text-olive hover:bg-cream"
          >
            Vorheriger Monat
          </Link>
          <p className="font-serif text-xl text-olive">
            {formatYearMonthHeading(yearMonth)}
          </p>
          <Link
            href={`/kalender?month=${addYearMonth(yearMonth, 1)}`}
            className="rounded-full border border-olive/20 px-4 py-2 text-sm text-olive hover:bg-cream"
          >
            Nächster Monat
          </Link>
        </nav>
      </div>

      <div className="mt-6">
        <CalendarLegend />
      </div>

      <div className="mt-6 flex items-start gap-8 max-lg:flex-col">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <MonthGrid
            yearMonth={yearMonth}
            weeks={weeks}
            chips={chips}
            todayYmd={calendarYmd(now)}
          />
        </div>
        <aside className="w-80 shrink-0 rounded-2xl bg-paper px-6 py-5 shadow-[0_10px_30px_rgba(90,80,50,0.06)] max-lg:w-full">
          <CalendarAppointmentForm events={events} />
        </aside>
      </div>
    </>
  );
}
