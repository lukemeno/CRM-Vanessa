"use client";

import { useActionState, useState } from "react";
import { EVENT_STATUSES, type EventStatus } from "@/db/schema";
import { EVENT_STATUS_LABELS } from "@/domain/inquiry";
import {
  changeInquiryStatusAction,
  type InquiryFormState,
} from "@/app/(app)/anfragen/actions";

const initialState: InquiryFormState = {};

const fieldClass =
  "w-full rounded-xl border border-olive/25 bg-cream px-3.5 py-2.5 text-foreground outline-none ring-olive/30 focus:border-olive focus:ring-2";

export function StatusForm({
  eventId,
  status,
}: {
  eventId: string;
  status: EventStatus;
}) {
  const [state, action, pending] = useActionState(
    changeInquiryStatusAction,
    initialState,
  );
  const [nextStatus, setNextStatus] = useState<EventStatus>(status);

  return (
    <form action={action} className="mt-8 max-w-xl space-y-4">
      <input type="hidden" name="id" value={eventId} />

      <label className="block">
        <span className="mb-1.5 block text-sm text-olive-dark/80">Status</span>
        <select
          name="status"
          value={nextStatus}
          onChange={(event) =>
            setNextStatus(event.target.value as EventStatus)
          }
          className={fieldClass}
        >
          {EVENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {EVENT_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      {nextStatus === "lost" ? (
        <label className="block">
          <span className="mb-1.5 block text-sm text-olive-dark/80">
            Grund (bei Verloren)
          </span>
          <textarea
            name="lostReason"
            required
            rows={3}
            placeholder="Warum ist die Anfrage verloren?"
            className={fieldClass}
            onInvalid={(event) => {
              event.currentTarget.setCustomValidity(
                "Bitte einen Grund angeben, wenn die Anfrage verloren ist.",
              );
            }}
            onInput={(event) => {
              event.currentTarget.setCustomValidity("");
            }}
          />
        </label>
      ) : null}

      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || nextStatus === status}
        className="rounded-full bg-olive px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-olive-dark disabled:opacity-60"
      >
        {pending ? "Wird gespeichert…" : "Status speichern"}
      </button>
    </form>
  );
}
