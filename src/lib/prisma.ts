import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  let datasourceUrl: string | undefined = undefined;

  // Adaptor khusus Vercel Serverless: File system /var/task bersifat read-only.
  // Salin file SQLite ke /tmp/dev.db agar dapat dibaca dan ditulisi di Vercel.
  if (process.env.VERCEL) {
    const tmpDbPath = path.join('/tmp', 'dev.db');
    const sourceDbPath = path.join(process.cwd(), 'prisma', 'dev.db');

    try {
      if (!fs.existsSync(tmpDbPath)) {
        if (fs.existsSync(sourceDbPath)) {
          fs.copyFileSync(sourceDbPath, tmpDbPath);
        } else {
          // Buat file kosong jika file sumber belum ada
          fs.writeFileSync(tmpDbPath, '');
        }
      }
      datasourceUrl = `file:${tmpDbPath}`;
    } catch (err) {
      console.error('[Prisma Vercel Bridge] Gagal menyalin dev.db ke /tmp:', err);
    }
  }

  return new PrismaClient({
    log: ['error'],
    ...(datasourceUrl
      ? {
          datasources: {
            db: {
              url: datasourceUrl,
            },
          },
        }
      : {}),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
