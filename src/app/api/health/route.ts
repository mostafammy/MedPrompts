import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/get-db';

export async function GET() {
  try {
    const db = getDb();
    // Use Drizzle's underlying client to run a raw ping
    await db.$client.execute('SELECT 1');
    return NextResponse.json({ status: 'ok', db: 'ok', ts: Date.now() });
  } catch {
    return NextResponse.json(
      { status: 'degraded', db: 'error', ts: Date.now() },
      { status: 503 }
    );
  }
}
