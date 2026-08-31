import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { BelegPdfModel } from "@/domain/beleg";
import { belegSenderLines } from "@/domain/beleg";
import { formatEuroFromCents } from "@/domain/money";
import { OfferLeaf } from "@/pdf/offer-leaf";

const OLIVE = "#5c6540";
const OLIVE_DARK = "#3a4128";
const PAPER = "#fffdf8";
const CREAM = "#faf6ee";

const styles = StyleSheet.create({
  page: {
    backgroundColor: PAPER,
    color: OLIVE_DARK,
    fontFamily: "Cormorant Garamond",
    fontWeight: 500,
    paddingTop: 40,
    paddingBottom: 72,
    paddingHorizontal: 48,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  events: {
    fontSize: 22,
    letterSpacing: 8,
    textTransform: "uppercase",
    color: OLIVE,
    fontWeight: 600,
  },
  script: {
    fontFamily: "Great Vibes",
    fontSize: 26,
    color: OLIVE,
    marginTop: -4,
  },
  sender: {
    marginTop: 10,
    gap: 1,
  },
  senderLine: {
    fontSize: 9,
    color: OLIVE,
  },
  rule: {
    marginTop: 16,
    marginBottom: 20,
    height: 1,
    backgroundColor: OLIVE,
    opacity: 0.35,
  },
  title: {
    fontSize: 18,
    color: OLIVE,
    fontWeight: 600,
  },
  meta: {
    marginTop: 14,
    gap: 4,
  },
  metaLine: {
    fontSize: 12,
    color: OLIVE_DARK,
  },
  table: {
    marginTop: 28,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: CREAM,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#5c654055",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#5c654022",
  },
  colDesc: { width: "46%", fontSize: 11 },
  colQty: { width: "12%", fontSize: 11, textAlign: "right" },
  colUnit: { width: "21%", fontSize: 11, textAlign: "right" },
  colTotal: { width: "21%", fontSize: 11, textAlign: "right" },
  headText: { color: OLIVE, fontWeight: 600, fontSize: 10 },
  totals: {
    marginTop: 18,
    alignSelf: "flex-end",
    width: 240,
    gap: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: { fontSize: 12, color: OLIVE },
  totalValue: { fontSize: 12, color: OLIVE_DARK },
  grossRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: OLIVE,
  },
  grossLabel: { fontSize: 14, color: OLIVE, fontWeight: 600 },
  grossValue: { fontSize: 14, color: OLIVE_DARK, fontWeight: 600 },
  terms: {
    marginTop: 28,
    gap: 6,
    maxWidth: 420,
  },
  term: {
    fontSize: 10,
    color: OLIVE_DARK,
    lineHeight: 1.35,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    fontSize: 8,
    color: OLIVE,
    textAlign: "center",
    lineHeight: 1.4,
  },
});

function euro(cents: number): string {
  return formatEuroFromCents(cents).replace(/\u00a0/g, " ");
}

export function BelegDocument({ model }: { model: BelegPdfModel }) {
  const senderLines = belegSenderLines(model.sender);
  return (
    <Document
      title={model.heading}
      author="Events by Vanessa"
      subject={`${model.coupleNames}${model.eventDateLabel ? ` · ${model.eventDateLabel}` : ""}`}
      keywords={[model.number, ...senderLines, ...model.terms].join(" ")}
      language="de"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.events}>Events</Text>
            <Text style={styles.script}>by Vanessa</Text>
            <View style={styles.sender}>
              {senderLines.map((line) => (
                <Text key={line} style={styles.senderLine}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
          <OfferLeaf />
        </View>
        <View style={styles.rule} />
        <Text style={styles.title}>{model.heading}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaLine}>Datum {model.issuedOnLabel}</Text>
          <Text style={styles.metaLine}>{model.coupleNames}</Text>
          {model.eventDateLabel ? (
            <Text style={styles.metaLine}>{model.eventDateLabel}</Text>
          ) : null}
          <Text style={styles.metaLine}>
            {model.locationName}, {model.locationWindow}
          </Text>
        </View>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.colDesc, styles.headText]}>Beschreibung</Text>
            <Text style={[styles.colQty, styles.headText]}>Menge</Text>
            <Text style={[styles.colUnit, styles.headText]}>Einzelpreis</Text>
            <Text style={[styles.colTotal, styles.headText]}>Gesamt netto</Text>
          </View>
          {model.lines.map((line) => (
            <View key={line.description} style={styles.tableRow} wrap={false}>
              <Text style={styles.colDesc}>{line.description}</Text>
              <Text style={styles.colQty}>{String(line.quantity)}</Text>
              <Text style={styles.colUnit}>{euro(line.unitNetCents)}</Text>
              <Text style={styles.colTotal}>{euro(line.netCents)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Netto</Text>
            <Text style={styles.totalValue}>{euro(model.netCents)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>MwSt {model.vatPercent}%</Text>
            <Text style={styles.totalValue}>{euro(model.vatCents)}</Text>
          </View>
          <View style={styles.grossRow}>
            <Text style={styles.grossLabel}>Brutto</Text>
            <Text style={styles.grossValue}>{euro(model.grossCents)}</Text>
          </View>
        </View>
        {model.terms.length > 0 ? (
          <View style={styles.terms}>
            {model.terms.map((term) => (
              <Text key={term} style={styles.term}>
                {term}
              </Text>
            ))}
          </View>
        ) : null}
        <Text style={styles.footer}>
          {model.sender.name} · {model.sender.street} · {model.sender.postalCity}
          {"\n"}
          Tel {model.sender.phone} · {model.sender.email}
        </Text>
      </Page>
    </Document>
  );
}

/** @deprecated Use BelegDocument — kept so existing offer imports stay stable. */
export function OfferDocument({ model }: { model: BelegPdfModel }) {
  return <BelegDocument model={model} />;
}
