import Link from "next/link";
import {
  CALENDAR_ITEM_KINDS,
  CALENDAR_ITEM_LABELS,
  WEEKDAY_HEADERS,
  type CalendarChip,
} from "@/domain/calendar-month";

const CHIP_CLASS: Record<CalendarChip["kind"], string> = {
  viewing: "border-[#5c6540]/25 bg-[#e7ecd8] text-olive-dark",
  planning: "border-[#5c6540]/35 bg-[#cfd6b6] text-olive-dark",
  booked: "border-olive bg-olive text-paper",
  blocked: "border-[#8a7d5c]/35 bg-[#e4dcc8] text-[#5c5340]",
  task: "border-[#b9a36a]/40 bg-[#f3ead0] text-olive-dark",
};

export function MonthGrid({
  yearMonth,
  weeks,
  chips,
  todayYmd,
}: {
  yearMonth: string;
  weeks: string[][];
  chips: CalendarChip[];
  todayYmd: string;
}) {
  const byDay = new Map<string, CalendarChip[]>();
  for (const chip of chips) {
    const list = byDay.get(chip.ymd) ?? [];
    list.push(chip);
    byDay.set(chip.ymd, list);
  }

  return (
    <div className="min-w-[52rem]">
      <div className="grid grid-cols-7 gap-px rounded-2xl bg-olive/10 p-px">
        {WEEKDAY_HEADERS.map((label) => (
          <div
            key={label}
            className="bg-paper px-3 py-2 text-sm text-olive-dark/80 first:rounded-tl-2xl last:rounded-tr-2xl"
          >
            {label}
          </div>
        ))}
        {weeks.flatMap((week, weekIndex) =>
          week.map((ymd, dayIndex) => {
            const inMonth = ymd.startsWith(yearMonth);
            const isToday = ymd === todayYmd;
            const dayChips = byDay.get(ymd) ?? [];
            const dayNumber = Number(ymd.slice(-2));
            const rounded =
              weekIndex === weeks.length - 1 && dayIndex === 0
                ? "rounded-bl-2xl"
                : weekIndex === weeks.length - 1 && dayIndex === 6
                  ? "rounded-br-2xl"
                  : "";
            return (
              <div
                key={ymd}
                className={`min-h-28 bg-paper px-2 py-2 ${rounded} ${inMonth ? "" : "opacity-45"} ${isToday ? "ring-1 ring-inset ring-olive/40" : ""}`}
              >
                <p className="text-sm text-olive-dark">{dayNumber}</p>
                <ul className="mt-1 space-y-1">
                  {dayChips.map((chip) => (
                    <li key={`${chip.kind}-${chip.eventId}-${chip.ymd}-${chip.timeLabel ?? ""}`}>
                      <Link
                        href={chip.href}
                        className={`block rounded-lg border px-2 py-1 text-xs leading-snug ${CHIP_CLASS[chip.kind]}`}
                      >
                        <span className="block font-serif text-sm leading-snug">
                          {chip.title}
                        </span>
                        <span className="mt-0.5 block text-[0.7rem] opacity-80">
                          {chip.timeLabel
                            ? `${CALENDAR_ITEM_LABELS[chip.kind]} · ${chip.timeLabel}`
                            : CALENDAR_ITEM_LABELS[chip.kind]}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

export function CalendarLegend() {
  return (
    <ul className="flex flex-wrap gap-3">
      {CALENDAR_ITEM_KINDS.map((kind) => (
        <li key={kind} className="flex items-center gap-2 text-sm text-olive-dark">
          <span
            className={`h-3 w-3 rounded-sm border ${CHIP_CLASS[kind]}`}
            aria-hidden
          />
          {CALENDAR_ITEM_LABELS[kind]}
        </li>
      ))}
    </ul>
  );
}
