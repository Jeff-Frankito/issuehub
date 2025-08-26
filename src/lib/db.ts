import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { headers } from 'next/headers';

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// Env flags (default to false if missing)
const dbLog = process.env.DATABASE_LOG === "true";
const logParams = process.env.DATABASE_LOG_PARAMS === "true";

// Log file path
const logFile = path.join(process.cwd(), "logs", "db.log");

// Ensure logs dir exists only if logging enabled
if (dbLog && !fs.existsSync(path.dirname(logFile))) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
}

export async function query<T = any>(sql: string, params: any[] = []) {
  const start = Date.now();

  try {
    const [rows] = await pool.execute(sql, params);

    if (dbLog) {
      const duration = Date.now() - start;
      const paramStr = logParams ? ` :: [${params.join(", ")}]` : "";
      const ts = new Date().toISOString();
      let where = "";
      let method = "";
      let uid = "";
      const runtime = (typeof (globalThis as any).EdgeRuntime !== 'undefined') ? 'edge' : 'node';
      try {
        const h = await headers();
        where = h.get('x-pathname') || '';
        method = h.get('x-method') || '';
        const hUid = h.get('x-user-id');
        if (hUid) uid = ` uid=${hUid}`;
      } catch {}

      const head = `[DB] ${ts} [${runtime}] ${method} ${where}${uid}`.trim();
      const message = `${head}\n${sql}${paramStr} (${duration}ms)\n`;

      console.log(message.trim());
      try { fs.appendFileSync(logFile, message); } catch {}
    }

    return rows as T;
  } catch (err) {
    if (dbLog) {
      const ts = new Date().toISOString();
      let where = "";
      let method = "";
      let uid = "";
      const runtime = (typeof (globalThis as any).EdgeRuntime !== 'undefined') ? 'edge' : 'node';
      try {
        const h = await headers();
        where = h.get('x-pathname') || '';
        method = h.get('x-method') || '';
        const hUid = h.get('x-user-id');
        if (hUid) uid = ` uid=${hUid}`;
      } catch {}
      const errHead = `[DB ERROR] ${ts} [${runtime}] ${method} ${where}${uid}`.trim();
      const errorMessage = `${errHead}\n${sql} ${logParams ? JSON.stringify(params) : ""} :: ${err}\n`;
      console.error(errorMessage.trim());
      try { fs.appendFileSync(logFile, errorMessage); } catch {}
    }
    throw err;
  }
}
