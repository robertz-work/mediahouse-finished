/**
 * POST /api/campaigns/[id]/submit — transition draft → awaiting_payment.
 *
 * Flow:
 *   - Validates campaign is "draft" with at least 1 item and billing data.
 *   - Always goes straight to awaiting_payment (no admin approval step).
 *   - Extends all holds to 24 hours (gives client time to pay).
 *   - If proforma — auto-generates invoice PDF.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as campaignsRepo from "@/lib/db/campaignsRepo";
import * as holdsRepo from "@/lib/db/holdsRepo";
import { generateProforma } from "@/lib/invoices/proformaGenerator";

const SUBMITTED_HOLD_MINUTES = 60 * 24 * 14; // 14 dni

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

  if (campaign.status !== "draft") {
    return NextResponse.json(
      { error: "Kampania nie jest w statusie draft" },
      { status: 400 }
    );
  }

  if (campaign.items.length === 0) {
    return NextResponse.json(
      { error: "Kampania nie zawiera żadnych nośników" },
      { status: 400 }
    );
  }


  if (!campaign.billing.name || !campaign.billing.address || !campaign.billing.email) {
    return NextResponse.json(
      { error: "Uzupełnij dane do faktury przed złożeniem zamówienia" },
      { status: 400 }
    );
  }


  const updated = await campaignsRepo.setStatus((await params).id, "awaiting_payment");
  if (!updated) {
    return NextResponse.json({ error: "Nie udało się złożyć zamówienia" }, { status: 500 });
  }


  for (const item of campaign.items) {
    if (item.holdId) {
      await holdsRepo.refresh(item.holdId, SUBMITTED_HOLD_MINUTES);
    }
  }


  if (campaign.paymentMethod === "proforma") {
    try {
      const result = await generateProforma((await params).id);
      console.log("[submit] Proforma generated:", result.invoiceNumber);

      const refreshed = await campaignsRepo.findById((await params).id);
      if (refreshed) return NextResponse.json(refreshed);
    } catch (err) {
      console.error("[submit] Proforma generation failed:", err);
    }
  }

  return NextResponse.json(updated);
}
