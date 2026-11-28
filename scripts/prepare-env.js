const fs = require('fs');
const path = require('path');

// Deteksi environment variable Neon dari Vercel
const neonUrl =
  process.env.NEON_POSTGRES_PRISMA_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.NEON_POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL;

const neonNonPooling =
  process.env.NEON_POSTGRES_URL_NON_POOLING ||
  process.env.NEON_POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  neonUrl;

if (neonUrl) {
  process.env.POSTGRES_PRISMA_URL = neonUrl;
  process.env.DATABASE_URL = neonUrl;
  process.env.POSTGRES_URL_NON_POOLING = neonNonPooling;

  const envPath = path.join(process.cwd(), '.env');
  const appendData = `\nPOSTGRES_PRISMA_URL="${neonUrl}"\nDATABASE_URL="${neonUrl}"\nPOSTGRES_URL_NON_POOLING="${neonNonPooling}"\n`;
  try {
    fs.appendFileSync(envPath, appendData);
    console.log('[prepare-env] Berhasil mapping environment variable Neon PostgreSQL.');
  } catch (e) {
    // Abaikan jika read-only
  }
}
