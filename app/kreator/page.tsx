"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  VOIVODESHIPS,
  VOIVODESHIP_LABELS,
  PERIOD_DAYS,
  PERIOD_LABELS,
  EXPOSITION_TYPES,
  type PeriodDays,
  type VoivodeshipCode,
} from "@/lib/constants";
import { getMinStartDate } from "@/lib/helpers/dateValidation";
import AvailabilityCalendar from "@/components/media/AvailabilityCalendar";
import AddTargetDialog from "@/components/campaign/AddTargetDialog";
import type { Media } from "@/lib/db/mediaRepo";
import type { PriceSnapshot } from "@/lib/pricing";

interface SuggestItem {
  media: Media;
  priceSnapshot: PriceSnapshot;
  addPrint: boolean;
  addInstall: boolean;
}

interface SuggestResult {
  items: SuggestItem[];
  totalCost: number;
  remainingBudget: number;
  budget: number;
}

type Step = "form" | "results";

export default function CreatorPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const minDate = getMinStartDate();

  const [voivodeships, setVoivodeships] = useState<VoivodeshipCode[]>([]);
  const [periodDays, setPeriodDays] = useState<PeriodDays>(90);
  const [startDate, setStartDate] = useState(minDate);
  const [budget, setBudget] = useState("");
  const [addPrint, setAddPrint] = useState<"yes" | "no" | "any">("any");
  const [addInstall, setAddInstall] = useState<"yes" | "no" | "any">("any");
  const [expositionType, setExpositionType] = useState("");
  const [nearbyPoi, setNearbyPoi] = useState<string[]>([]);

  const [poiCategories, setPoiCategories] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/poi-categories")
      .then((r) => r.json())
      .then((data: string[]) => setPoiCategories(data))
      .catch(console.error);
  }, []);

  const [step, setStep] = useState<Step>("form");
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [error, setError] = useState("");
  const [expandedCalendar, setExpandedCalendar] = useState<string | null>(null);
  const [existingDraft, setExistingDraft] = useState<{
    id: string;
    itemCount: number;
    total: number;
  } | null>(null);

  if (sessionStatus === "loading") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
      </main>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">Zaloguj się</h1>
        <p className="mt-2 text-sm text-slate-500">
          Aby korzystać z kreatora kampanii, musisz być zalogowany.
        </p>
        <Link
          href="/login?callbackUrl=/kreator"
          className="mt-4 inline-block rounded-xl bg-pink-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-pink-700"
        >
          Zaloguj się
        </Link>
      </main>
    );
  }

  const handleSearch = async () => {
    if (voivodeships.length === 0) {
      setError("Wybierz co najmniej jedno województwo");
      return;
    }
    if (!budget || Number(budget) <= 0) {
      setError("Podaj budżet większy od 0");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/campaigns/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voivodeships,
          periodDays,
          startDate,
          budget: Number(budget),
          addPrint,
          addInstall,
          expositionType,
          nearbyPoi,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd serwera");
      }

      const data: SuggestResult = await res.json();
      setResult(data);
      setSelected(new Set(data.items.map((i) => i.media.id)));
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!result) return;
    setError("");
    try {
      const res = await fetch("/api/campaigns/draft");
      const draft = await res.json();
      if (draft && draft.items?.length > 0) {
        setExistingDraft({
          id: draft.id,
          itemCount: draft.items.length,
          total: draft.totals?.grandTotal ?? 0,
        });
        return;
      }
    } catch {
    }
    await performAddBatch("new");
  };

  const performAddBatch = async (target: "existing" | "new") => {
    if (!result) return;
    setAddingToCart(true);
    setError("");

    try {
      let campaignId: string;
      if (target === "existing" && existingDraft) {
        campaignId = existingDraft.id;
      } else {
        const campRes = await fetch("/api/campaigns?new=1", { method: "POST" });
        if (!campRes.ok) throw new Error("Nie udało się utworzyć kampanii");
        campaignId = (await campRes.json()).id;
      }

      const selectedItems = result.items.filter((i) => selected.has(i.media.id));
      let added = 0;
      const errors: string[] = [];

      for (const item of selectedItems) {
        const res = await fetch(`/api/campaigns/${campaignId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaId: item.media.id,
            periodDays,
            startDate,
            addPrint: item.addPrint,
            addInstall: item.addInstall,
          }),
        });

        if (res.ok) {
          added++;
        } else {
          const err = await res.json();
          errors.push(`${item.media.code}: ${err.error}`);
        }
      }

      if (errors.length > 0 && added === 0) {
        throw new Error(errors.join("; "));
      }

      router.push("/koszyk");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setAddingToCart(false);
      setExistingDraft(null);
    }
  };

  const toggleItem = (mediaId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(mediaId)) next.delete(mediaId);
      else next.add(mediaId);
      return next;
    });
  };

  const selectedTotal = result
    ? result.items
        .filter((i) => selected.has(i.media.id))
        .reduce((sum, i) => sum + i.priceSnapshot.total, 0)
    : 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <AddTargetDialog
        open={!!existingDraft}
        itemCount={existingDraft?.itemCount ?? 0}
        total={existingDraft?.total ?? 0}
        busy={addingToCart}
        onSelect={performAddBatch}
        onCancel={() => setExistingDraft(null)}
      />
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Kreator kampanii</h1>
      <p className="mb-8 text-sm text-slate-500">
        Podaj budżet i preferencje — zaproponujemy nośniki, które się w nim zmieszczą.
      </p>

      {step === "form" ? (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Województwa <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {VOIVODESHIPS.map((v) => (
                <label
                  key={v}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={voivodeships.includes(v)}
                    onChange={() =>
                      setVoivodeships((prev) =>
                        prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
                      )
                    }
                    className="h-3.5 w-3.5 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                  />
                  {VOIVODESHIP_LABELS[v]}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Okres</label>
              <select
                value={periodDays}
                onChange={(e) => setPeriodDays(Number(e.target.value) as PeriodDays)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                {PERIOD_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {PERIOD_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Data rozpoczęcia</label>
              <input
                type="date"
                value={startDate}
                min={minDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Budżet netto (zł) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              placeholder="np. 10000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Rodzaj ekspozycji</label>
            <div className="flex gap-2">
              {[{ label: "Bez znaczenia", value: "" }, ...EXPOSITION_TYPES.map((t) => ({ label: t, value: t }))].map(
                (opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setExpositionType(opt.value)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
                      expositionType === opt.value
                        ? "bg-pink-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              )}
            </div>
          </div>

          {poiCategories.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                W pobliżu (opcjonalnie)
              </label>
              <div className="flex flex-wrap gap-2">
                {poiCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      setNearbyPoi((prev) =>
                        prev.includes(cat)
                          ? prev.filter((c) => c !== cat)
                          : [...prev, cat]
                      )
                    }
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      nearbyPoi.includes(cat)
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {nearbyPoi.length > 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  Nośnik musi być w pobliżu co najmniej jednego z zaznaczonych obiektów.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Druk</label>
              <div className="flex gap-2">
                {(["any", "yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setAddPrint(v)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      addPrint === v
                        ? "bg-pink-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {v === "any" ? "Bez znaczenia" : v === "yes" ? "Tak" : "Nie"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Montaż</label>
              <div className="flex gap-2">
                {(["any", "yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setAddInstall(v)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      addInstall === v
                        ? "bg-pink-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {v === "any" ? "Bez znaczenia" : v === "yes" ? "Tak" : "Nie"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full rounded-xl bg-pink-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
          >
            {loading ? "Szukam..." : "Znajdź nośniki"}
          </button>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setStep("form")}
            className="mb-4 text-sm font-medium text-pink-600 hover:underline"
          >
            &larr; Zmień kryteria
          </button>

          {result && result.items.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-lg font-medium text-slate-500">
                Nie znaleziono nośników spełniających kryteria
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Spróbuj zwiększyć budżet lub rozszerzyć filtry.
              </p>
            </div>
          ) : result ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3">
                <div className="text-sm text-slate-600">
                  Zaznaczono{" "}
                  <span className="font-bold text-slate-900">{selected.size}</span> z{" "}
                  {result.items.length} nośników
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-500">
                    Koszt:{" "}
                    <span className="font-bold text-pink-600">
                      {selectedTotal.toLocaleString("pl-PL")} zł
                    </span>
                  </span>
                  <span className="text-slate-500">
                    Pozostało:{" "}
                    <span className="font-medium text-emerald-600">
                      {(result.budget - selectedTotal).toLocaleString("pl-PL")} zł
                    </span>
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {result.items.map((item) => (
                  <div
                    key={item.media.id}
                    className={`rounded-xl border p-3 transition ${
                      selected.has(item.media.id)
                        ? "border-pink-200 bg-pink-50/50"
                        : "border-slate-200 bg-white opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selected.has(item.media.id)}
                        onChange={() => toggleItem(item.media.id)}
                        className="h-4 w-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                      />

                      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {item.media.photos[0] ? (
                          <img
                            src={item.media.photos[0]}
                            alt={item.media.code}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-400">
                            —
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link
                              href={`/nosniki/${item.media.id}`}
                              className="text-sm font-semibold text-slate-900 hover:text-pink-600"
                              target="_blank"
                            >
                              {item.media.code}
                            </Link>
                            <p className="text-xs text-slate-500 line-clamp-1">
                              {item.media.address}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-bold text-pink-600">
                            {item.priceSnapshot.total.toLocaleString("pl-PL")} zł
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                            {item.media.size.widthCm}×{item.media.size.heightCm} cm
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 capitalize text-slate-600">
                            {item.media.expositionType}
                          </span>
                          {item.addPrint && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">
                              +druk
                            </span>
                          )}
                          {item.addInstall && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">
                              +montaż
                            </span>
                          )}
                          {item.media.nearbyPoi &&
                            item.media.nearbyPoi.slice(0, 3).map((poi) => (
                              <span
                                key={poi}
                                className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600"
                              >
                                {poi}
                              </span>
                            ))}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCalendar(
                                expandedCalendar === item.media.id ? null : item.media.id
                              );
                            }}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 hover:bg-pink-50 hover:text-pink-600 transition cursor-pointer"
                          >
                            {expandedCalendar === item.media.id ? "Ukryj kalendarz" : "Dostępność"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {expandedCalendar === item.media.id && (
                      <div className="mt-3 border-t border-slate-100 pt-3 pl-12">
                        <AvailabilityCalendar mediaId={item.media.id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                onClick={handleAddToCart}
                disabled={selected.size === 0 || addingToCart}
                className="mt-6 w-full rounded-xl bg-pink-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
              >
                {addingToCart
                  ? "Dodawanie do koszyka..."
                  : `Wrzuć ${selected.size} ${selected.size === 1 ? "nośnik" : selected.size < 5 ? "nośniki" : "nośników"} do koszyka`}
              </button>
            </>
          ) : null}
        </div>
      )}
    </main>
  );
}
