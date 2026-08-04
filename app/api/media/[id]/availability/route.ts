/**
 * GET /api/media/[id]/availability — returns bookings and active holds
 * for a given media item. Used by the AvailabilityCalendar component.
 */

import { NextResponse } from "next/server";
import * as bookingsRepo from "@/lib/db/bookingsRepo";
import * as holdsRepo from "@/lib/db/holdsRepo";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id: mediaId } = await context.params;

  const [bookings, holds] = await Promise.all([
    bookingsRepo.findByMedia(mediaId),
    holdsRepo.findByMedia(mediaId),
  ]);

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      startDate: b.startDate,
      endDate: b.endDate,
    })),
    holds: holds.map((h) => ({
      startDate: h.startDate,
      endDate: h.endDate,
    })),
  });
}
