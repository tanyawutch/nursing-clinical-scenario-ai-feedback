import "server-only";

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Check your environment variables.");
}

const needsSupabasePoolerSsl =
  process.env.DATABASE_URL.includes("supabase.com") ||
  process.env.DATABASE_URL.includes("pooler.supabase.com");

const pool =
  globalForPrisma.prismaPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: needsSupabasePoolerSsl ? { rejectUnauthorized: false } : undefined,
  });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaPool = pool;
}
