import Link from "next/link";

export default function AnfrageNotFound() {
  return (
    <>
      <h1 className="font-serif text-3xl text-olive">Anfrage nicht gefunden</h1>
      <p className="mt-2 text-sm text-foreground/80">
        Diese Anfrage gibt es nicht oder sie wurde entfernt.
      </p>
      <p className="mt-6">
        <Link
          href="/anfragen"
          className="text-sm text-olive hover:text-olive-dark"
        >
          ← Zurück zum Board
        </Link>
      </p>
    </>
  );
}
