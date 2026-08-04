"use client";

export default function RepError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <h2 className="mb-2 text-lg font-bold text-red-800">
        Wystąpił błąd
      </h2>
      <p className="mb-4 text-sm text-red-600">
        {error.message || "Coś poszło nie tak. Spróbuj ponownie."}
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-pink-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-pink-700"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}
