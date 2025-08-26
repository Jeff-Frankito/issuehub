// app/api/projects/route.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { query } from "@/lib/db"; // adjust the path if your db.ts lives elsewhere

export const runtime = "nodejs"; // required for mysql driver
export const dynamic = "force-dynamic"; // ensure no static caching

async function getSessionUserId(req: Request): Promise<number | null> {
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
  const uid = (token as any)?.uid;
  return typeof uid === "number" ? uid : Number.isFinite(Number(uid)) ? Number(uid) : null;
}

type Row = {
  id: number;
  name: string;
  slug: string;
  visibility: "private" | "internal" | "public";
  created_at: string;
  members_count: number;
  role: "owner" | "admin" | "maintainer" | "contributor" | "viewer";
};

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

      const sql = `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.visibility,
        DATE_FORMAT(p.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
        (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) AS members_count,
        pm.role AS role
      FROM projects p
      INNER JOIN project_members pm
              ON pm.project_id = p.id
             AND pm.user_id = ?
      ORDER BY p.created_at DESC
    `;

    const rows = await query<Row[]>(sql, [userId]);
    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    console.error("GET /api/projects error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
