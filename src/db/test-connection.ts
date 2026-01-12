import 'dotenv/config';
import { testConnection, closePool } from './connection.js';

async function main() {
  const success = await testConnection();
  await closePool();
  process.exit(success ? 0 : 1);
}

main();
