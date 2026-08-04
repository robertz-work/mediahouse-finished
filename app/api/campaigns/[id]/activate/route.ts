/**
 * POST /api/campaigns/[id]/activate — ustaw ten szkic jako aktywny koszyk.
 * Bumpuje updated_at, więc findDraft (najnowszy) wskaże tę kampanię.
 * Tylko właściciel, tylko status draft.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as campaignsRepo from "@/lib/db/campaignsRepo";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });
  }

  const { id } = await params;
  const ok = await campaignsRepo.touchDraft(id, session.user.id);
  if (!ok) {
    return NextResponse.json(
      { error: "Nie znaleziono szkicu lub brak uprawnień" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
