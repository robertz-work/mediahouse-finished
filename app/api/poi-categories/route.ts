import { NextResponse } from "next/server";
import * as poiCategoriesRepo from "@/lib/db/poiCategoriesRepo";

/** GET — public list of all POI categories (sorted). */
export async function GET() {
  const categories = await poiCategoriesRepo.listAll();
  return NextResponse.json(categories);
}

/** POST — add a new category. Body: `{ name: string }`. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "Nazwa kategorii jest wymagana" },
        { status: 400 }
      );
    }

    const updated = await poiCategoriesRepo.add(name);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "B\u0142\u0105d serwera" }, { status: 500 });
  }
}
