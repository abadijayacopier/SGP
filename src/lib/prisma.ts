import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prioritaskan environment variable Neon PostgreSQL yang memiliki prefix NEON_ di Vercel
const cloudDbUrl =
  process.env.NEON_POSTGRES_PRISMA_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.NEON_POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.STORAGE_PRISMA_URL ||
  process.env.STORAGE_URL;

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
