"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md">
        <h1 className="mb-2 text-4xl font-bold text-slate-900">Ups!</h1>
        <p className="mb-6 text-slate-500">
          Coś poszło nie tak. Spróbuj odświeżyć stronę lub wróć na stronę główną.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-pink-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700"
          >
            Spróbuj ponownie
          </button>
          <a
            href="/"
            className="rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Strona główna
          </a>
        </div>
      </div>
    </main>
  );
}
