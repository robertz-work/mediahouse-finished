/**
 * MySQL connection pool — replaces fileLock.ts for all repos except settings.
 *
 * Usage:
 *   import db from "@/lib/db/mysql";
 *   const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
 *
 * .env.local — podaj parametry osobno (bezpieczne przy znakach specjalnych w haśle):
 *   DB_HOST=mysql.mojadomena.pl
 *   DB_PORT=3306
 *   DB_USER=m1250_mediaH
 *   DB_PASSWORD=moje-haslo"trudne
 *   DB_NAME=m1250_mediahouse
 */

import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 5,
  idleTimeout: 60_000,
  enableKeepAlive: true,
});

export default pool;
export type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
