/**
 * POST /api/campaigns/suggest — greedy algorithm that proposes media
 * fitting the client's budget and filters.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import * as mediaRepo from "@/lib/db/mediaRepo";
import { isAvailable } from "@/lib/availability";
import { calculateItemPrice, type PriceSnapshot } from "@/lib/pricing";
import {
  VOIVODESHIPS,
  PERIOD_DAYS,
  PERIOD_PRICE_FIELD,
  EXPOSITION_TYPES,
  type PeriodDays,
  type VoivodeshipCode,
} from "@/lib/constants";
import { isStartDateValid } from "@/lib/helpers/dateValidation";

const suggestSchema = z.object({
  voivodeships: z
    .array(z.enum(VOIVODESHIPS as unknown as [string, ...string[]]))
    .min(1, "Wybierz co najmniej jedno województwo"),
  periodDays: z
    .number()
    .refine((v): v is PeriodDays => (PERIOD_DAYS as readonly number[]).includes(v)),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  budget: z.number().positive("Budżet musi być większy od 0"),
  addPrint: z.enum(["yes", "no", "any"]).default("any"),
  addInstall: z.enum(["yes", "no", "any"]).default("any"),
  expositionType: z
    .enum([...(EXPOSITION_TYPES as unknown as [string, ...string[]]), ""])
    .default(""),
  nearbyPoi: z.array(z.string()).optional().default([]),
});

export interface SuggestResult {
  items: Array<{
    media: mediaRepo.Media;
    priceSnapshot: PriceSnapshot;
    addPrint: boolean;
    addInstall: boolean;
  }>;
  totalCost: number;
  remainingBudget: number;
  budget: number;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = suggestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Walidacja", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    voivodeships,
    periodDays,
    startDate,
    budget,
    addPrint: printPref,
    addInstall: installPref,
    expositionType,
    nearbyPoi,
  } = parsed.data;

  if (!isStartDateValid(startDate)) {
    return NextResponse.json(
      { error: "Data rozpoczęcia musi być co najmniej 14 dni od dziś" },
      { status: 400 }
    );
  }

  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + periodDays);
  const endDate = end.toISOString().split("T")[0];

  let candidates = await mediaRepo.findPublished();

  candidates = candidates.filter((m) =>
    (voivodeships as VoivodeshipCode[]).includes(m.voivodeship)
  );

  if (expositionType) {
    candidates = candidates.filter((m) => m.expositionType === expositionType);
  }

  if (nearbyPoi.length > 0) {
    candidates = candidates.filter(
      (m) => m.nearbyPoi && m.nearbyPoi.some((p) => nearbyPoi.includes(p))
    );
  }

  const priceField = PERIOD_PRICE_FIELD[periodDays as PeriodDays];
  candidates = candidates.filter((m) => m.pricing[priceField] != null);

  const availableCandidates: mediaRepo.Media[] = [];
  for (const m of candidates) {
    const ok = await isAvailable(m.id, startDate, endDate);
    if (ok) availableCandidates.push(m);
  }

  const priced = availableCandidates.map((m) => {
    const wantPrint =
      printPref === "yes" ? true : printPref === "no" ? false : !!m.pricing.printCost;
    const wantInstall =
      installPref === "yes"
        ? true
        : installPref === "no"
        ? false
        : !!m.pricing.installCost;

    const snapshot = calculateItemPrice(
      m.pricing,
      periodDays as PeriodDays,
      wantPrint && !!m.pricing.printCost,
      wantInstall && !!m.pricing.installCost
    );

    return { media: m, priceSnapshot: snapshot, addPrint: wantPrint, addInstall: wantInstall };
  });

  priced.sort((a, b) => a.priceSnapshot.total - b.priceSnapshot.total);

  const selected: typeof priced = [];
  let totalCost = 0;

  for (const item of priced) {
    if (totalCost + item.priceSnapshot.total <= budget) {
      selected.push(item);
      totalCost += item.priceSnapshot.total;
    }
  }

  const result: SuggestResult = {
    items: selected,
    totalCost,
    remainingBudget: budget - totalCost,
    budget,
  };

  return NextResponse.json(result);
}
