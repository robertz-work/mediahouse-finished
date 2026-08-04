"use client";

/**
 * Sidebar filters for the public catalog page.
 */

import { useState, useEffect } from "react";
import {
  VOIVODESHIPS,
  VOIVODESHIP_LABELS,
  ROAD_TYPES,
  ROAD_TYPE_LABELS,
  EXPOSITION_TYPES,
} from "@/lib/constants";
import type { VoivodeshipCode, RoadType, ExpositionType } from "@/lib/constants";

export interface Filters {
  voivodeships: VoivodeshipCode[];
  expositionType: ExpositionType | "";
  illuminated: "" | "true" | "false";
  roadTypes: RoadType[];
  priceMin: string;
  priceMax: string;
  search: string;
  nearbyPoi: string[];
}

export const DEFAULT_FILTERS: Filters = {
  voivodeships: [],
  expositionType: "",
  illuminated: "",
  roadTypes: [],
  priceMin: "",
  priceMax: "",
  search: "",
  nearbyPoi: [],
};

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  onReset: () => void;
  resultCount: number;
}

export default function MediaFilters({ filters, onChange, onReset, resultCount }: Props) {
  const [expanded, setExpanded] = useState({
    voivodeship: true,
    type: true,
    road: false,
    price: true,
    poi: false,
  });

  const [poiCategories, setPoiCategories] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/poi-categories")
      .then((r) => r.json())
      .then((data: string[]) => setPoiCategories(data))
      .catch(console.error);
  }, []);

  const toggle = (key: keyof typeof expanded) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const hasAnyFilter =
    filters.voivodeships.length > 0 ||
    filters.expositionType !== "" ||
    filters.illuminated !== "" ||
    filters.roadTypes.length > 0 ||
    filters.priceMin !== "" ||
    filters.priceMax !== "" ||
    filters.search !== "" ||
    filters.nearbyPoi.length > 0;

  return (
    <aside className="space-y-5">

      <div>
        <input
          type="text"
          placeholder="Szukaj po kodzie, adresie..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
        />
      </div>


      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {resultCount} {resultCount === 1 ? "nośnik" : resultCount < 5 ? "nośniki" : "nośników"}
        </span>
        {hasAnyFilter && (
          <button
            onClick={onReset}
            className="text-xs font-medium text-pink-600 hover:underline"
          >
            Wyczyść filtry
          </button>
        )}
      </div>


      <FilterSection
        title="Województwo"
        open={expanded.voivodeship}
        onToggle={() => toggle("voivodeship")}
      >
        <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
          {VOIVODESHIPS.map((v) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-slate-50">
              <input
                type="checkbox"
                checked={filters.voivodeships.includes(v)}
                onChange={() => {
                  const next = filters.voivodeships.includes(v)
                    ? filters.voivodeships.filter((x) => x !== v)
                    : [...filters.voivodeships, v];
                  onChange({ ...filters, voivodeships: next });
                }}
                className="h-3.5 w-3.5 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
              />
              <span className="text-slate-700">{VOIVODESHIP_LABELS[v]}</span>
            </label>
          ))}
        </div>
      </FilterSection>


      <FilterSection
        title="Rodzaj ekspozycji"
        open={expanded.type}
        onToggle={() => toggle("type")}
      >
        <div className="space-y-1">
          <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-slate-50">
            <input
              type="radio"
              name="expositionType"
              checked={filters.expositionType === ""}
              onChange={() => onChange({ ...filters, expositionType: "" })}
              className="h-3.5 w-3.5 border-slate-300 text-pink-600 focus:ring-pink-500"
            />
            <span className="text-slate-700">Wszystkie</span>
          </label>
          {EXPOSITION_TYPES.map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-slate-50">
              <input
                type="radio"
                name="expositionType"
                checked={filters.expositionType === t}
                onChange={() => onChange({ ...filters, expositionType: t })}
                className="h-3.5 w-3.5 border-slate-300 text-pink-600 focus:ring-pink-500"
              />
              <span className="capitalize text-slate-700">{t}</span>
            </label>
          ))}
        </div>


        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">Oświetlenie</p>
          <div className="flex gap-2">
            {[
              { label: "Wszystkie", value: "" as const },
              { label: "Tak", value: "true" as const },
              { label: "Nie", value: "false" as const },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => onChange({ ...filters, illuminated: opt.value })}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  filters.illuminated === opt.value
                    ? "bg-pink-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </FilterSection>


      <FilterSection
        title="Rodzaj drogi"
        open={expanded.road}
        onToggle={() => toggle("road")}
      >
        <div className="space-y-1">
          {ROAD_TYPES.map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-slate-50">
              <input
                type="checkbox"
                checked={filters.roadTypes.includes(r)}
                onChange={() => {
                  const next = filters.roadTypes.includes(r)
                    ? filters.roadTypes.filter((x) => x !== r)
                    : [...filters.roadTypes, r];
                  onChange({ ...filters, roadTypes: next });
                }}
                className="h-3.5 w-3.5 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
              />
              <span className="text-slate-700">{ROAD_TYPE_LABELS[r]}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title="Cena (za miesiąc)"
        open={expanded.price}
        onToggle={() => toggle("price")}
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="od"
            value={filters.priceMin}
            onChange={(e) => onChange({ ...filters, priceMin: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
          />
          <span className="text-slate-400">—</span>
          <input
            type="number"
            placeholder="do"
            value={filters.priceMax}
            onChange={(e) => onChange({ ...filters, priceMax: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
          />
          <span className="text-xs text-slate-400">zł</span>
        </div>
      </FilterSection>

      {poiCategories.length > 0 && (
        <FilterSection
          title="W pobliżu"
          open={expanded.poi}
          onToggle={() => toggle("poi")}
        >
          <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
            {poiCategories.map((cat) => (
              <label
                key={cat}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={filters.nearbyPoi.includes(cat)}
                  onChange={() => {
                    const next = filters.nearbyPoi.includes(cat)
                      ? filters.nearbyPoi.filter((c) => c !== cat)
                      : [...filters.nearbyPoi, cat];
                    onChange({ ...filters, nearbyPoi: next });
                  }}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                />
                <span className="text-slate-700">{cat}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}
    </aside>
  );
}


function FilterSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-slate-100 pt-4">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <svg
          className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
