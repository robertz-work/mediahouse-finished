"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function OrderPlacedPage() {
  const params = useSearchParams();
  const status = params.get("status");
  const method = params.get("method");
  const campaignId = params.get("id");

  const isProforma = method === "proforma";

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
        <svg
          className="h-10 w-10 text-emerald-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-slate-900">
        Zamówienie zostało złożone!
      </h1>

      {isProforma ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-600">
            Faktura pro forma została wygenerowana.
            Opłać ją przelewem tradycyjnym w ciągu 14 dni.
          </p>
          <div className="mx-auto max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Faktura pro forma
            </div>
            <p className="mt-2 text-xs text-amber-700">
              Fakturę znajdziesz w szczegółach kampanii, w zakładce „Faktury". Po zaksięgowaniu wpłaty administrator aktywuje Twoją kampanię.
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">
          Twoje zamówienie oczekuje na płatność.
        </p>
      )}

      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
        <span className="font-medium text-slate-700">
          {isProforma ? "Oczekuje na przelew" : "Oczekuje na płatność"}
        </span>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        {campaignId && (
          <Link
            href={`/kampanie/${campaignId}`}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Szczegóły kampanii
          </Link>
        )}
        <Link
          href="/nosniki"
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Katalog nośników
        </Link>
        <Link
          href="/kreator"
          className="rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700"
        >
          Nowa kampania
        </Link>
      </div>
    </main>
  );
}
