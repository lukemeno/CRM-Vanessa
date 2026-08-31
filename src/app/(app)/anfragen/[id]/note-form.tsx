"use client";

import { useActionState } from "react";
import {
  updateNoteAction,
  type InquiryFormState,
} from "@/app/(app)/anfragen/actions";

const initialState: InquiryFormState = {};

const fieldClass =
  "w-full rounded-xl border border-olive/25 bg-cream px-3.5 py-2.5 text-foreground outline-none ring-olive/30 focus:border-olive focus:ring-2";

export function NoteForm({
  eventId,
  note,
}: {
  eventId: string;
  note: string | null;
}) {
  const [state, action, pending] = useActionState(
    updateNoteAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={eventId} />
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wide text-olive/70">
          Notiz
        </span>
        <textarea
          name="note"
          rows={4}
          defaultValue={note ?? ""}
          placeholder="Keine Notiz."
          className={fieldClass}
        />
      </label>
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
        {pending ? "Wird gespeichert…" : "Notiz speichern"}
      </button>
    </form>
  );
}
