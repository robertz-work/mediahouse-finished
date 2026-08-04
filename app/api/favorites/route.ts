/**
 * GET    /api/favorites           — list user's favorite media IDs
 * POST   /api/favorites           — toggle favorite (add/remove)
 * Body:  { mediaId: string }
 * Returns: { favorited: boolean }
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as favoritesRepo from "@/lib/db/favoritesRepo";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });
  }

  const mediaIds = await favoritesRepo.getMediaIds(session.user.id);
  return NextResponse.json({ mediaIds });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });
  }

  const body = await request.json();
  const { mediaId } = body;

  if (!mediaId || typeof mediaId !== "string") {
    return NextResponse.json({ error: "Brak mediaId" }, { status: 400 });
  }

  const favorited = await favoritesRepo.toggle(session.user.id, mediaId);
  return NextResponse.json({ favorited });
}
