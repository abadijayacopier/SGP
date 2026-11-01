import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import KartuTaniClient from './KartuTaniClient';
import QrCodeView from '@/components/ui/QrCodeView';
import { Sprout, ShieldCheck, Layers, MapPin, CreditCard } from 'lucide-react';
import { formatAngka } from '@/lib/calculations';
import {
  getDefaultNipForRole,
  generateAutoSignatureSvg,
  generateOfficialStampSvg,
} from '@/lib/signature-utils';

interface Props {
  params: Promise<{ id: string }>;
}

const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const dynamic = 'force-dynamic';

export default async function CetakKartuTaniPage({ params }: Props) {
  const { id } = await params;

  let petani: any = null;
  let pplUser: any = null;
  let petaniUser: any = null;
  let poktanUser: any = null;

  try {
    const results = await Promise.all([
      prisma.petani.findUnique({
        where: { id },
        include: {
          poktan: true,
          lahan: true,
          alokasiPupuk: true,
          penyaluranPupuk: {
            orderBy: { tanggalPenyaluran: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.user.findFirst({
        where: { role: 'PPL' },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    petani = results[0];
    pplUser = results[1];

    if (petani) {
      const userResults = await Promise.all([
        prisma.user.findFirst({
          where: {
            OR: [{ username: petani.nik }, { role: 'PETANI', name: petani.nama }],
          },
        }),
        prisma.user.findFirst({
          where: {
            role: 'POKTAN',
            OR: [
              { poktanId: petani.poktanId },
              { name: { contains: petani.poktan?.ketua || 'Suparman' } },
            ],
          },
        }),
      ]);
      petaniUser = userResults[0];
      poktanUser = userResults[1];
    }
  } catch (err) {
    console.error('[CetakKartuTaniPage] Database query error:', err);
  }

  if (!petani) {
    notFound();
  }

  const petaniSig =
    petaniUser?.signatureUrl || generateAutoSignatureSvg(petani.nama);
  const poktanName = poktanUser?.name || petani.poktan?.ketua || 'H. Suparman';
  const poktanSig =
    poktanUser?.signatureUrl || generateAutoSignatureSvg(poktanName);
  const poktanStamp =
    poktanUser?.stampUrl !== undefined && poktanUser?.stampUrl !== null
      ? poktanUser.stampUrl
      : generateOfficialStampSvg('POKTAN', petani.poktan?.nama);
  const poktanNip = poktanUser?.nip || getDefaultNipForRole('POKTAN');

  const pplName = pplUser?.name || 'Iis Sugiarti, S.P';
  const pplSig = pplUser?.signatureUrl || generateAutoSignatureSvg(pplName);
  const pplStamp =
    pplUser?.stampUrl !== undefined && pplUser?.stampUrl !== null
      ? pplUser.stampUrl
      : generateOfficialStampSvg('PPL', pplUser?.wilayah || 'BPP Kec. Lembeyan');
  const pplNip = pplUser?.nip || getDefaultNipForRole('PPL');

  const nomorKartu = `KT-3509-2026-${petani.nik.slice(-6)}`;
  const qrPayload = `/verifikasi?code=${petani.nik}`;
  const alokasiAktif = petani.alokasiPupuk?.[0];
  const fotoPetani =
    petaniUser?.avatarUrl ||
    petani.penyaluranPupuk?.[0]?.fotoDiri ||
    '/uploads/sample_petani_face.svg';

  const now = new Date();
  const tanggalCetak = `${now.getDate()} ${BULAN_INDONESIA[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-10 text-slate-900 print:bg-white print:py-0">
      {/* Client Action Bar */}
      <KartuTaniClient
        petaniId={petani.id}
        namaPetani={petani.nama}
        nik={petani.nik}
        qrPayload={qrPayload}
      />

      {/* Lembar Cetak A4 */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-10 print:border-none print:shadow-none print:p-0 space-y-6 print:space-y-3 print-page">
        {/* Kop Lembar Kartu Tani */}
        <div className="border-b-2 border-slate-800 pb-3 flex items-center justify-between gap-4 print:pb-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Dokumen Identitas Elektronik Petani (e-RDKK & GIS)
            </span>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-1 print:text-lg">
              KARTU TANI DIGITAL & KARTU KENDALI ALOKASI PUPUK BERSUBSIDI
            </h1>
            <p className="text-xs text-slate-500 print:text-[11px]">
              Pemerintah Kecamatan Lembeyan &bull; BPP Kecamatan Lembeyan &bull; Pengembang: Supriyanto Abadi Jaya
            </p>
          </div>
          <div className="text-right text-xs font-mono text-slate-600 shrink-0">
            <div className="font-bold text-slate-900">{nomorKartu}</div>
            <div className="text-[10px]">Terbit: {tanggalCetak}</div>
          </div>
        </div>

        {/* SECTION 1: KARTU TANI ID CARD (TAMPAK DEPAN & BELAKANG) */}
        <div className="print-avoid-break">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 print:text-[10px]">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Potong pada garis putus-putus untuk ukuran Kartu ID Standar (CR-80 Dua Sisi)
            </h2>
            <span className="text-[11px] text-slate-400 italic print:text-[9px]">✂️ Garis Potong Kartu</span>
          </div>

          <div
            className="p-3 sm:p-4 border-2 border-dashed border-slate-400 rounded-2xl sm:rounded-3xl bg-slate-50/50 grid grid-cols-2 gap-3 sm:gap-5 items-stretch print:grid-cols-2 print:gap-3"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
          >
            {/* SISI DEPAN KARTU TANI */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-950 text-white p-3.5 sm:p-5 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[235px] border border-emerald-700 print:min-h-[220px] print:p-3.5">
              <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-emerald-400/10 pointer-events-none" />

              {/* Header Kartu Depan */}
              <div className="flex items-start justify-between gap-2 border-b border-emerald-700/80 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0">
                    <Sprout className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-amber-300 leading-none">
                      KARTU TANI DIGITAL
                    </div>
                    <div className="text-[8px] sm:text-[9px] text-emerald-200 font-medium mt-0.5">
                      PEMERINTAH KECAMATAN LEMBEYAN &bull; e-ALOKASI
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[9px] sm:text-[10px] font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/60 text-emerald-200">
                  {nomorKartu}
                </span>
              </div>

              {/* Body Kartu Depan: Foto, Chip, Biodata & QR */}
              <div className="my-2 sm:my-3 flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Foto Petani */}
                  <div className="w-14 h-18 sm:w-16 sm:h-20 rounded-xl bg-white p-0.5 shadow-sm shrink-0 overflow-hidden border border-amber-300">
                    <img
                      src={fotoPetani}
                      alt={petani.nama}
                      className="w-full h-full object-cover rounded-lg bg-slate-100"
                    />
                  </div>

                  {/* Identitas */}
                  <div className="space-y-0.5">
                    {/* Simulasi Smart Chip */}
                    <div className="w-7 h-4 sm:w-8 sm:h-5 rounded bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 border border-amber-700/40 mb-1 shadow-2xs" />
                    <div className="text-xs sm:text-sm font-black tracking-tight text-white uppercase leading-tight line-clamp-1">
                      {petani.nama}
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-mono text-amber-300 font-bold">
                      NIK: {petani.nik}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-emerald-100 font-semibold line-clamp-1">
                      {petani.poktan?.nama}
                    </div>
                    <div className="text-[8px] sm:text-[9px] text-emerald-300/90 line-clamp-1">
                      Desa {petani.desa}, Kec. {petani.kecamatan}
                    </div>
                  </div>
                </div>

                {/* QR Code Scan Cepat */}
                <div className="shrink-0">
                  <QrCodeView value={qrPayload} size={62} />
                </div>
              </div>

              {/* Footer Kartu Depan */}
              <div className="pt-2 border-t border-emerald-700/80 flex items-center justify-between text-[9px] sm:text-[10px]">
                <div>
                  <span className="text-emerald-300">Luas: </span>
                  <strong className="text-amber-300 font-black">
                    {Number(petani.totalLuasLahan || 0).toFixed(2)} Ha ({petani.lahan.length} Blok)
                  </strong>
                </div>
                <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-bold bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  <ShieldCheck className="w-3 h-3 text-amber-300" /> TERVERIFIKASI
                </span>
              </div>
            </div>

            {/* SISI BELAKANG KARTU TANI */}
            <div className="rounded-2xl bg-white border-2 border-slate-300 p-3.5 sm:p-5 shadow-md flex flex-col justify-between min-h-[235px] text-slate-800 print:min-h-[220px] print:p-3.5">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-emerald-800">
                    RINCIAN KUOTA E-RDKK & BLOK SAWAH GIS
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-500">
                    TAHUN ANGGARAN 2026
                  </span>
                </div>

                {/* Tabel Mini Kuota pada Belakang Kartu */}
                {alokasiAktif ? (
                  <div className="grid grid-cols-3 gap-1.5 text-center mb-2.5 print:gap-1 print:mb-2">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-1 sm:p-1.5">
                      <span className="text-[8px] sm:text-[9px] font-bold text-green-700 block uppercase">Jatah Urea</span>
                      <strong className="text-[11px] sm:text-xs font-black text-green-900">{alokasiAktif.jatahUreaKg} Kg</strong>
                      <span className="text-[7px] sm:text-[8px] text-green-600 block">Sisa: {alokasiAktif.sisaUreaKg} Kg</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-1 sm:p-1.5">
                      <span className="text-[8px] sm:text-[9px] font-bold text-amber-700 block uppercase">Jatah NPK</span>
                      <strong className="text-[11px] sm:text-xs font-black text-amber-900">{alokasiAktif.jatahNpkKg} Kg</strong>
                      <span className="text-[7px] sm:text-[8px] text-amber-600 block">Sisa: {alokasiAktif.sisaNpkKg} Kg</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-1 sm:p-1.5">
                      <span className="text-[8px] sm:text-[9px] font-bold text-slate-600 block uppercase">Organik</span>
                      <strong className="text-[11px] sm:text-xs font-black text-slate-800">{alokasiAktif.jatahOrganikKg} Kg</strong>
                      <span className="text-[7px] sm:text-[8px] text-slate-500 block">Sisa: {alokasiAktif.sisaOrganikKg} Kg</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 bg-slate-50 rounded-lg text-[9px] sm:text-[10px] text-slate-400 mb-2.5 text-center">
                    Belum ada alokasi musim tanam aktif
                  </div>
                )}

                {/* Daftar Kode Blok Sawah */}
                <div className="mb-2">
                  <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase block mb-1">
                    Daftar Blok Sawah Terdaftar ({petani.lahan.length} Petak):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {petani.lahan.map((l: any) => (
                      <span
                        key={l.id}
                        className="text-[8px] sm:text-[9px] font-mono font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700"
                      >
                        {l.kodeLahan} ({l.luasHa} Ha - {l.komoditas})
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ketentuan & Pengesahan Belakang Kartu */}
              <div className="pt-2 border-t border-slate-200 flex items-end justify-between text-[8px] sm:text-[9px] text-slate-500">
                <ul className="list-disc list-inside space-y-0.5 max-w-[210px] sm:max-w-[230px] leading-tight">
                  <li>Wajib ditunjukkan beserta KTP asli saat penebusan.</li>
                  <li>Pindai QR Code pada petugas Kios untuk validasi kuota.</li>
                </ul>
                <div className="text-right shrink-0">
                  <span className="block text-[7px] sm:text-[8px] text-slate-400">Disahkan elektronik:</span>
                  <strong className="text-slate-800 font-bold block text-[8px] sm:text-[9px]">Koordinator BPP Kec.</strong>
                  <span className="font-mono text-[7px] sm:text-[8px]">Lembeyan</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: TABEL LAMPIRAN BLOK LAHAN & ALOKASI LENGKAP */}
        <div className="space-y-3 print:space-y-2 print-avoid-break">
          <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <Layers className="w-4 h-4 text-emerald-600" />
            Lampiran Rincian Petak Lahan GIS & Hak Alokasi Pupuk Bersubsidi
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-300 print:text-[10px]">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px] print:text-[10px]">
                <tr>
                  <th className="py-1.5 sm:py-2 px-2 sm:px-3 border-r">Blok</th>
                  <th className="py-1.5 sm:py-2 px-2 border-r text-center">Bentuk Poligon</th>
                  <th className="py-1.5 sm:py-2 px-2 sm:px-3 border-r">Kode GIS & Surat Lahan</th>
                  <th className="py-1.5 sm:py-2 px-2 sm:px-3 border-r">Nama Blok / Hamparan Sawah</th>
                  <th className="py-1.5 sm:py-2 px-2 sm:px-3 border-r">Komoditas</th>
                  <th className="py-1.5 sm:py-2 px-2 sm:px-3 border-r text-center">Luas (Ha / m²)</th>
                  <th className="py-1.5 sm:py-2 px-2 sm:px-3 border-r">No. Pipil / SPPT</th>
                  <th className="py-1.5 sm:py-2 px-2 sm:px-3">Koordinat Patok & Pusat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {petani.lahan.map((l: any, idx: number) => {
                  let pts: [number, number][] = [];
                  try {
                    pts = JSON.parse(l.coordinates || '[]');
                  } catch {
                    pts = [];
                  }
                  const lats = pts.map((p) => p[0]);
                  const lngs = pts.map((p) => p[1]);
                  const minLat = Math.min(...lats);
                  const maxLat = Math.max(...lats);
                  const minLng = Math.min(...lngs);
                  const maxLng = Math.max(...lngs);
                  const cosLat = Math.cos(((l.centerLat || -7.768) * Math.PI) / 180);
                  const wM = Math.max(5, (maxLng - minLng) * 111320 * cosLat);
                  const hM = Math.max(5, (maxLat - minLat) * 110540);
                  const sc = Math.min(48 / wM, 36 / hM);
                  const ox = (60 - wM * sc) / 2;
                  const oy = (44 - hM * sc) / 2;
                  const svgPts = pts
                    .map(([lat, lng]) => {
                      const x = ox + (lng - minLng) * 111320 * cosLat * sc;
                      const y = 44 - oy - (lat - minLat) * 110540 * sc;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ');

                  return (
                    <tr key={l.id}>
                      <td className="py-1.5 sm:py-2 px-2 sm:px-3 border-r font-mono text-center">#{idx + 1}</td>
                      <td className="py-1.5 sm:py-2 px-1.5 border-r text-center">
                        <div className="inline-flex flex-col items-center bg-emerald-950 rounded-lg p-1 border border-emerald-800">
                          <svg width="56" height="40" viewBox="0 0 60 44">
                            {pts.length >= 3 && (
                              <polygon
                                points={svgPts}
                                fill="#22c55e"
                                fillOpacity="0.5"
                                stroke="#86efac"
                                strokeWidth="1.5"
                              />
                            )}
                          </svg>
                          <span className="text-[8px] font-mono text-emerald-300">
                            {pts.length} Patok
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 sm:py-2 px-2 sm:px-3 border-r font-mono font-bold text-emerald-800">
                        <div>{l.kodeLahan}</div>
                        <a
                          href={`/cetak-lahan/${l.id}`}
                          className="text-[9px] sm:text-[10px] font-sans font-bold text-blue-600 hover:underline no-print inline-block mt-0.5"
                        >
                          Buka Surat Lahan &rarr;
                        </a>
                      </td>
                      <td className="py-1.5 sm:py-2 px-2 sm:px-3 border-r font-bold text-slate-900">{l.namaLahan}</td>
                      <td className="py-1.5 sm:py-2 px-2 sm:px-3 border-r font-semibold">{l.komoditas}</td>
                      <td className="py-1.5 sm:py-2 px-2 sm:px-3 border-r text-center font-bold">
                        {l.luasHa} Ha ({formatAngka(l.luasM2)} m²)
                      </td>
                      <td className="py-1.5 sm:py-2 px-2 sm:px-3 border-r font-mono">{l.nomorPipil || '-'}</td>
                      <td className="py-1.5 sm:py-2 px-2 sm:px-3 font-mono text-[9px] sm:text-[10px]">
                        <div className="font-bold text-slate-800">
                          Pusat: {l.centerLat.toFixed(5)}, {l.centerLng.toFixed(5)}
                        </div>
                        {pts[0] && (
                          <div className="text-slate-500">
                            P1: {pts[0][0].toFixed(5)}, {pts[0][1].toFixed(5)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kolom Pengesahan Lembar Kartu Tani */}
        <div className="pt-3 border-t border-slate-200 grid grid-cols-3 gap-4 sm:gap-6 text-center text-xs print:pt-2 print:gap-3 print-avoid-break">
          <div>
            <p className="text-slate-600 font-semibold print:text-[10px]">Pemegang Kartu Tani,</p>
            <div className="h-16 sm:h-20 flex items-center justify-center relative my-0.5 sm:my-1">
              <img
                src={petaniSig}
                alt="TTD Petani"
                className="h-12 sm:h-14 object-contain relative z-10"
              />
            </div>
            <p className="font-bold text-slate-900 underline uppercase print:text-[11px]">{petani.nama}</p>
            <p className="text-[9px] sm:text-[10px] font-mono text-slate-500">
              {petaniUser?.nip || `NIK: ${petani.nik}`}
            </p>
          </div>
          <div>
            <p className="text-slate-600 font-semibold print:text-[10px]">Ketua {petani.poktan?.nama},</p>
            <div className="h-16 sm:h-20 flex items-center justify-center relative my-0.5 sm:my-1">
              {poktanStamp && (
                <img
                  src={poktanStamp}
                  alt="Stempel Poktan"
                  className="h-16 w-16 sm:h-18 sm:w-18 object-contain absolute left-1/2 -translate-x-12 sm:-translate-x-14 opacity-80 pointer-events-none"
                />
              )}
              <img
                src={poktanSig}
                alt="TTD Poktan"
                className="h-12 sm:h-14 object-contain relative z-10"
              />
            </div>
            <p className="font-bold text-slate-900 underline uppercase print:text-[11px]">{poktanName}</p>
            <p className="text-[9px] sm:text-[10px] font-mono text-slate-600">{poktanNip}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400">Desa {petani.desa}</p>
          </div>
          <div>
            <p className="text-slate-600 font-semibold print:text-[10px]">Penyuluh Pertanian Lapangan (PPL),</p>
            <div className="h-16 sm:h-20 flex items-center justify-center relative my-0.5 sm:my-1">
              {pplStamp && (
                <img
                  src={pplStamp}
                  alt="Stempel BPP"
                  className="h-16 w-16 sm:h-18 sm:w-18 object-contain absolute left-1/2 -translate-x-12 sm:-translate-x-14 opacity-80 pointer-events-none"
                />
              )}
              <img
                src={pplSig}
                alt="TTD PPL"
                className="h-12 sm:h-14 object-contain relative z-10"
              />
            </div>
            <p className="font-bold text-slate-900 underline uppercase print:text-[11px]">
              {pplName}
            </p>
            <p className="text-[9px] sm:text-[10px] font-mono text-slate-600">{pplNip}</p>
            <p className="text-[9px] sm:text-[10px] text-slate-400">
              {pplUser?.wilayah || 'BPP Kecamatan Lembeyan'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
