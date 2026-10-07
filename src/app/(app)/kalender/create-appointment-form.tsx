"use client";

import { useActionState, useState } from "react";
import {
  createAppointmentAction,
  type InquiryFormState,
} from "@/app/(app)/anfragen/actions";
import { APPOINTMENT_KINDS, type AppointmentKind } from "@/db/schema";
import { APPOINTMENT_KIND_LABELS } from "@/domain/calendar";

const initialState: InquiryFormState = {};

const fieldClass =
  "w-full rounded-xl border border-olive/25 bg-cream px-3.5 py-2.5 text-foreground outline-none ring-olive/30 focus:border-olive focus:ring-2";

export function CalendarAppointmentForm({
  events,
}: {
  events: Array<{ id: string; coupleAName: string; coupleBName: string }>;
}) {
  const [state, action, pending] = useActionState(
    createAppointmentAction,
    initialState,
  );
  const [kind, setKind] = useState<AppointmentKind>("viewing");

  if (events.length === 0) {
    return (
      <p className="text-sm text-olive/80">
        Lege zuerst eine Anfrage an, dann kannst du eine Besichtigung oder
        Planung eintragen.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <p className="font-serif text-lg text-olive">Termin anlegen</p>

      <label className="block">
        <span className="mb-1.5 block text-sm text-olive-dark/80">Anfrage</span>
        <select name="id" required className={fieldClass}>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.coupleAName} & {event.coupleBName}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-olive-dark/80">Art</span>
        <select
          name="kind"
          value={kind}
          onChange={(event) =>
            setKind(event.target.value as AppointmentKind)
          }
          className={fieldClass}
        >
          {APPOINTMENT_KINDS.map((value) => (
            <option key={value} value={value}>
              {APPOINTMENT_KIND_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-olive-dark/80">Beginn</span>
        <input
          name="start"
          type="datetime-local"
          required
          className={fieldClass}
        />
      </label>

      {kind === "planning" ? (
        <label className="block">
          <span className="mb-1.5 block text-sm text-olive-dark/80">Ende</span>
          <input
            name="end"
            type="datetime-local"
            required
            className={fieldClass}
          />
        </label>
      ) : (
        <p className="text-sm text-olive/70">
          Besichtigung: 60 Minuten Termin, 30 Minuten Puffer danach im Kalender.
        </p>
      )}

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
        {pending ? "Wird gespeichert…" : "Termin speichern"}
      </button>
    </form>
  );
}
