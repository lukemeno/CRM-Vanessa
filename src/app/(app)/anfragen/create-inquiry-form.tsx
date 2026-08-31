"use client";

import Link from "next/link";
import { useActionState } from "react";
import { EVENT_SOURCES } from "@/db/schema";
import { EVENT_SOURCE_LABELS } from "@/domain/inquiry";
import {
  createInquiryAction,
  type InquiryFormState,
} from "@/app/(app)/anfragen/actions";

const initialState: InquiryFormState = {};

const fieldClass =
  "w-full rounded-xl border border-olive/25 bg-cream px-3.5 py-2.5 text-foreground outline-none ring-olive/30 placeholder:text-olive/40 focus:border-olive focus:ring-2";

export function CreateInquiryForm() {
  const [state, action, pending] = useActionState(
    createInquiryAction,
    initialState,
  );

  return (
    <form action={action} className="mt-8 max-w-xl space-y-4">
      <label className="block">
        <span className="sr-only">Name</span>
        <input
          name="coupleAName"
          required
          autoComplete="off"
          placeholder="Jana Hermes"
          className={fieldClass}
        />
      </label>

      <label className="block">
        <span className="sr-only">Weiterer Name</span>
        <input
          name="coupleBName"
          required
          autoComplete="off"
          placeholder="Raphael Gerhards"
          className={fieldClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-olive-dark/80">Datum</span>
        <input name="eventDate" type="date" className={fieldClass} />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-olive-dark/80">Gäste</span>
        <input
          name="guestCount"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          className={fieldClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-olive-dark/80">E-Mail</span>
        <input
          name="email"
          type="email"
          autoComplete="off"
          className={fieldClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-olive-dark/80">Telefon</span>
        <input
          name="phone"
          type="tel"
          autoComplete="off"
          className={fieldClass}
        />
      </label>

      <p className="text-sm text-olive/70">Mindestens E-Mail oder Telefon.</p>

      <label className="block">
        <span className="mb-1.5 block text-sm text-olive-dark/80">Quelle</span>
        <select name="source" defaultValue="manual" className={fieldClass}>
          {EVENT_SOURCES.map((source) => (
            <option key={source} value={source}>
              {EVENT_SOURCE_LABELS[source]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-olive-dark/80">
          Notiz
        </span>
        <textarea name="note" rows={4} className={fieldClass} />
      </label>

      {state.error ? (
        <p className="text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-olive px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-olive-dark disabled:opacity-60"
        >
          {pending ? "Wird gespeichert…" : "Anfrage anlegen"}
        </button>
        <Link
          href="/anfragen"
          className="text-sm text-olive hover:text-olive-dark"
        >
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
