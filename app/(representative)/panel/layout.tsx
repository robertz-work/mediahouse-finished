import Link from "next/link";


export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">

      <aside className="hidden w-56 shrink-0 md:block">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          Panel przedstawiciela
        </h2>
        <nav className="space-y-1">
          <SidebarLink href="/panel/nosniki">Moje nośniki</SidebarLink>
          <SidebarLink href="/panel/nosniki/nowy">Dodaj nośnik</SidebarLink>
        </nav>
      </aside>


      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

function SidebarLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-pink-50 hover:text-pink-700"
    >
      {children}
    </Link>
  );
}
