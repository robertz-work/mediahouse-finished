import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md">
        <p className="mb-2 text-6xl font-bold text-pink-600">404</p>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          Nie znaleziono strony
        </h1>
        <p className="mb-6 text-slate-500">
          Strona, której szukasz, nie istnieje lub została przeniesiona.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-pink-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700"
          >
            Strona główna
          </Link>
          <Link
            href="/nosniki"
            className="rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Katalog nośników
          </Link>
        </div>
      </div>
    </main>
  );
}
