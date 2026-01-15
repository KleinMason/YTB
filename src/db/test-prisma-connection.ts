import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    // Test connection by executing a raw query
    const result = await prisma.$queryRaw`SELECT NOW() as current_time`;
    console.log('✓ Prisma connected to PostgreSQL successfully');
    console.log('Current database time:', result);
  } catch (error) {
    console.error('✗ Failed to connect to PostgreSQL:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
