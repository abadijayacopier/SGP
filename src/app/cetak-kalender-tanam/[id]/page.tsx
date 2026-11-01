import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PrintButton from '@/app/cetak-lahan/[id]/PrintButton';
import QrCodeView from '@/components/ui/QrCodeView';
import {
  formatRupiah,
  formatAngka,
  hitungRekomendasiPupuk,
} from '@/lib/calculations';
import {
  getDefaultNipForRole,
  generateAutoSignatureSvg,
  generateOfficialStampSvg,
} from '@/lib/signature-utils';
import {
  Calendar,
  Sprout,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  Layers,
  Phone,
  FileText,
} from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ mt?: string; tgl?: string }>;
}

export const dynamic = 'force-dynamic';

const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export default async function CetakKalenderTanamPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = (await searchParams) || {};
  const musimParam = query.mt || 'MT-1';
  const tglTanamStr = query.tgl || new Date().toISOString().slice(0, 10);

  let lahan: any = null;
  let pplUser: any = null;

  try {
    lahan = await prisma.lahan.findUnique({
      where: { id },
      include: {
        petani: {
          include: {
            poktan: true,
          },
        },
      },
    });

    // Fallback: jika id yang dikirim adalah petaniId, ambil petak lahan pertama miliknya
    if (!lahan) {
      lahan = await prisma.lahan.findFirst({
        where: { petaniId: id },
        include: {
          petani: {
            include: {
              poktan: true,
            },
          },
        },
      });
    }

    pplUser = await prisma.user.findFirst({
      where: { role: 'PPL' },
      orderBy: { updatedAt: 'desc' },
    });
  } catch (err) {
    console.error('[CetakKalenderTanamPage] Database fetch error:', err);
  }

  if (!lahan) {
    notFound();
  }

  const numericLuas = lahan.luasHa;
  const rekomendasi = hitungRekomendasiPupuk(lahan.komoditas, numericLuas);

  const addDays = (baseDateStr: string, days: number) => {
    const d = new Date(baseDateStr || new Date());
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const masaPanenHari =
    lahan.komoditas === 'Padi'
      ? 105
      : lahan.komoditas === 'Jagung'
      ? 95
      : lahan.komoditas === 'Kedelai'
      ? 85
      : lahan.komoditas === 'Tebu'
      ? 300
      : 90;

  // Jadwal Fase Spesifik Komoditas
  const getFaseList = () => {
    if (lahan.komoditas === 'Padi') {
      return [
        {
          fase: 'FASE 1: 0–7 HST',
          nama: 'Pemupukan Dasar (Olah Tanah & Tanam)',
          waktu: addDays(tglTanamStr, 5),
          urea: Math.round(rekomendasi.ureaKg * 0.3),
          npk: Math.round(rekomendasi.npkKg * 0.5),
          organik: rekomendasi.organikKg,
          instruksi:
            'Aplikasi saat kondisi air sawah macak-macak (1-2 cm). Ditebar merata untuk mempercepat perakaran dan merangsang anakan awal.',
        },
        {
          fase: 'FASE 2: 21–25 HST',
          nama: 'Pemupukan Susulan I (Vegetatif Aktif)',
          waktu: addDays(tglTanamStr, 21),
          urea: Math.round(rekomendasi.ureaKg * 0.4),
          npk: Math.round(rekomendasi.npkKg * 0.5),
          organik: 0,
          instruksi:
            'Aplikasi anakan aktif produktif. Pastikan saluran pembuangan ditutup 2-3 hari agar larutan pupuk terserap maksimal ke perakaran padi.',
        },
        {
          fase: 'FASE 3: 35–42 HST',
          nama: 'Pemupukan Susulan II (Primordia / Bunting)',
          waktu: addDays(tglTanamStr, 38),
          urea: Math.round(rekomendasi.ureaKg * 0.3),
          npk: 0,
          organik: 0,
          instruksi:
            'Aplikasi pengisian bulir padi sebelum bunting mekar. Mencegah gabah hampa dan meningkatkan bobot gabah kering panen (GKP).',
        },
      ];
    } else if (lahan.komoditas === 'Jagung') {
      return [
        {
          fase: 'FASE 1: 7–10 HST',
          nama: 'Pemupukan Dasar (Awal Pertumbuhan)',
          waktu: addDays(tglTanamStr, 8),
          urea: Math.round(rekomendasi.ureaKg * 0.3),
          npk: Math.round(rekomendasi.npkKg * 0.5),
          organik: rekomendasi.organikKg,
          instruksi:
            'Ditugal di samping tanaman jarak 5-7 cm, tutup tanah tipis agar pupuk tidak menguap terkena panas terik matahari.',
        },
        {
          fase: 'FASE 2: 21–28 HST',
          nama: 'Pemupukan Susulan I (Vegetatif Cepat)',
          waktu: addDays(tglTanamStr, 25),
          urea: Math.round(rekomendasi.ureaKg * 0.4),
          npk: Math.round(rekomendasi.npkKg * 0.5),
          organik: 0,
          instruksi:
            'Ditugal jarak 10 cm dari batang. Lakukan pembubunan tanah pangkal batang untuk memperkuat akar jangkar jagung.',
        },
        {
          fase: 'FASE 3: 42–45 HST',
          nama: 'Pemupukan Susulan II (Pembungaan & Tongkol)',
          waktu: addDays(tglTanamStr, 43),
          urea: Math.round(rekomendasi.ureaKg * 0.3),
          npk: 0,
          organik: 0,
          instruksi:
            'Memaksimalkan pengisian biji jagung sampai ujung tongkol. Menghindarkan tongkol kerdil atau biji ompong.',
        },
      ];
    } else if (lahan.komoditas === 'Kedelai') {
      return [
        {
          fase: 'FASE 1: 0–7 HST',
          nama: 'Pemupukan Dasar (Awal Tanam)',
          waktu: addDays(tglTanamStr, 4),
          urea: 0,
          npk: Math.round(rekomendasi.npkKg * 0.5),
          organik: rekomendasi.organikKg,
          instruksi:
            'Kedelai mengikat nitrogen mandiri via bintil akar. Fokuskan asupan fosfat & kalium untuk penguatan perakaran.',
        },
        {
          fase: 'FASE 2: 20–25 HST',
          nama: 'Pemupukan Susulan I (Pra-Bunga)',
          waktu: addDays(tglTanamStr, 21),
          urea: 0,
          npk: Math.round(rekomendasi.npkKg * 0.5),
          organik: 0,
          instruksi:
            'Penguatan cabang produktif dan pembentukan calon bunga yang serempak.',
        },
        {
          fase: 'FASE 3: 40–45 HST',
          nama: 'Pemupukan Susulan II (Pengisian Polong)',
          waktu: addDays(tglTanamStr, 42),
          urea: rekomendasi.ureaKg,
          npk: 0,
          organik: 0,
          instruksi:
            'Dosis ringan perangsang pembesaran polong kedelai agar biji montok dan berbobot seragam.',
        },
      ];
    } else {
      return [
        {
          fase: 'FASE 1: 0–15 HST',
          nama: 'Pemupukan Dasar / Keprasan',
          waktu: addDays(tglTanamStr, 10),
          urea: Math.round(rekomendasi.ureaKg * 0.3),
          npk: Math.round(rekomendasi.npkKg * 0.4),
          organik: rekomendasi.organikKg,
          instruksi: 'Ditabur pada juringan tanam / dekat keprasan, ditutup tanah olahan.',
        },
        {
          fase: 'FASE 2: 45–60 HST',
          nama: 'Pemupukan Susulan I (Pertumbuhan Batang)',
          waktu: addDays(tglTanamStr, 50),
          urea: Math.round(rekomendasi.ureaKg * 0.4),
          npk: Math.round(rekomendasi.npkKg * 0.6),
          organik: 0,
          instruksi: 'Ditabur di larikan, diikuti pembumbunan I untuk menopang tegakan anakan.',
        },
        {
          fase: 'FASE 3: 90–120 HST',
          nama: 'Pemupukan Susulan II (Pemanjangan Ruas Batang)',
          waktu: addDays(tglTanamStr, 100),
          urea: Math.round(rekomendasi.ureaKg * 0.3),
          npk: 0,
          organik: 0,
          instruksi: 'Meningkatkan bobot tebu dan rendemen sukrosa batang sebelum tebang.',
        },
      ];
    }
  };

  const faseList = getFaseList();
  const tglCetak = new Date();
  const formatTglCetak = `${tglCetak.getDate()} ${BULAN_INDONESIA[tglCetak.getMonth()]} ${tglCetak.getFullYear()}`;

  const pplName = pplUser?.name || 'Iis Sugiarti, S.P';
  const pplNip = pplUser?.nip || getDefaultNipForRole('PPL', pplUser?.username);
  const signatureSvg = generateAutoSignatureSvg(pplName, '#1e3a8a');
  const stampSvg = generateOfficialStampSvg('PPL', 'BPP KEC. LEMBEYAN');

  const verificationUrl = `https://pertanian-lembeyan.magetan.go.id/cek-kuota?tab=kalkulator&lahanId=${lahan.id}&mt=${musimParam}`;

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-10 text-slate-900 print:bg-white print:py-0 print:px-0">
      {/* Action Bar Atas (Hanya tampil di layar, disembunyikan saat cetak) */}
      <div className="max-w-4xl mx-auto px-4 mb-6 flex items-center justify-between no-print">
        <Link
          href={`/cek-kuota?tab=kalkulator&lahanId=${lahan.id}`}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-emerald-700 bg-white px-4 py-2 rounded-xl shadow-xs border border-slate-200 transition"
        >
          &larr; Kembali ke Kalkulator
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/cetak-lahan/${lahan.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl border border-slate-300 transition"
          >
            <Layers className="w-4 h-4 text-emerald-700" />
            Cetak Surat Lahan GIS
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* Dokumen Lembar Cetak A4 Presisi 1 Halaman */}
      <div
        className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl print:rounded-none print:shadow-none border border-slate-200 p-6 sm:p-10 space-y-4 print:p-0 print:space-y-2 print:border-none print-page-fit"
        style={{
          colorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {/* KOP SURAT RESMI */}
        <div className="border-b-4 border-double border-slate-900 pb-3 print:pb-2 flex items-center gap-4 print:gap-3">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 print:w-14 print:h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs border-2 border-emerald-900"
            style={{ backgroundColor: '#065f46' }}
          >
            <Sprout className="w-9 h-9 sm:w-10 sm:h-10 print:w-7 print:h-7 text-amber-300" />
          </div>
          <div className="flex-1 text-center font-serif">
            <h3 className="text-xs sm:text-sm print:text-[11px] font-bold tracking-widest uppercase text-slate-700">
              Pemerintah Kabupaten Magetan
            </h3>
            <h2 className="text-sm sm:text-base print:text-xs font-black tracking-wider uppercase text-slate-900">
              Kecamatan Lembeyan &bull; Dinas Tanaman Pangan dan Hortikultura
            </h2>
            <h1 className="text-base sm:text-lg print:text-sm font-black uppercase text-emerald-950 tracking-tight">
              Balai Penyuluhan Pertanian (BPP) Wilayah Kecamatan Lembeyan
            </h1>
            <p className="text-[10.5px] print:text-[9px] font-sans text-slate-600 mt-0.5">
              Jl. Raya Lembeyan - Parang No. 14, Kec. Lembeyan, Kab. Magetan, Jawa Timur 63372
              &bull; Posluh: (0351) 438-BPP &bull; Email: bpp.lembeyan@magetan.go.id
            </p>
          </div>
        </div>

        {/* JUDUL DOKUMEN & IDENTITAS BLOK */}
        <div className="text-center space-y-0.5">
          <span
            className="text-[9.5px] print:text-[8.5px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full inline-block"
            style={{
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #6ee7b7',
            }}
          >
            Dokumen Rekomendasi Teknis Pemupukan Presisi Berbasis Geospasial
          </span>
          <h2 className="text-base sm:text-lg print:text-sm font-black text-slate-900 uppercase underline decoration-emerald-600 decoration-2 underline-offset-2">
            KARTU JADWAL KALENDER TANAM & DOSIS PEMUPUKAN BERIMBANG
          </h2>
          <p className="text-[11px] print:text-[9.5px] font-mono font-bold text-slate-600">
            Nomor: 521.1/BPP-LMB/{lahan.kodeLahan}/2026 &bull; Periode: {musimParam}
          </p>
        </div>

        {/* TABEL DATA PETANI & SPESIFIKASI LAHAN (KONSISTEN 2 KOLOM DALAM LAYAR MAUPUN CETAK) */}
        <div className="grid grid-cols-2 gap-3 print:gap-2.5 text-xs print:text-[10px]">
          <div
            className="p-3 print:p-2 rounded-xl space-y-1.5"
            style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <div className="font-bold text-emerald-900 uppercase border-b border-slate-200 pb-1 text-[10.5px] print:text-[9.5px] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              Identitas Petani / Penggarap
            </div>
            <table className="w-full text-slate-800">
              <tbody>
                <tr>
                  <td className="py-0.5 text-slate-500 w-28 font-medium">Nama Petani</td>
                  <td className="py-0.5 font-bold">: {lahan.petani?.nama || '-'}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-slate-500 font-medium">NIK KTP</td>
                  <td className="py-0.5 font-mono font-bold">: {lahan.petani?.nik || '-'}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-slate-500 font-medium">Kelompok Tani</td>
                  <td className="py-0.5 font-bold">: {lahan.petani?.poktan?.nama || '-'}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-slate-500 font-medium">Desa / Domisili</td>
                  <td className="py-0.5">: {lahan.petani?.desa || 'Kediren'}, Lembeyan</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-slate-500 font-medium">Kontak HP / WA</td>
                  <td className="py-0.5 font-mono">: {lahan.petani?.telepon || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            className="p-3 print:p-2 rounded-xl space-y-1.5"
            style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <div className="font-bold text-emerald-900 uppercase border-b border-slate-200 pb-1 text-[10.5px] print:text-[9.5px] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              Spesifikasi Petak Sawah Geospasial
            </div>
            <table className="w-full text-slate-800">
              <tbody>
                <tr>
                  <td className="py-0.5 text-slate-500 w-32 font-medium">Nama Blok Lahan</td>
                  <td className="py-0.5 font-bold">: {lahan.namaLahan}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-slate-500 font-medium">Kode Petak GIS</td>
                  <td className="py-0.5 font-mono font-bold text-emerald-800">: {lahan.kodeLahan}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-slate-500 font-medium">Komoditas / Musim</td>
                  <td className="py-0.5 font-bold">: {lahan.komoditas} ({musimParam === 'MT-1' ? 'MT 1 Walikan (Padi)' : musimParam === 'MT-2' ? 'MT 2 Kemarau (Palawija)' : musimParam === 'MT-3' ? 'MT 3 Rendeng (Padi)' : musimParam})</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-slate-500 font-medium">Luas Lahan Terukur</td>
                  <td className="py-0.5 font-bold text-slate-900">
                    : {lahan.luasHa} Ha ({lahan.luasM2.toLocaleString('id-ID')} m²)
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5 text-slate-500 font-medium">Mulai Tanam (0 HST)</td>
                  <td className="py-0.5 font-bold text-emerald-800">
                    : {addDays(tglTanamStr, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* RINGKASAN REKOMENDASI KUOTA PUPUK BPP */}
        <div
          className="rounded-xl p-3 print:p-2"
          style={{
            backgroundColor: '#ecfdf5',
            border: '1.5px solid #059669',
          }}
        >
          <div className="text-[10.5px] print:text-[9.5px] font-black uppercase tracking-wider text-emerald-950 mb-1.5 flex items-center justify-between">
            <span>Rekomendasi Alokasi Pupuk Bersubsidi Musim Tanam ({musimParam})</span>
            <span className="text-amber-900 font-mono font-bold">
              Total Tebus HET: {formatRupiah(rekomendasi.ureaKg * 2250 + rekomendasi.npkKg * 2300 + rekomendasi.organikKg * 800)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5 print:gap-2 text-center">
            <div
              className="p-2 print:p-1 rounded-lg"
              style={{ backgroundColor: '#ffffff', border: '1px solid #a7f3d0' }}
            >
              <span className="text-[9.5px] print:text-[8.5px] text-slate-500 uppercase font-bold block">Urea (Nitrogen)</span>
              <span className="text-base print:text-sm font-black text-emerald-900">{rekomendasi.ureaKg} Kg</span>
              <span className="text-[9px] print:text-[8px] text-slate-400 block">@Rp 2.250 / Kg</span>
            </div>
            <div
              className="p-2 print:p-1 rounded-lg"
              style={{ backgroundColor: '#ffffff', border: '1px solid #a7f3d0' }}
            >
              <span className="text-[9.5px] print:text-[8.5px] text-slate-500 uppercase font-bold block">NPK Phonska</span>
              <span className="text-base print:text-sm font-black text-amber-900">{rekomendasi.npkKg} Kg</span>
              <span className="text-[9px] print:text-[8px] text-slate-400 block">@Rp 2.300 / Kg</span>
            </div>
            <div
              className="p-2 print:p-1 rounded-lg"
              style={{ backgroundColor: '#ffffff', border: '1px solid #a7f3d0' }}
            >
              <span className="text-[9.5px] print:text-[8.5px] text-slate-500 uppercase font-bold block">Organik Petroganik</span>
              <span className="text-base print:text-sm font-black text-teal-900">{rekomendasi.organikKg} Kg</span>
              <span className="text-[9px] print:text-[8px] text-slate-400 block">@Rp 800 / Kg</span>
            </div>
          </div>
        </div>

        {/* TABEL JADWAL APLIKASI TAHAP PEMUPUKAN & KALENDER HST */}
        <div className="space-y-1">
          <h4 className="text-[11px] print:text-[10px] font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-700" />
            Matriks Kalender Aplikasi Pemupukan Presisi Berimbang
          </h4>

          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-xs print:text-[9.5px] text-left border-collapse border border-slate-300">
              <thead className="print-dark-header">
                <tr
                  className="bg-slate-900 print:bg-slate-900 text-white print:text-white text-[10px] print:text-[9px] uppercase tracking-wider font-bold print-dark-header"
                  style={{ backgroundColor: '#0f172a', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                >
                  <th className="py-2 px-2.5 border-r border-slate-700 text-center w-28 bg-slate-900 print:bg-slate-900 text-white print:text-white print-dark-header font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Fase HST</th>
                  <th className="py-2 px-2.5 border-r border-slate-700 w-32 text-center bg-slate-900 print:bg-slate-900 text-white print:text-white print-dark-header font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Tanggal Pelaksanaan</th>
                  <th className="py-2 px-2 border-r border-slate-700 text-center w-20 bg-slate-900 print:bg-slate-900 text-white print:text-white print-dark-header font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Urea (Kg)</th>
                  <th className="py-2 px-2 border-r border-slate-700 text-center w-20 bg-slate-900 print:bg-slate-900 text-white print:text-white print-dark-header font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>NPK (Kg)</th>
                  <th className="py-2 px-2 border-r border-slate-700 text-center w-20 bg-slate-900 print:bg-slate-900 text-white print:text-white print-dark-header font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Organik (Kg)</th>
                  <th className="py-2 px-2.5 bg-slate-900 print:bg-slate-900 text-white print:text-white print-dark-header font-bold" style={{ backgroundColor: '#0f172a', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Petunjuk Teknis Agronomi BPP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {faseList.map((f, idx) => (
                  <tr
                    key={idx}
                    style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}
                  >
                    <td className="py-1.5 px-2.5 font-bold text-slate-900 border-r border-slate-200 text-center">
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[9.5px] print:text-[8.5px] font-mono font-bold"
                        style={{ backgroundColor: '#e2e8f0', color: '#0f172a' }}
                      >
                        {f.fase}
                      </span>
                      <div className="text-[9.5px] print:text-[8.5px] text-slate-600 font-sans mt-0.5 font-semibold">
                        {f.nama}
                      </div>
                    </td>
                    <td className="py-1.5 px-2.5 font-bold text-emerald-900 border-r border-slate-200 text-center font-mono">
                      {f.waktu}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold text-emerald-800 border-r border-slate-200">
                      {f.urea > 0 ? `${f.urea} Kg` : '-'}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold text-amber-800 border-r border-slate-200">
                      {f.npk > 0 ? `${f.npk} Kg` : '-'}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold text-teal-800 border-r border-slate-200">
                      {f.organik > 0 ? `${f.organik} Kg` : '-'}
                    </td>
                    <td className="py-1.5 px-2.5 text-[10px] print:text-[9px] text-slate-700 leading-tight">
                      {f.instruksi}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ESTIMASI PANEN RAYA */}
        <div
          className="p-2.5 print:p-1.5 rounded-lg flex items-center justify-between text-xs print:text-[10px]"
          style={{ backgroundColor: '#fffbeb', border: '1.5px solid #f59e0b' }}
        >
          <div>
            <span className="font-bold text-amber-950 uppercase tracking-wide">
              Perkiraan Panen Raya Komoditas {lahan.komoditas} (~{masaPanenHari} HST):
            </span>
            <div className="text-[10.5px] print:text-[9px] text-amber-900 font-medium">
              Potensi Hasil Panen Hamparan: ~
              {(numericLuas * (lahan.komoditas === 'Padi' ? 6.5 : 5.8)).toFixed(1)} Ton Gabah / Pipilan Kering
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9.5px] print:text-[8.5px] text-amber-800 block uppercase font-bold">Target Panen</span>
            <span className="text-sm print:text-xs font-black text-amber-950 font-mono">
              {addDays(tglTanamStr, masaPanenHari)}
            </span>
          </div>
        </div>

        {/* TANDA TANGAN & PENGESAHAN RESMI (KOMPAK TINGGI PAS 1 HALAMAN) */}
        <div className="pt-2 border-t-2 border-slate-200 grid grid-cols-3 gap-3 text-center text-xs print:text-[10px]">
          {/* Kolom Kiri: QR Verifikasi */}
          <div className="flex flex-col items-center justify-center space-y-0.5">
            <QrCodeView value={verificationUrl} size={68} />
            <span className="text-[8.5px] print:text-[7.5px] font-mono text-slate-500">Verifikasi Resmi BPP</span>
            <span className="text-[8.5px] print:text-[7.5px] text-slate-600 font-bold">{lahan.kodeLahan}</span>
          </div>

          {/* Kolom Tengah: Petani */}
          <div className="flex flex-col justify-between h-28 print:h-24">
            <div>
              <p className="text-slate-500 text-[10px] print:text-[9px]">Mengetahui,</p>
              <p className="font-bold text-slate-800">Petani Pemilik / Penggarap</p>
            </div>
            <div>
              <p className="font-black text-slate-900 underline text-xs print:text-[10px]">{lahan.petani?.nama || '-'}</p>
              <p className="text-[9.5px] print:text-[8px] font-mono text-slate-500">NIK: {lahan.petani?.nik || '-'}</p>
            </div>
          </div>

          {/* Kolom Kanan: Penyuluh BPP & Stempel Basah */}
          <div className="flex flex-col justify-between h-28 print:h-24 relative">
            <div>
              <p className="text-slate-500 text-[10px] print:text-[9px]">Lembeyan, {formatTglCetak}</p>
              <p className="font-bold text-slate-800">Penyuluh Pertanian Lapangan (PPL)</p>
            </div>

            {/* Stempel & TTD Digital */}
            <div className="relative my-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stampSvg}
                alt="Stempel BPP"
                className="w-20 h-20 print:w-16 print:h-16 absolute -top-3 opacity-80 pointer-events-none"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signatureSvg}
                alt="TTD PPL"
                className="w-32 h-12 print:w-24 print:h-9 relative z-10 pointer-events-none"
              />
            </div>

            <div>
              <p className="font-black text-slate-900 underline text-xs print:text-[10px]">{pplName}</p>
              <p className="text-[9.5px] print:text-[8px] font-mono text-slate-500">{pplNip}</p>
            </div>
          </div>
        </div>

        {/* FOOTER RESMI */}
        <div className="pt-2 border-t border-slate-200 text-center text-[9px] print:text-[8px] text-slate-400 flex items-center justify-between">
          <span>Sistem Informasi Pertanian Terpadu (GIS & e-RDKK) Kec. Lembeyan</span>
          <span>Dikembangkan oleh: Supriyanto Abadi Jaya &bull; Magetan</span>
        </div>
      </div>
    </div>
  );
}
