"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Przejście ze szkicu kampanii do koszyka. Najpierw ustawia tę kampanię jako
 * aktywną (bump updated_at), żeby koszyk pokazał właśnie ją, potem przekierowuje.
 */
export default function GoToCartButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/activate`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Nie udało się otworzyć koszyka");
        setBusy(false);
        return;
      }
      router.push("/koszyk");
    } catch {
      alert("Błąd serwera");
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-50"
    >
      {busy ? "Otwieranie…" : "Przejdź do koszyka"}
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
    </button>
  );
}
