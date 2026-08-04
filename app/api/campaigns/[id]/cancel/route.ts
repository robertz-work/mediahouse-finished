/**
 * POST /api/campaigns/[id]/cancel
 * Client cancels their own campaign — only allowed for: draft, pending_approval, awaiting_payment.
 * Releases all associated holds.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as campaignsRepo from "@/lib/db/campaignsRepo";
import * as holdsRepo from "@/lib/db/holdsRepo";
import type { CampaignStatus } from "@/lib/constants";

const CANCELLABLE_STATUSES: CampaignStatus[] = [
  "draft",
  "pending_approval",
  "awaiting_payment",
];

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });
  }

  const { id } = await params;
  const campaign = await campaignsRepo.findById(id);
  if (!campaign) {
    return NextResponse.json({ error: "Nie znaleziono kampanii" }, { status: 404 });
  }

  if (campaign.clientId !== session.user.id) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  if (!CANCELLABLE_STATUSES.includes(campaign.status)) {
    return NextResponse.json(
      {
        error: `Nie można anulować kampanii w statusie "${campaign.status}". Dozwolone statusy: ${CANCELLABLE_STATUSES.join(", ")}`,
      },
      { status: 400 }
    );
  }


  await holdsRepo.removeByCampaign(id);


  const updated = await campaignsRepo.setStatus(id, "cancelled");

  return NextResponse.json({ campaign: updated });
}
