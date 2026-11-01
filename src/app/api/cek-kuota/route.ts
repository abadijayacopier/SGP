import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = (searchParams.get('q') || '').trim();

    if (!rawQuery) {
      // Kembalikan daftar ringkas petani untuk pilihan cepat (quick sample)
      const samplePetani = await prisma.petani.findMany({
        take: 10,
        include: {
          poktan: true,
          lahan: true,
          alokasiPupuk: true,
        },
        orderBy: { nama: 'asc' },
      });
      return NextResponse.json({
        success: true,
        type: 'SAMPLES',
        samples: samplePetani,
      });
    }

    // Jika input adalah URL dari pemindaian QR Code, ekstrak token terakhirnya
    let cleanToken = rawQuery;
    if (rawQuery.includes('/')) {
      const parts = rawQuery.split('/').filter(Boolean);
      cleanToken = parts[parts.length - 1] || rawQuery;
    }

    // 1. Cek apakah cocok dengan Nomor Nota Penyaluran (NOTA-...)
    if (cleanToken.toUpperCase().startsWith('NOTA-')) {
      const nota = await prisma.penyaluranPupuk.findUnique({
        where: { nomorNota: cleanToken.toUpperCase() },
        include: {
          petani: {
            include: {
              poktan: true,
              lahan: true,
              alokasiPupuk: true,
              penyaluranPupuk: { orderBy: { tanggalPenyaluran: 'desc' } },
            },
          },
        },
      });
      if (nota) {
        return NextResponse.json({
          success: true,
          type: 'NOTA',
          verifiedDocument: {
            jenis: 'NOTA SERAH TERIMA PUPUK BERSUBSIDI',
            nomor: nota.nomorNota,
            tanggal: nota.tanggalPenyaluran,
            kios: nota.namaKios,
            verifikator: nota.namaPengurusPoktan,
            status: 'DOKUMEN ASLI & TERVERIFIKASI KECAMATAN LEMBEYAN',
          },
          notaDetail: nota,
          petani: nota.petani,
        });
      }
    }

    // 2. Cek apakah cocok dengan Kode Lahan GIS (LHN-...)
    if (cleanToken.toUpperCase().startsWith('LHN-')) {
      const lahan = await prisma.lahan.findUnique({
        where: { kodeLahan: cleanToken.toUpperCase() },
        include: {
          petani: {
            include: {
              poktan: true,
              lahan: true,
              alokasiPupuk: true,
              penyaluranPupuk: { orderBy: { tanggalPenyaluran: 'desc' } },
            },
          },
        },
      });
      if (lahan) {
        return NextResponse.json({
          success: true,
          type: 'LAHAN',
          verifiedDocument: {
            jenis: 'KARTU REGISTRASI LAHAN PERTANIAN (GIS)',
            nomor: lahan.kodeLahan,
            tanggal: lahan.createdAt,
            kios: `Luas: ${lahan.luasHa} Ha (${lahan.komoditas})`,
            verifikator: 'BPP Kecamatan Lembeyan',
            status: 'PETAK SPASIAL TERVERIFIKASI RESMI',
          },
          lahanDetail: lahan,
          petani: lahan.petani,
        });
      }
    }

    // 3. Cek apakah cocok dengan Nomor Pengajuan e-RDKK (REG-ERDKK-...)
    if (cleanToken.toUpperCase().startsWith('REG-')) {
      const pengajuan = await prisma.pengajuanLahan.findUnique({
        where: { nomorPengajuan: cleanToken.toUpperCase() },
        include: {
          petani: {
            include: {
              poktan: true,
              lahan: true,
              alokasiPupuk: true,
              penyaluranPupuk: { orderBy: { tanggalPenyaluran: 'desc' } },
            },
          },
        },
      });
      if (pengajuan) {
        return NextResponse.json({
          success: true,
          type: 'PENGAJUAN',
          verifiedDocument: {
            jenis: 'BERKAS PENGAJUAN KUOTA e-RDKK',
            nomor: pengajuan.nomorPengajuan,
            tanggal: pengajuan.createdAt,
            kios: `Status: ${pengajuan.status}`,
            verifikator: pengajuan.diverifikasiOleh || 'Menunggu Verifikasi BPP Lembeyan',
            status: 'BERKAS TERCATAT DI DATABASE KECAMATAN LEMBEYAN',
          },
          pengajuanDetail: pengajuan,
          petani: pengajuan.petani,
        });
      }
    }

    // 4. Cari Petani berdasarkan NIK, ID, atau Nama
    const petani = await prisma.petani.findFirst({
      where: {
        OR: [
          { nik: cleanToken },
          { id: cleanToken },
          { noKk: cleanToken },
          { nama: { contains: cleanToken } },
        ],
      },
      include: {
        poktan: true,
        lahan: { orderBy: { createdAt: 'desc' } },
        alokasiPupuk: { orderBy: { tahun: 'desc' } },
        penyaluranPupuk: { orderBy: { tanggalPenyaluran: 'desc' } },
      },
    });

    if (petani) {
      return NextResponse.json({
        success: true,
        type: 'PETANI',
        verifiedDocument: {
          jenis: 'KARTU TANI DIGITAL & KUOTA e-RDKK',
          nomor: `KT-LMB-${petani.nik.slice(-6)}`,
          tanggal: petani.updatedAt,
          kios: petani.poktan?.nama || '-',
          verifikator: 'Pemerintah Kecamatan Lembeyan',
          status: 'PETANI TERDAFTAR & AKTIF PENERIMA SUBSIDI',
        },
        petani,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: `Data dengan kata kunci / nomor "${rawQuery}" tidak ditemukan dalam database Kecamatan Lembeyan.`,
      },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
