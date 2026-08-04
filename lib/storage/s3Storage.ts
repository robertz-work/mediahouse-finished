/**
 * S3-compatible storage driver for Cloudflare R2 (and any S3 endpoint).
 *
 * Required env vars:
 *   S3_ENDPOINT        – e.g. https://<ACCOUNT_ID>.r2.cloudflarestorage.com
 *   S3_ACCESS_KEY_ID   – R2 API token access key
 *   S3_SECRET_ACCESS_KEY – R2 API token secret key
 *   S3_BUCKET          – bucket name, e.g. "mediahouse"
 *   S3_PUBLIC_URL      – public URL prefix for the bucket,
 *                        e.g. https://cdn.mediahouse.pl  or
 *                        https://pub-<hash>.r2.dev
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import type { Storage, UploadInput, UploadResult } from "./storage";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env variable: ${name}`);
  return val;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").slice(0, 100) || "file";
}

function sanitizePathHint(hint: string): string {
  if (hint.includes("..")) throw new Error(`Invalid pathHint: ${hint}`);
  return hint.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;
  client = new S3Client({
    region: "auto",
    endpoint: requireEnv("S3_ENDPOINT"),
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

export class S3Storage implements Storage {
  private bucket = requireEnv("S3_BUCKET");
  private publicUrl = requireEnv("S3_PUBLIC_URL").replace(/\/+$/, "");

  async upload(input: UploadInput, pathHint: string): Promise<UploadResult> {
    const hint = sanitizePathHint(pathHint);
    const filename = sanitizeFilename(input.filename);
    const key = `${hint}/${randomUUID()}-${filename}`;

    await getClient().send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.data,
        ContentType: input.contentType,
      })
    );

    return { key, url: this.getUrl(key) };
  }

  async delete(key: string): Promise<void> {
    const safeKey = sanitizePathHint(key);
    try {
      await getClient().send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: safeKey,
        })
      );
    } catch {
    }
  }

  getUrl(key: string): string {
    const safeKey = sanitizePathHint(key);
    return `${this.publicUrl}/${safeKey}`;
  }
}
