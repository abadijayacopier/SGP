import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const namaKios = searchParams.get('namaKios') || 'UD. Tani Subur Barokah';
    const jenisPupuk = searchParams.get('jenisPupuk');
    const tipeMutasi = searchParams.get('tipeMutasi');
    const limitParam = searchParams.get('limit');
    const take = limitParam ? parseInt(limitParam) : 100;

    const where: any = { namaKios };

    if (jenisPupuk && jenisPupuk !== 'SEMUA') {
      where.jenisPupuk = { contains: jenisPupuk };
    }

    if (tipeMutasi && tipeMutasi !== 'SEMUA') {
      where.tipeMutasi = tipeMutasi;
    }

    const mutasiList = await prisma.mutasiStokKios.findMany({
      where,
      orderBy: { tanggal: 'desc' },
      take,
    });

    // Summary statistics mutasi
    const totalMasuk = mutasiList
      .filter((m) => m.tipeMutasi === 'MASUK_DISTRIBUTOR')
      .reduce((acc, m) => acc + m.jumlahKg, 0);

    const totalDistribusiPoktan = mutasiList
      .filter((m) => m.tipeMutasi === 'DISTRIBUSI_POKTAN')
      .reduce((acc, m) => acc + m.jumlahKg, 0);

    const totalPenyaluranPetani = mutasiList
      .filter((m) => m.tipeMutasi === 'PENYALURAN_PETANI')
      .reduce((acc, m) => acc + m.jumlahKg, 0);

    const totalKeluar = totalDistribusiPoktan + totalPenyaluranPetani;

    return NextResponse.json({
      success: true,
      data: mutasiList,
      stats: {
        totalTransaksi: mutasiList.length,
        totalMasukKg: totalMasuk,
        totalKeluarKg: totalKeluar,
        totalDistribusiPoktanKg: totalDistribusiPoktan,
        totalPenyaluranPetaniKg: totalPenyaluranPetani,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
