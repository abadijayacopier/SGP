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

    // Daftar kemungkinan lokasi file database di lingkungan serverless Vercel
    const candidatePaths = [
      path.join(process.cwd(), 'prisma', 'dev.db'),
      path.join(process.cwd(), 'public', 'dev.db'),
      path.join('/var', 'task', 'prisma', 'dev.db'),
      path.join('/var', 'task', 'public', 'dev.db'),
      path.join(process.cwd(), '.next', 'server', 'prisma', 'dev.db'),
      path.resolve('prisma/dev.db'),
      path.resolve('public/dev.db'),
    ];

    try {
      const isTmpValid = fs.existsSync(tmpDbPath) && fs.statSync(tmpDbPath).size > 1024;
      if (!isTmpValid) {
        let copied = false;
        for (const candidate of candidatePaths) {
          try {
            if (fs.existsSync(candidate) && fs.statSync(candidate).size > 1024) {
              fs.copyFileSync(candidate, tmpDbPath);
              copied = true;
              break;
            }
          } catch (e) {
            // Abaikan error pada candidate individual dan coba candidate berikutnya
          }
        }

        if (!copied && !fs.existsSync(tmpDbPath)) {
          console.warn('[Prisma Vercel Bridge] Master dev.db tidak ditemukan di candidate paths.');
        }
      }

      if (fs.existsSync(tmpDbPath)) {
        datasourceUrl = `file:${tmpDbPath}`;
      }
    } catch (err) {
      console.error('[Prisma Vercel Bridge] Gagal menginisialisasi database di /tmp:', err);
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
