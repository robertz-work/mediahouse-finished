/**
 * Notifications repository — CRUD over MySQL.
 * Used for in-app notifications (campaign status changes, etc.).
 */

import { v4 as uuid } from "uuid";
import db, { type RowDataPacket, type ResultSetHeader } from "./mysql";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  campaignId?: string;
  isRead: boolean;
  createdAt: string; // ISO datetime
}

interface NotificationRow extends RowDataPacket {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  campaign_id: string | null;
  is_read: number;
  created_at: Date;
}

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    campaignId: row.campaign_id ?? undefined,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at.toISOString(),
  };
}

export async function getByUserId(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number }
): Promise<Notification[]> {
  const limit = options?.limit ?? 50;
  const where = options?.unreadOnly
    ? "WHERE user_id = ? AND is_read = 0"
    : "WHERE user_id = ?";

  const [rows] = await db.query<NotificationRow[]>(
    `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ?`,
    [userId, limit]
  );

  return rows.map(rowToNotification);
}

export async function countUnread(userId: string): Promise<number> {
  const [rows] = await db.query<(RowDataPacket & { cnt: number })[]>(
    "SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0",
    [userId]
  );
  return rows[0]?.cnt ?? 0;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function create(input: {
  userId: string;
  type: string;
  title: string;
  message: string;
  campaignId?: string;
}): Promise<Notification> {
  const id = uuid();
  const now = new Date();

  await db.query(
    `INSERT INTO notifications (id, user_id, type, title, message, campaign_id, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, input.userId, input.type, input.title, input.message, input.campaignId ?? null, now]
  );

  return {
    id,
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    campaignId: input.campaignId,
    isRead: false,
    createdAt: now.toISOString(),
  };
}

export async function markAsRead(id: string, userId: string): Promise<boolean> {
  const [result] = await db.query<ResultSetHeader>(
    "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return result.affectedRows > 0;
}

export async function markAllAsRead(userId: string): Promise<number> {
  const [result] = await db.query<ResultSetHeader>(
    "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
    [userId]
  );
  return result.affectedRows;
}
