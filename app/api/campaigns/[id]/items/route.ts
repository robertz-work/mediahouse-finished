/**
 * POST /api/campaigns/[id]/items — add a media item to a draft campaign.
 * Creates a hold atomically (check availability → hold → item).
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

const addItemSchema = z.object({
  mediaId: z.string().min(1),
  periodDays: z.number().refine((v): v is PeriodDays => (PERIOD_DAYS as readonly number[]).includes(v), {
    message: "Nieprawidłowy okres",
  }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format daty: YYYY-MM-DD"),
  addPrint: z.boolean().default(false),
  addInstall: z.boolean().default(false),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });
  }

  const { id: campaignId } = await context.params;


  const campaign = await campaignsRepo.findById(campaignId);
  if (!campaign || campaign.clientId !== session.user.id) {
    return NextResponse.json({ error: "Kampania nie znaleziona" }, { status: 404 });
  }
  if (campaign.status !== "draft") {
    return NextResponse.json({ error: "Kampania nie jest w statusie draft" }, { status: 400 });
  }


  const body = await request.json();
  const parsed = addItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Walidacja nie powiodła się", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { mediaId, periodDays, startDate, addPrint, addInstall } = parsed.data;


  if (!isStartDateValid(startDate)) {
    return NextResponse.json(
      { error: "Data rozpoczęcia musi być co najmniej 14 dni od dziś" },
      { status: 400 }
    );
  }


  const media = await mediaRepo.findById(mediaId);
  if (!media || media.status !== "published") {
    return NextResponse.json({ error: "Nośnik nie jest dostępny" }, { status: 404 });
  }


  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + periodDays);
  const endDate = end.toISOString().split("T")[0];


  const available = await isAvailable(mediaId, startDate, endDate, campaignId);
  if (!available) {
    return NextResponse.json(
      { error: "Nośnik jest już zarezerwowany w wybranym okresie" },
      { status: 409 }
    );
  }


  let priceSnapshot;
  try {
    priceSnapshot = calculateItemPrice(media.pricing, periodDays as PeriodDays, addPrint, addInstall);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Błąd kalkulacji ceny" },
      { status: 400 }
    );
  }


  const settings = await settingsRepo.load();
  const hold = await holdsRepo.create(
    {
      mediaId,
      clientId: session.user.id,
      campaignId,
      startDate,
      endDate,
    },
    settings.holdTimeoutMinutes
  );


  try {
    const result = await campaignsRepo.addItem(campaignId, {
      mediaId,
      periodDays: periodDays as PeriodDays,
      startDate,
      endDate,
      addPrint,
      addInstall,
      priceSnapshot,
      holdId: hold.id,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {

    await holdsRepo.remove(hold.id);
    console.error("[campaigns items POST]", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
