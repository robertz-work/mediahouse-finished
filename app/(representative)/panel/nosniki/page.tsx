"use client";


import Link from "next/link";
import { useEffect, useState } from "react";
import type { Media } from "@/lib/db/mediaRepo";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  published: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Oczekuje",
  published: "Opublikowany",
  rejected: "Odrzucony",
  archived: "Zarchiwizowany",
};

export default function MediaListPage() {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/media?mine=true")
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Moje nośniki</h1>
        <Link
          href="/panel/nosniki/nowy"
          className="rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700"
        >
          + Dodaj nośnik
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-400">
          Ładowanie…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <p className="text-slate-500">
            Nie masz jeszcze żadnych nośników.
          </p>
          <Link
            href="/panel/nosniki/nowy"
            className="mt-3 inline-block text-sm font-semibold text-pink-600 hover:underline"
          >
            Dodaj pierwszy nośnik →
          </Link>
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
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((m) => (
                <tr key={m.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {m.code}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-slate-600">
                    {m.address}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.voivodeship}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {m.expositionType}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[m.status] ?? ""}`}
                    >
                      {STATUS_LABELS[m.status] ?? m.status}
                    </span>
                    {m.status === "rejected" && m.rejectionReason && (
                      <p className="mt-1 text-xs text-red-500">
                        {m.rejectionReason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/panel/nosniki/${m.id}`}
                      className="text-sm font-medium text-pink-600 hover:underline"
                    >
                      Edytuj
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
