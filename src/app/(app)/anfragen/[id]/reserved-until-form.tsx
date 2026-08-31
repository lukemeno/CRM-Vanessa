"use client";

import { useActionState } from "react";
import {
  setReservedUntilAction,
  type InquiryFormState,
} from "@/app/(app)/anfragen/actions";
import { formatBerlinDateTime, formatDateTimeLocal } from "@/lib/timezone";

const initialState: InquiryFormState = {};

const fieldClass =
  "w-full rounded-xl border border-olive/25 bg-cream px-3.5 py-2.5 text-foreground outline-none ring-olive/30 focus:border-olive focus:ring-2";

export function ReservedUntilForm({
  eventId,
  reservedUntil,
}: {
  eventId: string;
  reservedUntil: Date | null;
}) {
  const [state, action, pending] = useActionState(
    setReservedUntilAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={eventId} />
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wide text-olive/70">
          Reserviert bis
        </span>
        <input
          name="reservedUntil"
          type="datetime-local"
          defaultValue={
            reservedUntil ? formatDateTimeLocal(reservedUntil) : ""
          }
          className={fieldClass}
        />
      </label>
      {reservedUntil ? (
        <p className="text-sm text-olive/80">
          {formatBerlinDateTime(reservedUntil)}
        </p>
      ) : (
        <p className="text-sm text-olive/70">Kein Vorbehalt.</p>
      )}
      <p className="text-sm text-olive/70">
        Feld am Angebot, kein eigener Status. Leer speichern hebt den Vorbehalt
        auf.
      </p>
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-olive px-4 py-2 text-sm font-medium text-paper transition hover:bg-olive-dark disabled:opacity-60"
      >
        {pending ? "Wird gespeichert…" : "Vorbehalt speichern"}
      </button>
    </form>
  );
}
