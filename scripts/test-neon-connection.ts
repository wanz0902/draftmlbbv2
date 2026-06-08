import dotenv from 'dotenv';
dotenv.config();

import { testNeonConnection, closeNeonPool } from '../lib/neon.js';

async function main() {
  console.log('[test-neon] Starting Neon PostgreSQL connection test...\n');

  const result = await testNeonConnection();

  if (result.ok) {
    console.log('[test-neon] Connection OK');
    console.log(`[test-neon] Server version : ${result.serverVersion}`);
    console.log(`[test-neon] Latency       : ${result.latencyMs}ms`);
  } else {
    console.error('[test-neon] Connection FAILED');
    console.error(`[test-neon] Error: ${result.error}`);
    console.error(`[test-neon] Latency: ${result.latencyMs}ms`);
  }

  await closeNeonPool();
  process.exit(result.ok ? 0 : 1);
}

main();
