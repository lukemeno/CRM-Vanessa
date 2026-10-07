import { APP_LOCALE } from "@/lib/timezone";

export const VAT_PERCENT = 19;

export function vatCents(netCents: number): number {
  if (!Number.isInteger(netCents)) {
    throw new Error("money must be integer cents");
  }
  return Math.round((netCents * VAT_PERCENT) / 100);
}

export function grossCents(netCents: number): number {
  return netCents + vatCents(netCents);
}

/** Integer cents as German EUR (e.g. 123456 → "1.234,56 €"). */
export function formatEuroFromCents(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error("money must be integer cents");
  }
  return new Intl.NumberFormat(APP_LOCALE, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

/** Date-style offer numbers (e.g. sample offer 21062026). Not invoice numbers. */
export function formatOfferNumber(eventDate: string): string {
  const [year, month, day] = eventDate.split("-");
  if (!year || !month || !day) {
    throw new Error(`invalid calendar date: ${eventDate}`);
  }
  return `${day}${month}${year}`;
}
