"use client";

import { useActionState, useMemo, useState } from "react";
import {
  saveOfferAction,
  type InquiryFormState,
} from "@/app/(app)/anfragen/actions";
import {
  centsToEuroInput,
  formatEuroFromCents,
  parseEuroToCents,
} from "@/domain/money";
import {
  SAMPLE_CATALOG_LINES,
  offerTotals,
  type OfferLineInput,
} from "@/domain/offer";

const initialState: InquiryFormState = {};

const fieldClass =
  "w-full rounded-xl border border-olive/25 bg-cream px-3.5 py-2.5 text-foreground outline-none ring-olive/30 focus:border-olive focus:ring-2";

type DraftLine = {
  description: string;
  quantity: string;
  unitNet: string;
};

function toDraft(line: OfferLineInput): DraftLine {
  return {
    description: line.description,
    quantity: String(line.quantity),
    unitNet: centsToEuroInput(line.unitNetCents),
  };
}

function emptyLine(): DraftLine {
  return { description: "", quantity: "1", unitNet: "0,00" };
}

export function OfferForm({
  eventId,
  issuedOn,
  lines,
  offerNumber,
}: {
  eventId: string;
  issuedOn: string;
  lines: OfferLineInput[];
  offerNumber: string | null;
}) {
  const [state, action, pending] = useActionState(
    saveOfferAction,
    initialState,
  );
  const [draftLines, setDraftLines] = useState<DraftLine[]>(
    lines.length > 0 ? lines.map(toDraft) : [emptyLine()],
  );
  const liveTotals = useMemo(() => {
    try {
      return offerTotals(
        draftLines.map((line) => ({
          description: line.description || "Position",
          quantity: Number(line.quantity),
          unitNetCents: line.unitNet.trim()
            ? parseEuroToCents(line.unitNet)
            : 0,
        })),
      );
    } catch {
      return null;
    }
  }, [draftLines]);

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setDraftLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={eventId} />

      {offerNumber ? (
        <p className="font-serif text-2xl text-olive">Angebot {offerNumber}</p>
      ) : (
        <p className="text-sm text-olive/70">Noch kein Angebot gespeichert.</p>
      )}

      <label className="block max-w-xs">
        <span className="mb-1.5 block text-xs uppercase tracking-wide text-olive/70">
          Ausstellungsdatum
        </span>
        <input
          name="issuedOn"
          type="date"
          required
          defaultValue={issuedOn}
          className={fieldClass}
        />
      </label>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-olive/70">
              <th className="pb-2 pr-3 font-medium">Beschreibung</th>
              <th className="w-24 pb-2 pr-3 font-medium">Menge</th>
              <th className="w-40 pb-2 pr-3 font-medium">Einzelpreis netto</th>
              <th className="w-24 pb-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {draftLines.map((line, index) => (
              <tr key={index} className="align-top">
                <td className="pb-3 pr-3">
                    <input
                      name="description"
                      value={line.description}
                      onChange={(event) =>
                        updateLine(index, { description: event.target.value })
                      }
                      className={fieldClass}
                      placeholder="Location Alte Hettnerfabrik, Fr 11:00 bis So 11:00"
                    />
                </td>
                <td className="pb-3 pr-3">
                    <input
                      name="quantity"
                      type="number"
                      min={1}
                      step={1}
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(index, { quantity: event.target.value })
                      }
                      className={fieldClass}
                    />
                </td>
                <td className="pb-3 pr-3">
                    <input
                      name="unitNet"
                      value={line.unitNet}
                      onChange={(event) =>
                        updateLine(index, { unitNet: event.target.value })
                      }
                      className={fieldClass}
                      inputMode="decimal"
                    />
                </td>
                <td className="pb-3">
                  <button
                    type="button"
                    onClick={() =>
                      setDraftLines((current) =>
                        current.length === 1
                          ? current
                          : current.filter((_, i) => i !== index),
                      )
                    }
                    className="mt-2 text-sm text-olive/80 hover:text-olive-dark"
                  >
                    Entfernen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() => setDraftLines((current) => [...current, emptyLine()])}
          className="text-sm text-olive hover:text-olive-dark"
        >
          Zeile hinzufügen
        </button>
        <button
          type="button"
          onClick={() => setDraftLines(SAMPLE_CATALOG_LINES.map(toDraft))}
          className="text-sm text-olive hover:text-olive-dark"
        >
          Musterzeilen
        </button>
      </div>

      {liveTotals ? (
        <p className="font-serif text-xl text-olive">
          {formatEuroFromCents(liveTotals.netCents)}
          <span className="ml-2 text-sm font-sans text-olive/70">netto</span>
          <span className="mx-2 text-olive/40">·</span>
          {formatEuroFromCents(liveTotals.grossCents)}
          <span className="ml-2 text-sm font-sans text-olive/70">
            brutto inkl. 19% MwSt
          </span>
        </p>
      ) : null}

      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-olive px-4 py-2 text-sm font-medium text-paper transition hover:bg-olive-dark disabled:opacity-60"
        >
          {pending ? "Wird gespeichert…" : "Angebot speichern"}
        </button>
        {offerNumber ? (
          <a
            href={`/anfragen/${eventId}/angebot`}
            className="text-sm text-olive hover:text-olive-dark"
          >
            PDF herunterladen
          </a>
        ) : null}
      </div>
    </form>
  );
}
