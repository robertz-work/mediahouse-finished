"use client";


import { useState, useMemo, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DynamicSingleMarkerMap from "@/components/map/DynamicSingleMarkerMap";
import AvailabilityCalendar from "@/components/media/AvailabilityCalendar";
import AddTargetDialog from "@/components/campaign/AddTargetDialog";
import type { Media } from "@/lib/db/mediaRepo";
import { type PeriodDays } from "@/lib/constants";
import { getMinStartDate } from "@/lib/helpers/dateValidation";

interface PricingRow {
  label: string;
  price: number | undefined;
  days: number;
}

interface Props {
  media: Media;
  pricingRows: PricingRow[];
  voivodeshipLabel: string;
  roadTypeLabel: string;
}

export default function MediaDetailClient({
  media,
  pricingRows,
  voivodeshipLabel,
  roadTypeLabel,
}: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const minDate = getMinStartDate();

  const [selectedPeriod, setSelectedPeriod] = useState<number>(
    pricingRows.length > 0 ? pricingRows[0].days : 30
  );
  const [startDate, setStartDate] = useState(minDate);
  const [addPrint, setAddPrint] = useState(false);
  const [addInstall, setAddInstall] = useState(false);

  const isLoggedIn = !!session?.user;
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const checkFavorite = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch("/api/favorites");
      if (res.ok) {
        const data: { mediaIds: string[] } = await res.json();
        setIsFav(data.mediaIds.includes(media.id));
      }
    } catch {}
  }, [isLoggedIn, media.id]);

  useEffect(() => {
    checkFavorite();
  }, [checkFavorite]);

  const handleToggleFavorite = async () => {
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=/nosniki/${media.id}`);
      return;
    }
    setFavLoading(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: media.id }),
      });
      if (res.ok) {
        const data: { favorited: boolean } = await res.json();
        setIsFav(data.favorited);
      }
    } finally {
      setFavLoading(false);
    }
  };

  const endDate = useMemo(() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + selectedPeriod);
    return d.toISOString().split("T")[0];
  }, [startDate, selectedPeriod]);

  const basePrice = pricingRows.find((r) => r.days === 30)?.price;
  function discountPct(row: PricingRow): number | null {
    if (!basePrice || !row.price || row.days === 30) return null;
    const months = row.days / 30;
    const fullPrice = basePrice * months;
    const pct = Math.round(((fullPrice - row.price) / fullPrice) * 100);
    return pct > 0 ? pct : null;
  }


  const selectedPrice = pricingRows.find((r) => r.days === selectedPeriod)?.price ?? 0;
  const printCost = addPrint ? (media.pricing.printCost ?? 0) : 0;
  const installCost = addInstall ? (media.pricing.installCost ?? 0) : 0;
  const total = selectedPrice + printCost + installCost;


  const [existingDraft, setExistingDraft] = useState<{
    id: string;
    itemCount: number;
    total: number;
  } | null>(null);

  const handleAddToCampaign = async () => {
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
    await performAdd("new");
  };

  const performAdd = async (target: "existing" | "new") => {
    setLoading(true);
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

      const itemRes = await fetch(`/api/campaigns/${campaignId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: media.id,
          periodDays: selectedPeriod,
          startDate,
          addPrint,
          addInstall,
        }),
      });

      if (!itemRes.ok) {
        const err = await itemRes.json();
        throw new Error(err.error || "Nie udało się dodać nośnika");
      }

      router.push("/koszyk");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setLoading(false);
      setExistingDraft(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <AddTargetDialog
        open={!!existingDraft}
        itemCount={existingDraft?.itemCount ?? 0}
        total={existingDraft?.total ?? 0}
        busy={loading}
        onSelect={performAdd}
        onCancel={() => setExistingDraft(null)}
      />

      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-pink-600">Media House</Link>
        <span className="mx-2">•</span>
        <Link href="/nosniki" className="hover:text-pink-600">Karta produktu</Link>
        <span className="mx-2">•</span>
        <span className="font-medium text-slate-900">{media.expositionType === "baner" ? "Baner" : "Billboard"} {media.code}</span>
      </nav>


      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        {media.expositionType === "baner" ? "Baner" : "Billboard"} {media.code}
      </h1>

      <div className="grid gap-8 lg:grid-cols-2">

        <div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
            {media.photos.length > 0 ? (
              <img
                src={media.photos[selectedPhoto]}
                alt={`${media.code} — zdjęcie ${selectedPhoto + 1}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-lg text-slate-400">
                Zdjęcia
              </div>
            )}
          </div>

  
          {media.photos.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {media.photos.slice(0, 4).map((photo, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedPhoto(i)}
                  className={`aspect-[4/3] overflow-hidden rounded-xl border-2 transition ${
                    i === selectedPhoto
                      ? "border-pink-600"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={photo} alt={`Miniatura ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}


          <section className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Parametry techniczne
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <ParamPill label="ROZMIAR" value={`${Math.round(media.size.widthCm / 100)}x${Math.round(media.size.heightCm / 100)}m`} />
              <ParamPill label="WYSOKOŚĆ OD ZIEMI" value={`${Math.round(media.heightFromGroundCm / 100)}m`} />
              <ParamPill label="ODLEGŁOŚĆ OD DROGI" value={`${media.distanceFromRoadM}m`} />
              <ParamPill label="TYP DROGI" value={roadTypeLabel} />
              <ParamPill label="EKSPOZYCJA" value={media.expositionType === "baner" ? "Baner" : "Billboard"} />
              <ParamPill label="OŚWIETLENIE" value={media.illuminated ? "LED" : "Brak"} />
              {media.requiresLift && <ParamPill label="MONTAŻ ZE ZWYŻKĄ" value="Tak" />}
            </div>
          </section>


          <section className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Lokalizacja
            </h2>
            <DynamicSingleMarkerMap lat={media.gps.lat} lng={media.gps.lng} height="280px" />


            {media.nearbyPoi && media.nearbyPoi.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pobliskie punkty
                </p>
                <div className="flex flex-wrap gap-2">
                  {media.nearbyPoi.map((poi) => (
                    <span key={poi} className="rounded-full bg-pink-600 px-3 py-1 text-xs font-semibold text-white">
                      {poi}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>


          {media.description && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                Opis lokalizacji
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                {media.description}
              </p>
            </section>
          )}
        </div>


        <div>
          <div className="sticky top-20 space-y-6">

            <div>
              <h2 className="mb-3 text-base font-semibold text-slate-900">
                Wybierz okres emisji
              </h2>
              <div className="space-y-2">
                {pricingRows.map((row) => {
                  const disc = discountPct(row);
                  const isSelected = selectedPeriod === row.days;
                  return (
                    <button
                      key={row.days}
                      onClick={() => setSelectedPeriod(row.days)}
                      className={`w-full rounded-2xl border-2 px-5 py-4 text-center transition ${
                        isSelected
                          ? "border-pink-600 bg-white shadow-md"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <p className="text-sm text-slate-500">
                        {row.label}
                        {disc && (
                          <span className="ml-2 text-pink-600 font-medium">
                            (oszczędzasz {disc}%)
                          </span>
                        )}
                      </p>
                      <p className={`mt-1 text-2xl font-bold ${isSelected ? "text-pink-600" : "text-slate-900"}`}>
                        {row.price!.toLocaleString("pl-PL")} zł
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>


            <div>
              <h2 className="mb-3 text-base font-semibold text-slate-900">
                Wybierz termin
              </h2>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={startDate}
                  min={minDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 rounded-full border border-slate-300 px-4 py-2.5 text-sm text-center focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="date"
                  value={endDate}
                  disabled
                  className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-center text-slate-500"
                />
              </div>
            </div>


            <div>
              <h2 className="mb-3 text-base font-semibold text-slate-900">
                Dostępność
              </h2>
              <AvailabilityCalendar mediaId={media.id} />
            </div>


            <div>
              <h2 className="mb-3 text-base font-semibold text-slate-900">
                Dodatki
              </h2>
              <div className="space-y-3">
                {media.pricing.printCost != null && media.pricing.printCost > 0 && (
                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition hover:border-pink-300">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={addPrint}
                        onChange={(e) => setAddPrint(e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                      />
                      <span className="text-sm font-medium text-slate-900">Druk materiału</span>
                    </div>
                    <span className="text-sm font-semibold text-pink-600">
                      +{media.pricing.printCost.toLocaleString("pl-PL")} zł
                    </span>
                  </label>
                )}
                {media.pricing.installCost != null && media.pricing.installCost > 0 && (
                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition hover:border-pink-300">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={addInstall}
                        onChange={(e) => setAddInstall(e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                      />
                      <span className="text-sm font-medium text-slate-900">Montaż</span>
                    </div>
                    <span className="text-sm font-semibold text-pink-600">
                      +{media.pricing.installCost.toLocaleString("pl-PL")} zł
                    </span>
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  Nośnik <span className="text-slate-400">({pricingRows.find(r => r.days === selectedPeriod)?.label})</span>
                </span>
                <span className="font-semibold text-slate-900">
                  {selectedPrice.toLocaleString("pl-PL")} zł
                </span>
              </div>
              {addPrint && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Druk</span>
                  <span className="font-semibold text-slate-900">
                    {printCost.toLocaleString("pl-PL")} zł
                  </span>
                </div>
              )}
              {addInstall && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Montaż</span>
                  <span className="font-semibold text-slate-900">
                    {installCost.toLocaleString("pl-PL")} zł
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <span className="text-base font-bold text-slate-900">Razem</span>
                <span className="text-2xl font-bold text-pink-600">
                  {total.toLocaleString("pl-PL")} zł
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cena netto. Faktura VAT wystawiana automatycznie.
              </p>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleToggleFavorite}
                disabled={favLoading}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${
                  isFav
                    ? "border-pink-300 bg-pink-50 text-pink-600"
                    : "border-slate-300 text-slate-700 hover:border-pink-300 hover:text-pink-600"
                }`}
              >
                {isFav ? "W ulubionych" : "Zapisz do ulubionych"}
                <svg
                  className="h-4 w-4"
                  fill={isFav ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>

              {isLoggedIn ? (
                <button
                  onClick={handleAddToCampaign}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-pink-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
                >
                  {loading ? "Dodawanie..." : "Dodaj do kampanii"}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              ) : (
                <Link
                  href="/login"
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-pink-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-pink-700"
                >
                  Dodaj do kampanii
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="mt-16 rounded-3xl bg-slate-900 px-8 py-16 text-center">
        <h2 className="text-3xl font-bold text-white">
          Gotowy na <span className="text-pink-500">kampanię OOH?</span>
        </h2>
        <p className="mt-3 text-slate-400">
          Tysiące lokalizacji w całej Polsce.{" "}
          <span className="font-semibold text-white">Zacznij już teraz.</span>
        </p>
        <Link
          href="/kreator"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-pink-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-pink-700"
        >
          Stwórz kampanię
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </section>
    </main>
  );
}

function ParamPill({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <span className="inline-block rounded-full bg-pink-600 px-3 py-1 text-xs font-semibold text-white">
        {value}
      </span>
    </div>
  );
}
