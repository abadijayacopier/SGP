import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rows, defaultPoktanId } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Data CSV kosong atau format tidak dikenali.' },
        { status: 400 }
      );
    }

    const poktans = await prisma.poktan.findMany();
    const fallbackPoktan =
      poktans.find((p) => p.id === defaultPoktanId) || poktans[0];

    if (!fallbackPoktan) {
      return NextResponse.json(
        { success: false, error: 'Belum ada data Kelompok Tani (Poktan) di database.' },
        { status: 400 }
      );
    }

    let importedCount = 0;
    const createdItems: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const nik = String(r.nik || r.nik_petani || '').replace(/\D/g, '');
      const namaPetani = String(r.nama_petani || r.nama || '').trim();
      if (!nik || !namaPetani) continue;

      const noKk = String(r.no_kk || nik).replace(/\D/g, '') || nik;
      const tempatLahir = String(r.tempat_lahir || 'Magetan').trim();
      const tanggalLahir = String(r.tanggal_lahir || '1980-01-01').trim();
      const namaIbuKandung = String(r.nama_ibu_kandung || '-').trim();
      const telepon = String(r.telepon || '').trim() || null;
      const alamat = String(r.alamat || 'Dusun Krajan').trim();
      const desa = String(r.desa || fallbackPoktan.desa || 'Kediren').trim();
      const kecamatan = String(r.kecamatan || 'Lembeyan').trim();
      const kabupaten = String(r.kabupaten || 'Magetan').trim();
      const namaPoktanInput = String(r.nama_poktan || '').trim().toLowerCase();

      const matchedPoktan =
        poktans.find((p) => p.nama.toLowerCase() === namaPoktanInput) ||
        fallbackPoktan;

      const luasHa = Math.max(
        0.05,
        parseFloat(String(r.luas_ha || r.luas_lahan__ha_ || '0.5').replace(',', '.')) || 0.5
      );
      const komoditasRencana = String(r.komoditas || r.komoditas_mt1 || 'Padi').trim();

      // Pastikan Petani terdaftar / terupdate
      let petani = await prisma.petani.findUnique({ where: { nik } });
      if (!petani) {
        petani = await prisma.petani.create({
          data: {
            nik,
            noKk,
            nama: namaPetani,
            tempatLahir,
            tanggalLahir,
            namaIbuKandung,
            telepon,
            alamat,
            desa,
            kecamatan,
            kabupaten,
            poktanId: matchedPoktan.id,
            statusVerifikasi: 'MENUNGGU_VERIFIKASI_PPL',
            totalLuasLahan: 0,
          },
        });
      } else {
        petani = await prisma.petani.update({
          where: { id: petani.id },
          data: {
            tempatLahir: tempatLahir || petani.tempatLahir,
            tanggalLahir: tanggalLahir || petani.tanggalLahir,
            namaIbuKandung: namaIbuKandung || petani.namaIbuKandung,
            kabupaten: kabupaten || petani.kabupaten,
          },
        });
      }

      const nomorPengajuan = `ERDKK/IMP/${new Date().getFullYear()}/${String(Date.now() + i).slice(-5)}`;

      const pengajuan = await prisma.pengajuanLahan.create({
        data: {
          nomorPengajuan,
          petaniId: petani.id,
          poktanId: matchedPoktan.id,
          namaPemilik: namaPetani,
          nikPemilik: nik,
          noKk,
          tempatLahir,
          tanggalLahir,
          namaIbuKandung,
          komoditasRencana,
          luasHa,
          desa,
          kecamatan,
          kabupaten,
          nomorPipil: `NOP-35.20.040-${String(Date.now() + i).slice(-4)}`,
          fileKtp: '/uploads/sample_ktp.svg',
          fileKk: '/uploads/sample_kk.svg',
          filePipil: '/uploads/sample_pipil.svg',
          status: 'DIAJUKAN_POKTAN',
          catatan: 'Diimpor secara kolektif melalui fitur Import Massal CSV e-RDKK.',
        },
        include: {
          poktan: true,
        },
      });

      importedCount++;
      createdItems.push(pengajuan);
    }

    return NextResponse.json({
      success: true,
      importedCount,
      data: createdItems,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengimpor CSV e-RDKK' },
      { status: 500 }
    );
  }
}
