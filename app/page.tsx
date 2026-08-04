"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  VOIVODESHIPS,
  VOIVODESHIP_LABELS,
  EXPOSITION_TYPES,
  PERIOD_DAYS,
  PERIOD_LABELS,
} from "@/lib/constants";
import DynamicCatalogMap from "@/components/map/DynamicCatalogMap";
import MediaCard from "@/components/media/MediaCard";
import type { Media } from "@/lib/db/mediaRepo";

export default function HomePage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [voivodeship, setVoivodeship] = useState("");
  const [city, setCity] = useState("");
  const [expositionType, setExpositionType] = useState("");
  const [period, setPeriod] = useState<string>("");

  const [allMedia, setAllMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/media")
      .then((r) => r.json())
      .then((data) => {
        setAllMedia(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const featured = allMedia.filter((m) => m.featured);
  const displayed = featured.length > 0 ? featured : allMedia.slice(0, 6);

  function handleSearch() {
    const params = new URLSearchParams();
    if (voivodeship) params.set("voivodeship", voivodeship);
    if (city) params.set("city", city);
    if (expositionType) params.set("expositionType", expositionType);
    if (period) params.set("period", period);
    router.push(`/nosniki?${params.toString()}`);
  }

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const w = scrollRef.current.offsetWidth;
    scrollRef.current.scrollBy({ left: dir === "left" ? -w : w, behavior: "smooth" });
  };

  return (
    <main>
      <section className="relative bg-slate-900 pb-32 pt-16 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
            Zaplanuj{" "}
            <span className="text-pink-600">kampanię outdoorową</span> w{" "}
            <span className="text-pink-600">3 minuty</span>
          </h1>
          <p className="mt-4 text-base text-slate-300 sm:text-lg">
            Setki billboardów i banerów w całej Polsce. Transparentne ceny,
            szybki start, druk i montaż.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
            <Step num={1} label="Wybierz lokalizację" />
            <Divider />
            <Step num={2} label="Dobierz nośniki" />
            <Divider />
            <Step num={3} label="Opłać i uruchom" />
          </div>
        </div>

        <div className="relative mx-auto -mb-16 mt-12 max-w-4xl px-4">
          <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
            <div className="grid gap-4 sm:grid-cols-4 sm:gap-5">
              <select
                value={voivodeship}
                onChange={(e) => setVoivodeship(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-pink-600"
              >
                <option value="">Województwo</option>
                {VOIVODESHIPS.map((v) => (
                  <option key={v} value={v}>
                    {VOIVODESHIP_LABELS[v]}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Miasto"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-pink-600"
              />

              <select
                value={expositionType}
                onChange={(e) => setExpositionType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-pink-600"
              >
                <option value="">Typ nośnika</option>
                {EXPOSITION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>

              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-pink-600"
              >
                <option value="">Okres emisji</option>
                {PERIOD_DAYS.map((p) => (
                  <option key={p} value={p.toString()}>
                    {PERIOD_LABELS[p]}
                  </option>
                ))}
              </select>

              <button
                onClick={handleSearch}
                className="rounded-full bg-pink-600 px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700 sm:col-span-4"
              >
                Szukaj
              </button>
            </div>
          </div>
        </div>
      </section>

      {!loading && allMedia.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Nośniki w pobliżu
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Znajdź nośniki na mapie
                </p>
              </div>
              <Link
                href="/nosniki"
                className="rounded-full border border-slate-300 px-6 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Zobacz pełną mapę
              </Link>
            </div>
            <DynamicCatalogMap items={allMedia} height="400px" />
          </div>
        </section>
      )}

      {!loading && displayed.length > 0 && (
        <section className="bg-slate-50 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                Polecane nośniki
              </h2>
              <Link
                href="/nosniki"
                className="text-sm font-medium text-pink-600 hover:underline"
              >
                Zobacz wszystkie →
              </Link>
            </div>

            <div className="relative">
              <button
                onClick={() => scroll("left")}
                className="absolute -left-6 top-1/2 z-10 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-slate-100"
              >
                <svg
                  className="h-5 w-5 text-slate-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div
                ref={scrollRef}
                className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth scrollbar-hide"
              >
                {displayed.slice(0, 12).map((m) => (
                  <div
                    key={m.id}
                    className="flex-shrink-0 w-[85%] snap-start sm:w-[calc(50%_-_0.75rem)] lg:w-[calc(33.333%_-_1rem)]"
                  >
                    <MediaCard media={m} />
                  </div>
                ))}
              </div>

              <button
                onClick={() => scroll("right")}
                className="absolute -right-6 top-1/2 z-10 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-slate-100"
              >
                <svg
                  className="h-5 w-5 text-slate-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-3 text-center text-2xl font-bold text-slate-900">
            Dlaczego wybrać nas?
          </h2>
          <p className="mb-12 text-center text-sm text-slate-500">
            Łączymy druk, montaż i obsługę w jedną skuteczną kampanię
          </p>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Feature
              icon={LightningIcon}
              title="Szybki start"
              desc="Kampanię ustawisz w kilka minut — bez zbędnych formalności, wizyt i spotkań."
            />
            <Feature
              icon={TagIcon}
              title="Transparentne ceny"
              desc="Cena każdego nośnika jest widoczna od razu, wraz z kosztami druku i montażu."
            />
            <Feature
              icon={MapPinIcon}
              title="Mapa nośników"
              desc="Wybieraj lokalizacje na mapie. Filtruj po województwie, rozmiarze i oświetleniu."
            />
            <Feature
              icon={PrinterIcon}
              title="Druk i montaż"
              desc="Opcjonalnie zamów druk i montaż — zajmiemy się wszystkim za Ciebie."
            />
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold">Gotowy na kampanię OOH?</h2>
          <p className="mt-3 text-slate-300">
            Tysiące lokalizacji w całej Polsce. Zacznij już teraz.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
            <Link
              href="/nosniki"
              className="rounded-full bg-pink-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-pink-700"
            >
              Stwórz kampanię
            </Link>
            <button className="rounded-full border border-white px-8 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Skontaktuj się
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Step({ num, label }: { num: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-600 text-sm font-bold">
        {num}
      </span>
      <span className="text-xs font-medium sm:text-sm">{label}</span>
    </div>
  );
}

function Divider() {
  return (
    <svg
      className="hidden h-px w-8 sm:block"
      viewBox="0 0 32 1"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line
        x1="0"
        y1="0.5"
        x2="32"
        y2="0.5"
        stroke="currentColor"
        strokeDasharray="4 4"
        className="text-slate-600"
      />
    </svg>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-100">
        <Icon className="h-7 w-7 text-pink-600" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{desc}</p>
    </div>
  );
}

function LightningIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function TagIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
    </svg>
  );
}

function MapPinIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5z" />
    </svg>
  );
}

function PrinterIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
      />
    </svg>
  );
}
