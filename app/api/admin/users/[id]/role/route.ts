/**
 * PATCH /api/admin/users/[id]/role
 * Change a user's role. Admin only.
 * Body: { role: "client" | "representative" | "admin" }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/helpers/requireAdmin";
import { updateRole, findById } from "@/lib/db/usersRepo";
import { ROLES } from "@/lib/constants";

const schema = z.object({
  role: z.enum(ROLES, {
    errorMap: () => ({ message: "Nieprawidłowa rola" }),
  }),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  if ((await params).id === session.user.id) {
    return NextResponse.json(
      { error: "Nie możesz zmienić swojej roli" },
      { status: 400 }
    );
  }

  const user = await findById((await params).id);
  if (!user) {
    return NextResponse.json({ error: "Nie znaleziono użytkownika" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors.role?.[0] ?? "Nieprawidłowa rola" },
      { status: 400 }
    );
  }

  const updated = await updateRole((await params).id, parsed.data.role);
  if (!updated) {
    return NextResponse.json({ error: "Błąd aktualizacji" }, { status: 500 });
  }

  const { passwordHash: _, ...safe } = updated;
  return NextResponse.json(safe);
}
