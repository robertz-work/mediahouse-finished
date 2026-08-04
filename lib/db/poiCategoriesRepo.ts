/**
 * POI categories repository — dynamic list of nearby-POI tags.
 * Migrated from JSON file to MySQL.
 *
 * Table: `poi_categories` (id AUTO_INCREMENT, name UNIQUE).
 * Public API returns string[] for backward compatibility.
 */

import db, { type RowDataPacket } from "./mysql";

interface PoiCategoryRow extends RowDataPacket {
  id: number;
  name: string;
}

/** Return all POI categories, sorted alphabetically. */
export async function listAll(): Promise<string[]> {
  const [rows] = await db.query<PoiCategoryRow[]>(
    "SELECT name FROM poi_categories ORDER BY name"
  );
  return rows.map((r) => r.name);
}

/**
 * Add a new category (case-insensitive dedup, trimmed).
 * Returns the full updated list.
 */
export async function add(name: string): Promise<string[]> {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return listAll();

  // INSERT IGNORE skips if name already exists (UNIQUE constraint)
  await db.query("INSERT IGNORE INTO poi_categories (name) VALUES (?)", [
    trimmed,
  ]);

  return listAll();
}

/**
 * Ensure every tag in `tags` exists in the global list.
 * Called automatically when saving a media item.
 */
export async function ensureAll(tags: string[]): Promise<void> {
  if (!tags || tags.length === 0) return;

  const trimmed = tags
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  if (trimmed.length === 0) return;

  // Bulk INSERT IGNORE — one query for all tags
  const placeholders = trimmed.map(() => "(?)").join(", ");
  await db.query(
    `INSERT IGNORE INTO poi_categories (name) VALUES ${placeholders}`,
    trimmed
  );
}

/** Find a category ID by name. Useful for media_nearby_poi FK. */
export async function findIdByName(
  name: string
): Promise<number | undefined> {
  const [rows] = await db.query<PoiCategoryRow[]>(
    "SELECT id FROM poi_categories WHERE name = ?",
    [name.trim().toLowerCase()]
  );
  return rows[0]?.id;
}

/** Find category IDs for multiple names. Returns a Map<name, id>. */
export async function findIdsByNames(
  names: string[]
): Promise<Map<string, number>> {
  if (names.length === 0) return new Map();

  const trimmed = names.map((n) => n.trim().toLowerCase());
  const placeholders = trimmed.map(() => "?").join(", ");

  const [rows] = await db.query<PoiCategoryRow[]>(
    `SELECT id, name FROM poi_categories WHERE name IN (${placeholders})`,
    trimmed
  );

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.name, row.id);
  }
  return map;
}
