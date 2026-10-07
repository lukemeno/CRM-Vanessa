export const APP_TIMEZONE = "Europe/Berlin";
export const APP_LOCALE = "de-DE";

export function formatToday(
  now: Date = new Date(),
  timeZone: string = APP_TIMEZONE,
): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(now);
}

/** Calendar-day display (YYYY-MM-DD stored as date, shown in German). */
export function formatCalendarDate(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`invalid calendar date: ${ymd}`);
  }
  return new Intl.DateTimeFormat(APP_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function addCalendarDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day + days);
  return new Date(utc).toISOString().slice(0, 10);
}

export function yearInTimeZone(
  now: Date,
  timeZone: string = APP_TIMEZONE,
): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric" }).format(now),
  );
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Instant at which `timeZone` local wall time equals `ymd` + hour:minute. */
export function zonedInstant(
  ymd: string,
  hour: number,
  minute = 0,
  timeZone: string = APP_TIMEZONE,
): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utcMillis = desiredAsUtc;
  for (let i = 0; i < 4; i++) {
    const parts = zonedParts(new Date(utcMillis), timeZone);
    const actualAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const delta = desiredAsUtc - actualAsUtc;
    if (delta === 0) {
      break;
    }
    utcMillis += delta;
  }
  return new Date(utcMillis);
}
