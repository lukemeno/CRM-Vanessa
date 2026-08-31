"use client";

import { useActionState } from "react";
import {
  updateGuestCountAction,
  type InquiryFormState,
} from "@/app/(app)/anfragen/actions";
import { GUEST_COUNT_LOCKED_COPY } from "@/domain/eventakte";

const initialState: InquiryFormState = {};

const fieldClass =
  "w-full rounded-xl border border-olive/25 bg-cream px-3.5 py-2.5 text-foreground outline-none ring-olive/30 focus:border-olive focus:ring-2";

export function GuestCountForm({
  eventId,
  guestCount,
  locked,
}: {
  eventId: string;
  guestCount: number | null;
  locked: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateGuestCountAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={eventId} />
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wide text-olive/70">
          Gäste
        </span>
        <input
          name="guestCount"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          defaultValue={guestCount ?? ""}
          disabled={locked}
          className={fieldClass}
        />
      </label>
      {locked ? (
        <p className="text-sm text-olive/80">{GUEST_COUNT_LOCKED_COPY}</p>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-olive px-4 py-2 text-sm font-medium text-paper transition hover:bg-olive-dark disabled:opacity-60"
        >
          {pending ? "Wird gespeichert…" : "Gästezahl speichern"}
        </button>
      )}
      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
