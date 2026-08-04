"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Campaign, CampaignItem } from "@/lib/db/campaignsRepo";
import type { Media } from "@/lib/db/mediaRepo";
import type { Hold } from "@/lib/db/holdsRepo";
import { PERIOD_LABELS, PERIOD_DAYS, type PeriodDays } from "@/lib/constants";
import { getMinStartDate } from "@/lib/helpers/dateValidation";

interface CartItemWithMedia extends CampaignItem {
  media?: Media;
  hold?: Hold;
}

export default function CartPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [items, setItems] = useState<CartItemWithMedia[]>([]);
  const [holds, setHolds] = useState<Hold[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const minStartDate = getMinStartDate();

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/koszyk");
    }
  }, [sessionStatus, router]);

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns/draft");
      const data: Campaign | null = await res.json();
      setCampaign(data);

      if (!data) {
        setItems([]);
        return;
      }

      const enriched: CartItemWithMedia[] = await Promise.all(
        data.items.map(async (item) => {
          const [mediaRes, holdsRes] = await Promise.all([
            fetch(`/api/media/${item.mediaId}`).then((r) => r.ok ? r.json() : null),
            item.holdId
              ? fetch(`/api/holds/${item.holdId}`).then((r) => r.ok ? r.json() : null)
              : null,
          ]);
          return { ...item, media: mediaRes ?? undefined, hold: holdsRes ?? undefined };
        })
      );

      setItems(enriched);
    } catch (err) {
      console.error("Fetch cart error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) fetchCart();
  }, [session, fetchCart]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRemoveItem = async (itemId: string) => {
    if (!campaign) return;
    setActionLoading(itemId);
    try {
      const res = await fetch(
        `/api/campaigns/${campaign.id}/items/${itemId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        await fetchCart();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateItem = async (
    itemId: string,
    patch: { periodDays?: number; startDate?: string; addPrint?: boolean; addInstall?: boolean }
  ) => {
    if (!campaign) return;
    setActionLoading(itemId);
    try {
      const res = await fetch(
        `/api/campaigns/${campaign.id}/items/${itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }
      );
      if (res.ok) {
        await fetchCart();
      } else {
        const err = await res.json();
        alert(err.error || "Wystąpił błąd");
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
      </main>
    );
  }

  if (!campaign || items.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <svg className="mx-auto mb-4 h-20 w-20 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
        <h1 className="text-xl font-bold text-slate-900">Koszyk jest pusty</h1>
        <p className="mt-2 text-sm text-slate-500">
          Dodaj nośniki z katalogu, aby rozpocząć kampanię.
        </p>
        <Link
          href="/nosniki"
          className="mt-4 inline-block rounded-xl bg-pink-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-pink-700"
        >
          Przeglądaj nośniki
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Koszyk</h1>

      <div className="space-y-4">
        {items.map((item) => {
          const holdExpiry = item.hold
            ? new Date(item.hold.expiresAt).getTime()
            : null;
          const remainingSec = holdExpiry
            ? Math.max(0, Math.floor((holdExpiry - now) / 1000))
            : null;
          const holdExpired = remainingSec !== null && remainingSec <= 0;

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-4 ${
                holdExpired
                  ? "border-red-200 bg-red-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex gap-4">
                <div className="h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {item.media?.photos[0] ? (
                    <img
                      src={item.media.photos[0]}
                      alt={item.media.code}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">
                      Brak zdjęcia
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        href={`/nosniki/${item.mediaId}`}
                        className="text-sm font-semibold text-slate-900 hover:text-pink-600"
                      >
                        {item.media?.code || item.mediaId}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {item.media?.address || ""}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={actionLoading === item.id}
                      className="text-slate-400 hover:text-red-500 disabled:opacity-50"
                      title="Usuń"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>


                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="text-xs text-slate-500">
                      Start:
                      <input
                        type="date"
                        value={item.startDate}
                        min={minStartDate}
                        onChange={(e) => {
                          if (e.target.value < minStartDate) return;
                          handleUpdateItem(item.id, { startDate: e.target.value });
                        }}
                        className="ml-1 rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                    </label>

                    <label className="text-xs text-slate-500">
                      Okres:
                      <select
                        value={item.periodDays}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            periodDays: Number(e.target.value),
                          })
                        }
                        className="ml-1 rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        {PERIOD_DAYS.map((d) => (
                          <option key={d} value={d}>
                            {PERIOD_LABELS[d]}
                          </option>
                        ))}
                      </select>
                    </label>

                    {item.media?.pricing.printCost && (
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={item.addPrint}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { addPrint: e.target.checked })
                          }
                          className="h-3.5 w-3.5 rounded border-slate-300 text-pink-600"
                        />
                        Druk ({item.media.pricing.printCost} zł)
                      </label>
                    )}

                    {item.media?.pricing.installCost && (
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={item.addInstall}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { addInstall: e.target.checked })
                          }
                          className="h-3.5 w-3.5 rounded border-slate-300 text-pink-600"
                        />
                        Montaż ({item.media.pricing.installCost} zł)
                      </label>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-pink-600">
                      {item.priceSnapshot.total.toLocaleString("pl-PL")} zł
                    </span>

                    {remainingSec !== null && (
                      <span
                        className={`text-xs font-medium ${
                          holdExpired
                            ? "text-red-600"
                            : remainingSec < 120
                            ? "text-orange-500"
                            : "text-slate-400"
                        }`}
                      >
                        {holdExpired
                          ? "Rezerwacja wygasła"
                          : `Hold: ${Math.floor(remainingSec / 60)}:${String(
                              remainingSec % 60
                            ).padStart(2, "0")}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Podsumowanie</h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Nośniki ({campaign.items.length})</span>
            <span>{campaign.totals.mediaSubtotal.toLocaleString("pl-PL")} zł</span>
          </div>
          {campaign.totals.printSubtotal > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Druk</span>
              <span>{campaign.totals.printSubtotal.toLocaleString("pl-PL")} zł</span>
            </div>
          )}
          {campaign.totals.installSubtotal > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Montaż</span>
              <span>{campaign.totals.installSubtotal.toLocaleString("pl-PL")} zł</span>
            </div>
          )}
          <div className="border-t border-slate-200 pt-2">
            <div className="flex justify-between text-base font-bold text-slate-900">
              <span>Razem netto</span>
              <span>{campaign.totals.grandTotal.toLocaleString("pl-PL")} zł</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>VAT 23%</span>
              <span>
                {Math.round(campaign.totals.grandTotal * 0.23).toLocaleString("pl-PL")} zł
              </span>
            </div>
            <div className="mt-1 flex justify-between text-sm font-semibold text-slate-700">
              <span>Razem brutto</span>
              <span>
                {Math.round(campaign.totals.grandTotal * 1.23).toLocaleString("pl-PL")} zł
              </span>
            </div>
          </div>
        </div>

        <Link
          href={`/kampanie/podsumowanie`}
          className="mt-6 block w-full rounded-xl bg-pink-600 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-pink-700"
        >
          Przejdź do podsumowania
        </Link>
      </div>
    </main>
  );
}
