"use client";

/**
 * Reusable multi-section form for creating / editing a billboard (media).
 *
 * Props:
 *   mode         — "create" | "edit"
 *   defaultValues — pre-filled values for edit mode
 *   mediaId      — required for edit mode (used in PATCH URL + upload hint)
 *   onSuccess    — callback after successful save (e.g. router.push)
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  mediaCreateSchema,
  type MediaCreateInput,
} from "@/lib/validators/mediaSchema";
import {
  VOIVODESHIPS,
  VOIVODESHIP_LABELS,
  ROAD_TYPES,
  ROAD_TYPE_LABELS,
  EXPOSITION_TYPES,
} from "@/lib/constants";
import DynamicMapPicker from "@/components/map/DynamicMapPicker";


interface Props {
  mode: "create" | "edit";
  defaultValues?: Partial<MediaCreateInput> & { photos?: string[] };
  mediaId?: string;
  onSuccess?: () => void;
}

export default function MediaForm({
  mode,
  defaultValues,
  mediaId,
  onSuccess,
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MediaCreateInput>({
    resolver: zodResolver(mediaCreateSchema),
    defaultValues: {
      code: "",
      address: "",
      voivodeship: undefined,
      city: "",
      gps: { lat: 52.0, lng: 19.5 },
      roadType: undefined,
      size: { widthCm: 0, heightCm: 0 },
      heightFromGroundCm: 0,
      distanceFromRoadM: 0,
      expositionType: undefined,
      illuminated: false,
      requiresLift: false,
      description: "",
      locationTags: [],
      pricing: {},
      ...defaultValues,
    },
  });


  const [photos, setPhotos] = useState<string[]>(defaultValues?.photos ?? []);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const [latInput, setLatInput] = useState(
    String(defaultValues?.gps?.lat ?? 52.0)
  );
  const [lngInput, setLngInput] = useState(
    String(defaultValues?.gps?.lng ?? 19.5)
  );


  const [poiCategories, setPoiCategories] = useState<string[]>([]);
  const [poiInput, setPoiInput] = useState("");
  const [poiDropdownOpen, setPoiDropdownOpen] = useState(false);

  useEffect(() => {
    fetch("/api/poi-categories")
      .then((r) => r.json())
      .then((data: string[]) => setPoiCategories(data))
      .catch(console.error);
  }, []);

  const currentPoi: string[] = watch("nearbyPoi") ?? [];

  const addPoi = async (name: string) => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed || currentPoi.includes(trimmed)) return;
    setValue("nearbyPoi", [...currentPoi, trimmed]);
    setPoiInput("");
    setPoiDropdownOpen(false);

    if (!poiCategories.includes(trimmed)) {
      try {
        const res = await fetch("/api/poi-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (res.ok) {
          const updated: string[] = await res.json();
          setPoiCategories(updated);
        }
      } catch {
        setPoiCategories((prev) =>
          [...prev, trimmed].sort((a, b) => a.localeCompare(b, "pl"))
        );
      }
    }
  };

  const removePoi = (cat: string) => {
    setValue("nearbyPoi", currentPoi.filter((c) => c !== cat));
  };

  const filteredPoiOptions = poiCategories.filter(
    (c) =>
      !currentPoi.includes(c) &&
      c.toLowerCase().includes(poiInput.toLowerCase())
  );

  const gps = watch("gps");

  const applyGpsInputs = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (!isNaN(lat) && !isNaN(lng)) {
      setValue("gps", { lat, lng });
    }
  };

  const handleMapChange = (coords: { lat: number; lng: number }) => {
    setValue("gps", coords);
    setLatInput(coords.lat.toFixed(6));
    setLngInput(coords.lng.toFixed(6));
  };


  const [apiError, setApiError] = useState("");


  const handlePhotoUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploadingPhotos(true);
      try {
        const formData = new FormData();
        Array.from(files).forEach((f) => formData.append("files", f));

        const hint = mediaId ?? "temp-" + Date.now();
        const res = await fetch(`/api/upload?mediaId=${hint}`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          setApiError(data.error ?? "Błąd uploadu");
          return;
        }
        setPhotos((prev) => [...prev, ...data.urls]);
      } catch {
        setApiError("Błąd uploadu zdjęć");
      } finally {
        setUploadingPhotos(false);
      }
    },
    [mediaId]
  );

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };


  const onSubmit = async (data: MediaCreateInput) => {
    setApiError("");
    const payload = { ...data, photos, nearbyPoi: currentPoi };

    try {
      const url = mode === "create" ? "/api/media" : `/api/media/${mediaId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        setApiError(result.error ?? "Błąd zapisu");
        return;
      }

      onSuccess?.();
    } catch {
      setApiError("Błąd serwera");
    }
  };

  const sectionCls = "rounded-2xl border border-slate-200 bg-white p-6";
  const labelCls = "mb-1 block text-sm font-medium text-slate-700";
  const inputCls =
    "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-200";
  const errInputCls =
    "w-full rounded-xl border border-red-500 px-4 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200";
  const errorCls = "mt-1 text-xs text-red-600";


  const pricingErr = errors.pricing as
    | Record<string, { message?: string } | undefined>
    | undefined;

  function FieldError({ msg }: { msg?: string }) {
    return msg ? <p className={errorCls}>{msg}</p> : null;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {apiError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {apiError}
        </div>
      )}

      <div className={sectionCls}>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Identyfikacja
        </h3>
        <div>
          <label className={labelCls}>Kod / oznaczenie tablicy *</label>
          <input {...register("code")} className={inputCls} placeholder="WB-0142" />
          <FieldError msg={errors.code?.message} />
        </div>
      </div>

      <div className={sectionCls}>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Lokalizacja
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Adres *</label>
            <input
              {...register("address")}
              className={inputCls}
              placeholder="ul. Marszałkowska 1, Warszawa"
            />
            <FieldError msg={errors.address?.message} />
          </div>

          <div>
            <label className={labelCls}>Województwo *</label>
            <select {...register("voivodeship")} className={inputCls}>
              <option value="">Wybierz…</option>
              {VOIVODESHIPS.map((v) => (
                <option key={v} value={v}>
                  {VOIVODESHIP_LABELS[v]}
                </option>
              ))}
            </select>
            <FieldError msg={errors.voivodeship?.message} />
          </div>

          <div>
            <label className={labelCls}>Miasto</label>
            <input {...register("city")} className={inputCls} placeholder="Warszawa" />
          </div>

          <div>
            <label className={labelCls}>Rodzaj drogi *</label>
            <select {...register("roadType")} className={inputCls}>
              <option value="">Wybierz…</option>
              {ROAD_TYPES.map((r) => (
                <option key={r} value={r}>
                  {ROAD_TYPE_LABELS[r]}
                </option>
              ))}
            </select>
            <FieldError msg={errors.roadType?.message} />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Współrzędne GPS *</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  className={inputCls}
                  placeholder="Szerokość (lat), np. 52.229676"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  onBlur={applyGpsInputs}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyGpsInputs();
                    }
                  }}
                />
              </div>
              <div className="flex-1">
                <input
                  className={inputCls}
                  placeholder="Długość (lng), np. 21.012229"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  onBlur={applyGpsInputs}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyGpsInputs();
                    }
                  }}
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Wpisz współrzędne lub kliknij na mapie poniżej — oba sposoby się synchronizują.
            </p>
            <FieldError msg={errors.gps?.lat?.message || errors.gps?.lng?.message} />
          </div>

          <div className="sm:col-span-2">
            <Controller
              control={control}
              name="gps"
              render={({ field }) => (
                <DynamicMapPicker
                  value={field.value}
                  onChange={handleMapChange}
                  height="300px"
                />
              )}
            />
          </div>
        </div>
      </div>

      <div className={sectionCls}>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          W pobliżu (do 1 km)
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Zaznacz obiekty znajdujące się w obrębie ~1 km od nośnika. Możesz też wpisać nową kategorię.
        </p>

        {currentPoi.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {currentPoi.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"
              >
                {cat}
                <button
                  type="button"
                  onClick={() => removePoi(cat)}
                  className="ml-1 text-emerald-400 hover:text-emerald-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <input
            className={inputCls}
            placeholder="Wpisz lub wybierz kategorię..."
            value={poiInput}
            onChange={(e) => {
              setPoiInput(e.target.value);
              setPoiDropdownOpen(true);
            }}
            onFocus={() => setPoiDropdownOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (poiInput.trim()) addPoi(poiInput);
              }
            }}
          />

          {poiDropdownOpen && filteredPoiOptions.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {filteredPoiOptions.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-pink-50 hover:text-pink-700"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addPoi(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {poiDropdownOpen && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => setPoiDropdownOpen(false)}
          />
        )}
      </div>

      <div className={sectionCls}>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Parametry fizyczne
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelCls}>Szerokość (cm) *</label>
            <input type="number" {...register("size.widthCm")} className={inputCls} />
            <FieldError msg={errors.size?.widthCm?.message} />
          </div>
          <div>
            <label className={labelCls}>Wysokość (cm) *</label>
            <input type="number" {...register("size.heightCm")} className={inputCls} />
            <FieldError msg={errors.size?.heightCm?.message} />
          </div>
          <div>
            <label className={labelCls}>Wys. od ziemi (cm) *</label>
            <input type="number" {...register("heightFromGroundCm")} className={inputCls} />
            <FieldError msg={errors.heightFromGroundCm?.message} />
          </div>
          <div>
            <label className={labelCls}>Odl. od drogi (m) *</label>
            <input type="number" step="0.1" {...register("distanceFromRoadM")} className={inputCls} />
            <FieldError msg={errors.distanceFromRoadM?.message} />
          </div>
        </div>
      </div>

      <div className={sectionCls}>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Specyfikacja
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Rodzaj ekspozycji *</label>
            <select {...register("expositionType")} className={inputCls}>
              <option value="">Wybierz…</option>
              {EXPOSITION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <FieldError msg={errors.expositionType?.message} />
          </div>

          <div className="flex items-end gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" {...register("illuminated")} className="h-4 w-4 rounded border-slate-300 text-pink-600" />
              Oświetlenie
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" {...register("requiresLift")} className="h-4 w-4 rounded border-slate-300 text-pink-600" />
              Wymaga zwyżki
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Opis</label>
            <textarea
              {...register("description")}
              rows={3}
              className={inputCls}
              placeholder="Dodatkowy opis lokalizacji, widoczności itp."
            />
          </div>
        </div>
      </div>

      <div className={sectionCls}>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Cennik (netto, PLN)
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Wpisz ceny dla dostępnych okresów. Puste pole = okres niedostępny dla klienta.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelCls}>1 miesiąc</label>
            <input type="number" step="0.01" {...register("pricing.month1")} className={pricingErr?.month1 ? errInputCls : inputCls} placeholder="np. 800" />
            <FieldError msg={pricingErr?.month1?.message} />
          </div>
          <div>
            <label className={labelCls}>3 miesiące</label>
            <input type="number" step="0.01" {...register("pricing.month3")} className={pricingErr?.month3 ? errInputCls : inputCls} placeholder="np. 2100" />
            <FieldError msg={pricingErr?.month3?.message} />
          </div>
          <div>
            <label className={labelCls}>6 miesięcy</label>
            <input type="number" step="0.01" {...register("pricing.month6")} className={pricingErr?.month6 ? errInputCls : inputCls} placeholder="np. 3600" />
            <FieldError msg={pricingErr?.month6?.message} />
          </div>
          <div>
            <label className={labelCls}>12 miesięcy</label>
            <input type="number" step="0.01" {...register("pricing.month12")} className={pricingErr?.month12 ? errInputCls : inputCls} placeholder="np. 6000" />
            <FieldError msg={pricingErr?.month12?.message} />
          </div>
          <div>
            <label className={labelCls}>Druk (jednorazowo)</label>
            <input type="number" step="0.01" {...register("pricing.printCost")} className={inputCls} placeholder="np. 250" />
          </div>
          <div>
            <label className={labelCls}>Montaż (jednorazowo)</label>
            <input type="number" step="0.01" {...register("pricing.installCost")} className={inputCls} placeholder="np. 280" />
          </div>
        </div>
      </div>

      <div className={sectionCls}>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Zdjęcia
        </h3>

        {photos.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {photos.map((url, i) => (
              <div
                key={url}
                className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200"
              >
                <img
                  src={url}
                  alt={`Zdjęcie ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center transition hover:border-pink-400"
          onClick={() => fileInputRef.current?.click()}
        >
          <p className="text-sm text-slate-500">
            {uploadingPhotos
              ? "Przesyłanie…"
              : "Kliknij aby dodać zdjęcia (JPG, PNG, WEBP, max 10 MB)"}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handlePhotoUpload(e.target.files)}
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-pink-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
        >
          {isSubmitting
            ? "Zapisywanie…"
            : mode === "create"
              ? "Dodaj nośnik"
              : "Zapisz zmiany"}
        </button>
      </div>
    </form>
  );
}