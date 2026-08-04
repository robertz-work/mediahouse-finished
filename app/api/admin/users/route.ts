/**
 * GET /api/admin/users — list all users (admin only).
 * Returns users WITHOUT passwordHash for security.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/helpers/requireAdmin";
import { listAll } from "@/lib/db/usersRepo";

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const users = await listAll();

  const safe = users.map(({ passwordHash: _, ...rest }) => rest);

  return NextResponse.json(safe);
}
