import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PrintButton from './PrintButton';
import QrCodeView from '@/components/ui/QrCodeView';
import { MapPin, Sprout, ShieldCheck, Layers } from 'lucide-react';
import {
  formatAngka,
  calculateSegmentLengths,
  calculatePolygonPerimeter,
} from '@/lib/calculations';
import {
  getDefaultNipForRole,
  generateAutoSignatureSvg,
  generateOfficialStampSvg,
} from '@/lib/signature-utils';

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default async function CetakLahanPage({ params }: Props) {
  const { id } = await params;

  let lahan: any = null;
  let pplUser: any = null;
  let allLahanList: any[] = [];
  let petaniUser: any = null;
  let poktanUser: any = null;

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

    const [pplResult, lahanListResult] = await Promise.all([
      prisma.user.findFirst({
        where: { role: 'PPL' },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.lahan.findMany({
        include: {
          petani: {
            select: { id: true, nama: true, desa: true },
          },
        },
        orderBy: { kodeLahan: 'asc' },
      }),
    ]);
    pplUser = pplResult;
    allLahanList = lahanListResult;

    if (lahan) {
      const userResults = await Promise.all([
        prisma.user.findFirst({
          where: {
            OR: [
              { username: lahan.petani?.nik || '' },
              { role: 'PETANI', name: lahan.petani?.nama || '' },
            ],
          },
        }),
        prisma.user.findFirst({
          where: {
            role: 'POKTAN',
            OR: [
              { poktanId: lahan.petani?.poktanId || '' },
              { name: { contains: lahan.petani?.poktan?.ketua || 'Suparman' } },
            ],
          },
        }),
      ]);
      petaniUser = userResults[0];
      poktanUser = userResults[1];
    }
  } catch (err) {
    console.error('[CetakLahanPage] Database error:', err);
  }

  if (!lahan) {
    notFound();
  }

  const petaniSig =
    petaniUser?.signatureUrl ||
    generateAutoSignatureSvg(lahan.petani?.nama || 'Petani');
  const poktanName = poktanUser?.name || lahan.petani?.poktan?.ketua || 'H. Suparman';
  const poktanSig =
    poktanUser?.signatureUrl || generateAutoSignatureSvg(poktanName);
  const poktanStamp =
    poktanUser?.stampUrl !== undefined && poktanUser?.stampUrl !== null
      ? poktanUser.stampUrl
      : generateOfficialStampSvg('POKTAN', lahan.petani?.poktan?.nama);
  const poktanNip =
    poktanUser?.nip || getDefaultNipForRole('POKTAN');

  const pplName = pplUser?.name || 'Iis Sugiarti, S.P';
  const pplSig = pplUser?.signatureUrl || generateAutoSignatureSvg(pplName);
  const pplStamp =
    pplUser?.stampUrl !== undefined && pplUser?.stampUrl !== null
      ? pplUser.stampUrl
      : generateOfficialStampSvg('PPL', pplUser?.wilayah || 'BPP Kec. Lembeyan');
  const pplNip = pplUser?.nip || getDefaultNipForRole('PPL');

  let coords: [number, number][] = [];
  try {
    coords = JSON.parse(lahan.coordinates);
  } catch (e) {
    coords = [];
  }

  // Hitung panjang tiap sisi patok (m) dan keliling poligon (m)
  const segments = calculateSegmentLengths(coords);
  const perimeterM = calculatePolygonPerimeter(coords);

  // Proyeksi Geodesik Proporsional (Menjaga Aspect Ratio Asli Poligon dalam Meter)
  const lats = coords.map((c) => c[0]);
  const lngs = coords.map((c) => c[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const avgLatRad = ((lahan.centerLat || -7.768) * Math.PI) / 180;
  const metersPerDegLat = 110540;
  const metersPerDegLng = 111320 * Math.cos(avgLatRad);

  const widthMeters = Math.max(10, (maxLng - minLng) * metersPerDegLng);
  const heightMeters = Math.max(10, (maxLat - minLat) * metersPerDegLat);

  const paddingX = 64;
  const paddingY = 46;
  const svgWidth = 540;
  const svgHeight = 290;
  const availWidth = svgWidth - 2 * paddingX;
  const availHeight = svgHeight - 2 * paddingY;

  // Gunakan skala tunggal (uniform scale) agar bentuk poligon tidak melar/terdistorsi
  const scale = Math.min(availWidth / widthMeters, availHeight / heightMeters);
  const drawnWidth = widthMeters * scale;
  const drawnHeight = heightMeters * scale;
  const offsetX = (svgWidth - drawnWidth) / 2;
  const offsetY = (svgHeight - drawnHeight) / 2;

  const projectedPoints = coords.map(([lat, lng], idx) => {
    const xM = (lng - minLng) * metersPerDegLng;
    const yM = (lat - minLat) * metersPerDegLat;
    const x = offsetX + xM * scale;
    const y = svgHeight - offsetY - yM * scale;
    return { x, y, lat, lng, label: `P${idx + 1}` };
  });

  const normalizedPoints = projectedPoints
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  const centroidSvg = {
    x:
      projectedPoints.reduce((s, p) => s + p.x, 0) /
      Math.max(1, projectedPoints.length),
    y:
      projectedPoints.reduce((s, p) => s + p.y, 0) /
      Math.max(1, projectedPoints.length),
  };

  // Skala bar dinamis (50 meter)
  const scaleBarMeters = widthMeters > 180 ? 50 : 25;
  const scaleBarPx = Math.min(120, Math.max(30, scaleBarMeters * scale));

  // Warna poligon khas per komoditas
  const komLower = (lahan.komoditas || 'padi').toLowerCase();
  const polyStyle = komLower.includes('jagung')
    ? { fill: '#f59e0b', stroke: '#fde047', badge: 'Jagung' }
    : komLower.includes('kedelai')
    ? { fill: '#eab308', stroke: '#fef08a', badge: 'Kedelai' }
    : komLower.includes('tebu')
    ? { fill: '#38bdf8', stroke: '#bae6fd', badge: 'Tebu' }
    : { fill: '#22c55e', stroke: '#86efac', badge: 'Padi Sawah' };

  const now = new Date();
  const currentDate = `${now.getDate()} ${BULAN_INDONESIA[now.getMonth()]} ${now.getFullYear()}`;

  const verificationUrl = `https://pertanian.lembeyan.go.id/verifikasi/lahan/${lahan.kodeLahan}`;

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-10 text-slate-900 print:bg-white print:py-0">
      {/* Action Bar & Navigasi Cepat Antar Petak Lahan (Hanya tampil di layar) */}
      <div className="max-w-4xl mx-auto px-4 mb-6 space-y-3 no-print">
        <div className="flex items-center justify-between">
          <a
            href="/peta"
            className="text-xs font-bold text-slate-600 hover:text-emerald-700 transition"
          >
            &larr; Kembali ke Peta GIS Kecamatan Lembeyan
          </a>
          <PrintButton />
        </div>

        {/* Bar Pemilih Cepat Petak Lahan Petani untuk Membandingkan Poligon & Koordinat */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            Pilih Petak Lahan:
          </span>
          {allLahanList.map((item) => {
            const isCurrent = item.id === lahan.id;
            return (
              <Link
                key={item.id}
                href={`/cetak-lahan/${item.id}`}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition border ${
                  isCurrent
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200'
                }`}
              >
                {item.kodeLahan} &bull; {item.petani?.nama} ({item.komoditas} - {item.luasHa} Ha)
              </Link>
            );
          })}
        </div>
      </div>

      {/* Lembar Dokumen Resmi Format A4 */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-300 shadow-xl rounded-2xl p-8 sm:p-12 print-page print:border-none print:shadow-none print:p-0">
        {/* Kop Resmi Dinas dengan QR Code di Header */}
        <div className="border-b-4 border-double border-slate-900 pb-4 mb-6 flex items-center justify-between gap-4">
          <div className="w-20 text-center shrink-0">
            <QrCodeView
              value={verificationUrl}
              size={68}
              caption="VALIDASI SPASIAL"
            />
          </div>

          <div className="text-center flex-1">
            <h3 className="text-xs sm:text-sm font-bold tracking-widest text-slate-700 uppercase">
              PEMERINTAH KECAMATAN LEMBEYAN
            </h3>
            <h2 className="text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">
              BALAI PENYULUHAN PERTANIAN (BPP) KECAMATAN LEMBEYAN
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Pusat Koordinasi Pemetaan Lahan & Alokasi Pupuk Bersubsidi Kecamatan Lembeyan
            </p>
            <p className="text-[11px] text-slate-500 italic">
              Sistem Informasi Geografis Lahan Pertanian &bull; Dikembangkan oleh Supriyanto Abadi Jaya
            </p>
          </div>

          <div className="w-20 shrink-0 text-center hidden sm:block">
            <div className="border border-emerald-600 text-emerald-800 bg-emerald-50 rounded-xl p-2 text-[10px] font-bold">
              <ShieldCheck className="w-6 h-6 mx-auto text-emerald-600 mb-0.5" />
              TERVERIFIKASI
            </div>
          </div>
        </div>

        {/* Judul Surat Keterangan */}
        <div className="text-center mb-6">
          <h1 className="text-base font-black uppercase tracking-wider underline decoration-2 decoration-emerald-700 text-slate-900">
            KARTU IDENTITAS & SURAT KETERANGAN PETAK LAHAN PERTANIAN
          </h1>
          <p className="text-xs font-mono font-semibold text-slate-600 mt-1">
            Nomor Registrasi Spasial: <span className="text-emerald-800 font-bold">{lahan.kodeLahan}</span>
          </p>
        </div>

        {/* Section 1: Identitas Pemilik / Penggarap */}
        <div className="mb-5">
          <h4 className="text-xs font-black uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded text-slate-800 mb-2 border-l-4 border-emerald-600">
            I. IDENTITAS PEMILIK / PENGGARAP LAHAN
          </h4>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 font-semibold text-slate-600 w-44">Nama Petani</td>
                <td className="py-1.5 font-bold text-slate-900">: {lahan.petani?.nama}</td>
                <td className="py-1.5 font-semibold text-slate-600 w-36">Kelompok Tani</td>
                <td className="py-1.5 font-bold text-slate-900">: {lahan.petani?.poktan?.nama}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 font-semibold text-slate-600">Nomor Induk Kependudukan (NIK)</td>
                <td className="py-1.5 font-mono text-slate-900">: {lahan.petani?.nik}</td>
                <td className="py-1.5 font-semibold text-slate-600">Desa / Kelurahan</td>
                <td className="py-1.5 text-slate-900">: {lahan.petani?.desa}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 font-semibold text-slate-600">Nomor Kartu Keluarga (KK)</td>
                <td className="py-1.5 font-mono text-slate-900">: {lahan.petani?.noKk}</td>
                <td className="py-1.5 font-semibold text-slate-600">Kecamatan / Kabupaten</td>
                <td className="py-1.5 text-slate-900">
                  : Kec. {lahan.petani?.kecamatan || 'Lembeyan'}, Kab. {lahan.kabupaten || lahan.petani?.kabupaten || 'Magetan'}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 font-semibold text-slate-600">Tempat, Tanggal Lahir</td>
                <td className="py-1.5 text-slate-900">
                  : {lahan.petani?.tempatLahir || 'Magetan'}, {lahan.petani?.tanggalLahir || '1975-04-23'}
                </td>
                <td className="py-1.5 font-semibold text-slate-600">Nama Ibu Kandung</td>
                <td className="py-1.5 text-slate-900">: {lahan.petani?.namaIbuKandung || 'Hj. Sumirah'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Data Agronomi & Petak Lahan */}
        <div className="mb-5">
          <h4 className="text-xs font-black uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded text-slate-800 mb-2 border-l-4 border-emerald-600">
            II. DATA AGRONOMI & KEPEMILIKAN LAHAN
          </h4>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 font-semibold text-slate-600 w-44">Nama Petak Lahan</td>
                <td className="py-1.5 font-bold text-slate-900">: {lahan.namaLahan}</td>
                <td className="py-1.5 font-semibold text-slate-600 w-36">Komoditas Tanam</td>
                <td className="py-1.5 font-bold text-emerald-800">: {lahan.komoditas}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 font-semibold text-slate-600">Luas Lahan Terukur (GIS)</td>
                <td className="py-1.5 font-bold text-emerald-800">
                  : {lahan.luasHa} Hektar ({formatAngka(lahan.luasM2)} m²)
                </td>
                <td className="py-1.5 font-semibold text-slate-600">Status Kepemilikan</td>
                <td className="py-1.5 text-slate-900">: {lahan.statusKepemilikan}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1.5 font-semibold text-slate-600">No. Pipil / SPPT PBB</td>
                <td className="py-1.5 font-mono font-bold text-amber-900">: {lahan.nomorPipil || '-'}</td>
                <td className="py-1.5 font-semibold text-slate-600">Status Irigasi</td>
                <td className="py-1.5 text-slate-900">: {lahan.statusIrigasi}</td>
              </tr>
              <tr>
                <td className="py-1.5 font-semibold text-slate-600">Batas Sempadan Tanah</td>
                <td colSpan={3} className="py-1.5 text-slate-700">
                  : Utara: <span className="font-medium">{lahan.batasUtara || '-'}</span> | Selatan: <span className="font-medium">{lahan.batasSelatan || '-'}</span> | Timur: <span className="font-medium">{lahan.batasTimur || '-'}</span> | Barat: <span className="font-medium">{lahan.batasBarat || '-'}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3: Gambar Poligon Visual Lahan (Print Diagram) */}
        <div className="mb-6">
          <h4 className="text-xs font-black uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded text-slate-800 mb-2 border-l-4 border-emerald-600">
            III. GAMBAR VISUAL SPASIAL POLIGON & TITIK KOORDINAT LAHAN
          </h4>

          <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 flex flex-col md:flex-row gap-4 items-stretch">
            {/* SVG Visual Representation of the Land Polygon (Skala Geodesik Proporsional) */}
            <div className="w-full md:w-3/5 bg-emerald-950 rounded-lg p-2.5 flex flex-col items-center justify-between border border-emerald-800 relative overflow-hidden">
              <div className="w-full flex items-center justify-between z-10 px-1">
                <div className="text-[10px] font-mono text-emerald-300 bg-emerald-900/90 px-2 py-0.5 rounded border border-emerald-700">
                  {lahan.kodeLahan} &bull; {coords.length} Patok &bull; {lahan.komoditas}
                </div>
                <div className="text-[10px] font-bold text-white bg-red-600/90 px-2 py-0.5 rounded shadow-2xs">
                  Utara (N) &uarr;
                </div>
              </div>

              <svg width="100%" height="260" viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="my-1">
                {/* Grid lines background */}
                <defs>
                  <pattern id={`grid-${lahan.id}`} width="28" height="28" patternUnits="userSpaceOnUse">
                    <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#grid-${lahan.id})`} />

                {/* Label Sempadan Utara / Selatan / Barat / Timur */}
                <text x={svgWidth / 2} y="14" textAnchor="middle" fill="#6ee7b7" fontSize="9" opacity="0.8">
                  &uarr; Utara: {(lahan.batasUtara || '-').slice(0, 34)}
                </text>
                <text x={svgWidth / 2} y={svgHeight - 6} textAnchor="middle" fill="#6ee7b7" fontSize="9" opacity="0.8">
                  &darr; Selatan: {(lahan.batasSelatan || '-').slice(0, 34)}
                </text>

                {/* Poligon Lahan Sawah Proporsional */}
                {projectedPoints.length >= 3 && (
                  <>
                    <polygon
                      points={normalizedPoints}
                      fill={polyStyle.fill}
                      fillOpacity="0.42"
                      stroke={polyStyle.stroke}
                      strokeWidth="3"
                      strokeLinejoin="round"
                    />

                    {/* Ukuran Panjang Sisi (Meter) di Tengah Tiap Garis Batas */}
                    {projectedPoints.map((pt, idx) => {
                      const nextPt = projectedPoints[(idx + 1) % projectedPoints.length];
                      const midX = (pt.x + nextPt.x) / 2;
                      const midY = (pt.y + nextPt.y) / 2;
                      const segDist = typeof segments[idx] === 'number' ? segments[idx] : ((segments[idx] as any)?.distanceM || 0);
                      return (
                        <g key={`seg-${idx}`}>
                          <rect
                            x={midX - 22}
                            y={midY - 8}
                            width="44"
                            height="15"
                            rx="4"
                            fill="rgba(2, 44, 34, 0.88)"
                            stroke="rgba(110, 231, 183, 0.45)"
                            strokeWidth="0.8"
                          />
                          <text
                            x={midX}
                            y={midY + 2.5}
                            textAnchor="middle"
                            fill="#fde047"
                            fontSize="8.5"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {segDist} m
                          </text>
                        </g>
                      );
                    })}

                    {/* Titik Pusat Geometri (Centroid) */}
                    <g>
                      <line
                        x1={centroidSvg.x - 6}
                        y1={centroidSvg.y}
                        x2={centroidSvg.x + 6}
                        y2={centroidSvg.y}
                        stroke="#ffffff"
                        strokeWidth="1.2"
                        strokeDasharray="2,1"
                      />
                      <line
                        x1={centroidSvg.x}
                        y1={centroidSvg.y - 6}
                        x2={centroidSvg.x}
                        y2={centroidSvg.y + 6}
                        stroke="#ffffff"
                        strokeWidth="1.2"
                        strokeDasharray="2,1"
                      />
                      <text
                        x={centroidSvg.x}
                        y={centroidSvg.y + 14}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                        opacity="0.9"
                      >
                        {lahan.luasHa} Ha ({formatAngka(lahan.luasM2)} m²)
                      </text>
                    </g>

                    {/* Titik Patok Batas (P1, P2, P3...) */}
                    {projectedPoints.map((pt, idx) => {
                      const labelOffsetX = pt.x < centroidSvg.x ? -18 : 8;
                      const labelOffsetY = pt.y < centroidSvg.y ? -6 : 12;
                      return (
                        <g key={`pt-${idx}`}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="5.5"
                            fill="#facc15"
                            stroke="#0f172a"
                            strokeWidth="1.8"
                          />
                          <text
                            x={pt.x + labelOffsetX}
                            y={pt.y + labelOffsetY}
                            fill="#ffffff"
                            fontSize="10"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {pt.label}
                          </text>
                        </g>
                      );
                    })}

                    {/* Skala Bar Geodesik */}
                    <g transform={`translate(14, ${svgHeight - 24})`}>
                      <line x1="0" y1="6" x2={scaleBarPx} y2="6" stroke="#ffffff" strokeWidth="2" />
                      <line x1="0" y1="2" x2="0" y2="10" stroke="#ffffff" strokeWidth="2" />
                      <line x1={scaleBarPx} y1="2" x2={scaleBarPx} y2="10" stroke="#ffffff" strokeWidth="2" />
                      <text x={scaleBarPx / 2} y="2" textAnchor="middle" fill="#a7f3d0" fontSize="8" fontFamily="monospace">
                        {scaleBarMeters}m
                      </text>
                    </g>
                  </>
                )}
              </svg>

              <div className="w-full flex items-center justify-between text-[10px] text-emerald-300 px-1">
                <span className="italic">*Proyeksi Geodesik WGS84 (Skala Proporsional 1:1)</span>
                <span className="font-mono font-bold text-amber-300">
                  Keliling: {formatAngka(perimeterM)} m
                </span>
              </div>
            </div>

            {/* Tabel Titik Sudut Koordinat & Jarak Antar Patok */}
            <div className="w-full md:w-2/5 text-xs flex flex-col justify-between">
              <div>
                <div className="font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Koordinat Patok ({coords.length} Titik):
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Kec. Lembeyan
                  </span>
                </div>
                <div className="max-h-[225px] overflow-y-auto border border-slate-200 rounded-lg bg-white">
                  <table className="w-full text-left text-[10.5px]">
                    <thead className="bg-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="py-1.5 px-2">Patok</th>
                        <th className="py-1.5 px-2">Latitude</th>
                        <th className="py-1.5 px-2">Longitude</th>
                        <th className="py-1.5 px-2 text-right">Sisi (m)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {coords.map(([lat, lng], idx) => {
                        const seg = segments[idx];
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1 px-2 font-bold text-slate-900">
                              P{idx + 1}
                            </td>
                            <td className="py-1 px-2 text-slate-700">{lat.toFixed(5)}</td>
                            <td className="py-1 px-2 text-slate-700">{lng.toFixed(5)}</td>
                            <td className="py-1 px-2 text-right font-bold text-emerald-700">
                              {seg !== undefined ? `${typeof seg === 'number' ? seg : (seg as any)?.distanceM} m` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-2 p-2 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-600 space-y-0.5">
                <div>
                  Pusat Geometri (Centroid):{' '}
                  <strong className="font-mono text-slate-900">
                    {lahan.centerLat.toFixed(5)}, {lahan.centerLng.toFixed(5)}
                  </strong>
                </div>
                <div>
                  Dimensi Bentang:{' '}
                  <strong className="font-mono text-slate-800">
                    {Math.round(widthMeters)} m (T-B) &times; {Math.round(heightMeters)} m (U-S)
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Kolom Tanda Tangan Pengesahan Resmi & Validasi QR Code */}
        <div className="pt-4 border-t-2 border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <span className="font-semibold text-slate-700">Developer Pengembang:</span>
              <span className="font-bold text-emerald-800">Supriyanto Abadi Jaya</span>
            </div>
            <div className="text-right text-xs text-slate-600">
              Kecamatan Lembeyan, {currentDate}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <p className="font-semibold text-slate-600">Petani Pemilik / Penggarap,</p>
              <div className="h-20 flex items-center justify-center relative my-1">
                <img
                  src={petaniSig}
                  alt="TTD Petani"
                  className="h-14 object-contain relative z-10"
                />
              </div>
              <p className="font-bold text-slate-900 underline uppercase">{lahan.petani?.nama}</p>
              <p className="text-[10px] text-slate-500 font-mono">
                {petaniUser?.nip || `NIK: ${lahan.petani?.nik}`}
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-600">Ketua Kelompok Tani,</p>
              <div className="h-20 flex items-center justify-center relative my-1">
                {poktanStamp && (
                  <img
                    src={poktanStamp}
                    alt="Stempel Poktan"
                    className="h-18 w-18 object-contain absolute left-1/2 -translate-x-14 opacity-80 pointer-events-none"
                  />
                )}
                <img
                  src={poktanSig}
                  alt="TTD Poktan"
                  className="h-14 object-contain relative z-10"
                />
              </div>
              <p className="font-bold text-slate-900 underline uppercase">
                {poktanName}
              </p>
              <p className="text-[10px] font-mono text-slate-500">{poktanNip}</p>
              <p className="text-[10px] text-slate-400">{lahan.petani?.poktan?.nama}</p>
            </div>

            <div>
              <p className="font-semibold text-slate-600">Petugas Penyuluh Lapangan (PPL),</p>
              <div className="h-20 flex items-center justify-center relative my-1">
                {pplStamp && (
                  <img
                    src={pplStamp}
                    alt="Stempel BPP"
                    className="h-18 w-18 object-contain absolute left-1/2 -translate-x-14 opacity-80 pointer-events-none"
                  />
                )}
                <img
                  src={pplSig}
                  alt="TTD PPL"
                  className="h-14 object-contain relative z-10"
                />
              </div>
              <p className="font-bold text-slate-900 underline uppercase">
                {pplName}
              </p>
              <p className="text-[10px] font-mono text-slate-600">{pplNip}</p>
              <p className="text-[10px] text-slate-400">
                {pplUser?.wilayah || 'BPP Kecamatan Lembeyan'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
