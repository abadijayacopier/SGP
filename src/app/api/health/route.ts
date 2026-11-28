import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const envInfo = {
    has_POSTGRES_PRISMA_URL: Boolean(process.env.POSTGRES_PRISMA_URL),
    has_DATABASE_URL: Boolean(process.env.DATABASE_URL),
    has_POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
    postgres_host: process.env.POSTGRES_HOST || 'not_set',
    node_env: process.env.NODE_ENV,
    is_vercel: Boolean(process.env.VERCEL),
    timestamp: new Date().toISOString(),
  };

  try {
    const count = await prisma.petani.count();
    const poktans = await prisma.poktan.findMany({
      select: {
        nama: true,
        jumlahAnggota: true,
        _count: { select: { anggota: true } },
      },
    });

    return NextResponse.json({
      status: 'ok',
      env: envInfo,
      totalPetani: count,
      poktans,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        env: envInfo,
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
