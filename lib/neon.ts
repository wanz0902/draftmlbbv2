import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getNeonPool(): pg.Pool {
  if (pool) return pool;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Add it to your .env file (see .env.example).');
  }

  pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
  });

  pool.on('error', (err) => {
    console.error('[neon] Unexpected pool error:', err.message);
  });

  return pool;
}

export async function testNeonConnection(): Promise<{ ok: boolean; serverVersion: string; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const client = await getNeonPool().connect();
    try {
      const res = await client.query('SELECT version() AS version');
      const latencyMs = Date.now() - start;
      return {
        ok: true,
        serverVersion: res.rows[0]?.version ?? 'unknown',
        latencyMs,
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      ok: false,
      serverVersion: '',
      latencyMs: Date.now() - start,
      error: err.message ?? String(err),
    };
  }
}

export async function closeNeonPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
