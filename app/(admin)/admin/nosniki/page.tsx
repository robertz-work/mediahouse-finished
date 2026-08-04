"use client";

/**
 * /admin/nosniki — media management with status filter, preview,
 * approve/reject actions, and edit link.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Media } from "@/lib/db/mediaRepo";

const ALL_STATUSES = [
  { value: "", label: "Wszystkie" },
  { value: "pending", label: "Oczekujące" },
  { value: "published", label: "Opublikowane" },
  { value: "rejected", label: "Odrzucone" },
  { value: "archived", label: "Zarchiwizowane" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  published: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-slate-100 text-slate-500",
};

export default function AdminMediaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusFilter = searchParams.get("status") ?? "";

  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const [previewId, setPreviewId] = useState<string | null>(null);

  const fetchMedia = useCallback(() => {
    setLoading(true);
    const url = statusFilter
      ? `/api/media?status=${statusFilter}`
      : "/api/media";

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  async function handleApprove(id: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/media/${id}/approve`, {
        method: "POST",
      });
      if (res.ok) {
        fetchMedia();
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectId || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/media/${rejectId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (res.ok) {
        setRejectId(null);
        setRejectReason("");
        fetchMedia();
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setActionLoading(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/media/${deleteId}/delete`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteId(null);
        setPreviewId(null);
        fetchMedia();
      } else {
        const err = await res.json();
        setDeleteError(err.error || "Wystąpił błąd podczas usuwania");
      }
    } finally {
      setActionLoading(false);
    }
  }

  const previewItem = previewId
    ? items.find((m) => m.id === previewId)
    : null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        Zarządzanie nośnikami
      </h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => {
              const params = new URLSearchParams();
              if (s.value) params.set("status", s.value);
              router.push(`/admin/nosniki?${params.toString()}`);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              statusFilter === s.value
                ? "bg-pink-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-400">
          Ładowanie…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
          Brak nośników {statusFilter ? `ze statusem „${statusFilter}"` : ""}.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Kod</th>
                <th className="px-4 py-3">Adres</th>
                <th className="px-4 py-3">Województwo</th>
                <th className="px-4 py-3">Typ</th>
                <th className="px-4 py-3">Cena 1mc</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((m) => (
                <tr key={m.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <button
                      onClick={() =>
                        setPreviewId(previewId === m.id ? null : m.id)
                      }
                      className="hover:text-pink-600 hover:underline"
                    >
                      {m.code}
                    </button>
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-slate-600">
                    {m.address}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {m.voivodeship}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {m.expositionType}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {m.pricing.month1
                      ? `${m.pricing.month1.toLocaleString("pl-PL")} zł`
                      : "–"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_COLORS[m.status] ?? ""
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {m.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(m.id)}
                            disabled={actionLoading}
                            className="rounded-lg bg-green-50 px-3 py-1 text-xs font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                          >
                            Zatwierdź
                          </button>
                          <button
                            onClick={() => setRejectId(m.id)}
                            disabled={actionLoading}
                            className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            Odrzuć
                          </button>
                        </>
                      )}
                      <Link
                        href={`/panel/nosniki/${m.id}`}
                        className="rounded-lg bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                      >
                        Edytuj
                      </Link>
                      <button
                        onClick={() => {
                          setDeleteId(m.id);
                          setDeleteError("");
                        }}
                        disabled={actionLoading}
                        className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        Usuń
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {previewItem && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              {previewItem.code} — podgląd
            </h3>
            <button
              onClick={() => setPreviewId(null)}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              Zamknij ×
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Adres" value={previewItem.address} />
            <Info label="Miasto" value={previewItem.city || "–"} />
            <Info label="Województwo" value={previewItem.voivodeship} />
            <Info label="Rodzaj drogi" value={previewItem.roadType} />
            <Info
              label="Rozmiar"
              value={`${previewItem.size.widthCm} × ${previewItem.size.heightCm} cm`}
            />
            <Info
              label="Wys. od ziemi"
              value={`${previewItem.heightFromGroundCm} cm`}
            />
            <Info
              label="Odl. od drogi"
              value={`${previewItem.distanceFromRoadM} m`}
            />
            <Info label="Ekspozycja" value={previewItem.expositionType} />
            <Info
              label="Oświetlenie"
              value={previewItem.illuminated ? "Tak" : "Nie"}
            />
            <Info
              label="Zwyżka"
              value={previewItem.requiresLift ? "Wymagana" : "Nie"}
            />
            <Info
              label="GPS"
              value={`${previewItem.gps.lat.toFixed(5)}, ${previewItem.gps.lng.toFixed(5)}`}
            />
          </div>

          {previewItem.description && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase text-slate-500">
                Opis
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {previewItem.description}
              </p>
            </div>
          )}

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase text-slate-500">
              Cennik (netto)
            </p>
            <div className="flex flex-wrap gap-3">
              {previewItem.pricing.month1 && (
                <PriceBadge label="1 mc" value={previewItem.pricing.month1} />
              )}
              {previewItem.pricing.month3 && (
                <PriceBadge label="3 mc" value={previewItem.pricing.month3} />
              )}
              {previewItem.pricing.month6 && (
                <PriceBadge label="6 mc" value={previewItem.pricing.month6} />
              )}
              {previewItem.pricing.month12 && (
                <PriceBadge label="12 mc" value={previewItem.pricing.month12} />
              )}
              {previewItem.pricing.printCost && (
                <PriceBadge label="Druk" value={previewItem.pricing.printCost} />
              )}
              {previewItem.pricing.installCost && (
                <PriceBadge
                  label="Montaż"
                  value={previewItem.pricing.installCost}
                />
              )}
            </div>
          </div>

          {previewItem.photos.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase text-slate-500">
                Zdjęcia ({previewItem.photos.length})
              </p>
              <div className="flex gap-3 overflow-x-auto">
                {previewItem.photos.map((url, i) => (
                  <img
                    key={url}
                    src={url}
                    alt={`Zdjęcie ${i + 1}`}
                    className="h-24 w-32 shrink-0 rounded-xl border border-slate-200 object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          {previewItem.rejectionReason && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <strong>Powód odrzucenia:</strong> {previewItem.rejectionReason}
            </div>
          )}
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-semibold text-slate-900">
              Odrzuć nośnik
            </h3>
            <p className="mb-4 text-sm text-slate-500">
              Podaj powód odrzucenia — przedstawiciel go zobaczy i będzie mógł
              poprawić nośnik.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Np. Złej jakości zdjęcia, niekompletny adres…"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setRejectId(null);
                  setRejectReason("");
                }}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Anuluj
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? "Odrzucanie…" : "Odrzuć"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              Usunąć nośnik?
            </h3>
            <p className="mb-1 text-sm text-slate-500">
              Ta operacja jest nieodwracalna. Nośnik{" "}
              <span className="font-semibold text-slate-700">
                {items.find((m) => m.id === deleteId)?.code}
              </span>{" "}
              zostanie trwale usunięty wraz ze wszystkimi zdjęciami i danymi.
            </p>
            <p className="mb-4 text-xs text-slate-400">
              Jeśli nośnik ma aktywne rezerwacje, usunięcie nie będzie możliwe.
            </p>

            {deleteError && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {deleteError}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteId(null);
                  setDeleteError("");
                }}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Anuluj
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? "Usuwanie…" : "Tak, usuń trwale"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}

function PriceBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs">
      <span className="text-slate-500">{label}:</span>{" "}
      <span className="font-semibold text-slate-800">
        {value.toLocaleString("pl-PL")} zł
      </span>
    </span>
  );
}
