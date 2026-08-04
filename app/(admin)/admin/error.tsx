"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <h2 className="mb-2 text-lg font-bold text-red-800">
        Błąd w panelu admina
      </h2>
      <p className="mb-4 text-sm text-red-600">
        {error.message || "Wystąpił nieoczekiwany błąd."}
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}
