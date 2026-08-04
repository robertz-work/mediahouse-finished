/**
 * Holds (temporary reservations) repository — CRUD over MySQL.
 * Migrated from data/holds.json.
 *
 * Expired holds are excluded via WHERE clause (no lazy cleanup needed —
 * MySQL ignores them automatically). Periodic cleanup is optional.
 */

import { v4 as uuid } from "uuid";
import db, { type RowDataPacket, type ResultSetHeader } from "./mysql";

export interface Hold {
  id: string;
  mediaId: string;
  clientId: string;
  campaignId: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  expiresAt: string; // ISO datetime
}

interface HoldRow extends RowDataPacket {
  id: string;
  media_id: string;
  client_id: string;
  campaign_id: string;
  start_date: string | Date;
  end_date: string | Date;
  expires_at: Date;
}

function rowToHold(row: HoldRow): Hold {
  const startDate =
    row.start_date instanceof Date
      ? row.start_date.toISOString().split("T")[0]
      : String(row.start_date);
  const endDate =
    row.end_date instanceof Date
      ? row.end_date.toISOString().split("T")[0]
      : String(row.end_date);

  return {
    id: row.id,
    mediaId: row.media_id,
    clientId: row.client_id,
    campaignId: row.campaign_id,
    startDate,
    endDate,
    expiresAt: row.expires_at.toISOString(),
  };
}

const ACTIVE = "expires_at > NOW()";

export async function listAll(): Promise<Hold[]> {
  const [rows] = await db.query<HoldRow[]>(
    `SELECT * FROM holds WHERE ${ACTIVE}`
  );
  return rows.map(rowToHold);
}

export async function findByMedia(mediaId: string): Promise<Hold[]> {
  const [rows] = await db.query<HoldRow[]>(
    `SELECT * FROM holds WHERE media_id = ? AND ${ACTIVE}`,
    [mediaId]
  );
  return rows.map(rowToHold);
}

export async function findByCampaign(campaignId: string): Promise<Hold[]> {
  const [rows] = await db.query<HoldRow[]>(
    `SELECT * FROM holds WHERE campaign_id = ? AND ${ACTIVE}`,
    [campaignId]
  );
  return rows.map(rowToHold);
}

export async function findById(id: string): Promise<Hold | undefined> {
  const [rows] = await db.query<HoldRow[]>(
    `SELECT * FROM holds WHERE id = ? AND ${ACTIVE}`,
    [id]
  );
  return rows[0] ? rowToHold(rows[0]) : undefined;
}

export async function create(
  input: Omit<Hold, "id" | "expiresAt">,
  holdTimeoutMinutes: number
): Promise<Hold> {
  const id = uuid();
  const expiresAt = new Date(Date.now() + holdTimeoutMinutes * 60 * 1000);

  await db.query(
    `INSERT INTO holds (id, media_id, client_id, campaign_id, start_date, end_date, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.mediaId,
      input.clientId,
      input.campaignId,
      input.startDate,
      input.endDate,
      expiresAt,
    ]
  );

  return {
    id,
    mediaId: input.mediaId,
    clientId: input.clientId,
    campaignId: input.campaignId,
    startDate: input.startDate,
    endDate: input.endDate,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function refresh(
  id: string,
  holdTimeoutMinutes: number
): Promise<Hold | undefined> {
  const expiresAt = new Date(Date.now() + holdTimeoutMinutes * 60 * 1000);

  const [result] = await db.query<ResultSetHeader>(
    `UPDATE holds SET expires_at = ? WHERE id = ? AND ${ACTIVE}`,
    [expiresAt, id]
  );

  if (result.affectedRows === 0) return undefined;
  return findById(id);
}

export async function remove(id: string): Promise<boolean> {
  const [result] = await db.query<ResultSetHeader>(
    "DELETE FROM holds WHERE id = ?",
    [id]
  );
  return result.affectedRows > 0;
}

export async function removeByCampaign(campaignId: string): Promise<number> {
  const [result] = await db.query<ResultSetHeader>(
    "DELETE FROM holds WHERE campaign_id = ?",
    [campaignId]
  );
  return result.affectedRows;
}

export async function purgeExpired(): Promise<number> {
  const [result] = await db.query<ResultSetHeader>(
    "DELETE FROM holds WHERE expires_at <= NOW()"
  );
  return result.affectedRows;
}
