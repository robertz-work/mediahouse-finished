"use client";

/**
 * Monthly calendar showing media availability.
 * - Red days: booked (permanent reservations)
 * - Amber/yellow days: active holds (temporary)
 * - Gray days: past
 * - Default: available
 */

import { useState, useEffect, useCallback } from "react";

interface DateRange {
  startDate: string;
  endDate: string;
}

interface AvailabilityData {
  bookings: DateRange[];
  holds: DateRange[];
}

interface Props {
  mediaId: string;
}

const DAYS_PL = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function isInRange(dateStr: string, ranges: DateRange[]): boolean {
  return ranges.some((r) => dateStr >= r.startDate && dateStr < r.endDate);
}

export default function AvailabilityCalendar({ mediaId }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/media/${mediaId}/availability`);
      if (res.ok) {
        const json: AvailabilityData = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("AvailabilityCalendar fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [mediaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };


  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toDateStr(now);

  const cells: Array<{ day: number; dateStr: string } | null> = [];
  // Fill empty cells before first day
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr });
  }

  return (
    <div className="w-full max-w-sm">

      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
          aria-label="Poprzedni miesiąc"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-slate-900">
          {MONTHS_PL[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
          aria-label="Następny miesiąc"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

 
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
        {DAYS_PL.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>


      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-pink-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-8" />;
            }

            const isPast = cell.dateStr < todayStr;
            const isBooked = data ? isInRange(cell.dateStr, data.bookings) : false;
            const isHeld = data ? isInRange(cell.dateStr, data.holds) : false;
            const isToday = cell.dateStr === todayStr;

            let classes = "flex h-8 w-full items-center justify-center rounded-md text-xs font-medium transition";

            if (isPast) {
              classes += " text-slate-300 cursor-default";
            } else if (isBooked) {
              classes += " bg-red-500 text-white";
            } else if (isHeld) {
              classes += " bg-amber-400 text-white";
            } else {
              classes += " text-slate-700 hover:bg-slate-50";
            }

            if (isToday && !isBooked && !isHeld) {
              classes += " ring-1 ring-pink-400";
            }

            return (
              <div key={cell.dateStr} className={classes}>
                {cell.day}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" />
          Zarezerwowane
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" />
          Wstępna rezerwacja
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-200" />
          Wolne
        </span>
      </div>
    </div>
  );
}
