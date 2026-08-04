/**
 * Shared date validation helpers.
 * Used on both client (kreator, koszyk) and server (API routes).
 */

import { MIN_BOOKING_LEAD_DAYS } from "@/lib/constants";

/**
 * Returns the earliest allowed start date as a YYYY-MM-DD string.
 * Today + MIN_BOOKING_LEAD_DAYS (14 days).
 */
export function getMinStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + MIN_BOOKING_LEAD_DAYS);
  return d.toISOString().split("T")[0];
}

/**
 * Returns true if the given YYYY-MM-DD date string is on or after
 * the minimum allowed start date.
 */
export function isStartDateValid(dateStr: string): boolean {
  const minDate = getMinStartDate();
  return dateStr >= minDate;
}
