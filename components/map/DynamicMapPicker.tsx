"use client";

/**
 * Dynamically imported MapPicker — safe for SSR.
 *
 * Usage:
 *   import DynamicMapPicker from "@/components/map/DynamicMapPicker";
 *   <DynamicMapPicker value={gps} onChange={setGps} />
 */

import dynamic from "next/dynamic";

const DynamicMapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-sm text-slate-400">
      Ładowanie mapy…
    </div>
  ),
});

export default DynamicMapPicker;
