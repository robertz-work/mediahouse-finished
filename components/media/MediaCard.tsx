import Link from "next/link";
import type { Media } from "@/lib/db/mediaRepo";
import { VOIVODESHIP_LABELS } from "@/lib/constants";

/**
 * Card component for displaying a media item in catalog grid.
 * Shows: photo, code, address, size, cheapest price, illumination badge.
 */
export default function MediaCard({ media }: { media: Media }) {
  const prices = [
    media.pricing.month1,
    media.pricing.month3,
    media.pricing.month6,
    media.pricing.month12,
  ].filter((p): p is number => p != null && p > 0);

  const cheapestPrice = prices.length > 0 ? Math.min(...prices) : null;
  const coverPhoto = media.photos[0];

  return (
    <Link
      href={`/nosniki/${media.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-slate-100">
        {coverPhoto ? (
          <img
            src={coverPhoto}
            alt={`${media.code} — ${media.address}`}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Brak zdjęcia
          </div>
        )}


        <div className="absolute left-2 top-2 flex gap-1.5">
          <span className="rounded-full bg-pink-600 px-2 py-0.5 text-[10px] font-bold text-white">
            {media.code}
          </span>
          {media.illuminated && (
            <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-yellow-900">
              Oświetlony
            </span>
          )}
          {media.expositionType === "plakat" && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              Plakat
            </span>
          )}
        </div>
      </div>


      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-900">
              {media.code}
            </h3>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {media.address}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {media.city ? `${media.city}, ` : ""}
              {VOIVODESHIP_LABELS[media.voivodeship]}
            </p>
          </div>
          <span className="shrink-0 text-right">
            {cheapestPrice !== null ? (
              <>
                <span className="text-sm font-bold text-pink-600">
                  {cheapestPrice.toLocaleString("pl-PL")} zł
                </span>
                <span className="block text-[10px] text-slate-400">od / mies.</span>
              </>
            ) : (
              <span className="text-xs text-slate-400">Zapytaj</span>
            )}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge>{media.size.widthCm}×{media.size.heightCm} cm</Badge>
          <Badge className="capitalize">{media.expositionType}</Badge>
          {media.locationTags.slice(0, 2).map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 ${className}`}>
      {children}
    </span>
  );
}
