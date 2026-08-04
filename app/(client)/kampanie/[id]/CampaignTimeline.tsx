"use client";

/**
 * Clean horizontal bar timeline showing each media item's date range.
 * - Shows start/end date labels at edges
 * - Colored bar: pink if active (now >= start), gray/outline if not started yet
 * - Progress indicator within active bars
 */

interface TimelineItem {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
}

export default function CampaignTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) return null;

  const now = Date.now();

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const fmtShort = (d: string) =>
    new Date(d).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
    });

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const s = new Date(item.startDate).getTime();
        const e = new Date(item.endDate).getTime();
        const span = e - s || 1;

        const notStarted = now < s;
        const completed = now >= e;
        const progressPct = notStarted
          ? 0
          : completed
            ? 100
            : Math.round(((now - s) / span) * 100);

        return (
          <div
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >

            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-800">
                {item.label}
              </span>
              <span className="text-xs text-slate-400">
                {fmtDate(item.startDate)} — {fmtDate(item.endDate)}
              </span>
            </div>

  
            <div className="relative h-6 w-full overflow-hidden rounded-full bg-slate-100">
              {notStarted ? (

                <div className="flex h-full items-center justify-center">
                  <span className="text-[10px] font-medium text-slate-400">
                    Start: {fmtShort(item.startDate)}
                  </span>
                </div>
              ) : (

                <div
                  className={`h-full rounded-full transition-all ${
                    completed ? "bg-emerald-500" : "bg-pink-500"
                  }`}
                  style={{ width: `${Math.max(progressPct, 3)}%` }}
                >
                  <span className="flex h-full items-center justify-center text-[10px] font-semibold text-white whitespace-nowrap px-2">
                    {completed
                      ? "Zakończona"
                      : `${progressPct}%`}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
