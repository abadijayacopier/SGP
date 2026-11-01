import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const petaniId = searchParams.get('petaniId');
    const tahun = searchParams.get('tahun');

    const where: any = {};
    if (petaniId) {
      where.petaniId = petaniId;
    }
    if (tahun) {
      where.tahun = parseInt(tahun);
    }

    const alokasiList = await prisma.alokasiPupuk.findMany({
      where,
      include: {
        petani: {
          include: {
            poktan: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: alokasiList });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
