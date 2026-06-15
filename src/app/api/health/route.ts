import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client/web';

export const runtime = 'edge';

export async function GET() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    return NextResponse.json(
      { status: 'degraded', db: 'misconfigured', ts: Date.now() },
      { status: 503 }
    );
  }

  try {
    const client = createClient(authToken ? { url, authToken } : { url });
    const rs = await client.execute('SELECT 1 AS ok');
    const ok = rs.rows[0]?.ok === 1;

    if (!ok) {
      return NextResponse.json(
        { status: 'degraded', db: 'unexpected', ts: Date.now() },
        { status: 503 }
      );
    }

    return NextResponse.json({ status: 'ok', db: 'ok', ts: Date.now() });
  } catch {
    return NextResponse.json(
      { status: 'degraded', db: 'error', ts: Date.now() },
      { status: 503 }
    );
  }
}
