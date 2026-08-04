/**
 * POST /api/campaigns — get or create a draft campaign for the current client.
 * GET  /api/campaigns — list campaigns for the current user.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as campaignsRepo from "@/lib/db/campaignsRepo";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });
  }

  try {
    // ?new=1 → zawsze twórz nowy szkic; domyślnie użyj istniejącego (lub utwórz).
    const forceNew = new URL(request.url).searchParams.get("new") === "1";
    const campaign = forceNew
      ? await campaignsRepo.createDraft(session.user.id)
      : await campaignsRepo.getOrCreateDraft(session.user.id);
    return NextResponse.json(campaign);
  } catch (err) {
    console.error("[campaigns POST]", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });
  }

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");

  let campaigns: campaignsRepo.Campaign[];

  if (session.user.role === "admin") {
    campaigns = statusFilter
      ? await campaignsRepo.findByStatus(statusFilter as campaignsRepo.Campaign["status"])
      : await campaignsRepo.listAll();
  } else {
    campaigns = await campaignsRepo.findByClient(session.user.id);
    if (statusFilter) {
      campaigns = campaigns.filter((c) => c.status === statusFilter);
    }
  }

  campaigns.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return NextResponse.json(campaigns);
}
