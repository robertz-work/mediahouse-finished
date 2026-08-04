"use client";

/**
 * /ulubione — page showing user's favorite (bookmarked) media items.
 * Client-only. Allows removing favorites and navigating to media detail.
 */

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Media } from "@/lib/db/mediaRepo";
import { VOIVODESHIP_LABELS } from "@/lib/constants";

export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await fetch("/api/favorites/media");
      if (!res.ok) return;
      const data = await res.json();
      setMedia(data.media ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchFavorites();
    if (status === "unauthenticated") router.push("/login?callbackUrl=/ulubione");
  }, [status, fetchFavorites, router]);

  const handleRemove = async (mediaId: string) => {
    setRemovingId(mediaId);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId }),
      });
      if (res.ok) {
        setMedia((prev) => prev.filter((m) => m.id !== mediaId));
      }
    } finally {
      setRemovingId(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Ulubione nośniki
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Twoje zapisane nośniki reklamowe — szybki dostęp do ulubionych lokalizacji.
        </p>
      </div>

      {media.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
          <svg
            className="mb-4 h-12 w-12 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
          <p className="text-lg font-semibold text-slate-700">
            Nie masz jeszcze ulubionych
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Przeglądaj katalog i kliknij gwiazdkę aby zapisać nośnik.
          </p>
          <Link
            href="/nosniki"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-pink-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700"
          >
            Przeglądaj katalog
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      )}


      {media.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((m) => {
            const prices = [
              m.pricing.month1,
              m.pricing.month3,
              m.pricing.month6,
              m.pricing.month12,
            ].filter((p): p is number => p != null && p > 0);
            const cheapest = prices.length > 0 ? Math.min(...prices) : null;
            const coverPhoto = m.photos[0];

            return (
              <div
                key={m.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-md"
              >

                <button
                  onClick={() => handleRemove(m.id)}
                  disabled={removingId === m.id}
                  className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-pink-500 shadow-sm backdrop-blur transition hover:bg-pink-50 hover:text-pink-700 disabled:opacity-50"
                  title="Usuń z ulubionych"
                >
                  {removingId === m.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  )}
                </button>

                <Link href={`/nosniki/${m.id}`}>

                  <div className="relative aspect-[4/3] bg-slate-100">
                    {coverPhoto ? (
                      <img
                        src={coverPhoto}
                        alt={`${m.code} — ${m.address}`}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        Brak zdjęcia
                      </div>
                    )}
                    <div className="absolute left-2 top-2 flex gap-1.5">
                      <span className="rounded-full bg-pink-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {m.code}
                      </span>
                      {m.illuminated && (
                        <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-yellow-900">
                          Oświetlony
                        </span>
                      )}
                    </div>
                  </div>


                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-900">
                          {m.code}
                        </h3>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{m.address}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {m.city ? `${m.city}, ` : ""}
                          {VOIVODESHIP_LABELS[m.voivodeship]}
                        </p>
                      </div>
                      <span className="shrink-0 text-right">
                        {cheapest !== null ? (
                          <>
                            <span className="text-sm font-bold text-pink-600">
                              {cheapest.toLocaleString("pl-PL")} zł
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              od / mies.
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">Zapytaj</span>
                        )}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {m.size.widthCm}×{m.size.heightCm} cm
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-600">
                        {m.expositionType}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
