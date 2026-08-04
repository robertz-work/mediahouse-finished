/**
 * Invoice counter repository — atomic numbering for proforma invoices.
 * Table: invoice_counters (see database/add_payments.sql)
 *
 * Format: FP/{year}/{month}/{sequential_number}
 * Example: FP/2026/04/001
 */

import db, { type RowDataPacket, type ResultSetHeader } from "./mysql";

interface CounterRow extends RowDataPacket {
  year: number;
  month: number;
  last_number: number;
}

/**
 * Atomically increment and return the next invoice number for the given month.
 * Uses INSERT ... ON DUPLICATE KEY UPDATE to avoid race conditions.
 */
export async function getNextNumber(year: number, month: number): Promise<string> {

  await db.query<ResultSetHeader>(
    `INSERT INTO invoice_counters (year, month, last_number)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE last_number = last_number + 1`,
    [year, month]
  );

  const [rows] = await db.query<CounterRow[]>(
    "SELECT last_number FROM invoice_counters WHERE year = ? AND month = ?",
    [year, month]
  );

  const num = rows[0]?.last_number ?? 1;
  const monthStr = String(month).padStart(2, "0");
  const numStr = String(num).padStart(3, "0");

  return `FP/${year}/${monthStr}/${numStr}`;
}
