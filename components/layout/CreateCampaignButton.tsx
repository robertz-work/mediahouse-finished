"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

/**
 * Prominent "Stwórz kampanię" CTA button shown in the header.
 * - For logged-in clients: links to /kreator
 * - For guests: links to /login?callbackUrl=/kreator
 * - Hidden for representatives and admins (they manage media, not campaigns)
 */
export default function CreateCampaignButton() {
  const { data: session, status } = useSession();


  if (status === "authenticated" && session?.user?.role !== "client") {
    return null;
  }

  if (status !== "authenticated") {
    return null;
  }

  return (
    <Link
      href="/kreator"
      className="hidden items-center gap-1.5 rounded-full bg-pink-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-pink-700 lg:inline-flex"
    >
      Stwórz kampanię
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
    </Link>
  );
}
