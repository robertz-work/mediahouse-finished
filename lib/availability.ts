/**
 * Availability checker — detects date-range overlaps with bookings and holds.
 */

import * as bookingsRepo from "./db/bookingsRepo";
import * as holdsRepo from "./db/holdsRepo";

/**
 * Check if a media is available for the given date range.
 *
 * @param mediaId          Media to check
 * @param startDate        Desired start (ISO date string, e.g. "2026-05-01")
 * @param endDate          Desired end   (ISO date string, e.g. "2026-07-30")
 * @param excludeCampaignId  Optional campaign to exclude (e.g. the current draft — avoids
 *                           conflicting with the user's own pending items)
 * @returns true if available, false if there's a conflicting booking or hold
 */
export async function isAvailable(
  mediaId: string,
  startDate: string,
  endDate: string,
  excludeCampaignId?: string
): Promise<boolean> {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  const bookings = await bookingsRepo.findByMedia(mediaId);
  for (const b of bookings) {
    if (excludeCampaignId && b.campaignId === excludeCampaignId) continue;
    if (rangesOverlap(start, end, new Date(b.startDate).getTime(), new Date(b.endDate).getTime())) {
      return false;
    }
  }

  const holds = await holdsRepo.findByMedia(mediaId);
  for (const h of holds) {
    if (excludeCampaignId && h.campaignId === excludeCampaignId) continue;
    if (rangesOverlap(start, end, new Date(h.startDate).getTime(), new Date(h.endDate).getTime())) {
      return false;
    }
  }

  return true;
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
