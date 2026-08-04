/**
 * GET /api/campaigns/draft — zwraca istniejący szkic klienta lub `null`.
 * Read-only: NIE tworzy szkicu (w przeciwieństwie do POST /api/campaigns).
 * Dzięki temu samo wejście do koszyka/podsumowania nie tworzy pustego szkicu.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as campaignsRepo from "@/lib/db/campaignsRepo";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });
  }

  const draft = await campaignsRepo.findDraft(session.user.id);
  return NextResponse.json(draft ?? null);
}
