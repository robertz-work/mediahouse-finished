"use client";

import dynamic from "next/dynamic";

const DynamicSingleMarkerMap = dynamic(() => import("./SingleMarkerMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400">
      Ładowanie mapy...
    </div>
  ),
});

export default DynamicSingleMarkerMap;
