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
