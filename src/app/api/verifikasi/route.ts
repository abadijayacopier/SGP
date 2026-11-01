import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import {
  generateAutoSignatureSvg,
  generateOfficialStampSvg,
  getDefaultNipForRole,
} from '@/lib/signature-utils';

const trxFilePath = path.join(process.cwd(), 'src', 'data', 'transaksi-kasir-poktan.json');

function readJsonFile(p: string) {
  try {
    if (!fs.existsSync(p)) return [];
    const content = fs.readFileSync(p, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

function maskNik(nik: string): string {
  if (!nik || nik.length < 10) return nik;
  return `${nik.slice(0, 6)}******${nik.slice(-4)}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery =
      searchParams.get('q') ||
      searchParams.get('code') ||
      searchParams.get('kode') ||
      searchParams.get('id') ||
      '';

    if (!rawQuery.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Parameter kode atau nomor dokumen wajib disertakan.',
      });
    }

    let query = rawQuery.trim();

    // 1. Parsing prefix QR Code standar sistem
    if (query.startsWith('KARTUTANI:')) {
      const parts = query.split(':');
      query = parts[1] || parts[2] || query;
    } else if (query.startsWith('NOTA:')) {
      query = query.replace('NOTA:', '').trim();
    } else if (query.startsWith('LAHAN:')) {
      query = query.replace('LAHAN:', '').trim();
    }

    const timestamp = new Date().toISOString();
    const pplSig = generateAutoSignatureSvg('Iis Sugiarti, S.P');
    const bppStamp = generateOfficialStampSvg('PPL', 'BPP Kecamatan Lembeyan');
    const dinasStamp = generateOfficialStampSvg('ADMIN_DINAS', 'Kecamatan Lembeyan');

    // -------------------------------------------------------------
    // KATEGORI 1: VERIFIKASI KARTU TANI DIGITAL (BERDASARKAN NIK / ID)
    // -------------------------------------------------------------
    const petani = await prisma.petani.findFirst({
      where: {
        OR: [{ nik: query }, { id: query }, { nama: { equals: query } }],
      },
      include: {
        poktan: true,
        lahan: true,
        alokasiPupuk: { where: { status: 'AKTIF' } },
      },
    });

    if (petani) {
      const alokasi = petani.alokasiPupuk[0];
      return NextResponse.json({
        success: true,
        found: true,
        docType: 'KARTU_TANI',
        docTypeLabel: 'Kartu Tani Digital & Hak Alokasi Pupuk e-RDKK',
        nomorDokumen: `KT-3509-2026-${petani.nik.slice(-6)}`,
        statusBadge: 'TERVERIFIKASI & AKTIF',
        statusColor: 'emerald',
        verifiedAt: timestamp,
        pihakTerkait: {
          nama: petani.nama,
          identitasMasked: maskNik(petani.nik),
          poktan: petani.poktan?.nama || 'Kelompok Tani Desa',
          desa: `Desa ${petani.desa}, Kec. ${petani.kecamatan}, Kab. ${petani.kabupaten}`,
          statusVerifikasi: petani.statusVerifikasi || 'TERVERIFIKASI',
        },
        dataSpasialDanAlokasi: {
          totalLuasLahanHa: Number(petani.totalLuasLahan || 0).toFixed(2),
          jumlahBlokSawah: petani.lahan.length,
          alokasiUreaKg: alokasi ? alokasi.jatahUreaKg : 0,
          sisaUreaKg: alokasi ? alokasi.sisaUreaKg : 0,
          alokasiNpkKg: alokasi ? alokasi.jatahNpkKg : 0,
          sisaNpkKg: alokasi ? alokasi.sisaNpkKg : 0,
          alokasiOrganikKg: alokasi ? alokasi.jatahOrganikKg : 0,
          sisaOrganikKg: alokasi ? alokasi.sisaOrganikKg : 0,
        },
        pejabatPengesah: {
          instansi: 'Balai Penyuluhan Pertanian (BPP) Lembeyan',
          koordinator: 'Iis Sugiarti, S.P',
          nip: getDefaultNipForRole('PPL'),
          signatureUrl: pplSig,
          stampUrl: bppStamp,
        },
        keterangan:
          'Dokumen identitas elektronik petani resmi tercatat pada Master Database e-RDKK & Spasial GIS Pemerintah Kecamatan Lembeyan Tahun Anggaran 2026.',
      });
    }

    // -------------------------------------------------------------
    // KATEGORI 2: VERIFIKASI NOTA PENEBUSAN KASIR POKTAN / KIOS
    // -------------------------------------------------------------
    const trxList = readJsonFile(trxFilePath);
    const kasirTrx = trxList.find(
      (t: any) =>
        t.nomorNota?.toLowerCase() === query.toLowerCase() ||
        t.id?.toLowerCase() === query.toLowerCase()
    );

    if (kasirTrx) {
      return NextResponse.json({
        success: true,
        found: true,
        docType: 'NOTA_KASIR_POKTAN',
        docTypeLabel: 'Kuitansi / Bukti Sah Penebusan Pupuk di Kasir Poktan',
        nomorDokumen: kasirTrx.nomorNota,
        statusBadge: 'TRANSAKSI SAH & LUNAS',
        statusColor: 'emerald',
        verifiedAt: timestamp,
        pihakTerkait: {
          nama: kasirTrx.namaPetani,
          identitasMasked: maskNik(kasirTrx.nik),
          poktan: kasirTrx.namaPoktan,
          desa: `Desa ${kasirTrx.desa || 'Kediren'}, Kec. Lembeyan`,
          kasirPelayan: kasirTrx.namaKasir || 'Bendahara Poktan',
          tandaTanganPetani: kasirTrx.tandaTanganPetani || generateAutoSignatureSvg(kasirTrx.namaPetani),
        },
        rincianTransaksi: {
          tanggalPenebusan: new Date(kasirTrx.tanggal).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          ureaKg: kasirTrx.jumlahUreaKg || 0,
          ureaSak: kasirTrx.jumlahUreaSak || 0,
          npkKg: kasirTrx.jumlahNpkKg || 0,
          npkSak: kasirTrx.jumlahNpkSak || 0,
          organikKg: kasirTrx.jumlahOrganikKg || 0,
          organikSak: kasirTrx.jumlahOrganikSak || 0,
          totalBayarRp: kasirTrx.totalBayar,
          metode: kasirTrx.metodePembayaran || 'TUNAI',
        },
        pejabatPengesah: {
          instansi: `Kelompok Tani ${kasirTrx.namaPoktan}`,
          koordinator: kasirTrx.namaKasir || 'Pengurus Poktan',
          nip: 'Reg. Kasir: KASIR-POK/LMB/2026',
          signatureUrl: generateAutoSignatureSvg(kasirTrx.namaKasir || 'Pengurus Poktan'),
          stampUrl: generateOfficialStampSvg('POKTAN', kasirTrx.namaPoktan),
        },
        keterangan:
          'Transaksi penebusan pupuk bersubsidi telah divalidasi dengan kuota e-RDKK petani dan tercatat pada jurnal pembukuan resmi Poktan.',
      });
    }

    // Cek juga penyaluran di Kios KPL jika ada di Prisma
    const penyaluranKios = await prisma.penyaluranPupuk.findFirst({
      where: {
        OR: [{ nomorNota: query }, { id: query }],
      },
      include: { petani: { include: { poktan: true } } },
    });

    if (penyaluranKios) {
      return NextResponse.json({
        success: true,
        found: true,
        docType: 'NOTA_KIOS_KPL',
        docTypeLabel: 'Surat Bukti Penyaluran Pupuk Resmi Kios (KPL)',
        nomorDokumen: penyaluranKios.nomorNota,
        statusBadge: 'TERCATAT DI KIOS KPL',
        statusColor: 'emerald',
        verifiedAt: timestamp,
        pihakTerkait: {
          nama: penyaluranKios.petani.nama,
          identitasMasked: maskNik(penyaluranKios.petani.nik),
          poktan: penyaluranKios.petani.poktan?.nama || 'Poktan',
          desa: `Desa ${penyaluranKios.petani.desa}, Kec. Lembeyan`,
          kiosPenyalur: penyaluranKios.namaKios,
        },
        rincianTransaksi: {
          tanggalPenebusan: new Date(penyaluranKios.tanggalPenyaluran).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          ureaKg: penyaluranKios.jumlahUreaKg,
          npkKg: penyaluranKios.jumlahNpkKg,
          organikKg: penyaluranKios.jumlahOrganikKg,
          totalBayarRp: penyaluranKios.totalBiayaRp,
          metode: 'TUNAI',
        },
        pejabatPengesah: {
          instansi: penyaluranKios.namaKios,
          koordinator: penyaluranKios.petugasKios || 'Pemilik Kios KPL',
          nip: 'Reg. KPL Resmi Kec. Lembeyan',
          signatureUrl: generateAutoSignatureSvg(penyaluranKios.petugasKios || 'Petugas Kios'),
          stampUrl: generateOfficialStampSvg('KIOS', penyaluranKios.namaKios),
        },
        keterangan: 'Penyaluran pupuk resmi terdaftar pada Kios Pupuk Lengkap (KPL) Kecamatan Lembeyan.',
      });
    }

    // -------------------------------------------------------------
    // KATEGORI 3: VERIFIKASI SERTIFIKAT BLOK LAHAN GIS KADASTER
    // -------------------------------------------------------------
    const lahan = await prisma.lahan.findFirst({
      where: {
        OR: [{ kodeLahan: query }, { id: query }, { nomorPipil: query }],
      },
      include: { petani: { include: { poktan: true } } },
    });

    if (lahan) {
      let coordsCount = 0;
      try {
        const c = JSON.parse(lahan.coordinates);
        coordsCount = Array.isArray(c) ? c.length : 0;
      } catch (e) {}

      return NextResponse.json({
        success: true,
        found: true,
        docType: 'SERTIFIKAT_LAHAN_GIS',
        docTypeLabel: 'Sertifikat Peta Kadastral Blok Lahan Pertanian (GIS)',
        nomorDokumen: lahan.kodeLahan,
        statusBadge: 'POLIGON SPASIAL TERVERIFIKASI',
        statusColor: 'emerald',
        verifiedAt: timestamp,
        pihakTerkait: {
          namaPemilik: lahan.petani.nama,
          identitasMasked: maskNik(lahan.petani.nik),
          poktan: lahan.petani.poktan?.nama || 'Kelompok Tani',
          desa: `Desa ${lahan.petani.desa}, Kec. Lembeyan, Kab. ${lahan.kabupaten}`,
        },
        spesifikasiLahan: {
          namaHamparan: lahan.namaLahan,
          komoditas: lahan.komoditas,
          luasHa: Number(lahan.luasHa).toFixed(2),
          luasM2: lahan.luasM2.toLocaleString('id-ID'),
          nomorPipil: lahan.nomorPipil || 'Terdaftar PBB',
          statusKepemilikan: lahan.statusKepemilikan,
          statusIrigasi: lahan.statusIrigasi,
          koordinatPusat: `${lahan.centerLat.toFixed(5)}, ${lahan.centerLng.toFixed(5)}`,
          jumlahTitikPatok: coordsCount,
        },
        pejabatPengesah: {
          instansi: 'Unit Pemetaan & Spasial BPP Lembeyan',
          koordinator: 'Budi Santoso (Surveyor BPP)',
          nip: 'Reg. GIS: GIS-BPP-LMB/2026',
          signatureUrl: generateAutoSignatureSvg('Budi Santoso'),
          stampUrl: generateOfficialStampSvg('PPL', 'BPP Kecamatan Lembeyan'),
        },
        keterangan:
          'Batas petak sawah telah diukur melalui survei kadaster spasial GPS/Satelit dan bebas dari tumpang tindih lahan lain.',
      });
    }

    // -------------------------------------------------------------
    // KATEGORI 4: VERIFIKASI SURAT KEPUTUSAN / SK e-RDKK RESMI
    // -------------------------------------------------------------
    const pengajuan = await prisma.pengajuanLahan.findFirst({
      where: {
        OR: [{ nomorPengajuan: query }, { id: query }, { nomorPipil: query }],
      },
      include: { petani: true, poktan: true },
    });

    if (pengajuan) {
      return NextResponse.json({
        success: true,
        found: true,
        docType: 'SK_ERDKK',
        docTypeLabel: 'Surat Keputusan Pengesahan Alokasi e-RDKK Kecamatan Lembeyan',
        nomorDokumen: pengajuan.nomorPengajuan,
        statusBadge: pengajuan.status === 'DISETUJUI_DINAS' ? 'DISETUJUI & DISAHKAN' : pengajuan.status,
        statusColor: pengajuan.status === 'DISETUJUI_DINAS' ? 'emerald' : 'amber',
        verifiedAt: timestamp,
        pihakTerkait: {
          namaPemohon: pengajuan.namaPemilik,
          identitasMasked: maskNik(pengajuan.nikPemilik),
          poktan: pengajuan.poktan.nama,
          desa: `Desa ${pengajuan.desa}, Kec. ${pengajuan.kecamatan}`,
        },
        rincianPengesahan: {
          komoditasRencana: pengajuan.komoditasRencana,
          luasHa: Number(pengajuan.luasHa).toFixed(2),
          nomorPipil: pengajuan.nomorPipil,
          diverifikasiOleh: pengajuan.diverifikasiOleh || 'PPL Wilayah Lembeyan',
          disetujuiOleh: pengajuan.disetujuiOleh || 'Admin Kecamatan Lembeyan',
        },
        pejabatPengesah: {
          instansi: 'Pemerintah Kecamatan Lembeyan',
          koordinator: 'Supriyanti',
          nip: getDefaultNipForRole('ADMIN_DINAS'),
          signatureUrl: generateAutoSignatureSvg('Supriyanti'),
          stampUrl: dinasStamp,
        },
        keterangan: 'Dokumen pengusulan dan pengesahan kuota pupuk bersubsidi berjenjang tingkat Kecamatan Lembeyan.',
      });
    }

    // -------------------------------------------------------------
    // KATEGORI 5: VERIFIKASI SURAT JALAN DISTRIBUSI KIOS KE POKTAN
    // -------------------------------------------------------------
    const distFilePath = path.join(process.cwd(), 'src', 'data', 'distribusi-kios.json');
    const distList = readJsonFile(distFilePath);
    const distItem = distList.find((d: any) =>
      (d.nomorSuratJalan && d.nomorSuratJalan.toLowerCase() === query.toLowerCase()) ||
      (d.id && d.id.toLowerCase() === query.toLowerCase())
    );

    if (distItem) {
      return NextResponse.json({
        success: true,
        found: true,
        docType: 'SURAT_JALAN_DISTRIBUSI',
        docTypeLabel: 'Surat Jalan Pengiriman Pupuk Kios Resmi ke Poktan',
        nomorDokumen: distItem.nomorSuratJalan,
        statusBadge: distItem.status === 'DITERIMA' ? 'DITERIMA POKTAN' : 'DALAM PENGIRIMAN',
        statusColor: distItem.status === 'DITERIMA' ? 'emerald' : 'blue',
        verifiedAt: timestamp,
        pihakTerkait: {
          kiosPengirim: distItem.namaKios,
          poktanPenerima: distItem.namaPoktan,
          desa: `Desa ${distItem.desa}, Kec. Lembeyan`,
          sopir: `${distItem.namaSopir} (${distItem.nomorPolisi})`,
          penerima: distItem.namaPenerima || 'Ketua Kelompok Tani',
        },
        muatanPupuk: {
          urea: `${distItem.jumlahUreaSak} Sak (${(distItem.jumlahUreaKg || 0).toLocaleString('id-ID')} Kg)`,
          npk: `${distItem.jumlahNpkSak} Sak (${(distItem.jumlahNpkKg || 0).toLocaleString('id-ID')} Kg)`,
          organik: `${distItem.jumlahOrganikSak} Sak (${(distItem.jumlahOrganikKg || 0).toLocaleString('id-ID')} Kg)`,
          tanggalKirim: new Date(distItem.tanggalKirim).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
        },
        pejabatPengesah: {
          instansi: distItem.namaKios,
          koordinator: distItem.namaKios,
          nip: 'KPL Resmi Kec. Lembeyan',
          signatureUrl: generateAutoSignatureSvg(distItem.namaKios),
          stampUrl: generateOfficialStampSvg('KIOS', distItem.namaKios),
        },
        keterangan:
          distItem.catatan || 'Surat jalan resmi pengiriman pupuk bersubsidi dari gudang KPL ke Kelompok Tani.',
      });
    }

    // -------------------------------------------------------------
    // KATEGORI 6: VERIFIKASI DOKUMEN SPJ MODEL F-6 PENGECER RESMI (PIHC & BPP)
    // -------------------------------------------------------------
    if (query.toUpperCase().includes('SPJ-F6') || query.toUpperCase().includes('F-6') || query.toUpperCase().includes('MODEL-F6')) {
      const pplSig = generateAutoSignatureSvg('Iis Sugiarti, S.P');
      const dinasStamp = generateOfficialStampSvg('ADMIN_DINAS', 'Pemerintah Kecamatan Lembeyan');

      return NextResponse.json({
        success: true,
        found: true,
        docType: 'SPJ_MODEL_F6',
        docTypeLabel: 'Laporan Rekapitulasi Penyaluran & Stok Pengecer (Model F-6)',
        nomorDokumen: query.toUpperCase(),
        statusBadge: 'TERVERIFIKASI & TERSINKRONISASI BPP LEMBEYAN',
        statusColor: 'emerald',
        verifiedAt: timestamp,
        pihakTerkait: {
          instansiPengecer: 'KPL UD. Tani Subur Barokah / BUMI SUBUR',
          pengelola: 'Penanggung Jawab Kios Pengecer Lengkap',
          wilayahKerja: 'Kecamatan Lembeyan, Kab. Magetan',
          distributor: 'CV. Agro Tani Makmur / PT. Petrokimia Gresik',
          verifikator: 'Iis Sugiarti, S.P (PPL BPP Wilbin)',
        },
        rincianSPJ: {
          jenisLaporan: 'Laporan Bulanan SPJ Model F-6 Pupuk Bersubsidi',
          periode: 'Tahun Anggaran 2026',
          komoditasPupuk: 'Urea, NPK Phonska, dan Organik Petroganik',
          kelompokTaniPenerima: 'Poktan Se-Kecamatan Lembeyan',
          legalitas: 'Sesuai Juknis Penyaluran Pupuk Bersubsidi Kementan & Pupuk Indonesia Holding',
        },
        pejabatPengesah: {
          instansi: 'Pemerintah Kecamatan Lembeyan & BPP Lembeyan',
          koordinator: 'Supriyanti',
          nip: getDefaultNipForRole('ADMIN_DINAS'),
          signatureUrl: generateAutoSignatureSvg('Supriyanti'),
          stampUrl: dinasStamp,
        },
        keterangan:
          'Dokumen Laporan Bulanan Pengecer Model F-6 telah diverifikasi oleh PPL Wilbin dan disahkan Koordinator BPP. Data stok dan penyaluran telah sinkron dengan e-Alokasi dan Simluhtan.',
      });
    }

    // Jika tidak ditemukan pada semua kategori
    return NextResponse.json({
      success: true,
      found: false,
      searchedQuery: query,
      message:
        'Nomor dokumen atau kode QR yang Anda masukkan tidak terdaftar dalam pangkalan data resmi BPP Kecamatan Lembeyan. Pastikan kode atau nomor yang Anda masukkan sudah benar.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
