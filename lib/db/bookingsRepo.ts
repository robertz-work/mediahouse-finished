/**
 * Bookings (permanent reservations after payment) — CRUD over MySQL.
 * Migrated from data/bookings.json.
 */

import { v4 as uuid } from "uuid";
import db, { type RowDataPacket, type ResultSetHeader } from "./mysql";

export interface Booking {
  id: string;
  mediaId: string;
  campaignId: string;
  clientId: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  createdAt: string; // ISO datetime
}

interface BookingRow extends RowDataPacket {
  id: string;
  media_id: string;
  campaign_id: string;
  client_id: string;
  start_date: string | Date;
  end_date: string | Date;
  created_at: Date;
}

function rowToBooking(row: BookingRow): Booking {
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
    campaignId: row.campaign_id,
    clientId: row.client_id,
    startDate,
    endDate,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listAll(): Promise<Booking[]> {
  const [rows] = await db.query<BookingRow[]>("SELECT * FROM bookings");
  return rows.map(rowToBooking);
}

export async function findByMedia(mediaId: string): Promise<Booking[]> {
  const [rows] = await db.query<BookingRow[]>(
    "SELECT * FROM bookings WHERE media_id = ?",
    [mediaId]
  );
  return rows.map(rowToBooking);
}

export async function findByCampaign(campaignId: string): Promise<Booking[]> {
  const [rows] = await db.query<BookingRow[]>(
    "SELECT * FROM bookings WHERE campaign_id = ?",
    [campaignId]
  );
  return rows.map(rowToBooking);
}

export async function create(
  input: Omit<Booking, "id" | "createdAt">
): Promise<Booking> {
  const id = uuid();
  const now = new Date();

  await db.query(
    `INSERT INTO bookings (id, media_id, campaign_id, client_id, start_date, end_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.mediaId, input.campaignId, input.clientId, input.startDate, input.endDate, now]
  );

  return {
    id,
    mediaId: input.mediaId,
    campaignId: input.campaignId,
    clientId: input.clientId,
    startDate: input.startDate,
    endDate: input.endDate,
    createdAt: now.toISOString(),
  };
}

export async function createMany(
  inputs: Array<Omit<Booking, "id" | "createdAt">>
): Promise<Booking[]> {
  if (inputs.length === 0) return [];

  const now = new Date();
  const created: Booking[] = [];
  const values: unknown[][] = [];

  for (const input of inputs) {
    const id = uuid();
    values.push([
      id,
      input.mediaId,
      input.campaignId,
      input.clientId,
      input.startDate,
      input.endDate,
      now,
    ]);
    created.push({
      id,
      mediaId: input.mediaId,
      campaignId: input.campaignId,
      clientId: input.clientId,
      startDate: input.startDate,
      endDate: input.endDate,
      createdAt: now.toISOString(),
    });
  }

  await db.query(
    `INSERT INTO bookings (id, media_id, campaign_id, client_id, start_date, end_date, created_at)
     VALUES ?`,
    [values]
  );

  return created;
}

export async function removeByCampaign(campaignId: string): Promise<number> {
  const [result] = await db.query<ResultSetHeader>(
    "DELETE FROM bookings WHERE campaign_id = ?",
    [campaignId]
  );
  return result.affectedRows;
}
