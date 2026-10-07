"use client";

import { useActionState } from "react";
import {
  updateEventContactAction,
  type InquiryFormState,
} from "@/app/(app)/anfragen/actions";

const initialState: InquiryFormState = {};

const fieldClass =
  "w-full rounded-xl border border-olive/25 bg-cream px-3.5 py-2.5 text-foreground outline-none ring-olive/30 focus:border-olive focus:ring-2";

const labelClass = "mb-1.5 block text-sm text-olive-dark/80";

export function ContactForm({
  eventId,
  email,
  phone,
}: {
  eventId: string;
  email: string | null;
  phone: string | null;
}) {
  const [state, action, pending] = useActionState(
    updateEventContactAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={eventId} />
      <label className="block">
        <span className={labelClass}>E-Mail</span>
        <input
          name="email"
          type="email"
          autoComplete="off"
          defaultValue={email ?? ""}
          className={fieldClass}
        />
      </label>
      <label className="block">
        <span className={labelClass}>Telefon</span>
        <input
          name="phone"
          type="tel"
          autoComplete="off"
          defaultValue={phone ?? ""}
          className={fieldClass}
        />
      </label>
      <p className="text-sm text-olive/70">Mindestens E-Mail oder Telefon.</p>
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
        {pending ? "Wird gespeichert…" : "Kontakt speichern"}
      </button>
    </form>
  );
}
