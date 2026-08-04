/**
 * GET /api/admin/settings — load current settings.
 * PATCH /api/admin/settings — update settings.
 * Admin only.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/helpers/requireAdmin";
import * as settingsRepo from "@/lib/db/settingsRepo";

const patchSchema = z.object({
  requireOrderApproval: z.boolean().optional(),
  holdTimeoutMinutes: z.coerce.number().int().min(5).max(120).optional(),
  contactEmail: z.string().email().optional(),
});

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const settings = await settingsRepo.load();
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Walidacja nie powiodła się", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await settingsRepo.save(parsed.data);
  return NextResponse.json(updated);
}
