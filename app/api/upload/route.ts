/**
 * POST /api/upload — multipart file upload.
 *
 * Accepts FormData with field `files` (one or more images).
 * Query param `mediaId` is used as the storage path hint.
 *
 * Returns: { urls: string[], keys: string[] }
 *
 * Auth: must be logged in as representative or admin.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStorage } from "@/lib/storage";
import { detectImage } from "@/lib/storage/detectImage";
import {
  MAX_PHOTOS_PER_MEDIA,
  MAX_UPLOAD_BYTES,
} from "@/lib/constants";

export async function POST(request: Request) {
  // Auth check
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "representative" && session.user.role !== "admin")
  ) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const mediaId =
      new URL(request.url).searchParams.get("mediaId") ?? "temp";

    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Nie przesłano plików" },
        { status: 400 }
      );
    }

    if (files.length > MAX_PHOTOS_PER_MEDIA) {
      return NextResponse.json(
        { error: `Maksymalnie ${MAX_PHOTOS_PER_MEDIA} zdjęć` },
        { status: 400 }
      );
    }

    const storage = getStorage();
    const urls: string[] = [];
    const keys: string[] = [];

    for (const file of files) {
      // Validate size
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: `Plik "${file.name}" przekracza limit ${MAX_UPLOAD_BYTES / 1024 / 1024} MB` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      const detected = detectImage(buffer);
      if (!detected) {
        return NextResponse.json(
          { error: `Niedozwolony lub uszkodzony plik: "${file.name}". Dozwolone: JPG, PNG, WEBP.` },
          { status: 400 }
        );
      }

      const safeFilename = `image.${detected.ext}`;
      const result = await storage.upload(
        { data: buffer, filename: safeFilename, contentType: detected.mime },
        `media/${mediaId}`
      );
      urls.push(result.url);
      keys.push(result.key);
    }

    return NextResponse.json({ urls, keys }, { status: 201 });
  } catch (err) {
    console.error("[upload] Error:", err);
    return NextResponse.json({ error: "Błąd uploadu" }, { status: 500 });
  }
}
