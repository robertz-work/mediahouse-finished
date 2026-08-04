/**
 * Campaigns repository — CRUD over MySQL.
 * Migrated from data/campaigns.json.
 *
 * Campaign items are stored in a separate `campaign_items` table.
 * Billing and totals are flattened into campaigns columns.
 * Writes use transactions.
 */

import { v4 as uuid } from "uuid";
import db, { type RowDataPacket, type ResultSetHeader } from "./mysql";
import * as notificationsRepo from "./notificationsRepo";
import type { CampaignStatus, PeriodDays, PaymentMethod } from "../constants";
import type { PriceSnapshot } from "../pricing";

const STATUS_LABELS_PL: Record<CampaignStatus, string> = {
  draft: "Szkic",
  pending_approval: "Oczekuje na akceptację",
  awaiting_payment: "Oczekuje na płatność",
  paid: "Opłacona",
  active: "Aktywna",
  completed: "Zakończona",
  cancelled: "Anulowana",
  rejected: "Odrzucona",
};

export interface CampaignItem {
  id: string;
  mediaId: string;
  periodDays: PeriodDays;
  startDate: string;
  endDate: string;
  addPrint: boolean;
  addInstall: boolean;
  priceSnapshot: PriceSnapshot;
  holdId?: string;
}

export interface CampaignBilling {
  name: string;
  address: string;
  nip?: string;
  email: string;
}

export interface CampaignTotals {
  mediaSubtotal: number;
  printSubtotal: number;
  installSubtotal: number;
  grandTotal: number;
}

export interface Campaign {
  id: string;
  clientId: string;
  name?: string;
  status: CampaignStatus;
  paymentMethod?: PaymentMethod;
  invoiceUrl?: string;
  invoiceNumber?: string;
  items: CampaignItem[];
  billing: CampaignBilling;
  totals: CampaignTotals;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

interface CampaignRow extends RowDataPacket {
  id: string;
  client_id: string;
  name: string | null;
  status: CampaignStatus;
  billing_name: string | null;
  billing_address: string | null;
  billing_nip: string | null;
  billing_email: string | null;
  payment_method: PaymentMethod | null;
  invoice_url: string | null;
  invoice_number: string | null;
  total_media: number;
  total_print: number;
  total_install: number;
  total_grand: number;
  created_at: Date;
  updated_at: Date;
  paid_at: Date | null;
}

interface ItemRow extends RowDataPacket {
  id: string;
  campaign_id: string;
  media_id: string;
  period_days: number;
  start_date: string | Date;
  end_date: string | Date;
  add_print: number;
  add_install: number;
  snap_media: number;
  snap_print: number;
  snap_install: number;
  snap_total: number;
  hold_id: string | null;
}

function rowToCampaign(row: CampaignRow, items: CampaignItem[]): Campaign {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name ?? undefined,
    status: row.status,
    paymentMethod: row.payment_method ?? undefined,
    invoiceUrl: row.invoice_url ?? undefined,
    invoiceNumber: row.invoice_number ?? undefined,
    items,
    billing: {
      name: row.billing_name ?? "",
      address: row.billing_address ?? "",
      nip: row.billing_nip ?? undefined,
      email: row.billing_email ?? "",
    },
    totals: {
      mediaSubtotal: Number(row.total_media),
      printSubtotal: Number(row.total_print),
      installSubtotal: Number(row.total_install),
      grandTotal: Number(row.total_grand),
    },
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    paidAt: row.paid_at?.toISOString() ?? undefined,
  };
}

function rowToItem(row: ItemRow): CampaignItem {
  const startDate =
    row.start_date instanceof Date
      ? row.start_date.toISOString().split("T")[0]
      : String(row.start_date).split("T")[0];
  const endDate =
    row.end_date instanceof Date
      ? row.end_date.toISOString().split("T")[0]
      : String(row.end_date).split("T")[0];

  return {
    id: row.id,
    mediaId: row.media_id,
    periodDays: row.period_days as PeriodDays,
    startDate,
    endDate,
    addPrint: Boolean(row.add_print),
    addInstall: Boolean(row.add_install),
    priceSnapshot: {
      media: Number(row.snap_media),
      print: Number(row.snap_print),
      install: Number(row.snap_install),
      total: Number(row.snap_total),
    },
    holdId: row.hold_id ?? undefined,
  };
}

async function loadItems(campaignIds: string[]): Promise<Map<string, CampaignItem[]>> {
  const map = new Map<string, CampaignItem[]>();
  if (campaignIds.length === 0) return map;

  const placeholders = campaignIds.map(() => "?").join(", ");
  const [rows] = await db.query<ItemRow[]>(
    `SELECT * FROM campaign_items WHERE campaign_id IN (${placeholders})`,
    campaignIds
  );

  for (const row of rows) {
    const arr = map.get(row.campaign_id) ?? [];
    arr.push(rowToItem(row));
    map.set(row.campaign_id, arr);
  }

  return map;
}

async function recalcTotalsSQL(
  conn: import("mysql2/promise").PoolConnection,
  campaignId: string
): Promise<void> {
  await conn.query(
    `UPDATE campaigns SET
       total_media   = (SELECT COALESCE(SUM(snap_media), 0)   FROM campaign_items WHERE campaign_id = ?),
       total_print   = (SELECT COALESCE(SUM(snap_print), 0)   FROM campaign_items WHERE campaign_id = ?),
       total_install = (SELECT COALESCE(SUM(snap_install), 0) FROM campaign_items WHERE campaign_id = ?),
       total_grand   = (SELECT COALESCE(SUM(snap_total), 0)   FROM campaign_items WHERE campaign_id = ?),
       updated_at    = NOW()
     WHERE id = ?`,
    [campaignId, campaignId, campaignId, campaignId, campaignId]
  );
}

export async function listAll(): Promise<Campaign[]> {
  const [rows] = await db.query<CampaignRow[]>("SELECT * FROM campaigns");
  if (rows.length === 0) return [];

  const itemsMap = await loadItems(rows.map((r) => r.id));
  return rows.map((r) => rowToCampaign(r, itemsMap.get(r.id) ?? []));
}

export async function findById(id: string): Promise<Campaign | undefined> {
  const [rows] = await db.query<CampaignRow[]>(
    "SELECT * FROM campaigns WHERE id = ?",
    [id]
  );
  if (!rows[0]) return undefined;

  const itemsMap = await loadItems([id]);
  return rowToCampaign(rows[0], itemsMap.get(id) ?? []);
}

export async function findByClient(clientId: string): Promise<Campaign[]> {
  const [rows] = await db.query<CampaignRow[]>(
    "SELECT * FROM campaigns WHERE client_id = ?",
    [clientId]
  );
  if (rows.length === 0) return [];

  const itemsMap = await loadItems(rows.map((r) => r.id));
  return rows.map((r) => rowToCampaign(r, itemsMap.get(r.id) ?? []));
}

export async function findByStatus(status: CampaignStatus): Promise<Campaign[]> {
  const [rows] = await db.query<CampaignRow[]>(
    "SELECT * FROM campaigns WHERE status = ?",
    [status]
  );
  if (rows.length === 0) return [];

  const itemsMap = await loadItems(rows.map((r) => r.id));
  return rows.map((r) => rowToCampaign(r, itemsMap.get(r.id) ?? []));
}

/**
 * Return the client's existing draft campaign, or undefined if none exists.
 * Read-only — does NOT create a draft (używane przy wejściu do koszyka/
 * podsumowania, żeby samo wejście nie tworzyło pustego szkicu).
 */
export async function findDraft(clientId: string): Promise<Campaign | undefined> {
  const [rows] = await db.query<CampaignRow[]>(
    "SELECT * FROM campaigns WHERE client_id = ? AND status = 'draft' ORDER BY updated_at DESC LIMIT 1",
    [clientId]
  );
  if (!rows[0]) return undefined;

  const itemsMap = await loadItems([rows[0].id]);
  return rowToCampaign(rows[0], itemsMap.get(rows[0].id) ?? []);
}

/**
 * Ustaw wskazany szkic jako „aktywny" (najnowszy) — bump updated_at.
 * Dzięki temu koszyk i podsumowanie (findDraft = najnowszy) pokażą tę kampanię.
 * Owner-only, tylko dla szkicu. Zwraca true jeśli zaktualizowano.
 */
export async function touchDraft(
  campaignId: string,
  clientId: string
): Promise<boolean> {
  const [res] = await db.query<ResultSetHeader>(
    "UPDATE campaigns SET updated_at = NOW() WHERE id = ? AND client_id = ? AND status = 'draft'",
    [campaignId, clientId]
  );
  return res.affectedRows > 0;
}

/** Always create a fresh draft campaign for the client. */
export async function createDraft(clientId: string): Promise<Campaign> {
  const id = uuid();
  const now = new Date();

  await db.query(
    `INSERT INTO campaigns (id, client_id, status, created_at, updated_at)
     VALUES (?, ?, 'draft', ?, ?)`,
    [id, clientId, now, now]
  );

  return {
    id,
    clientId,
    status: "draft",
    items: [],
    billing: { name: "", address: "", email: "" },
    totals: { mediaSubtotal: 0, printSubtotal: 0, installSubtotal: 0, grandTotal: 0 },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/** Find the client's (newest) draft, or create one if none exists. */
export async function getOrCreateDraft(clientId: string): Promise<Campaign> {
  const existing = await findDraft(clientId);
  if (existing) return existing;
  return createDraft(clientId);
}

export async function addItem(
  campaignId: string,
  item: Omit<CampaignItem, "id">
): Promise<{ campaign: Campaign; item: CampaignItem }> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [campaigns] = await conn.query<CampaignRow[]>(
      "SELECT * FROM campaigns WHERE id = ? AND status = 'draft' FOR UPDATE",
      [campaignId]
    );
    if (!campaigns[0]) throw new Error("Kampania nie istnieje");

    const itemId = uuid();
    await conn.query(
      `INSERT INTO campaign_items
        (id, campaign_id, media_id, period_days, start_date, end_date,
         add_print, add_install, snap_media, snap_print, snap_install, snap_total, hold_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemId,
        campaignId,
        item.mediaId,
        item.periodDays,
        item.startDate,
        item.endDate,
        item.addPrint ? 1 : 0,
        item.addInstall ? 1 : 0,
        item.priceSnapshot.media,
        item.priceSnapshot.print,
        item.priceSnapshot.install,
        item.priceSnapshot.total,
        item.holdId ?? null,
      ]
    );

    await recalcTotalsSQL(conn, campaignId);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const campaign = await findById(campaignId);
  if (!campaign) throw new Error("Kampania nie istnieje po dodaniu pozycji");

  const newItem = campaign.items.find((i) => i.mediaId === item.mediaId && i.startDate === item.startDate)!;
  return { campaign, item: newItem };
}

export async function updateItem(
  campaignId: string,
  itemId: string,
  patch: Partial<Pick<CampaignItem, "periodDays" | "startDate" | "endDate" | "addPrint" | "addInstall" | "priceSnapshot" | "holdId">>
): Promise<Campaign | undefined> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [campaigns] = await conn.query<CampaignRow[]>(
      "SELECT id FROM campaigns WHERE id = ? AND status = 'draft' FOR UPDATE",
      [campaignId]
    );
    if (!campaigns[0]) { await conn.rollback(); return undefined; }

    const sets: string[] = [];
    const params: unknown[] = [];

    if (patch.periodDays !== undefined) { sets.push("period_days = ?"); params.push(patch.periodDays); }
    if (patch.startDate !== undefined) { sets.push("start_date = ?"); params.push(patch.startDate); }
    if (patch.endDate !== undefined) { sets.push("end_date = ?"); params.push(patch.endDate); }
    if (patch.addPrint !== undefined) { sets.push("add_print = ?"); params.push(patch.addPrint ? 1 : 0); }
    if (patch.addInstall !== undefined) { sets.push("add_install = ?"); params.push(patch.addInstall ? 1 : 0); }
    if (patch.priceSnapshot !== undefined) {
      sets.push("snap_media = ?", "snap_print = ?", "snap_install = ?", "snap_total = ?");
      params.push(patch.priceSnapshot.media, patch.priceSnapshot.print, patch.priceSnapshot.install, patch.priceSnapshot.total);
    }
    if (patch.holdId !== undefined) { sets.push("hold_id = ?"); params.push(patch.holdId); }

    if (sets.length === 0) { await conn.rollback(); return findById(campaignId); }

    params.push(itemId, campaignId);
    const [result] = await conn.query<ResultSetHeader>(
      `UPDATE campaign_items SET ${sets.join(", ")} WHERE id = ? AND campaign_id = ?`,
      params
    );

    if (result.affectedRows === 0) { await conn.rollback(); return undefined; }

    await recalcTotalsSQL(conn, campaignId);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return findById(campaignId);
}

export async function removeItem(
  campaignId: string,
  itemId: string
): Promise<{ campaign: Campaign; removedItem: CampaignItem } | undefined> {
  // Load the item before deleting (for return value)
  const [itemRows] = await db.query<ItemRow[]>(
    "SELECT * FROM campaign_items WHERE id = ? AND campaign_id = ?",
    [itemId, campaignId]
  );
  if (!itemRows[0]) return undefined;

  const removedItem = rowToItem(itemRows[0]);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [campaigns] = await conn.query<CampaignRow[]>(
      "SELECT id FROM campaigns WHERE id = ? AND status = 'draft' FOR UPDATE",
      [campaignId]
    );
    if (!campaigns[0]) { await conn.rollback(); return undefined; }

    await conn.query(
      "DELETE FROM campaign_items WHERE id = ? AND campaign_id = ?",
      [itemId, campaignId]
    );

    await recalcTotalsSQL(conn, campaignId);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const campaign = await findById(campaignId);
  if (!campaign) return undefined;

  return { campaign, removedItem };
}

export async function setStatus(
  id: string,
  status: CampaignStatus,
  extra?: Partial<Pick<Campaign, "paidAt" | "billing">>
): Promise<Campaign | undefined> {
  const sets = ["status = ?", "updated_at = NOW()"];
  const params: unknown[] = [status];

  if (extra?.paidAt) {
    sets.push("paid_at = ?");
    params.push(new Date(extra.paidAt));
  }
  if (extra?.billing) {
    sets.push("billing_name = ?", "billing_address = ?", "billing_nip = ?", "billing_email = ?");
    params.push(
      extra.billing.name,
      extra.billing.address,
      extra.billing.nip ?? null,
      extra.billing.email
    );
  }

  params.push(id);
  const [result] = await db.query<ResultSetHeader>(
    `UPDATE campaigns SET ${sets.join(", ")} WHERE id = ?`,
    params
  );

  if (result.affectedRows === 0) return undefined;

  const campaign = await findById(id);
  if (campaign && status !== "draft") {
    const statusLabel = STATUS_LABELS_PL[status] ?? status;
    const campaignName = campaign.name || `#${campaign.id.slice(0, 8)}`;
    try {
      await notificationsRepo.create({
        userId: campaign.clientId,
        type: "campaign_status_change",
        title: `Status kampanii: ${statusLabel}`,
        message: `Twoja kampania ${campaignName} zmieniła status na „${statusLabel}".`,
        campaignId: campaign.id,
      });
    } catch (err) {
      console.error("[setStatus] Notification creation failed:", err);
    }
  }

  return campaign;
}

export async function setPaymentMethod(
  id: string,
  paymentMethod: PaymentMethod
): Promise<Campaign | undefined> {
  const [result] = await db.query<ResultSetHeader>(
    `UPDATE campaigns SET payment_method = ?, updated_at = NOW() WHERE id = ?`,
    [paymentMethod, id]
  );
  if (result.affectedRows === 0) return undefined;
  return findById(id);
}

export async function setInvoice(
  id: string,
  invoiceUrl: string,
  invoiceNumber: string
): Promise<Campaign | undefined> {
  const [result] = await db.query<ResultSetHeader>(
    `UPDATE campaigns SET invoice_url = ?, invoice_number = ?, updated_at = NOW() WHERE id = ?`,
    [invoiceUrl, invoiceNumber, id]
  );
  if (result.affectedRows === 0) return undefined;
  return findById(id);
}

export async function updateBilling(
  id: string,
  billing: CampaignBilling
): Promise<Campaign | undefined> {
  const [result] = await db.query<ResultSetHeader>(
    `UPDATE campaigns SET
       billing_name = ?, billing_address = ?, billing_nip = ?, billing_email = ?,
       updated_at = NOW()
     WHERE id = ?`,
    [billing.name, billing.address, billing.nip ?? null, billing.email, id]
  );

  if (result.affectedRows === 0) return undefined;
  return findById(id);
}
