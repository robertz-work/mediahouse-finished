/**
 * GET /api/public/media/[id] — single published media (no auth).
 */

import { NextResponse } from "next/server";
import { findById } from "@/lib/db/mediaRepo";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const media = await findById((await params).id);

  if (!media || media.status !== "published") {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  return NextResponse.json(media);
}
