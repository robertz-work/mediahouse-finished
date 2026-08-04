/**
 * PATCH /api/campaigns/[id]/billing — save billing (invoice) data on draft campaign.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import * as campaignsRepo from "@/lib/db/campaignsRepo";

const billingSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana").max(200).trim(),
  address: z.string().min(1, "Adres jest wymagany").max(500).trim(),
  nip: z.string().max(20).trim().optional(),
  email: z.string().email("Podaj poprawny email").max(200).trim(),
  paymentMethod: z.enum(["proforma", "p24", "payu"]).optional(),
});

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Ctx) {
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

  if (campaign.status !== "draft") {
    return NextResponse.json(
      { error: "Dane fakturowe można edytować tylko w statusie draft" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = billingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Walidacja", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { paymentMethod, ...billingData } = parsed.data;

  const updated = await campaignsRepo.updateBilling((await params).id, billingData);
  if (!updated) {
    return NextResponse.json({ error: "Nie udało się zapisać" }, { status: 500 });
  }

  if (paymentMethod) {
    const withPayment = await campaignsRepo.setPaymentMethod((await params).id, paymentMethod);
    if (withPayment) return NextResponse.json(withPayment);
  }

  return NextResponse.json(updated);
}
