import type { Metadata } from "next";
import Link from "next/link";
import SessionProvider from "@/components/auth/SessionProvider";
import UserMenu from "@/components/layout/UserMenu";
import MobileNav from "@/components/layout/MobileNav";
import CreateCampaignButton from "@/components/layout/CreateCampaignButton";
import NotificationBell from "@/components/layout/NotificationBell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Media House — Kampanie OOH w całej Polsce",
    template: "%s | Media House",
  },
  description:
    "Zaplanuj kampanię outdoorową w 3 minuty. Setki billboardów i banerów w całej Polsce. Transparentne ceny, szybki start, druk i montaż.",
  keywords: [
    "bilbordy",
    "reklama outdoorowa",
    "OOH",
    "kampania reklamowa",
    "banery",
    "nośniki reklamowe",
    "Media House",
  ],
  openGraph: {
    title: "Media House — Kampanie OOH w całej Polsce",
    description:
      "Zaplanuj kampanię outdoorową w 3 minuty. Setki billboardów i banerów w całej Polsce.",
    locale: "pl_PL",
    type: "website",
    siteName: "Media House",
  },
  robots: { index: true, follow: true },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className="flex min-h-screen flex-col bg-white text-slate-900 antialiased">
        <SessionProvider>
          {/* ── Header ───────────────────────────────────── */}
          <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5">
                {/* Logo icon */}
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-600">
                  <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </span>
                <span className="text-lg font-extrabold tracking-tight">
                  <span className="text-pink-600">MEDIA</span>{" "}
                  <span className="text-slate-900">HOUSE</span>
                </span>
              </Link>

              <div className="flex items-center gap-2">
                <CreateCampaignButton />
                <NotificationBell />
                <UserMenu />
                <MobileNav />
              </div>
            </div>
          </header>

          <div className="flex-1">{children}</div>


          <footer className="border-t border-slate-200 bg-slate-900 text-slate-400">
            <div className="mx-auto max-w-7xl px-4 py-12">
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2 lg:col-span-2">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-600">
                      <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </span>
                    <span className="text-lg font-extrabold tracking-tight text-white">
                      <span className="text-pink-500">MEDIA</span> HOUSE
                    </span>
                  </div>
                  <p className="max-w-xs text-sm leading-relaxed">
                    Jesteśmy nowoczesnym media house&apos;em, który kompleksowo{" "}
                    <span className="text-pink-400">
                      realizuje kampanie reklamowe w przestrzeni miejskiej.
                    </span>
                  </p>
                </div>

                <div>
                  <nav className="flex items-center gap-5 text-sm">
                    <Link href="/nosniki" className="transition hover:text-white">
                      Jak to działa
                    </Link>
                    <Link href="/panel/nosniki" className="transition hover:text-white">
                      Dla partnerów
                    </Link>
                  </nav>
                </div>

                <div className="flex items-center gap-3 lg:justify-end">
                  <Link
                    href="/login"
                    className="rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-white hover:text-white"
                  >
                    Zaloguj się do panelu
                  </Link>
                  <a href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 transition hover:bg-slate-700">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                  </a>
                  <a href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 transition hover:bg-slate-700">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  </a>
                </div>
              </div>

              <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-6 text-xs sm:flex-row">
                <div className="flex gap-4">
                  <Link href="/regulamin" className="text-pink-400 hover:text-pink-300">
                    Regulamin
                  </Link>
                  <Link href="/polityka-prywatnosci" className="hover:text-white">
                    Polityka prywatności i plików cookies
                  </Link>
                </div>
                <p>&copy;{new Date().getFullYear()} przez Media House. Realizacja: <a href="https://beontop.agency/" className="text-pink-400 hover:text-pink-300" target="_blank" rel="noopener noreferrer">BeonTop</a></p>
              </div>
            </div>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
