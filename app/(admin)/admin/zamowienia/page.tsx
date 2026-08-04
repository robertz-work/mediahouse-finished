"use client";

/**
 * Admin orders panel — list campaigns by status, approve/reject/mark-paid.
 */

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Campaign } from "@/lib/db/campaignsRepo";
import type { CampaignStatus } from "@/lib/constants";
import { VAT_RATE } from "@/lib/constants";

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Szkic",
  pending_approval: "Do zatwierdzenia",
  awaiting_payment: "Oczekuje na płatność",
  paid: "Opłacona",
  active: "Aktywna",
  completed: "Zakończona",
  cancelled: "Anulowana",
  rejected: "Odrzucona",
};

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending_approval: "bg-amber-100 text-amber-700",
  awaiting_payment: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-600",
  rejected: "bg-red-100 text-red-600",
};

const FILTER_TABS: Array<{ label: string; value: string }> = [
  { label: "Do zatwierdzenia", value: "pending_approval" },
  { label: "Oczekuje na płatność", value: "awaiting_payment" },
  { label: "Opłacone", value: "paid" },
  { label: "Aktywne", value: "active" },
  { label: "Wszystkie", value: "" },
];

export default function AdminOrdersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending_approval");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/admin/zamowienia");
    }
    if (session?.user?.role && session.user.role !== "admin") {
      router.push("/");
    }
  }, [sessionStatus, session, router]);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter
        ? `/api/campaigns?status=${filter}`
        : "/api/campaigns";
      const res = await fetch(url);
      if (res.ok) {
        const data: Campaign[] = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error("Fetch campaigns error:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (session?.user?.role === "admin") fetchCampaigns();
  }, [session, fetchCampaigns]);

  const handleAction = async (
    campaignId: string,
    action: "approve" | "reject" | "mark-paid"
  ) => {
    if (action === "reject") {
      const confirmed = window.confirm("Czy na pewno chcesz odrzucić to zamówienie? Zostanie uznane za nieopłacone, a rezerwacje zwolnione.");
      if (!confirmed) return;
    }

    setActionLoading(campaignId);
    try {
      let res = await fetch(`/api/campaigns/${campaignId}/${action}`, {
        method: "POST",
      });

      if (res.status === 409 && action === "mark-paid") {
        const err = await res.json().catch(() => ({}));
        if (err.code === "AVAILABILITY_CONFLICT") {
          if (!window.confirm(err.error)) return;
          res = await fetch(`/api/campaigns/${campaignId}/${action}?force=1`, {
            method: "POST",
          });
        }
      }

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Wystąpił błąd");
        return;
      }

      await fetchCampaigns();
    } catch {
      alert("Błąd serwera");
    } finally {
      setActionLoading(null);
    }
  };

  if (sessionStatus === "loading") {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Zamówienia</h1>


      <div className="mb-6 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === tab.value
                ? "bg-pink-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>


      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-center">
          <p className="text-lg font-medium text-slate-500">Brak kampanii w tym statusie</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {campaign.name || `Kampania #${campaign.id.slice(0, 8)}`}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                        STATUS_COLORS[campaign.status]
                      }`}
                    >
                      {STATUS_LABELS[campaign.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Klient: {campaign.billing.name || "—"} · {campaign.billing.email || "—"}
                    {campaign.billing.nip && ` · NIP: ${campaign.billing.nip}`}
                  </p>
                  <p className="text-xs text-slate-400">
                    Złożono: {new Date(campaign.updatedAt).toLocaleDateString("pl-PL")}
                    {campaign.paidAt &&
                      ` · Opłacono: ${new Date(campaign.paidAt).toLocaleDateString("pl-PL")}`}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-pink-600">
                    {campaign.totals.grandTotal.toLocaleString("pl-PL")} zł
                    <span className="text-xs font-normal text-slate-400"> netto</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {Math.round(campaign.totals.grandTotal * (1 + VAT_RATE)).toLocaleString("pl-PL")} zł brutto
                  </p>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-slate-500">
                  Nośniki ({campaign.items.length}):
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {campaign.items.slice(0, 6).map((item) => (
                    <Link
                      key={item.id}
                      href={`/nosniki/${item.mediaId}`}
                      target="_blank"
                      className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 hover:text-pink-600"
                    >
                      {item.mediaId.slice(0, 8)}… · {item.startDate} – {item.endDate}
                      <span className="ml-1 font-medium">
                        {item.priceSnapshot.total.toLocaleString("pl-PL")} zł
                      </span>
                    </Link>
                  ))}
                  {campaign.items.length > 6 && (
                    <span className="text-xs text-slate-400">
                      +{campaign.items.length - 6} więcej
                    </span>
                  )}
                </div>
              </div>

              {campaign.billing.address && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-400">
                    Faktura: {campaign.billing.name}, {campaign.billing.address}
                    {campaign.billing.nip && ` · NIP: ${campaign.billing.nip}`}
                  </p>
                  {campaign.paymentMethod === "proforma" && campaign.invoiceNumber && (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-xs font-semibold text-amber-800">
                        {campaign.invoiceNumber}
                      </span>
                      {campaign.invoiceUrl && (
                        <a
                          href={campaign.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-pink-600 underline hover:text-pink-700"
                        >
                          Pobierz PDF
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {campaign.status === "pending_approval" && (
                  <>
                    <button
                      onClick={() => handleAction(campaign.id, "approve")}
                      disabled={actionLoading === campaign.id}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {actionLoading === campaign.id ? "..." : "Zatwierdź"}
                    </button>
                    <button
                      onClick={() => handleAction(campaign.id, "reject")}
                      disabled={actionLoading === campaign.id}
                      className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      Odrzuć
                    </button>
                  </>
                )}

                {campaign.status === "awaiting_payment" && (
                  <>
                    <button
                      onClick={() => handleAction(campaign.id, "mark-paid")}
                      disabled={actionLoading === campaign.id}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {actionLoading === campaign.id ? "..." : "Oznacz jako opłacona"}
                    </button>
                    <button
                      onClick={() => handleAction(campaign.id, "reject")}
                      disabled={actionLoading === campaign.id}
                      className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      Oznacz jako nieopłacona
                    </button>
                  </>
                )}

                {(campaign.status === "paid" || campaign.status === "active") && (
                  <Link
                    href={`/kampanie/${campaign.id}`}
                    className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-900"
                  >
                    Zobacz szczegóły
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
