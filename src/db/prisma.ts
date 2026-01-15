import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

/**
 * Test the database connection by executing a simple query.
 * @returns Promise that resolves to true if connected successfully
 */
export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Disconnect from the database gracefully.
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
}
