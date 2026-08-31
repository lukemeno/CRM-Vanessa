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

/** Date-style offer numbers (e.g. sample offer 21062026). Not invoice numbers. */
export function formatOfferNumber(eventDate: string): string {
  const [year, month, day] = eventDate.split("-");
  if (!year || !month || !day) {
    throw new Error(`invalid calendar date: ${eventDate}`);
  }
  return `${day}${month}${year}`;
}
