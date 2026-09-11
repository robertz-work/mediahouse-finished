"use client";

import { useState } from "react";

interface PayP24ButtonProps {
  campaignId: string;
  amount: number;
  email: string;
}

export default function PayP24Button({ campaignId, amount, email }: PayP24ButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    try {
      setLoading(true);

      // Dostosuj ścieżkę do swojego pliku route.ts (np. /api/payments/p24/register lub /api/p24/register)
      const res = await fetch("/api/payments/p24/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          amount,
          email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Błąd podczas inicjalizacji płatności.");
      }

      // Przekierowanie na stronę płatności P24
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        alert("Nie udało się uzyskać linku do płatności.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Wystąpił błąd podczas przekierowywania do płatności.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
    >
      {loading ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Przekierowywanie...
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Zapłać przez Przelewy24
        </>
      )}
    </button>
  );
}