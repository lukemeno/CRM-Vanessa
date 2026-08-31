import Link from "next/link";
import { db } from "@/db/client";
import { groupInquiriesByStatus, listInquiries } from "@/domain/inquiry";
import { InquiryBoard } from "@/app/(app)/anfragen/inquiry-board";

export const metadata = {
  title: "Anfragen",
};

export const dynamic = "force-dynamic";

export default async function AnfragenPage() {
  const grouped = groupInquiriesByStatus(await listInquiries(db));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-olive">Anfragen</h1>
        </div>
        <Link
          href="/anfragen/neu"
          className="rounded-full bg-olive px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-olive-dark"
        >
          Neue Anfrage
        </Link>
      </div>

      <InquiryBoard grouped={grouped} />
    </>
  );
}
