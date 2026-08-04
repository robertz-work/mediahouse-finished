/**
 * Storage abstraction.
 *
 * Any code that uploads, deletes, or references an uploaded file MUST go
 * through this interface. The concrete driver is selected at runtime in
 * `lib/storage/index.ts` based on the `STORAGE_DRIVER` env variable.
 */

export interface UploadInput {
  /** Raw file bytes. API routes should convert `File`/`Blob` to Buffer. */
  data: Buffer | Uint8Array;
  /** Original filename from the client — will be sanitized before use. */
  filename: string;
  /** MIME type, e.g. `image/jpeg`. Must pass validation before reaching storage. */
  contentType: string;
}

export interface UploadResult {
  /**
   * Backend-specific identifier used to delete or resolve the file later.
   * For LocalStorage this is the relative path below `public/uploads/`.
   */
  key: string;
  /** Publicly reachable URL (possibly relative) that the browser can use. */
  url: string;
}

export interface Storage {
  /**
   * Persist `input` under `pathHint` (e.g. `media/<mediaId>`) and return the
   * stable key + public URL.
   */
  upload(input: UploadInput, pathHint: string): Promise<UploadResult>;

  /** Remove a previously uploaded file. Silent no-op if it does not exist. */
  delete(key: string): Promise<void>;

  /** Resolve a key to a public URL. Useful when URLs expire (e.g. S3 presigned). */
  getUrl(key: string): string;
}
