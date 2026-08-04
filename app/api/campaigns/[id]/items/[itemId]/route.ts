/**
 * PATCH /api/campaigns/[id]/items/[itemId] — update an item (period, options).
 * DELETE /api/campaigns/[id]/items/[itemId] — remove item and its hold.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import * as campaignsRepo from "@/lib/db/campaignsRepo";
import * as mediaRepo from "@/lib/db/mediaRepo";
import * as holdsRepo from "@/lib/db/holdsRepo";
import * as settingsRepo from "@/lib/db/settingsRepo";
import { isAvailable } from "@/lib/availability";
import { calculateItemPrice } from "@/lib/pricing";
import { PERIOD_DAYS, type PeriodDays } from "@/lib/constants";
import { isStartDateValid } from "@/lib/helpers/dateValidation";

const patchItemSchema = z.object({
  periodDays: z
    .number()
    .refine((v): v is PeriodDays => (PERIOD_DAYS as readonly number[]).includes(v))
    .optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  addPrint: z.boolean().optional(),
  addInstall: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>;
}


export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });
  }

  const { id: campaignId, itemId } = await context.params;

  const campaign = await campaignsRepo.findById(campaignId);
  if (!campaign || campaign.clientId !== session.user.id) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }
  if (campaign.status !== "draft") {
    return NextResponse.json({ error: "Kampania nie jest draft" }, { status: 400 });
  }

  const item = campaign.items.find((i) => i.id === itemId);
  if (!item) {
    return NextResponse.json({ error: "Pozycja nie znaleziona" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = patchItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Walidacja", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const patch = parsed.data;
  const newPeriod = patch.periodDays ?? item.periodDays;
  const newStart = patch.startDate ?? item.startDate;
  const newPrint = patch.addPrint ?? item.addPrint;
  const newInstall = patch.addInstall ?? item.addInstall;


  if (patch.startDate && !isStartDateValid(newStart)) {
    return NextResponse.json(
      { error: "Data rozpoczęcia musi być co najmniej 14 dni od dziś" },
      { status: 400 }
    );
  }


  const start = new Date(newStart);
  const end = new Date(start);
  end.setDate(end.getDate() + newPeriod);
  const newEnd = end.toISOString().split("T")[0];


  if (newStart !== item.startDate || newPeriod !== item.periodDays) {
    const available = await isAvailable(item.mediaId, newStart, newEnd, campaignId);
    if (!available) {
      return NextResponse.json(
        { error: "Nośnik jest już zarezerwowany w wybranym okresie" },
        { status: 409 }
      );
    }
  }


  const media = await mediaRepo.findById(item.mediaId);
  if (!media) {
    return NextResponse.json({ error: "Nośnik nie istnieje" }, { status: 404 });
  }

  let priceSnapshot;
  try {
    priceSnapshot = calculateItemPrice(
      media.pricing,
      newPeriod as PeriodDays,
      newPrint,
      newInstall
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Błąd ceny" },
      { status: 400 }
    );
  }


  const settings = await settingsRepo.load();
  if (item.holdId) {
    await holdsRepo.refresh(item.holdId, settings.holdTimeoutMinutes);
  }


  const updated = await campaignsRepo.updateItem(campaignId, itemId, {
    periodDays: newPeriod as PeriodDays,
    startDate: newStart,
    endDate: newEnd,
    addPrint: newPrint,
    addInstall: newInstall,
    priceSnapshot,
  });

  return NextResponse.json(updated);
}


export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });
  }

  const { id: campaignId, itemId } = await context.params;

  const campaign = await campaignsRepo.findById(campaignId);
  if (!campaign || campaign.clientId !== session.user.id) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  const result = await campaignsRepo.removeItem(campaignId, itemId);
  if (!result) {
    return NextResponse.json({ error: "Pozycja nie znaleziona" }, { status: 404 });
  }

  // Remove associated hold
  if (result.removedItem.holdId) {
    await holdsRepo.remove(result.removedItem.holdId);
  }

  return NextResponse.json(result.campaign);
}
