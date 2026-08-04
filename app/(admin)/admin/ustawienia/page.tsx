"use client";

/**
 * /admin/ustawienia — global settings / feature flags.
 */

import { useEffect, useState } from "react";

interface Settings {
  requireOrderApproval: boolean;
  holdTimeoutMinutes: number;
  contactEmail: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        Ładowanie…
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Ustawienia</h1>

      <div className="max-w-xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">
                Wymagaj zatwierdzenia zamówień
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Gdy włączone, każde nowe zamówienie klienta musi zostać
                zatwierdzone przez admina zanim przejdzie do płatności. Gdy
                wyłączone, zamówienia przechodzą od razu do statusu
                „oczekujące na płatność".
              </p>
            </div>
            <button
              onClick={() =>
                setSettings((s) =>
                  s
                    ? {
                        ...s,
                        requireOrderApproval: !s.requireOrderApproval,
                      }
                    : s
                )
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                settings.requireOrderApproval
                  ? "bg-pink-600"
                  : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  settings.requireOrderApproval
                    ? "translate-x-5"
                    : "translate-x-0.5"
                } mt-0.5`}
              />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900">
            Czas rezerwacji tymczasowej (minuty)
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Czas, przez jaki nośnik jest zarezerwowany od momentu dodania do
            koszyka. Po upływie tego czasu rezerwacja wygasa i nośnik wraca do
            puli.
          </p>
          <input
            type="number"
            min={5}
            max={120}
            value={settings.holdTimeoutMinutes}
            onChange={(e) =>
              setSettings((s) =>
                s
                  ? {
                      ...s,
                      holdTimeoutMinutes: parseInt(e.target.value) || 15,
                    }
                  : s
              )
            }
            className="mt-3 w-32 rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900">Email kontaktowy</h3>
          <p className="mt-1 text-sm text-slate-500">
            Adres wyświetlany na stronie i w stopce maili.
          </p>
          <input
            type="email"
            value={settings.contactEmail}
            onChange={(e) =>
              setSettings((s) =>
                s ? { ...s, contactEmail: e.target.value } : s
              )
            }
            className="mt-3 w-full max-w-sm rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-pink-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
          >
            {saving ? "Zapisywanie…" : "Zapisz ustawienia"}
          </button>
          {saved && (
            <span className="text-sm font-medium text-green-600">
              Zapisano ✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
