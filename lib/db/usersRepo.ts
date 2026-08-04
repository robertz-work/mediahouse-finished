/**
 * Users repository — CRUD over MySQL `users` table.
 * Migrated from data/users.json.
 *
 * Public interface unchanged — all functions return the same types.
 */

import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import db, { type RowDataPacket, type ResultSetHeader } from "./mysql";
import type { Role } from "../constants";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  name: string;
  phone?: string;
  company?: string;
  nip?: string;
  createdAt: string; // ISOString
  emailPreferences?: Record<string, boolean>;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role?: Role;
  phone?: string;
  company?: string;
  nip?: string;
}

const BCRYPT_ROUNDS = 10;

interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  password_hash: string;
  role: Role;
  name: string;
  phone: string | null;
  company: string | null;
  nip: string | null;
  email_preferences: Record<string, boolean> | null;
  created_at: Date;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    name: row.name,
    phone: row.phone ?? undefined,
    company: row.company ?? undefined,
    nip: row.nip ?? undefined,
    createdAt: row.created_at.toISOString(),
    emailPreferences: row.email_preferences ?? undefined,
  };
}

export async function listAll(): Promise<User[]> {
  const [rows] = await db.query<UserRow[]>("SELECT * FROM users");
  return rows.map(rowToUser);
}

export async function findById(id: string): Promise<User | undefined> {
  const [rows] = await db.query<UserRow[]>(
    "SELECT * FROM users WHERE id = ?",
    [id]
  );
  return rows[0] ? rowToUser(rows[0]) : undefined;
}

export async function findByEmail(email: string): Promise<User | undefined> {
  const [rows] = await db.query<UserRow[]>(
    "SELECT * FROM users WHERE email = ?",
    [email.toLowerCase().trim()]
  );
  return rows[0] ? rowToUser(rows[0]) : undefined;
}

export async function create(input: CreateUserInput): Promise<User> {
  const email = input.email.toLowerCase().trim();
  const id = uuid();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const now = new Date();

  try {
    await db.query(
      `INSERT INTO users (id, email, password_hash, role, name, phone, company, nip, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        email,
        passwordHash,
        input.role ?? "client",
        input.name.trim(),
        input.phone?.trim() || null,
        input.company?.trim() || null,
        input.nip?.trim() || null,
        now,
      ]
    );
  } catch (err: unknown) {
    // MySQL duplicate entry error code
    if ((err as { code?: string }).code === "ER_DUP_ENTRY") {
      throw new Error(`User with email "${email}" already exists`);
    }
    throw err;
  }

  return {
    id,
    email,
    passwordHash,
    role: input.role ?? "client",
    name: input.name.trim(),
    phone: input.phone?.trim() || undefined,
    company: input.company?.trim() || undefined,
    nip: input.nip?.trim() || undefined,
    createdAt: now.toISOString(),
  };
}

export async function updateRole(
  id: string,
  role: Role
): Promise<User | undefined> {
  const [result] = await db.query<ResultSetHeader>(
    "UPDATE users SET role = ? WHERE id = ?",
    [role, id]
  );
  if (result.affectedRows === 0) return undefined;
  return findById(id);
}

export async function updateEmailPreferences(
  id: string,
  prefs: Record<string, boolean>
): Promise<User | undefined> {

  const user = await findById(id);
  if (!user) return undefined;

  const merged = { ...user.emailPreferences, ...prefs };

  await db.query(
    "UPDATE users SET email_preferences = ? WHERE id = ?",
    [JSON.stringify(merged), id]
  );

  return { ...user, emailPreferences: merged };
}

export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
