"use client";

/**
 * /admin — dashboard with key counters and quick overview.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Media } from "@/lib/db/mediaRepo";

interface Stats {
  pendingMedia: number;
  publishedMedia: number;
  totalMedia: number;
  totalUsers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingItems, setPendingItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/media").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
    ])
      .then(([media, users]) => {
        const mediaArr = media as Media[];
        setStats({
          pendingMedia: mediaArr.filter((m) => m.status === "pending").length,
          publishedMedia: mediaArr.filter((m) => m.status === "published").length,
          totalMedia: mediaArr.length,
          totalUsers: (users as unknown[]).length,
        });
        setPendingItems(
          mediaArr
            .filter((m) => m.status === "pending")
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            )
            .slice(0, 5)
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        Ładowanie…
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Dashboard</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Oczekujące nośniki"
          value={stats?.pendingMedia ?? 0}
          accent={stats?.pendingMedia ? "warning" : "neutral"}
          href="/admin/nosniki?status=pending"
        />
        <StatCard
          label="Opublikowane"
          value={stats?.publishedMedia ?? 0}
          accent="success"
        />
        <StatCard
          label="Wszystkie nośniki"
          value={stats?.totalMedia ?? 0}
          accent="neutral"
          href="/admin/nosniki"
        />
        <StatCard
          label="Użytkownicy"
          value={stats?.totalUsers ?? 0}
          accent="neutral"
          href="/admin/uzytkownicy"
        />
      </div>


      {pendingItems.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Oczekujące na zatwierdzenie
            </h2>
            <Link
              href="/admin/nosniki?status=pending"
              className="text-sm font-medium text-pink-600 hover:underline"
            >
              Zobacz wszystkie →
            </Link>
          </div>
          <div className="space-y-3">
            {pendingItems.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
              >
                <div>
                  <span className="font-medium text-slate-900">{m.code}</span>
                  <span className="ml-3 text-sm text-slate-500">
                    {m.address}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>
                    {new Date(m.createdAt).toLocaleDateString("pl-PL")}
                  </span>
                  <Link
                    href={`/admin/nosniki?status=pending`}
                    className="rounded-lg bg-pink-50 px-3 py-1 text-xs font-medium text-pink-600 hover:bg-pink-100"
                  >
                    Rozpatrz
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingItems.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
          Brak oczekujących nośników — wszystko jest na bieżąco.
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: number;
  accent: "neutral" | "warning" | "success";
  href?: string;
}) {
  const accentColors = {
    neutral: "text-slate-900",
    warning: "text-amber-600",
    success: "text-green-600",
  };

  const content = (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accentColors[accent]}`}>
        {value}
      </p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
