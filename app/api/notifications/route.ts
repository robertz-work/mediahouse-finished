/**
 * GET  /api/notifications — list notifications for the logged-in user
 * PATCH /api/notifications — mark notifications as read
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as notificationsRepo from "@/lib/db/notificationsRepo";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);

  const [notifications, unreadCount] = await Promise.all([
    notificationsRepo.getByUserId(session.user.id, { unreadOnly, limit }),
    notificationsRepo.countUnread(session.user.id),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niezalogowany" }, { status: 401 });
  }

  const body = await request.json();

  if (body.id) {
    const ok = await notificationsRepo.markAsRead(body.id, session.user.id);
    return NextResponse.json({ ok });
  }

  if (body.markAllRead) {
    const count = await notificationsRepo.markAllAsRead(session.user.id);
    return NextResponse.json({ markedRead: count });
  }

  return NextResponse.json({ error: "Brak akcji" }, { status: 400 });
}
