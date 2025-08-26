import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = "nodejs";

export async function GET() {
  try {
    // Query something trivial
    const rows = await query<{ now: string }[]>('SELECT NOW() AS now');
    return NextResponse.json({ ok: true, dbTime: rows[0]?.now ?? null });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
