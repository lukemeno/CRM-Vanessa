import Link from "next/link";
import { CreateInquiryForm } from "@/app/(app)/anfragen/create-inquiry-form";

export const metadata = {
  title: "Neue Anfrage",
};

export const dynamic = "force-dynamic";

export default function NeueAnfragePage() {
  return (
    <>
      <p className="text-sm text-olive/80">
        <Link href="/anfragen" className="hover:text-olive-dark">
          ← Anfragen
        </Link>
      </p>
      <h1 className="mt-3 font-serif text-3xl text-olive">Neue Anfrage</h1>
      <CreateInquiryForm />
    </>
  );
}
