/**
 * Favorites repository — client's saved/bookmarked media items.
 * Simple toggle: add or remove. No duplicates (UNIQUE constraint).
 */

import db, { type RowDataPacket, type ResultSetHeader } from "./mysql";

export interface Favorite {
  id: number;
  userId: string;
  mediaId: string;
  createdAt: string;
}

interface FavoriteRow extends RowDataPacket {
  id: number;
  user_id: string;
  media_id: string;
  created_at: Date;
}

function rowToFavorite(row: FavoriteRow): Favorite {
  return {
    id: row.id,
    userId: row.user_id,
    mediaId: row.media_id,
    createdAt: row.created_at.toISOString(),
  };
}

/** Get all favorite media IDs for a user. */
export async function getMediaIds(userId: string): Promise<string[]> {
  const [rows] = await db.query<(RowDataPacket & { media_id: string })[]>(
    "SELECT media_id FROM favorites WHERE user_id = ?",
    [userId]
  );
  return rows.map((r) => r.media_id);
}

/** Get full favorites list for a user (with timestamps). */
export async function getByUser(userId: string): Promise<Favorite[]> {
  const [rows] = await db.query<FavoriteRow[]>(
    "SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return rows.map(rowToFavorite);
}

/** Check if a specific media is favorited by a user. */
export async function isFavorited(
  userId: string,
  mediaId: string
): Promise<boolean> {
  const [rows] = await db.query<(RowDataPacket & { cnt: number })[]>(
    "SELECT COUNT(*) AS cnt FROM favorites WHERE user_id = ? AND media_id = ?",
    [userId, mediaId]
  );
  return (rows[0]?.cnt ?? 0) > 0;
}

/** Count total favorites for a user. */
export async function countByUser(userId: string): Promise<number> {
  const [rows] = await db.query<(RowDataPacket & { cnt: number })[]>(
    "SELECT COUNT(*) AS cnt FROM favorites WHERE user_id = ?",
    [userId]
  );
  return rows[0]?.cnt ?? 0;
}

/** Add media to favorites. Returns true if added, false if already existed. */
export async function add(userId: string, mediaId: string): Promise<boolean> {
  try {
    await db.query(
      "INSERT INTO favorites (user_id, media_id) VALUES (?, ?)",
      [userId, mediaId]
    );
    return true;
  } catch (err: unknown) {
    // Duplicate key = already favorited
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "ER_DUP_ENTRY") {
      return false;
    }
    throw err;
  }
}

/** Remove media from favorites. Returns true if removed. */
export async function remove(
  userId: string,
  mediaId: string
): Promise<boolean> {
  const [result] = await db.query<ResultSetHeader>(
    "DELETE FROM favorites WHERE user_id = ? AND media_id = ?",
    [userId, mediaId]
  );
  return result.affectedRows > 0;
}

/** Toggle favorite: add if not present, remove if present. Returns new state. */
export async function toggle(
  userId: string,
  mediaId: string
): Promise<boolean> {
  const exists = await isFavorited(userId, mediaId);
  if (exists) {
    await remove(userId, mediaId);
    return false;
  } else {
    await add(userId, mediaId);
    return true;
  }
}
