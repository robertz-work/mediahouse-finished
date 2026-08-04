"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Usuwa pojedynczy nośnik ze szkicu kampanii (endpoint dopuszcza tylko draft).
 */
export default function RemoveItemButton({
  campaignId,
  itemId,
}: {
  campaignId: string;
  itemId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleRemove = async () => {
    if (!confirm("Usunąć ten nośnik z kampanii?")) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/items/${itemId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Nie udało się usunąć nośnika");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={busy}
      title="Usuń nośnik"
      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? "Usuwanie…" : "Usuń"}
    </button>
  );
}
