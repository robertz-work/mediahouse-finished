/**
 * DELETE /api/admin/media/[id]/delete — permanently remove a media item.
 * Admin only. Cascades to photos, tags, POI, and related holds.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as mediaRepo from "@/lib/db/mediaRepo";
import * as bookingsRepo from "@/lib/db/bookingsRepo";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { id } = await context.params;

  const bookings = await bookingsRepo.findByMedia(id);
  const now = new Date().toISOString().split("T")[0];
  const activeBookings = bookings.filter((b) => b.endDate > now);

  if (activeBookings.length > 0) {
    return NextResponse.json(
      {
        error: `Nie można usunąć — nośnik ma ${activeBookings.length} aktywnych rezerwacji. Anuluj najpierw powiązane kampanie.`,
      },
      { status: 409 }
    );
  }

  const removed = await mediaRepo.remove(id, session.user.id, true);

  if (!removed) {
    return NextResponse.json(
      { error: "Nośnik nie został znaleziony" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
