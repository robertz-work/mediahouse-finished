"use client";


import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Campaign, CampaignItem } from "@/lib/db/campaignsRepo";
import type { Media } from "@/lib/db/mediaRepo";
import { PERIOD_LABELS, type PeriodDays, VAT_RATE, type PaymentMethod } from "@/lib/constants";

interface EnrichedItem extends CampaignItem {
  media?: Media;
}

export default function CampaignSummaryPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [items, setItems] = useState<EnrichedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [billingName, setBillingName] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingNip, setBillingNip] = useState("");
  const [billingEmail, setBillingEmail] = useState("");

  // Payment method
  // Przelewy24 i PayU tymczasowo wyłączone, domyślnie faktura pro forma.
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("proforma");

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/kampanie/podsumowanie");
    }
  }, [sessionStatus, router]);

  const fetchCampaign = useCallback(async () => {
    try {
      
      const res = await fetch("/api/campaigns/draft");
      const data: Campaign | null = await res.json();


      if (!data || data.items.length === 0) {
        router.push("/koszyk");
        return;
      }
      setCampaign(data);

      if (data.billing?.name) setBillingName(data.billing.name);
      if (data.billing?.address) setBillingAddress(data.billing.address);
      if (data.billing?.nip) setBillingNip(data.billing.nip ?? "");
      if (data.billing?.email) setBillingEmail(data.billing.email);

      if (!data.billing?.email && session?.user?.email) {
        setBillingEmail(session.user.email);
      }

      if (data.paymentMethod) setPaymentMethod(data.paymentMethod);

      const enriched: EnrichedItem[] = await Promise.all(
        data.items.map(async (item) => {
          const mediaRes = await fetch(`/api/media/${item.mediaId}`);
          const media = mediaRes.ok ? await mediaRes.json() : null;
          return { ...item, media: media ?? undefined };
        })
      );
      setItems(enriched);
    } catch (err) {
      console.error("Fetch campaign error:", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user) fetchCampaign();
  }, [session, fetchCampaign]);

  const handleSubmit = async () => {
    if (!campaign) return;

    if (!billingName.trim()) {
      setError("Podaj imię i nazwisko / nazwę firmy");
      return;
    }
    if (!billingAddress.trim()) {
      setError("Podaj adres do faktury");
      return;
    }
    if (!billingEmail.trim()) {
      setError("Podaj email kontaktowy");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const billingRes = await fetch(`/api/campaigns/${campaign.id}/billing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: billingName.trim(),
          address: billingAddress.trim(),
          nip: billingNip.trim() || undefined,
          email: billingEmail.trim(),
          paymentMethod,
        }),
      });

      if (!billingRes.ok) {
        const err = await billingRes.json();
        throw new Error(err.error || "Nie udało się zapisać danych fakturowych");
      }

      const submitRes = await fetch(`/api/campaigns/${campaign.id}/submit`, {
        method: "POST",
      });

      if (!submitRes.ok) {
        const err = await submitRes.json();
        throw new Error(err.error || "Nie udało się złożyć zamówienia");
      }

      const updated: Campaign = await submitRes.json();

      if (paymentMethod === "proforma") {
        router.push(`/kampanie/zlozono?status=awaiting_payment&method=proforma&id=${campaign.id}`);
      } else if (paymentMethod === "p24" || paymentMethod === "payu") {
        const payRes = await fetch(`/api/payments/${paymentMethod}/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: campaign.id }),
        });

        if (!payRes.ok) {
          const err = await payRes.json();
          throw new Error(err.error || "Nie udało się utworzyć płatności");
        }

        const { redirectUrl } = await payRes.json();
        window.location.href = redirectUrl;
        return;
      } else {
        router.push("/kampanie/zlozono?status=awaiting_payment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setSubmitting(false);
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
        <h1 className="text-xl font-bold text-slate-900">Brak nośników w kampanii</h1>
        <p className="mt-2 text-sm text-slate-500">Dodaj nośniki do koszyka, aby kontynuować.</p>
        <Link
          href="/koszyk"
          className="mt-4 inline-block rounded-xl bg-pink-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-pink-700"
        >
          Wróć do koszyka
        </Link>
      </main>
    );
  }

  const vatAmount = Math.round(campaign.totals.grandTotal * VAT_RATE);
  const grossTotal = Math.round(campaign.totals.grandTotal * (1 + VAT_RATE));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/koszyk" className="hover:text-pink-600">
          Koszyk
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900">Podsumowanie zamówienia</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-slate-900">Podsumowanie zamówienia</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Nośniki ({items.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-50">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {item.media?.photos[0] ? (
                      <img
                        src={item.media.photos[0]}
                        alt={item.media.code}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                        —
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {item.media?.code || item.mediaId}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.startDate} — {item.endDate} ·{" "}
                      {PERIOD_LABELS[item.periodDays as PeriodDays]}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-pink-600">
                    {item.priceSnapshot.total.toLocaleString("pl-PL")} zł
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Dane do faktury
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Imię i nazwisko / Nazwa firmy *
                </label>
                <input
                  type="text"
                  value={billingName}
                  onChange={(e) => setBillingName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                  placeholder="Jan Kowalski / Firma Sp. z o.o."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Adres *
                </label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                  placeholder="ul. Przykładowa 1, 00-001 Warszawa"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    NIP (opcjonalnie)
                  </label>
                  <input
                    type="text"
                    value={billingNip}
                    onChange={(e) => setBillingNip(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Email kontaktowy *
                  </label>
                  <input
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                    placeholder="jan@firma.pl"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Metoda płatności
            </h2>

            <div className="space-y-3">
              {/* ── Przelewy24 i PayU tymczasowo wyłączone ──
                  Aby przywrócić, zmień `false` na `true` w blokach poniżej
                  /}

              {/* Przelewy24 */}
              {false && (
              <label
                className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition ${
                  paymentMethod === "p24"
                    ? "border-pink-500 bg-pink-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="p24"
                  checked={paymentMethod === "p24"}
                  onChange={() => setPaymentMethod("p24")}
                  className="mt-0.5 h-4 w-4 text-pink-600 focus:ring-pink-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span className="text-sm font-semibold text-slate-900">Przelewy24</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Szybki przelew online — natychmiastowa realizacja
                  </p>
                </div>
              </label>
              )}

              {/* PayU */}
              {false && (
              <label
                className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition ${
                  paymentMethod === "payu"
                    ? "border-pink-500 bg-pink-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="payu"
                  checked={paymentMethod === "payu"}
                  onChange={() => setPaymentMethod("payu")}
                  className="mt-0.5 h-4 w-4 text-pink-600 focus:ring-pink-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-sm font-semibold text-slate-900">PayU</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Płatność online — BLIK, karta, przelew
                  </p>
                </div>
              </label>
              )}

              {/* Faktura pro forma */}
              <label
                className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition ${
                  paymentMethod === "proforma"
                    ? "border-pink-500 bg-pink-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="proforma"
                  checked={paymentMethod === "proforma"}
                  onChange={() => setPaymentMethod("proforma")}
                  className="mt-0.5 h-4 w-4 text-pink-600 focus:ring-pink-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-semibold text-slate-900">Faktura pro forma</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Faktura pro forma do pobrania w szczegółach kampanii. Opłać przelewem tradycyjnym w ciągu 14 dni.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div>
          <div className="sticky top-20 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Podsumowanie
            </h2>

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
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Razem netto</span>
                  <span>{campaign.totals.grandTotal.toLocaleString("pl-PL")} zł</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>VAT 23%</span>
                  <span>{vatAmount.toLocaleString("pl-PL")} zł</span>
                </div>
                <div className="mt-1 flex justify-between text-base font-bold text-pink-600">
                  <span>Razem brutto</span>
                  <span>{grossTotal.toLocaleString("pl-PL")} zł</span>
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-6 w-full rounded-xl bg-pink-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
            >
              {submitting
                ? "Składanie zamówienia..."
                : paymentMethod === "proforma"
                ? "Złóż zamówienie"
                : "Złóż zamówienie i zapłać"}
            </button>

            <p className="mt-3 text-center text-[11px] text-slate-400">
              {paymentMethod === "proforma"
                ? "Faktura pro forma będzie dostępna w szczegółach kampanii."
                : paymentMethod === "p24"
                ? "Zostaniesz przekierowany do Przelewy24."
                : "Zostaniesz przekierowany do PayU."}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
