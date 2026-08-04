/**
 * POST /api/campaigns/[id]/mark-paid — admin confirms payment received.
 * Transition: awaiting_payment → paid (or active if emission already started).
 * Creates permanent bookings, removes holds.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as campaignsRepo from "@/lib/db/campaignsRepo";
import * as bookingsRepo from "@/lib/db/bookingsRepo";
import * as holdsRepo from "@/lib/db/holdsRepo";
import * as mediaRepo from "@/lib/db/mediaRepo";
import { isAvailable } from "@/lib/availability";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const campaign = await campaignsRepo.findById((await params).id);
  if (!campaign) {
    return NextResponse.json({ error: "Kampania nie istnieje" }, { status: 404 });
  }

  if (campaign.status !== "awaiting_payment") {
    return NextResponse.json(
      { error: "Kampania nie oczekuje na płatność" },
      { status: 400 }
    );
  }


  const force = new URL(request.url).searchParams.get("force") === "1";
  if (!force) {
    const conflicts: string[] = [];
    for (const item of campaign.items) {
      const free = await isAvailable(
        item.mediaId,
        item.startDate,
        item.endDate,
        campaign.id
      );
      if (!free) {
        const media = await mediaRepo.findById(item.mediaId);
        conflicts.push(media?.code ?? item.mediaId.slice(0, 8));
      }
    }
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error:
            "Uwaga: poniższe nośniki są już zajęte w wybranym terminie (rezerwacja mogła wygasnąć): " +
            conflicts.join(", ") +
            ". Potwierdź, aby oznaczyć jako opłaconą mimo to.",
          code: "AVAILABILITY_CONFLICT",
          conflicts,
        },
        { status: 409 }
      );
    }
  }


  const bookingInputs = campaign.items.map((item) => ({
    mediaId: item.mediaId,
    campaignId: campaign.id,
    clientId: campaign.clientId,
    startDate: item.startDate,
    endDate: item.endDate,
  }));

  await bookingsRepo.createMany(bookingInputs);


  await holdsRepo.removeByCampaign(campaign.id);


  const today = new Date().toISOString().split("T")[0];
  const anyStarted = campaign.items.some((item) => item.startDate <= today);
  const targetStatus = anyStarted ? "active" : "paid";

  const updated = await campaignsRepo.setStatus((await params).id, targetStatus, {
    paidAt: new Date().toISOString(),
  });

  if (!updated) {
    return NextResponse.json({ error: "Błąd zapisu" }, { status: 500 });
  }

  return NextResponse.json(updated);
}
