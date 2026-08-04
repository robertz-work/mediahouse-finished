/**
 * POST /api/campaigns/[id]/reject — admin rejects an order.
 * Transition: pending_approval | awaiting_payment → rejected. Releases all holds.
 * Używane też do uznania nieopłaconego zamówienia za nieopłacone (odrzucenie).
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as campaignsRepo from "@/lib/db/campaignsRepo";
import * as holdsRepo from "@/lib/db/holdsRepo";
import type { CampaignStatus } from "@/lib/constants";

interface Ctx {
  params: Promise<{ id: string }>;
}

const REJECTABLE_STATUSES: CampaignStatus[] = [
  "pending_approval",
  "awaiting_payment",
];

export async function POST(request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const campaign = await campaignsRepo.findById((await params).id);
  if (!campaign) {
    return NextResponse.json({ error: "Kampania nie istnieje" }, { status: 404 });
  }

  if (!REJECTABLE_STATUSES.includes(campaign.status)) {
    return NextResponse.json(
      { error: "Zamówienia w tym statusie nie można odrzucić" },
      { status: 400 }
    );
  }

  await holdsRepo.removeByCampaign((await params).id);

  const updated = await campaignsRepo.setStatus((await params).id, "rejected");
  if (!updated) {
    return NextResponse.json({ error: "Błąd zapisu" }, { status: 500 });
  }

  return NextResponse.json(updated);
}
