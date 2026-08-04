/**
 * GET /api/media/published — public endpoint returning only published media.
 * No authentication required. Supports filtering via query params.
 */

import { NextResponse } from "next/server";
import * as mediaRepo from "@/lib/db/mediaRepo";

export async function GET(request: Request) {
  const url = new URL(request.url);

  let items = await mediaRepo.findPublished();


  const voivodeships = url.searchParams.getAll("voivodeship");
  if (voivodeships.length > 0) {
    items = items.filter((m) => voivodeships.includes(m.voivodeship));
  }

  const expositionType = url.searchParams.get("expositionType");
  if (expositionType) {
    items = items.filter((m) => m.expositionType === expositionType);
  }

  const illuminated = url.searchParams.get("illuminated");
  if (illuminated === "true") items = items.filter((m) => m.illuminated);
  if (illuminated === "false") items = items.filter((m) => !m.illuminated);

  const roadTypes = url.searchParams.getAll("roadType");
  if (roadTypes.length > 0) {
    items = items.filter((m) => roadTypes.includes(m.roadType));
  }

  const sizeMinW = url.searchParams.get("sizeMinW");
  if (sizeMinW) items = items.filter((m) => m.size.widthCm >= Number(sizeMinW));
  const sizeMaxW = url.searchParams.get("sizeMaxW");
  if (sizeMaxW) items = items.filter((m) => m.size.widthCm <= Number(sizeMaxW));
  const sizeMinH = url.searchParams.get("sizeMinH");
  if (sizeMinH) items = items.filter((m) => m.size.heightCm >= Number(sizeMinH));
  const sizeMaxH = url.searchParams.get("sizeMaxH");
  if (sizeMaxH) items = items.filter((m) => m.size.heightCm <= Number(sizeMaxH));

  const priceMin = url.searchParams.get("priceMin");
  const priceMax = url.searchParams.get("priceMax");
  if (priceMin || priceMax) {
    const min = priceMin ? Number(priceMin) : 0;
    const max = priceMax ? Number(priceMax) : Infinity;
    items = items.filter((m) => {
      const cheapest = Math.min(
        ...[m.pricing.month1, m.pricing.month3, m.pricing.month6, m.pricing.month12]
          .filter((v): v is number => v !== undefined)
      );
      return cheapest >= min && cheapest <= max;
    });
  }

  const nearbyPoi = url.searchParams.getAll("nearbyPoi");
  if (nearbyPoi.length > 0) {
    items = items.filter(
      (m) => m.nearbyPoi && m.nearbyPoi.some((p) => nearbyPoi.includes(p))
    );
  }

  const search = url.searchParams.get("q");
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (m) =>
        m.code.toLowerCase().includes(q) ||
        m.address.toLowerCase().includes(q) ||
        (m.city && m.city.toLowerCase().includes(q)) ||
        m.locationTags.some((t) => t.toLowerCase().includes(q))
    );
  }

  items.sort(
    (a, b) =>
      new Date(b.publishedAt || b.createdAt).getTime() -
      new Date(a.publishedAt || a.createdAt).getTime()
  );

  return NextResponse.json(items);
}
