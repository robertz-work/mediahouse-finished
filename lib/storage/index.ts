import { S3Storage } from "./s3Storage";
import type { Storage } from "./storage";

export type { Storage, UploadInput, UploadResult } from "./storage";

let instance: Storage | null = null;

export function getStorage(): Storage {
  if (instance) return instance;

  const driver = (process.env.STORAGE_DRIVER ?? "s3").toLowerCase();

  switch (driver) {
    case "s3":
    case "r2":
      instance = new S3Storage();
      break;

    default:
      throw new Error(
        `Unknown STORAGE_DRIVER "${driver}". Expected: s3 | r2`
      );
  }

  return instance;
}
