/**
 * Media (billboards/banners) repository — CRUD over MySQL.
 * Migrated from data/media.json.
 *
 * Nested arrays (photos, locationTags, nearbyPoi) are stored in separate
 * tables and loaded with additional queries. Writes use transactions.
 */

import { v4 as uuid } from "uuid";
import db, { type RowDataPacket, type ResultSetHeader } from "./mysql";
import * as poiCategoriesRepo from "./poiCategoriesRepo";
import type { MediaCreateInput } from "../validators/mediaSchema";
import type {
  VoivodeshipCode,
  RoadType,
  ExpositionType,
  MediaStatus,
} from "../constants";

export interface MediaPricing {
  month1?: number;
  month3?: number;
  month6?: number;
  month12?: number;
  printCost?: number;
  installCost?: number;
}

export interface Media {
  id: string;
  code: string;
  ownerId: string;
  status: MediaStatus;
  rejectionReason?: string;

  address: string;
  voivodeship: VoivodeshipCode;
  city?: string;
  gps: { lat: number; lng: number };
  roadType: RoadType;

  size: { widthCm: number; heightCm: number };
  heightFromGroundCm: number;
  distanceFromRoadM: number;

  expositionType: ExpositionType;
  illuminated: boolean;
  requiresLift: boolean;
  description: string;

  photos: string[];
  locationTags: string[];
  nearbyPoi: string[];
  featured: boolean;

  pricing: MediaPricing;

  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

interface MediaRow extends RowDataPacket {
  id: string;
  code: string;
  owner_id: string;
  status: MediaStatus;
  rejection_reason: string | null;
  address: string;
  voivodeship: VoivodeshipCode;
  city: string | null;
  gps_lat: number;
  gps_lng: number;
  road_type: RoadType;
  size_width_cm: number;
  size_height_cm: number;
  height_from_ground_cm: number;
  distance_from_road_m: number;
  exposition_type: ExpositionType;
  illuminated: number;
  requires_lift: number;
  description: string;
  featured: number;
  price_month1: number | null;
  price_month3: number | null;
  price_month6: number | null;
  price_month12: number | null;
  price_print: number | null;
  price_install: number | null;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
}

interface PhotoRow extends RowDataPacket {
  photo_url: string;
}

interface TagRow extends RowDataPacket {
  tag: string;
}

interface PoiRow extends RowDataPacket {
  name: string;
}

function rowToMedia(
  row: MediaRow,
  photos: string[],
  locationTags: string[],
  nearbyPoi: string[]
): Media {
  return {
    id: row.id,
    code: row.code,
    ownerId: row.owner_id,
    status: row.status,
    rejectionReason: row.rejection_reason ?? undefined,

    address: row.address,
    voivodeship: row.voivodeship,
    city: row.city ?? undefined,
    gps: { lat: Number(row.gps_lat), lng: Number(row.gps_lng) },
    roadType: row.road_type,

    size: { widthCm: row.size_width_cm, heightCm: row.size_height_cm },
    heightFromGroundCm: row.height_from_ground_cm,
    distanceFromRoadM: row.distance_from_road_m,

    expositionType: row.exposition_type,
    illuminated: Boolean(row.illuminated),
    requiresLift: Boolean(row.requires_lift),
    description: row.description,

    photos,
    locationTags,
    nearbyPoi,
    featured: Boolean(row.featured),

    pricing: {
      month1: row.price_month1 != null ? Number(row.price_month1) : undefined,
      month3: row.price_month3 != null ? Number(row.price_month3) : undefined,
      month6: row.price_month6 != null ? Number(row.price_month6) : undefined,
      month12: row.price_month12 != null ? Number(row.price_month12) : undefined,
      printCost: row.price_print != null ? Number(row.price_print) : undefined,
      installCost: row.price_install != null ? Number(row.price_install) : undefined,
    },

    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    publishedAt: row.published_at?.toISOString() ?? undefined,
  };
}

async function loadRelated(mediaIds: string[]): Promise<{
  photosMap: Map<string, string[]>;
  tagsMap: Map<string, string[]>;
  poiMap: Map<string, string[]>;
}> {
  const photosMap = new Map<string, string[]>();
  const tagsMap = new Map<string, string[]>();
  const poiMap = new Map<string, string[]>();

  if (mediaIds.length === 0) return { photosMap, tagsMap, poiMap };

  const placeholders = mediaIds.map(() => "?").join(", ");


  const [photoRows] = await db.query<(PhotoRow & { media_id: string })[]>(
    `SELECT media_id, photo_url FROM media_photos
     WHERE media_id IN (${placeholders}) ORDER BY sort_order`,
    mediaIds
  );
  for (const r of photoRows) {
    const arr = photosMap.get(r.media_id) ?? [];
    arr.push(r.photo_url);
    photosMap.set(r.media_id, arr);
  }


  const [tagRows] = await db.query<(TagRow & { media_id: string })[]>(
    `SELECT media_id, tag FROM media_location_tags
     WHERE media_id IN (${placeholders})`,
    mediaIds
  );
  for (const r of tagRows) {
    const arr = tagsMap.get(r.media_id) ?? [];
    arr.push(r.tag);
    tagsMap.set(r.media_id, arr);
  }

  const [poiRows] = await db.query<(PoiRow & { media_id: string })[]>(
    `SELECT mp.media_id, pc.name
     FROM media_nearby_poi mp
     JOIN poi_categories pc ON pc.id = mp.poi_category_id
     WHERE mp.media_id IN (${placeholders})`,
    mediaIds
  );
  for (const r of poiRows) {
    const arr = poiMap.get(r.media_id) ?? [];
    arr.push(r.name);
    poiMap.set(r.media_id, arr);
  }

  return { photosMap, tagsMap, poiMap };
}

async function loadSingle(mediaId: string): Promise<{
  photos: string[];
  locationTags: string[];
  nearbyPoi: string[];
}> {
  const { photosMap, tagsMap, poiMap } = await loadRelated([mediaId]);
  return {
    photos: photosMap.get(mediaId) ?? [],
    locationTags: tagsMap.get(mediaId) ?? [],
    nearbyPoi: poiMap.get(mediaId) ?? [],
  };
}

function cleanPricing(raw: Record<string, unknown>): MediaPricing {
  const out: MediaPricing = {};
  for (const key of [
    "month1",
    "month3",
    "month6",
    "month12",
    "printCost",
    "installCost",
  ] as const) {
    const v = raw[key];
    if (v !== undefined && v !== "" && v !== null) {
      out[key] = Number(v);
    }
  }
  return out;
}

async function savePhotos(
  conn: mysql.PoolConnection,
  mediaId: string,
  photos: string[]
) {
  if (photos.length === 0) return;
  const values = photos.map((url, i) => [mediaId, url, i]);
  await conn.query(
    "INSERT INTO media_photos (media_id, photo_url, sort_order) VALUES ?",
    [values]
  );
}

async function saveTags(
  conn: mysql.PoolConnection,
  mediaId: string,
  tags: string[]
) {
  if (tags.length === 0) return;
  const values = tags.map((t) => [mediaId, t]);
  await conn.query(
    "INSERT INTO media_location_tags (media_id, tag) VALUES ?",
    [values]
  );
}

async function savePoi(
  conn: mysql.PoolConnection,
  mediaId: string,
  poiNames: string[]
) {
  if (poiNames.length === 0) return;

  await poiCategoriesRepo.ensureAll(poiNames);

  const idMap = await poiCategoriesRepo.findIdsByNames(poiNames);
  const values: [string, number][] = [];
  for (const name of poiNames) {
    const id = idMap.get(name.trim().toLowerCase());
    if (id) values.push([mediaId, id]);
  }

  if (values.length > 0) {
    await conn.query(
      "INSERT IGNORE INTO media_nearby_poi (media_id, poi_category_id) VALUES ?",
      [values]
    );
  }
}

import type mysql from "mysql2/promise";

export async function listAll(): Promise<Media[]> {
  const [rows] = await db.query<MediaRow[]>("SELECT * FROM media");
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { photosMap, tagsMap, poiMap } = await loadRelated(ids);

  return rows.map((r) =>
    rowToMedia(
      r,
      photosMap.get(r.id) ?? [],
      tagsMap.get(r.id) ?? [],
      poiMap.get(r.id) ?? []
    )
  );
}

export async function findById(id: string): Promise<Media | undefined> {
  const [rows] = await db.query<MediaRow[]>(
    "SELECT * FROM media WHERE id = ?",
    [id]
  );
  if (!rows[0]) return undefined;

  const related = await loadSingle(id);
  return rowToMedia(rows[0], related.photos, related.locationTags, related.nearbyPoi);
}

export async function findByOwner(ownerId: string): Promise<Media[]> {
  const [rows] = await db.query<MediaRow[]>(
    "SELECT * FROM media WHERE owner_id = ?",
    [ownerId]
  );
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { photosMap, tagsMap, poiMap } = await loadRelated(ids);

  return rows.map((r) =>
    rowToMedia(
      r,
      photosMap.get(r.id) ?? [],
      tagsMap.get(r.id) ?? [],
      poiMap.get(r.id) ?? []
    )
  );
}

export async function findPublished(): Promise<Media[]> {
  const [rows] = await db.query<MediaRow[]>(
    "SELECT * FROM media WHERE status = 'published'"
  );
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { photosMap, tagsMap, poiMap } = await loadRelated(ids);

  return rows.map((r) =>
    rowToMedia(
      r,
      photosMap.get(r.id) ?? [],
      tagsMap.get(r.id) ?? [],
      poiMap.get(r.id) ?? []
    )
  );
}

export async function findPublishedByIds(ids: string[]): Promise<Media[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await db.query<MediaRow[]>(
    `SELECT * FROM media WHERE id IN (${placeholders}) AND status = 'published'`,
    ids
  );
  if (rows.length === 0) return [];

  const foundIds = rows.map((r) => r.id);
  const { photosMap, tagsMap, poiMap } = await loadRelated(foundIds);

  return rows.map((r) =>
    rowToMedia(
      r,
      photosMap.get(r.id) ?? [],
      tagsMap.get(r.id) ?? [],
      poiMap.get(r.id) ?? []
    )
  );
}

export async function findByStatus(status: MediaStatus): Promise<Media[]> {
  const [rows] = await db.query<MediaRow[]>(
    "SELECT * FROM media WHERE status = ?",
    [status]
  );
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { photosMap, tagsMap, poiMap } = await loadRelated(ids);

  return rows.map((r) =>
    rowToMedia(
      r,
      photosMap.get(r.id) ?? [],
      tagsMap.get(r.id) ?? [],
      poiMap.get(r.id) ?? []
    )
  );
}

export async function create(
  input: MediaCreateInput,
  ownerId: string,
  photos: string[] = []
): Promise<Media> {
  const id = uuid();
  const now = new Date();
  const pricing = cleanPricing(input.pricing as unknown as Record<string, unknown>);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO media (
        id, code, owner_id, status,
        address, voivodeship, city, gps_lat, gps_lng, road_type,
        size_width_cm, size_height_cm, height_from_ground_cm, distance_from_road_m,
        exposition_type, illuminated, requires_lift, description, featured,
        price_month1, price_month3, price_month6, price_month12, price_print, price_install,
        created_at, updated_at
      ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.code,
        ownerId,
        input.address,
        input.voivodeship,
        input.city || null,
        input.gps.lat,
        input.gps.lng,
        input.roadType,
        input.size.widthCm,
        input.size.heightCm,
        input.heightFromGroundCm,
        input.distanceFromRoadM,
        input.expositionType,
        input.illuminated ? 1 : 0,
        input.requiresLift ? 1 : 0,
        input.description || "",
        pricing.month1 ?? null,
        pricing.month3 ?? null,
        pricing.month6 ?? null,
        pricing.month12 ?? null,
        pricing.printCost ?? null,
        pricing.installCost ?? null,
        now,
        now,
      ]
    );

    await savePhotos(conn, id, photos);
    await saveTags(conn, id, input.locationTags ?? []);
    await savePoi(conn, id, input.nearbyPoi ?? []);

    await conn.commit();
  } catch (err: unknown) {
    await conn.rollback();
    if ((err as { code?: string }).code === "ER_DUP_ENTRY") {
      throw new Error(`Nośnik o kodzie "${input.code}" już istnieje`);
    }
    throw err;
  } finally {
    conn.release();
  }

  const media: Media = {
    id,
    code: input.code,
    ownerId,
    status: "pending",
    address: input.address,
    voivodeship: input.voivodeship,
    city: input.city || undefined,
    gps: input.gps,
    roadType: input.roadType,
    size: input.size,
    heightFromGroundCm: input.heightFromGroundCm,
    distanceFromRoadM: input.distanceFromRoadM,
    expositionType: input.expositionType,
    illuminated: input.illuminated,
    requiresLift: input.requiresLift,
    description: input.description || "",
    photos,
    locationTags: input.locationTags ?? [],
    nearbyPoi: input.nearbyPoi ?? [],
    featured: false,
    pricing,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  return media;
}

export async function update(
  id: string,
  patch: Partial<MediaCreateInput> & { photos?: string[] },
  requesterId: string,
  isAdmin: boolean
): Promise<Media | undefined> {
  const existing = await findById(id);
  if (!existing) return undefined;

  // Permission check
  if (!isAdmin) {
    if (existing.ownerId !== requesterId) return undefined;
    if (existing.status !== "pending" && existing.status !== "rejected") {
      throw new Error("Edycja możliwa tylko dla nośników oczekujących lub odrzuconych");
    }
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const sets: string[] = [];
    const params: unknown[] = [];

    if (patch.code !== undefined && patch.code !== existing.code) {
      sets.push("code = ?");
      params.push(patch.code);
    }
    if (patch.address !== undefined) { sets.push("address = ?"); params.push(patch.address); }
    if (patch.voivodeship !== undefined) { sets.push("voivodeship = ?"); params.push(patch.voivodeship); }
    if (patch.city !== undefined) { sets.push("city = ?"); params.push(patch.city || null); }
    if (patch.gps !== undefined) {
      sets.push("gps_lat = ?", "gps_lng = ?");
      params.push(patch.gps.lat, patch.gps.lng);
    }
    if (patch.roadType !== undefined) { sets.push("road_type = ?"); params.push(patch.roadType); }
    if (patch.size !== undefined) {
      sets.push("size_width_cm = ?", "size_height_cm = ?");
      params.push(patch.size.widthCm, patch.size.heightCm);
    }
    if (patch.heightFromGroundCm !== undefined) { sets.push("height_from_ground_cm = ?"); params.push(patch.heightFromGroundCm); }
    if (patch.distanceFromRoadM !== undefined) { sets.push("distance_from_road_m = ?"); params.push(patch.distanceFromRoadM); }
    if (patch.expositionType !== undefined) { sets.push("exposition_type = ?"); params.push(patch.expositionType); }
    if (patch.illuminated !== undefined) { sets.push("illuminated = ?"); params.push(patch.illuminated ? 1 : 0); }
    if (patch.requiresLift !== undefined) { sets.push("requires_lift = ?"); params.push(patch.requiresLift ? 1 : 0); }
    if (patch.description !== undefined) { sets.push("description = ?"); params.push(patch.description || ""); }

    if (patch.pricing !== undefined) {
      const pricing = cleanPricing(patch.pricing as unknown as Record<string, unknown>);
      sets.push("price_month1 = ?", "price_month3 = ?", "price_month6 = ?", "price_month12 = ?", "price_print = ?", "price_install = ?");
      params.push(
        pricing.month1 ?? null, pricing.month3 ?? null,
        pricing.month6 ?? null, pricing.month12 ?? null,
        pricing.printCost ?? null, pricing.installCost ?? null
      );
    }

    if (!isAdmin && existing.status === "rejected") {
      sets.push("status = 'pending'", "rejection_reason = NULL");
    }

    if (sets.length > 0) {
      sets.push("updated_at = NOW()");
      params.push(id);
      await conn.query(
        `UPDATE media SET ${sets.join(", ")} WHERE id = ?`,
        params
      );
    }

    if (patch.photos !== undefined) {
      await conn.query("DELETE FROM media_photos WHERE media_id = ?", [id]);
      await savePhotos(conn, id, patch.photos);
    }

    if (patch.locationTags !== undefined) {
      await conn.query("DELETE FROM media_location_tags WHERE media_id = ?", [id]);
      await saveTags(conn, id, patch.locationTags ?? []);
    }

    if ((patch as { nearbyPoi?: string[] }).nearbyPoi !== undefined) {
      await conn.query("DELETE FROM media_nearby_poi WHERE media_id = ?", [id]);
      await savePoi(conn, id, (patch as { nearbyPoi?: string[] }).nearbyPoi ?? []);
    }

    await conn.commit();
  } catch (err: unknown) {
    await conn.rollback();
    if ((err as { code?: string }).code === "ER_DUP_ENTRY") {
      throw new Error(`Nośnik o kodzie "${patch.code}" już istnieje`);
    }
    throw err;
  } finally {
    conn.release();
  }

  return findById(id);
}

export async function setStatus(
  id: string,
  status: MediaStatus,
  rejectionReason?: string
): Promise<Media | undefined> {
  const sets = ["status = ?", "updated_at = NOW()"];
  const params: unknown[] = [status];

  if (status === "published") {
    sets.push("published_at = NOW()", "rejection_reason = NULL");
  }
  if (status === "rejected" && rejectionReason) {
    sets.push("rejection_reason = ?");
    params.push(rejectionReason);
  }

  params.push(id);
  const [result] = await db.query<ResultSetHeader>(
    `UPDATE media SET ${sets.join(", ")} WHERE id = ?`,
    params
  );

  if (result.affectedRows === 0) return undefined;
  return findById(id);
}

export async function remove(
  id: string,
  requesterId: string,
  isAdmin: boolean
): Promise<boolean> {
  const existing = await findById(id);
  if (!existing) return false;

  if (!isAdmin) {
    if (existing.ownerId !== requesterId) return false;
    if (existing.status !== "pending") return false;
  }

  const [result] = await db.query<ResultSetHeader>(
    "DELETE FROM media WHERE id = ?",
    [id]
  );
  return result.affectedRows > 0;
}
