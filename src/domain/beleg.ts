/** Shared German Beleg chrome for offers and invoices. Not Eventakte copy. */

export const BELEG_SENDER = {
  name: "Events by Vanessa",
  street: "Alte Landstraße 23",
  postalCity: "53902 Bad Münstereifel",
  phone: "01573 8273034",
  email: "vanessa@events-altehettnerfabrik.de",
  venue: "Alte Hettnerfabrik",
} as const;

/** Sample 21062026 contract sentences. Live on the Beleg, not only the Akte. */
export const OFFER_BELEG_TERMS = [
  "Die Anzahlung beträgt 1.000 €.",
  "Die Buchung ist bis drei Monate vor dem Event stornofrei.",
  "Die Gästezahl kann bis 10 Tage vor dem Event geändert werden.",
] as const;

export const OLIVE_LEAF_ASSET = "public/brand/olive-leaf.svg";

export type BelegLine = {
  description: string;
  quantity: number;
  unitNetCents: number;
  netCents: number;
};

export type BelegPdfModel = {
  heading: string;
  number: string;
  issuedOnLabel: string;
  coupleNames: string;
  eventDateLabel: string | null;
  locationName: string;
  locationWindow: string;
  lines: BelegLine[];
  netCents: number;
  vatCents: number;
  grossCents: number;
  vatPercent: number;
  terms: readonly string[];
  sender: typeof BELEG_SENDER;
};

export function belegCoupleNames(
  coupleAName: string,
  coupleBName: string,
): string {
  return `${coupleAName} & ${coupleBName}`;
}

export function belegSenderLines(
  sender: typeof BELEG_SENDER = BELEG_SENDER,
): string[] {
  return [
    sender.street,
    sender.postalCity,
    `Tel ${sender.phone}`,
    sender.email,
  ];
}
