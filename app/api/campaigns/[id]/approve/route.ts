/**
 * POST /api/campaigns/[id]/approve — admin approves a pending campaign.
 * Transition: pending_approval → awaiting_payment.
 *
 * NOTE: Approval step is currently disabled in the submit flow
 * (all campaigns go straight to awaiting_payment). This endpoint
 * remains available for manual admin use if needed.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as campaignsRepo from "@/lib/db/campaignsRepo";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const campaign = await campaignsRepo.findById((await params).id);
  if (!campaign) {
    return NextResponse.json({ error: "Kampania nie istnieje" }, { status: 404 });
  }

  if (campaign.status !== "pending_approval") {
    return NextResponse.json(
      { error: "Kampania nie oczekuje na zatwierdzenie" },
      { status: 400 }
    );
  }

  const updated = await campaignsRepo.setStatus((await params).id, "awaiting_payment");
  if (!updated) {
    return NextResponse.json({ error: "Błąd zapisu" }, { status: 500 });
  }

  return NextResponse.json(updated);
}
