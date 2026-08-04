/**
 * GET /api/public/media — list published media (no auth required).
 * Used by: homepage, catalog, map, campaign builder.
 *
 * Query params (all optional):
 *   voivodeship   — filter by voivodeship code (comma-separated for multi)
 *   expositionType — "baner" | "plakat"
 *   illuminated   — "true" | "false"
 *   roadType      — filter by road type
 *   minPrice      — min price for month1
 *   maxPrice      — max price for month1
 *   minWidth      — min width in cm
 *   maxWidth      — max width in cm
 *   featured      — "true" to get only featured items
 *   q             — text search in code, address, city, description
 */

import { NextResponse } from "next/server";
import { findPublished } from "@/lib/db/mediaRepo";
import type { Media } from "@/lib/db/mediaRepo";

export async function GET(request: Request) {
  const url = new URL(request.url);
  let items = await findPublished();

  const voivodeships = url.searchParams.get("voivodeship");
  if (voivodeships) {
    const set = new Set(voivodeships.split(","));
    items = items.filter((m) => set.has(m.voivodeship));
  }

  const expo = url.searchParams.get("expositionType");
  if (expo) {
    items = items.filter((m) => m.expositionType === expo);
  }

  const illum = url.searchParams.get("illuminated");
  if (illum === "true") items = items.filter((m) => m.illuminated);
  if (illum === "false") items = items.filter((m) => !m.illuminated);


  const road = url.searchParams.get("roadType");
  if (road) {
    items = items.filter((m) => m.roadType === road);
  }


  const minP = parseFloat(url.searchParams.get("minPrice") ?? "");
  const maxP = parseFloat(url.searchParams.get("maxPrice") ?? "");
  if (!isNaN(minP)) {
    items = items.filter((m) => (m.pricing.month1 ?? 0) >= minP);
  }
  if (!isNaN(maxP)) {
    items = items.filter((m) => (m.pricing.month1 ?? Infinity) <= maxP);
  }


  const minW = parseInt(url.searchParams.get("minWidth") ?? "");
  const maxW = parseInt(url.searchParams.get("maxWidth") ?? "");
  if (!isNaN(minW)) {
    items = items.filter((m) => m.size.widthCm >= minW);
  }
  if (!isNaN(maxW)) {
    items = items.filter((m) => m.size.widthCm <= maxW);
  }


  if (url.searchParams.get("featured") === "true") {
    items = items.filter((m) => m.featured);
  }

  const q = url.searchParams.get("q")?.toLowerCase();
  if (q) {
    items = items.filter(
      (m) =>
        m.code.toLowerCase().includes(q) ||
        m.address.toLowerCase().includes(q) ||
        (m.city ?? "").toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.locationTags.some((t) => t.toLowerCase().includes(q))
    );
  }

  items.sort(
    (a, b) =>
      new Date(b.publishedAt ?? b.createdAt).getTime() -
      new Date(a.publishedAt ?? a.createdAt).getTime()
  );

  return NextResponse.json(items);
}
