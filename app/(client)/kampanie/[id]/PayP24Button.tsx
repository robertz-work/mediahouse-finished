"use client";

import { useState } from "react";

interface PayP24ButtonProps {
  campaignId: string;
}

export default function PayP24Button({ campaignId }: PayP24ButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    try {
      setLoading(true);

      // Strzał do Twojego API inicjującego płatność w P24
      const res = await fetch("/api/payments/p24/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });

      if (!res.ok) {
        throw new Error("Błąd podczas inicjalizacji płatności.");
      }

      const data = await res.json();

      // Przekierowanie użytkownika do Przelewy24 (adres zwrócony z API)
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Nie udało się uzyskać linku do płatności.");
      }
    } catch (err) {
      console.error(err);
      alert("Wystąpił błąd podczas przekierowywania do płatności.");
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