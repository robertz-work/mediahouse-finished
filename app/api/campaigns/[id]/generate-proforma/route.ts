/**
 * POST /api/campaigns/[id]/generate-proforma — generate proforma invoice PDF.
 * Only for campaigns in awaiting_payment status with paymentMethod=proforma.
 * Uploads PDF to S3 and saves URL in campaign.invoiceUrl.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as campaignsRepo from "@/lib/db/campaignsRepo";
import { generateProforma } from "@/lib/invoices/proformaGenerator";

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

  if (campaign.clientId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }


  if (campaign.status === "draft" || campaign.status === "pending_approval") {
    return NextResponse.json(
      { error: "Kampania musi być zatwierdzona przed wygenerowaniem faktury" },
      { status: 400 }
    );
  }


  if (campaign.invoiceUrl) {
    return NextResponse.json({
      invoiceNumber: campaign.invoiceNumber,
      invoiceUrl: campaign.invoiceUrl,
      alreadyGenerated: true,
    });
  }

  try {
    const result = await generateProforma((await params).id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[generate-proforma] Error:", err);
    return NextResponse.json(
      { error: "Nie udało się wygenerować faktury" },
      { status: 500 }
    );
  }
}
