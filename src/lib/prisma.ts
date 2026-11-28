import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prioritaskan URL database PostgreSQL Cloud (Neon / Vercel Postgres)
const cloudDbUrl =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.NEON_PRISMA_URL ||
  process.env.NEON_URL;

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: ['error'],
    ...(cloudDbUrl
      ? {
          datasources: {
            db: {
              url: cloudDbUrl,
            },
          },
        }
      : {}),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
