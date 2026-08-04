/**
 * POST /api/campaigns/[id]/declare-payment — client declares they have paid via bank transfer.
 * Does NOT change status — just marks a flag so admin knows to check.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as campaignsRepo from "@/lib/db/campaignsRepo";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });
  }

  const campaign = await campaignsRepo.findById((await params).id);
  if (!campaign) {
    return NextResponse.json({ error: "Kampania nie istnieje" }, { status: 404 });
  }

  if (campaign.clientId !== session.user.id) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  if (campaign.status !== "awaiting_payment") {
    return NextResponse.json(
      { error: "Kampania nie oczekuje na płatność" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Zgłoszenie płatności zostało przyjęte. Administrator zweryfikuje wpłatę.",
  });
}
