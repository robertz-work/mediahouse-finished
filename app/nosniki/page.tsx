"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import MediaCard from "@/components/media/MediaCard";
import MediaFilters, {
  DEFAULT_FILTERS,
  type Filters,
} from "@/components/media/MediaFilters";
import DynamicCatalogMap from "@/components/map/DynamicCatalogMap";
import type { Media } from "@/lib/db/mediaRepo";

type ViewMode = "grid" | "map";

export default function CatalogPage() {
  const [allItems, setAllItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    fetch("/api/media/published")
      .then((r) => r.json())
      .then((data: Media[]) => setAllItems(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let items = allItems;

    if (filters.voivodeships.length > 0) {
      items = items.filter((m) => filters.voivodeships.includes(m.voivodeship));
    }

    if (filters.expositionType) {
      items = items.filter((m) => m.expositionType === filters.expositionType);
    }

    if (filters.illuminated === "true") {
      items = items.filter((m) => m.illuminated);
    } else if (filters.illuminated === "false") {
      items = items.filter((m) => !m.illuminated);
    }

    if (filters.roadTypes.length > 0) {
      items = items.filter((m) => filters.roadTypes.includes(m.roadType));
    }

    if (filters.priceMin || filters.priceMax) {
      const min = filters.priceMin ? Number(filters.priceMin) : 0;
      const max = filters.priceMax ? Number(filters.priceMax) : Infinity;
      items = items.filter((m) => {
        const prices = [
          m.pricing.month1,
          m.pricing.month3,
          m.pricing.month6,
          m.pricing.month12,
        ].filter((v): v is number => v !== undefined && v > 0);
        if (prices.length === 0) return false;
        const cheapest = Math.min(...prices);
        return cheapest >= min && cheapest <= max;
      });
    }

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (m) =>
          m.code.toLowerCase().includes(q) ||
          m.address.toLowerCase().includes(q) ||
          (m.city && m.city.toLowerCase().includes(q)) ||
          m.locationTags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filters.nearbyPoi.length > 0) {
      items = items.filter(
        (m) =>
          m.nearbyPoi &&
          m.nearbyPoi.some((poi) => filters.nearbyPoi.includes(poi))
      );
    }

    return items;
  }, [allItems, filters]);

  const handleReset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Katalog nośników</h1>
          <p className="mt-1 text-sm text-slate-500">
            Przeglądaj dostępne billboardy i banery w całej Polsce
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
            aria-label="Filtry"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>

          <div className="flex rounded-lg border border-slate-300 bg-white p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                viewMode === "grid"
                  ? "bg-pink-600 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Lista
              </span>
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                viewMode === "map"
                  ? "bg-pink-600 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Mapa
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        <div className="hidden w-64 shrink-0 lg:block">
          <MediaFilters
            filters={filters}
            onChange={setFilters}
            onReset={handleReset}
            resultCount={filtered.length}
          />
        </div>

        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setMobileFiltersOpen(false)}
            />
            <div className="relative z-10 h-full w-80 max-w-full overflow-y-auto bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Filtry</h2>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <MediaFilters
                filters={filters}
                onChange={setFilters}
                onReset={handleReset}
                resultCount={filtered.length}
              />
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <svg className="mb-4 h-16 w-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <p className="text-lg font-medium text-slate-500">
                Brak nośników spełniających kryteria
              </p>
              <button
                onClick={handleReset}
                className="mt-2 text-sm font-medium text-pink-600 hover:underline"
              >
                Wyczyść filtry
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((m) => (
                <MediaCard key={m.id} media={m} />
              ))}
            </div>
          ) : (
            <DynamicCatalogMap items={filtered} height="calc(100vh - 220px)" />
          )}
        </div>
      </div>
    </main>
  );
}
