"use client";

import { useState } from "react";
import Link from "next/link";

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100"
        aria-label="Menu"
      >
        {open ? (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-16 z-50 border-b border-slate-200 bg-white px-4 py-4 shadow-lg">
          <nav className="flex flex-col gap-1">
            <MobileLink href="/nosniki" onClick={() => setOpen(false)}>
              Katalog nośników
            </MobileLink>
            <MobileLink href="/kreator" onClick={() => setOpen(false)}>
              Kreator kampanii
            </MobileLink>
            <MobileLink href="/kampanie" onClick={() => setOpen(false)}>
              Moje kampanie
            </MobileLink>
            <MobileLink href="/koszyk" onClick={() => setOpen(false)}>
              Koszyk
            </MobileLink>
          </nav>
        </div>
      )}
    </div>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-pink-50 hover:text-pink-700"
    >
      {children}
    </Link>
  );
}
