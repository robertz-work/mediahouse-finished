"use client";

import dynamic from "next/dynamic";

const DynamicCatalogMap = dynamic(() => import("./CatalogMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-400">
      Ładowanie mapy…
    </div>
  ),
});

export default DynamicCatalogMap;
