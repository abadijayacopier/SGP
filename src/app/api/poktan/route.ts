import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const poktanList = await prisma.poktan.findMany({
      include: {
        anggota: {
          include: {
            lahan: true,
            alokasiPupuk: true,
          },
        },
        pengajuan: true,
      },
      orderBy: { nama: 'asc' },
    });

    return NextResponse.json({ success: true, data: poktanList });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nama, ketua, kontak, desa, kecamatan, kabupaten } = body;

    if (!nama || !ketua || !desa || !kecamatan) {
      return NextResponse.json(
        { success: false, error: 'Nama Poktan, Ketua, Desa, dan Kecamatan wajib diisi' },
        { status: 400 }
      );
    }

    const created = await prisma.poktan.create({
      data: {
        nama,
        ketua,
        kontak: kontak || '',
        desa,
        kecamatan,
        kabupaten: kabupaten || 'Magetan',
        jumlahAnggota: 0,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
