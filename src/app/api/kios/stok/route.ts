import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const namaKios = searchParams.get('namaKios') || 'UD. Tani Subur Barokah';

    const stokList = await prisma.stokKios.findMany({
      where: { namaKios },
      orderBy: { jenisPupuk: 'asc' },
    });

    const totalAwal = stokList.reduce((acc, s) => acc + s.stokAwalKg, 0);
    const totalMasuk = stokList.reduce((acc, s) => acc + s.stokMasukKg, 0);
    const totalTersalur = stokList.reduce((acc, s) => acc + s.stokTersalurKg, 0);
    const totalSisa = stokList.reduce((acc, s) => acc + s.stokSisaKg, 0);

    return NextResponse.json({
      success: true,
      data: stokList,
      summary: {
        totalAwalKg: totalAwal,
        totalMasukKg: totalMasuk,
        totalTersalurKg: totalTersalur,
        totalSisaKg: totalSisa,
        persenTersalur: totalAwal + totalMasuk > 0 ? Math.round((totalTersalur / (totalAwal + totalMasuk)) * 100) : 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Penyesuaian Stok Opname Fisik
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stokId, stokFisikBaruKg, alasan, petugas } = body;

    if (!stokId || stokFisikBaruKg === undefined || stokFisikBaruKg === null) {
      return NextResponse.json(
        { success: false, error: 'Parameter stokId dan stokFisikBaruKg wajib diisi' },
        { status: 400 }
      );
    }

    const stokFisik = parseFloat(stokFisikBaruKg);
    if (isNaN(stokFisik) || stokFisik < 0) {
      return NextResponse.json(
        { success: false, error: 'Jumlah stok fisik harus angka positif atau nol' },
        { status: 400 }
      );
    }

    const stokItem = await prisma.stokKios.findUnique({
      where: { id: stokId },
    });

    if (!stokItem) {
      return NextResponse.json({ success: false, error: 'Data pupuk tidak ditemukan' }, { status: 404 });
    }

    const stokSebelum = stokItem.stokSisaKg;
    const selisih = stokFisik - stokSebelum;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.stokKios.update({
        where: { id: stokId },
        data: {
          stokSisaKg: stokFisik,
        },
      });

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const refOpname = `OPNAME-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;

      await tx.mutasiStokKios.create({
        data: {
          namaKios: stokItem.namaKios,
          jenisPupuk: stokItem.jenisPupuk,
          tipeMutasi: 'PENYESUAIAN_OPNAME',
          jumlahKg: Math.abs(selisih),
          stokSebelumKg: stokSebelum,
          stokSesudahKg: stokFisik,
          nomorReferensi: refOpname,
          petugas: petugas || 'Petugas Kios',
          keterangan: `Opname Fisik: ${selisih >= 0 ? '+' : ''}${selisih} Kg. Alasan: ${alasan || 'Pemeriksaan rutin fisik gudang'}`,
          tanggal: new Date(),
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, data: result, selisihKg: selisih });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
