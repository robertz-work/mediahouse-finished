/**
 * /api/media/[id] — GET, PATCH, DELETE a single media item.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as mediaRepo from "@/lib/db/mediaRepo";
import { mediaPatchSchema } from "@/lib/validators/mediaSchema";

interface Ctx {
  params: Promise<{ id: string }>;
}

// ── GET — public (published) or owner/admin ──────────────────────────────
export async function GET(_req: Request, { params }: Ctx) {
  const media = await mediaRepo.findById((await params).id);
  if (!media) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  // Published items are public; others require owner or admin
  if (media.status !== "published") {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
    }
    const isOwner = media.ownerId === session.user.id;
    const isAdmin = session.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
    }
  }

  return NextResponse.json(media);
}

// ── PATCH — update media fields ──────────────────────────────────────────
export async function PATCH(request: Request, { params }: Ctx) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "representative" && session.user.role !== "admin")
  ) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = mediaPatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Walidacja nie powiodła się", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const patch = {
      ...parsed.data,
      photos: body.photos as string[] | undefined,
      nearbyPoi: body.nearbyPoi as string[] | undefined,
    };
    const isAdmin = session.user.role === "admin";

    const updated = await mediaRepo.update(
      (await params).id,
      patch,
      session.user.id,
      isAdmin
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Nie znaleziono lub brak uprawnień" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes("już istnieje")) {
        return NextResponse.json({ error: err.message }, { status: 409 });
      }
      if (err.message.includes("Edycja możliwa")) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
    }
    console.error("[media PATCH]", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "representative" && session.user.role !== "admin")
  ) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const isAdmin = session.user.role === "admin";
  const deleted = await mediaRepo.remove((await params).id, session.user.id, isAdmin);

  if (!deleted) {
    return NextResponse.json(
      { error: "Nie znaleziono lub brak uprawnień" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
