import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import * as campaignsRepo from "@/lib/db/campaignsRepo";
import * as mediaRepo from "@/lib/db/mediaRepo";
import {
  PERIOD_LABELS,
  VAT_RATE,
  PAYMENT_METHOD_LABELS,
  type CampaignStatus,
  type PeriodDays,
  type PaymentMethod,
} from "@/lib/constants";
import CancelButton from "./CancelButton";
import CampaignTimeline from "./CampaignTimeline";
import RemoveItemButton from "./RemoveItemButton";
import GoToCartButton from "./GoToCartButton";
import PayP24Button from "./PayP24Button"; // <-- DODAJE IMPORT

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Szkic",
  pending_approval: "Oczekuje na akceptację",
  awaiting_payment: "Oczekuje na płatność",
  paid: "Opłacona",
  active: "Aktywna",
  completed: "Zakończona",
  cancelled: "Anulowana",
  rejected: "Odrzucona",
};

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_approval: "bg-amber-100 text-amber-800",
  awaiting_payment: "bg-blue-100 text-blue-800",
  paid: "bg-emerald-100 text-emerald-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
};

const CANCELLABLE: CampaignStatus[] = [
  "draft",
  "pending_approval",
  "awaiting_payment",
];

export default async function KampaniaSzczegolyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const campaign = await campaignsRepo.findById(id);
  // Właściciel widzi swoją kampanię; admin może podejrzeć dowolną.
  const isOwner = campaign?.clientId === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!campaign || (!isOwner && !isAdmin)) notFound();

  const mediaMap = new Map<string, { code: string; address: string; photos: string[] }>();
  for (const item of campaign.items) {
    if (!mediaMap.has(item.mediaId)) {
      const media = await mediaRepo.findById(item.mediaId);
      if (media) {
        mediaMap.set(item.mediaId, {
          code: media.code,
          address: media.address,
          photos: media.photos,
        });
      }
    }
  }

  const grossTotal = campaign.totals.grandTotal * (1 + VAT_RATE);

  const timelineItems = campaign.items.map((item) => {
    const media = mediaMap.get(item.mediaId);
    return {
      id: item.id,
      label: media ? `${media.code} — ${media.address}` : item.mediaId.slice(0, 8),
      startDate: item.startDate,
      endDate: item.endDate,
    };
  });

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {campaign.name || `Kampania #${campaign.id.slice(0, 8)}`}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Utworzona: {new Date(campaign.createdAt).toLocaleDateString("pl-PL")}
            {" · "}
            Zmieniona: {new Date(campaign.updatedAt).toLocaleDateString("pl-PL")}
          </p>
        </div>
        <span
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${STATUS_COLORS[campaign.status]}`}
        >
          {STATUS_LABELS[campaign.status]}
        </span>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatBox label="Nośniki" value={String(campaign.items.length)} />
        <StatBox
          label="Netto"
          value={campaign.totals.grandTotal.toLocaleString("pl-PL", {
            style: "currency",
            currency: "PLN",
          })}
        />
        <StatBox
          label="Brutto (23% VAT)"
          value={grossTotal.toLocaleString("pl-PL", {
            style: "currency",
            currency: "PLN",
          })}
        />
        <StatBox label="Status" value={STATUS_LABELS[campaign.status]} />
      </div>

      {campaign.items.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Harmonogram
          </h2>
          <CampaignTimeline items={timelineItems} />
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Nośniki w kampanii
        </h2>
        {campaign.items.length === 0 ? (
          <p className="text-slate-500">Brak nośników.</p>
        ) : (
          <div className="space-y-3">
            {campaign.items.map((item) => {
              const media = mediaMap.get(item.mediaId);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4"
                >
                  {media?.photos?.[0] && (
                    <img
                      src={media.photos[0]}
                      alt=""
                      className="h-16 w-24 shrink-0 rounded-xl object-cover"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">
                      {media ? `${media.code} — ${media.address}` : item.mediaId.slice(0, 8)}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {PERIOD_LABELS[item.periodDays as PeriodDays] ?? `${item.periodDays} dni`}
                      {" · "}
                      {new Date(item.startDate).toLocaleDateString("pl-PL")} –{" "}
                      {new Date(item.endDate).toLocaleDateString("pl-PL")}
                      {item.addPrint && " · Druk"}
                      {item.addInstall && " · Montaż"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      {(
                        item.priceSnapshot.media +
                        item.priceSnapshot.print +
                        item.priceSnapshot.install
                      ).toLocaleString("pl-PL", {
                        style: "currency",
                        currency: "PLN",
                      })}
                    </p>
                    <p className="text-xs text-slate-500">netto</p>
                  </div>

                  {isOwner && campaign.status === "draft" && (
                    <RemoveItemButton campaignId={campaign.id} itemId={item.id} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {campaign.billing.name && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Dane rozliczeniowe
          </h2>
          <div className="rounded-2xl border border-slate-200 p-5 text-sm text-slate-700">
            <p className="font-semibold">{campaign.billing.name}</p>
            <p>{campaign.billing.address}</p>
            {campaign.billing.nip && <p>NIP: {campaign.billing.nip}</p>}
            <p>{campaign.billing.email}</p>
          </div>
        </section>
      )}

      {campaign.paymentMethod && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Płatność i faktury
          </h2>
          <div className="rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Metoda płatności</p>
                <p className="font-semibold text-slate-900">
                  {PAYMENT_METHOD_LABELS[campaign.paymentMethod as PaymentMethod] ?? campaign.paymentMethod}
                </p>
              </div>

              {/* Sekcja dla Proforma */}
              {campaign.paymentMethod === "proforma" && campaign.invoiceUrl && (
                <a
                  href={campaign.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Pobierz fakturę pro forma
                </a>
              )}

              {/* Sekcja dla Przelewy24 (Przycisk "Zapłać") */}
              {(campaign.paymentMethod === "p24") &&
                campaign.status === "awaiting_payment" &&
                isOwner && (
                  <PayP24Button
      campaignId={campaign.id}
      amount={grossTotal}
      email={campaign.billing.email || session.user.email || ""}
    />
                )}
            </div>

            {/* Komunikat dla Proforma */}
            {campaign.paymentMethod === "proforma" && campaign.invoiceNumber && (
              <div className="mt-3 rounded-xl bg-amber-50 p-3">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">Nr faktury:</span> {campaign.invoiceNumber}
                </p>
                {campaign.status === "awaiting_payment" && (
                  <p className="mt-1 text-xs text-amber-600">
                    Opłać fakturę przelewem tradycyjnym. Po zaksięgowaniu wpłaty administrator aktywuje kampanię.
                  </p>
                )}
              </div>
            )}

            {/* Komunikat dla P24 w trakcie oczekiwania */}
            {(campaign.paymentMethod === "p24" ) &&
              campaign.status === "awaiting_payment" && (
                <div className="mt-3 rounded-xl bg-blue-50 p-3">
                  <p className="text-xs text-blue-800">
                    Kampania oczekuje na opłacenie online. Kliknij przycisk „Zapłać przez Przelewy24”, aby bezpiecznie przejść do płatności.
                  </p>
                </div>
              )}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Podsumowanie kosztów
        </h2>
        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="space-y-2 text-sm">
            <Row label="Nośniki (netto)" value={campaign.totals.mediaSubtotal} />
            <Row label="Druk (netto)" value={campaign.totals.printSubtotal} />
            <Row label="Montaż (netto)" value={campaign.totals.installSubtotal} />
            <div className="border-t border-slate-100 pt-2">
              <Row label="Razem netto" value={campaign.totals.grandTotal} bold />
            </div>
            <Row label="VAT (23%)" value={campaign.totals.grandTotal * VAT_RATE} />
            <div className="border-t border-slate-200 pt-2">
              <Row label="Razem brutto" value={grossTotal} bold />
            </div>
          </div>
        </div>
      </section>

      {isOwner && campaign.status === "draft" && campaign.items.length > 0 && (
        <div className="mb-6">
          <GoToCartButton campaignId={campaign.id} />
        </div>
      )}

      {isOwner && CANCELLABLE.includes(campaign.status) && (
        <CancelButton campaignId={campaign.id} />
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 text-center">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-slate-600">{label}</span>
      <span className="text-slate-900">
        {value.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
      </span>
    </div>
  );
}