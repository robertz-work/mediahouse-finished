/**
 * POST /api/admin/media/[id]/reject
 * Sets media status to "rejected" with a required reason.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/helpers/requireAdmin";
import { setStatus, findById } from "@/lib/db/mediaRepo";

const schema = z.object({
  reason: z.string().min(1, "Podaj powód odrzucenia").max(500),
});

export async function POST(
  request: Request,
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

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors.reason?.[0] ?? "Podaj powód" },
      { status: 400 }
    );
  }

  const updated = await setStatus((await params).id, "rejected", parsed.data.reason);
  return NextResponse.json(updated);
}
