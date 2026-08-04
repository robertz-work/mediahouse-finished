
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as mediaRepo from "@/lib/db/mediaRepo";
import { mediaCreateSchema } from "@/lib/validators/mediaSchema";

// ── POST — create a new media in "pending" status 
export async function POST(request: Request) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "representative" && session.user.role !== "admin")
  ) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = mediaCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Walidacja nie powiodła się", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const photos: string[] = body.photos ?? [];
    const media = await mediaRepo.create(parsed.data, session.user.id, photos);

    return NextResponse.json(media, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("już istnieje")) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[media POST]", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

// ── GET — list media ─────────────────────────────────────────────────────
//
// Query params:
//   ?mine=true          — only current user's media (representative)
//   ?status=pending      — filter by status (admin)
//   (no params)          — returns all for admin, own for representative
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });
  }

  const url = new URL(request.url);
  const mine = url.searchParams.get("mine") === "true";
  const statusFilter = url.searchParams.get("status");

  let items: mediaRepo.Media[];

  if (session.user.role === "admin" && !mine) {
    items = statusFilter
      ? await mediaRepo.findByStatus(statusFilter as mediaRepo.Media["status"])
      : await mediaRepo.listAll();
  } else {
    items = await mediaRepo.findByOwner(session.user.id);
    if (statusFilter) {
      items = items.filter((m) => m.status === statusFilter);
    }
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json(items);
}
