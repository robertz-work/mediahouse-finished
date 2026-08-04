/**
 * GET /api/holds/[id] — get a single hold (for countdown timer).
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as holdsRepo from "@/lib/db/holdsRepo";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });
  }

  const { id } = await context.params;
  const hold = await holdsRepo.findById(id);

  if (!hold || hold.clientId !== session.user.id) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  return NextResponse.json(hold);
}
