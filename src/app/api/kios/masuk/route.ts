import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      stokId,
      namaKios,
      jenisPupuk,
      jumlahKg,
      nomorDo,
      namaDistributor,
      nomorPolisi,
      namaSupir,
      petugas,
      tanggalMasuk,
      keterangan,
    } = body;

    const qty = parseFloat(jumlahKg);
    if (!qty || qty <= 0) {
      return NextResponse.json(
        { success: false, error: 'Jumlah pupuk masuk harus lebih dari 0 kg' },
        { status: 400 }
      );
    }

    if (!nomorDo) {
      return NextResponse.json(
        { success: false, error: 'Nomor Surat Jalan / Delivery Order (DO) wajib diisi' },
        { status: 400 }
      );
    }

    // Cari item stok
    let stokItem = null;
    if (stokId) {
      stokItem = await prisma.stokKios.findUnique({ where: { id: stokId } });
    } else if (namaKios && jenisPupuk) {
      stokItem = await prisma.stokKios.findFirst({
        where: { namaKios, jenisPupuk },
      });
    }

    if (!stokItem) {
      return NextResponse.json(
        { success: false, error: 'Jenis pupuk atau kios tidak ditemukan' },
        { status: 404 }
      );
    }

    const stokSebelum = stokItem.stokSisaKg;
    const stokSesudah = stokSebelum + qty;
    const tgl = tanggalMasuk ? new Date(tanggalMasuk) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Update stok kios
      const updatedStok = await tx.stokKios.update({
        where: { id: stokItem.id },
        data: {
          stokMasukKg: stokItem.stokMasukKg + qty,
          stokSisaKg: stokSesudah,
        },
      });

      // Catat mutasi penerimaan distributor
      const mutasi = await tx.mutasiStokKios.create({
        data: {
          namaKios: stokItem.namaKios,
          jenisPupuk: stokItem.jenisPupuk,
          tipeMutasi: 'MASUK_DISTRIBUTOR',
          jumlahKg: qty,
          stokSebelumKg: stokSebelum,
          stokSesudahKg: stokSesudah,
          nomorReferensi: nomorDo,
          namaDistributor: namaDistributor || 'Distributor Resmi Pupuk Indonesia',
          nomorPolisi: nomorPolisi || null,
          namaSupir: namaSupir || null,
          petugas: petugas || 'Petugas KPL',
          keterangan: keterangan || `Penerimaan DO resmi ${nomorDo} armada ${nomorPolisi || '-'}`,
          tanggal: tgl,
        },
      });

      return { stok: updatedStok, mutasi };
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
