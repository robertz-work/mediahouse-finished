/**
 * Payments repository — tracks online payment transactions (Przelewy24, PayU).
 * Table: payments (see database/add_payments.sql)
 */

import { v4 as uuid } from "uuid";
import db, { type RowDataPacket, type ResultSetHeader } from "./mysql";
import type { PaymentStatus } from "../constants";

export interface Payment {
  id: string;
  campaignId: string;
  provider: "p24" | "payu";
  externalId?: string;
  sessionId?: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  createdAt: string;
  paidAt?: string;
}

interface PaymentRow extends RowDataPacket {
  id: string;
  campaign_id: string;
  provider: "p24" | "payu";
  external_id: string | null;
  session_id: string | null;
  status: PaymentStatus;
  amount: number;
  currency: string;
  created_at: Date;
  paid_at: Date | null;
}

function rowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    provider: row.provider,
    externalId: row.external_id ?? undefined,
    sessionId: row.session_id ?? undefined,
    status: row.status,
    amount: Number(row.amount),
    currency: row.currency,
    createdAt: row.created_at.toISOString(),
    paidAt: row.paid_at?.toISOString() ?? undefined,
  };
}

export interface CreatePaymentInput {
  campaignId: string;
  provider: "p24" | "payu";
  amount: number;
  currency?: string;
  sessionId?: string;
  externalId?: string;
}

export async function create(input: CreatePaymentInput): Promise<Payment> {
  const id = uuid();
  const now = new Date();

  await db.query(
    `INSERT INTO payments (id, campaign_id, provider, external_id, session_id, status, amount, currency, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [
      id,
      input.campaignId,
      input.provider,
      input.externalId ?? null,
      input.sessionId ?? null,
      input.amount,
      input.currency ?? "PLN",
      now,
    ]
  );

  return {
    id,
    campaignId: input.campaignId,
    provider: input.provider,
    externalId: input.externalId,
    sessionId: input.sessionId,
    status: "pending",
    amount: input.amount,
    currency: input.currency ?? "PLN",
    createdAt: now.toISOString(),
  };
}

export async function findById(id: string): Promise<Payment | undefined> {
  const [rows] = await db.query<PaymentRow[]>(
    "SELECT * FROM payments WHERE id = ?",
    [id]
  );
  return rows[0] ? rowToPayment(rows[0]) : undefined;
}

export async function findByCampaignId(campaignId: string): Promise<Payment[]> {
  const [rows] = await db.query<PaymentRow[]>(
    "SELECT * FROM payments WHERE campaign_id = ? ORDER BY created_at DESC",
    [campaignId]
  );
  return rows.map(rowToPayment);
}

export async function findBySessionId(sessionId: string): Promise<Payment | undefined> {
  const [rows] = await db.query<PaymentRow[]>(
    "SELECT * FROM payments WHERE session_id = ? LIMIT 1",
    [sessionId]
  );
  return rows[0] ? rowToPayment(rows[0]) : undefined;
}

export async function findByExternalId(
  provider: "p24" | "payu",
  externalId: string
): Promise<Payment | undefined> {
  const [rows] = await db.query<PaymentRow[]>(
    "SELECT * FROM payments WHERE provider = ? AND external_id = ? LIMIT 1",
    [provider, externalId]
  );
  return rows[0] ? rowToPayment(rows[0]) : undefined;
}

export async function updateStatus(
  id: string,
  status: PaymentStatus,
  extra?: { externalId?: string; paidAt?: string }
): Promise<Payment | undefined> {
  const sets = ["status = ?"];
  const params: unknown[] = [status];

  if (extra?.externalId) {
    sets.push("external_id = ?");
    params.push(extra.externalId);
  }
  if (extra?.paidAt) {
    sets.push("paid_at = ?");
    params.push(new Date(extra.paidAt));
  }

  params.push(id);
  const [result] = await db.query<ResultSetHeader>(
    `UPDATE payments SET ${sets.join(", ")} WHERE id = ?`,
    params
  );

  if (result.affectedRows === 0) return undefined;
  return findById(id);
}
