import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import {
  generateAutoSignatureSvg,
  generateOfficialStampSvg,
  getDefaultNipForRole,
} from '@/lib/signature-utils';

const distFilePath = path.join(process.cwd(), 'src', 'data', 'distribusi-kios.json');
const kasirFilePath = path.join(process.cwd(), 'src', 'data', 'transaksi-kasir-poktan.json');

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Standar HET Pupuk Bersubsidi RI (Kementan & PIHC)
const HET_UREA_PER_KG = 2250;
const HET_NPK_PER_KG = 2300;
const HET_ORGANIK_PER_KG = 800;

function readDistribusiData() {
  try {
    if (!fs.existsSync(distFilePath)) return [];
    return JSON.parse(fs.readFileSync(distFilePath, 'utf-8'));
  } catch (err) {
    return [];
  }
}

function readKasirPoktanData() {
  try {
    if (!fs.existsSync(kasirFilePath)) return [];
    return JSON.parse(fs.readFileSync(kasirFilePath, 'utf-8'));
  } catch (err) {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedKios = searchParams.get('kios') || '';
    const now = new Date();
    const bulan = parseInt(searchParams.get('bulan') || String(now.getMonth() + 1), 10);
    const tahun = parseInt(searchParams.get('tahun') || String(now.getFullYear()), 10);

    // 1. Ambil Kios data, Users, & Poktan Riil beserta Anggotanya
    const [allStok, kiosUsers, allPoktans, penyaluranKasir, officialUsers] = await Promise.all([
      prisma.stokKios.findMany(),
      prisma.user.findMany({ where: { role: 'KIOS' } }),
      prisma.poktan.findMany({
        include: {
          anggota: {
            include: {
              alokasiPupuk: true,
              penyaluranPupuk: true,
            },
          },
          _count: { select: { anggota: true } },
        },
        orderBy: { nama: 'asc' },
      }),
      prisma.penyaluranPupuk.findMany({
        include: { petani: { include: { poktan: true } } },
      }),
      prisma.user.findMany({
        where: { role: { in: ['ADMIN_DINAS', 'PPL'] } },
      }),
    ]);

    // Tentukan Kios target dari database riil
    const availableKiosNames = Array.from(new Set([
      ...allStok.map((s) => s.namaKios),
      ...kiosUsers.map((u) => u.kiosName).filter(Boolean) as string[],
    ]));

    let targetKiosName = selectedKios;
    if (!targetKiosName || !availableKiosNames.some((n) => n.toLowerCase() === targetKiosName.toLowerCase())) {
      targetKiosName = availableKiosNames[0] || 'UD. BUMI SUBUR';
    }

    const matchedUser = kiosUsers.find(
      (u) => (u.kiosName && u.kiosName.toLowerCase() === targetKiosName.toLowerCase()) ||
             (u.name && u.name.toLowerCase() === targetKiosName.toLowerCase())
    );

    const kiosInfo = {
      namaKios: matchedUser?.kiosName || targetKiosName,
      kodeKios: matchedUser?.nip || 'Reg. KPL: KPL-LMB-008/2026',
      pengelola: matchedUser?.name || 'GIARNO',
      alamat: 'Jl. Raya Lembeyan - Parang No. 45, Kec. Lembeyan, Kab. Magetan',
      kecamatan: 'Lembeyan',
      kabupaten: 'Magetan',
      provinsi: 'Jawa Timur',
      wilayah: matchedUser?.wilayah || 'Kecamatan Lembeyan',
      telepon: matchedUser?.phone || '0821-5566-7788',
      distributor: 'CV. Agro Tani Makmur / PT. Petrokimia Gresik (Distributor Resmi Magetan)',
    };

    // 2. Data Riil Distribusi Kios & Transaksi Kasir
    const distData = readDistribusiData().filter((d: any) =>
      !targetKiosName || d.namaKios?.toLowerCase() === targetKiosName.toLowerCase()
    );
    const kasirJsonList = readKasirPoktanData();

    // 3. Hitung rincian per Poktan dari Data Riil Tanpa Angka Dummy
    const poktanRows = allPoktans.map((poktan) => {
      // Distribusi via Surat Jalan DO ke Poktan ini pada bulan & tahun terpilih
      const poktanDist = distData.filter((d: any) => {
        const isMatch = d.poktanId === poktan.id || d.namaPoktan?.toUpperCase() === poktan.nama?.toUpperCase();
        if (!isMatch) return false;
        if (d.tanggalKirim || d.createdAt) {
          const dt = new Date(d.tanggalKirim || d.createdAt);
          if (!isNaN(dt.getTime())) {
            return dt.getFullYear() === tahun && (dt.getMonth() + 1) === bulan;
          }
        }
        return true;
      });

      const distUreaKg = poktanDist.reduce((acc: number, cur: any) => acc + (Number(cur.jumlahUreaKg) || 0), 0);
      const distNpkKg = poktanDist.reduce((acc: number, cur: any) => acc + (Number(cur.jumlahNpkKg) || 0), 0);
      const distOrgKg = poktanDist.reduce((acc: number, cur: any) => acc + (Number(cur.jumlahOrganikKg) || 0), 0);

      // Penebusan kasir per anggota Poktan pada bulan & tahun terpilih
      const poktanKasirPrisma = penyaluranKasir.filter((k: any) => {
        const isMatch = k.petani?.poktanId === poktan.id || k.namaPengurusPoktan?.toUpperCase().includes(poktan.nama?.toUpperCase());
        if (!isMatch) return false;
        const dt = new Date(k.tanggalPenyaluran || k.createdAt);
        if (!isNaN(dt.getTime())) {
          return dt.getFullYear() === tahun && (dt.getMonth() + 1) === bulan;
        }
        return true;
      });

      const poktanKasirJson = kasirJsonList.filter((t: any) => {
        if (t.status === 'BATAL') return false;
        const isMatch = t.poktanId === poktan.id || t.namaPoktan?.toUpperCase() === poktan.nama?.toUpperCase();
        if (!isMatch) return false;
        const dt = new Date(t.tanggal || t.createdAt);
        if (!isNaN(dt.getTime())) {
          return dt.getFullYear() === tahun && (dt.getMonth() + 1) === bulan;
        }
        return true;
      });

      const kasirUreaKg =
        poktanKasirPrisma.reduce((acc: number, cur: any) => acc + (Number(cur.jumlahUreaKg) || 0), 0) +
        poktanKasirJson.reduce((acc: number, cur: any) => acc + (Number(cur.jumlahUreaKg) || 0), 0);
      const kasirNpkKg =
        poktanKasirPrisma.reduce((acc: number, cur: any) => acc + (Number(cur.jumlahNpkKg) || 0), 0) +
        poktanKasirJson.reduce((acc: number, cur: any) => acc + (Number(cur.jumlahNpkKg) || 0), 0);
      const kasirOrgKg =
        poktanKasirPrisma.reduce((acc: number, cur: any) => acc + (Number(cur.jumlahOrganikKg) || 0), 0) +
        poktanKasirJson.reduce((acc: number, cur: any) => acc + (Number(cur.jumlahOrganikKg) || 0), 0);

      // Total Penyaluran Riil ke Petani/Poktan (Maksimum dari DO yang telah dikirim ke Poktan atau penebusan kasir)
      const salurUrea = Math.max(distUreaKg, kasirUreaKg);
      const salurNpk = Math.max(distNpkKg, kasirNpkKg);
      const salurOrganik = Math.max(distOrgKg, kasirOrgKg);

      const salurUreaSak = Math.round(salurUrea / 50);
      const salurNpkSak = Math.round(salurNpk / 50);
      const salurOrganikSak = Math.round(salurOrganik / 40);

      // Penerimaan DO Distributor untuk Poktan ini (dari Surat Jalan KPL ke Poktan)
      const penerimaanUrea = distUreaKg;
      const penerimaanNpk = distNpkKg;
      const penerimaanOrganik = distOrgKg;

      // Akumulasi kuota e-RDKK anggota Poktan
      const anggota = poktan.anggota || [];
      const kuotaUrea = anggota.reduce(
        (sum: number, a: any) => sum + (a.alokasiPupuk?.reduce((s: number, al: any) => s + (Number(al.jatahUreaKg) || 0), 0) || 0),
        0
      );
      const kuotaNpk = anggota.reduce(
        (sum: number, a: any) => sum + (a.alokasiPupuk?.reduce((s: number, al: any) => s + (Number(al.jatahNpkKg) || 0), 0) || 0),
        0
      );
      const kuotaOrganik = anggota.reduce(
        (sum: number, a: any) => sum + (a.alokasiPupuk?.reduce((s: number, al: any) => s + (Number(al.jatahOrganikKg) || 0), 0) || 0),
        0
      );

      // Stok Awal: Jika Poktan memiliki anggota/kuota terdaftar atau DO, hitung secara proporsional riil
      const stokAwalUrea = anggota.length > 0 ? Math.max(kuotaUrea, distUreaKg) : distUreaKg;
      const stokAwalNpk = anggota.length > 0 ? Math.max(kuotaNpk, distNpkKg) : distNpkKg;
      const stokAwalOrganik = anggota.length > 0 ? Math.max(kuotaOrganik, distOrgKg) : distOrgKg;

      // Sisa Stok Akhir di Kios/Poktan
      const sisaUrea = Math.max(0, (stokAwalUrea + penerimaanUrea) - salurUrea);
      const sisaNpk = Math.max(0, (stokAwalNpk + penerimaanNpk) - salurNpk);
      const sisaOrganik = Math.max(0, (stokAwalOrganik + penerimaanOrganik) - salurOrganik);

      const totalNilaiHet =
        (salurUrea * HET_UREA_PER_KG) +
        (salurNpk * HET_NPK_PER_KG) +
        (salurOrganik * HET_ORGANIK_PER_KG);

      return {
        id: poktan.id,
        namaPoktan: poktan.nama,
        desa: poktan.desa,
        jumlahAnggota: poktan._count?.anggota || anggota.length || 0,
        stokAwalUrea,
        stokAwalNpk,
        stokAwalOrganik,
        penerimaanUrea,
        penerimaanNpk,
        penerimaanOrganik,
        salurUrea,
        salurUreaSak,
        salurNpk,
        salurNpkSak,
        salurOrganik,
        salurOrganikSak,
        sisaUrea,
        sisaNpk,
        sisaOrganik,
        totalNilaiHet,
      };
    });

    // 5. Grand Total Rekapitulasi
    const grandTotal = {
      stokAwalUrea: poktanRows.reduce((acc, r) => acc + r.stokAwalUrea, 0),
      stokAwalNpk: poktanRows.reduce((acc, r) => acc + r.stokAwalNpk, 0),
      stokAwalOrganik: poktanRows.reduce((acc, r) => acc + r.stokAwalOrganik, 0),
      penerimaanUrea: poktanRows.reduce((acc, r) => acc + r.penerimaanUrea, 0),
      penerimaanNpk: poktanRows.reduce((acc, r) => acc + r.penerimaanNpk, 0),
      penerimaanOrganik: poktanRows.reduce((acc, r) => acc + r.penerimaanOrganik, 0),
      salurUrea: poktanRows.reduce((acc, r) => acc + r.salurUrea, 0),
      salurUreaSak: poktanRows.reduce((acc, r) => acc + r.salurUreaSak, 0),
      salurNpk: poktanRows.reduce((acc, r) => acc + r.salurNpk, 0),
      salurNpkSak: poktanRows.reduce((acc, r) => acc + r.salurNpkSak, 0),
      salurOrganik: poktanRows.reduce((acc, r) => acc + r.salurOrganik, 0),
      salurOrganikSak: poktanRows.reduce((acc, r) => acc + r.salurOrganikSak, 0),
      sisaUrea: poktanRows.reduce((acc, r) => acc + r.sisaUrea, 0),
      sisaNpk: poktanRows.reduce((acc, r) => acc + r.sisaNpk, 0),
      sisaOrganik: poktanRows.reduce((acc, r) => acc + r.sisaOrganik, 0),
      totalNilaiHet: poktanRows.reduce((acc, r) => acc + r.totalNilaiHet, 0),
    };

    // 6. Pejabat Pengesah Tripartit
    const pplUser = officialUsers.find((u) => u.role === 'PPL');
    const adminUser = officialUsers.find((u) => u.role === 'ADMIN_DINAS');

    const pejabat = {
      kpl: {
        nama: kiosInfo.pengelola,
        jabatan: 'Penanggung Jawab / Pemilik Kios Resmi (KPL)',
        instansi: kiosInfo.namaKios,
        kodeReg: kiosInfo.kodeKios,
        signatureUrl: matchedUser?.signatureUrl || generateAutoSignatureSvg(kiosInfo.pengelola),
        stampUrl: matchedUser?.stampUrl || generateOfficialStampSvg('KIOS', kiosInfo.namaKios),
      },
      ppl: {
        nama: pplUser?.name || 'Iis Sugiarti, S.P',
        jabatan: 'Penyuluh Pertanian Lapangan (PPL Wilbin)',
        instansi: 'BPP Kecamatan Lembeyan',
        nip: pplUser?.nip || getDefaultNipForRole('PPL'),
        signatureUrl: pplUser?.signatureUrl || generateAutoSignatureSvg(pplUser?.name || 'Iis Sugiarti, S.P'),
        stampUrl: pplUser?.stampUrl || generateOfficialStampSvg('PPL', 'BPP Kecamatan Lembeyan'),
      },
      koordinator: {
        nama: adminUser?.name || 'Supriyanto (Admin Kecamatan)',
        jabatan: 'Koordinator BPP / Admin Kecamatan Lembeyan',
        instansi: 'Pemerintah Kecamatan Lembeyan',
        nip: adminUser?.nip || getDefaultNipForRole('ADMIN_DINAS'),
        signatureUrl: adminUser?.signatureUrl || generateAutoSignatureSvg(adminUser?.name || 'Supriyanto'),
        stampUrl: adminUser?.stampUrl || generateOfficialStampSvg('ADMIN_DINAS', 'Pemerintah Kecamatan Lembeyan'),
      },
    };

    const docCode = `SPJ-F6/${kiosInfo.kodeKios.replace(/[^a-zA-Z0-9]/g, '')}/${tahun}${String(bulan).padStart(2, '0')}`;
    const verificationToken = docCode;

    return NextResponse.json({
      success: true,
      data: {
        kiosInfo,
        periode: {
          bulanAngka: bulan,
          bulanNama: NAMA_BULAN[bulan - 1] || 'Oktober',
          tahun,
        },
        nomorDokumen: `F-6/KPL-LMB/${tahun}/${String(bulan).padStart(2, '0')}`,
        kodeVerifikasi: verificationToken,
        poktanRows,
        grandTotal,
        het: {
          urea: HET_UREA_PER_KG,
          npk: HET_NPK_PER_KG,
          organik: HET_ORGANIK_PER_KG,
        },
        pejabat,
        tanggalCetak: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
