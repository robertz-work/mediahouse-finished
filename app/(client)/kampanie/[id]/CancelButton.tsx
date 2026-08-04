"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Wystąpił błąd");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Nie udało się anulować kampanii");
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-full border border-red-300 px-6 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
      >
        Anuluj kampanię
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <p className="mb-3 text-sm text-red-800">
        Czy na pewno chcesz anulować tę kampanię? Wszystkie rezerwacje terminów
        zostaną zwolnione. Tej operacji nie można cofnąć.
      </p>
      {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Anulowanie..." : "Tak, anuluj"}
        </button>
        <button
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          className="rounded-full border border-slate-300 px-6 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Nie, wróć
        </button>
      </div>
    </div>
  );
}
