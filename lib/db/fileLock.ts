/**
 * Thin wrapper around `proper-lockfile` to serialize reads/writes on a JSON
 * file. Every repository that mutates a file in `data/` must go through
 * `withLock` to avoid interleaved writes corrupting the JSON.
 *
 * Usage:
 *   await withLock(usersPath, async () => {
 *     const users = await readJson<User[]>(usersPath);
 *     users.push(newUser);
 *     await writeJson(usersPath, users);
 *   });
 */

import fs from "fs/promises";
import path from "path";
import lockfile from "proper-lockfile";

const LOCK_OPTIONS: lockfile.LockOptions = {
  retries: {
    retries: 10,
    minTimeout: 50,
    maxTimeout: 500,
    factor: 1.5,
  },
  stale: 10_000, // 10 s — auto-release if a process dies mid-write
};

/**
 * Acquire an exclusive lock on the file at `filePath`, run `fn`, and release
 * the lock even if `fn` throws. `proper-lockfile` requires that the target
 * file already exists, so we `touch` it beforehand.
 */
export async function withLock<T>(
  filePath: string,
  fn: () => Promise<T>
): Promise<T> {
  await ensureFileExists(filePath);
  const release = await lockfile.lock(filePath, LOCK_OPTIONS);
  try {
    return await fn();
  } finally {
    await release();
  }
}

/**
 * Read and parse a JSON file. Returns the parsed value typed as `T`.
 * Throws on parse errors so the caller can decide how to recover.
 */
export async function readJson<T>(filePath: string): Promise<T> {
  await ensureFileExists(filePath);
  const raw = await fs.readFile(filePath, "utf-8");
  if (raw.trim() === "") {
    // proper-lockfile can leave the file empty on a brand-new touch;
    // treat an empty file as "no data yet" and return an empty array.
    return [] as unknown as T;
  }
  return JSON.parse(raw) as T;
}

/**
 * Write `value` as pretty-printed JSON to `filePath`. Creates parent dirs if
 * needed. Does NOT acquire a lock — always call inside `withLock`.
 */
export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const json = JSON.stringify(value, null, 2);
  await fs.writeFile(filePath, json, "utf-8");
}

/** Create an empty file (and its parents) if it does not exist. */
async function ensureFileExists(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "", "utf-8");
  }
}

/** Convenience: absolute path to `data/<name>` from the project root. */
export function dataPath(name: string): string {
  return path.join(process.cwd(), "data", name);
}
