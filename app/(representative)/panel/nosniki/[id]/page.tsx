"use client";

/**
 * /panel/nosniki/[id] — edit an existing media item.
 * Fetches the media on mount and reuses MediaForm in "edit" mode.
 */

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MediaForm from "@/components/media/MediaForm";
import type { Media } from "@/lib/db/mediaRepo";

export default function EditMediaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [media, setMedia] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/media/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setMedia(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Nie znaleziono nośnika");
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        Ładowanie…
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-600">{error || "Nie znaleziono nośnika"}</p>
        <button
          onClick={() => router.push("/panel/nosniki")}
          className="mt-3 text-sm font-medium text-pink-600 hover:underline"
        >
          ← Wróć do listy
        </button>
      </div>
    );
  }

  const canEdit =
    media.status === "pending" || media.status === "rejected";

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">
        Edycja: {media.code}
      </h1>

      {!canEdit && (
        <div className="mb-6 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
          Edycja jest możliwa tylko dla nośników ze statusem „Oczekuje" lub
          „Odrzucony". Ten nośnik ma status „{media.status}".
        </div>
      )}

      {canEdit && (
        <>
          <p className="mb-6 text-sm text-slate-500">
            Po zapisaniu nośnik wróci do statusu „Oczekuje" i zostanie ponownie
            przesłany do zatwierdzenia.
          </p>
          <MediaForm
            mode="edit"
            mediaId={media.id}
            defaultValues={{
              code: media.code,
              address: media.address,
              voivodeship: media.voivodeship,
              city: media.city ?? "",
              gps: media.gps,
              roadType: media.roadType,
              size: media.size,
              heightFromGroundCm: media.heightFromGroundCm,
              distanceFromRoadM: media.distanceFromRoadM,
              expositionType: media.expositionType,
              illuminated: media.illuminated,
              requiresLift: media.requiresLift,
              description: media.description,
              locationTags: media.locationTags,
              pricing: media.pricing,
              photos: media.photos,
            }}
            onSuccess={() => router.push("/panel/nosniki")}
          />
        </>
      )}
    </div>
  );
}
