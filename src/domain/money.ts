import { APP_LOCALE } from "@/lib/timezone";

export const VAT_PERCENT = 19;

/** Default Anzahlung: 1.000 € gross (19% MwSt). */
export const ANZAHLUNG_GROSS_CENTS = 100_000;

export function vatCents(netCents: number): number {
  if (!Number.isInteger(netCents)) {
    throw new Error("money must be integer cents");
  }
  return Math.round((netCents * VAT_PERCENT) / 100);
}

export function grossCents(netCents: number): number {
  return netCents + vatCents(netCents);
}

/** Invert gross → net so 100000 cents splits 84034 net + 15966 MwSt. */
export function netFromGross(gross: number): number {
  if (!Number.isInteger(gross)) {
    throw new Error("money must be integer cents");
  }
  const net = Math.round((gross * 100) / (100 + VAT_PERCENT));
  for (const candidate of [net, net + 1, net - 1, net + 2, net - 2]) {
    if (grossCents(candidate) === gross) {
      return candidate;
    }
  }
  throw new Error("money must be integer cents");
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

/**
 * Date-style offer numbers from the issue date (DDMMYYYY).
 * Sample 21062026 is 21.06.2026, not the wedding date. Not invoice numbers.
 */
export function formatOfferNumber(issuedOn: string): string {
  const [year, month, day] = issuedOn.split("-");
  if (!year || !month || !day) {
    throw new Error(`invalid calendar date: ${issuedOn}`);
  }
  return `${day}${month}${year}`;
}

/** German EUR text to integer cents ("2.000,00" → 200000). */
export function parseEuroToCents(raw: string): number {
  const cleaned = raw.trim().replace(/\s/g, "").replace(/€/g, "");
  if (!cleaned) {
    throw new Error("money must be integer cents");
  }
  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    normalized = cleaned.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, "");
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    throw new Error("money must be integer cents");
  }
  const cents = Math.round(value * 100);
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error("money must be integer cents");
  }
  return cents;
}

/** Integer cents as a German form value (200000 → "2000,00"). */
export function centsToEuroInput(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error("money must be integer cents");
  }
  return (cents / 100).toFixed(2).replace(".", ",");
}
