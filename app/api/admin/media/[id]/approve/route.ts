/**
 * POST /api/admin/media/[id]/approve
 * Sets media status to "published" and records publishedAt.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/helpers/requireAdmin";
import { setStatus, findById } from "@/lib/db/mediaRepo";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const existing = await findById((await params).id);
  if (!existing) {
    return NextResponse.json({ error: "Nie znaleziono nośnika" }, { status: 404 });
  }

  if (existing.status === "published") {
    return NextResponse.json({ error: "Nośnik jest już opublikowany" }, { status: 400 });
  }

  const updated = await setStatus((await params).id, "published");
  return NextResponse.json(updated);
}
