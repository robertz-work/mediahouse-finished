/**
 * GET /api/favorites/media — returns full Media objects for user's favorites
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as favoritesRepo from "@/lib/db/favoritesRepo";
import * as mediaRepo from "@/lib/db/mediaRepo";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });
  }

  const mediaIds = await favoritesRepo.getMediaIds(session.user.id);
  if (mediaIds.length === 0) {
    return NextResponse.json({ media: [] });
  }

  const media = await mediaRepo.findPublishedByIds(mediaIds);
  return NextResponse.json({ media });
}
