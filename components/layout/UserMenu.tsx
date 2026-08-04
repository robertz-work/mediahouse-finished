"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  if (status === "loading") {
    return <div className="h-9 w-24 animate-pulse rounded-full bg-slate-200" />;
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="hidden rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-pink-600 hover:text-pink-600 sm:inline-flex"
        >
          Zaloguj się do panelu
        </Link>
        <Link
          href="/login?callbackUrl=/kreator"
          className="inline-flex items-center gap-1.5 rounded-full bg-pink-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-pink-700"
        >
          Stwórz kampanię
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    );
  }

  const user = session.user;
  const initials = user.name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel =
    user.role === "admin"
      ? "Administrator"
      : user.role === "representative"
        ? "Przedstawiciel"
        : "Klient";

  const panelHref =
    user.role === "admin"
      ? "/admin"
      : user.role === "representative"
        ? "/panel/nosniki"
        : "/kampanie";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-pink-300 hover:bg-pink-50"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-600 text-xs font-bold text-white">
          {initials}
        </span>
        <span className="hidden sm:inline">{user.name}</span>
        <svg
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-60 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
            <div className="border-b border-slate-100 px-4 pb-3">
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
              <span className="mt-1.5 inline-block rounded-full bg-pink-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-700">
                {roleLabel}
              </span>
            </div>

            <nav className="py-1">
              <DropdownLink href={panelHref} onClick={() => setOpen(false)}>
                Mój panel
              </DropdownLink>

              {user.role === "client" && (
                <>
                  <DropdownLink href="/kreator" onClick={() => setOpen(false)}>
                    Stwórz kampanię
                  </DropdownLink>
                  <DropdownLink href="/koszyk" onClick={() => setOpen(false)}>
                    Koszyk
                  </DropdownLink>
                  <DropdownLink href="/ulubione" onClick={() => setOpen(false)}>
                    Ulubione nośniki
                  </DropdownLink>
                </>
              )}

            </nav>

            <div className="border-t border-slate-100 pt-1">
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full rounded-lg px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
              >
                Wyloguj się
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DropdownLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-2 text-sm text-slate-700 transition hover:bg-pink-50 hover:text-pink-700"
    >
      {children}
    </Link>
  );
}
