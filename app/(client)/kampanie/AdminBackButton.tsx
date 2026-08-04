"use client";

import { useRouter } from "next/navigation";

/**
 * Przycisk powrotu dla admina podglądającego kampanię klienta.
 * Wraca do poprzedniego widoku (np. listy zamówień w panelu admina).
 */
export default function AdminBackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Powrót
    </button>
  );
}
