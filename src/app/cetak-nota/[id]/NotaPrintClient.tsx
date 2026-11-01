'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Printer,
  FileText,
  Receipt,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Copy,
  ExternalLink,
  Sprout,
  Calendar,
  Building,
  UserCheck,
} from 'lucide-react';
import QrCodeView from '@/components/ui/QrCodeView';
import { formatRupiah, formatAngka } from '@/lib/calculations';

interface PenyaluranProps {
  data: {
    id: string;
    nomorNota: string;
    namaKios: string;
    petugasKios: string;
    namaPengurusPoktan: string;
    tanggalPenyaluran: string;
    jumlahUreaKg: number;
    jumlahNpkKg: number;
    jumlahOrganikKg: number;
    totalBiayaRp: number;
    fotoKtp: string;
    fotoDiri: string;
    catatan?: string | null;
    status: string;
    signatures?: {
      petaniSig: string;
      petaniNip: string;
      poktanSig: string;
      poktanStamp: string;
      poktanNip: string;
      kiosSig: string;
      kiosStamp: string;
      kiosNip: string;
    };
    petani: {
      id: string;
      nama: string;
      nik: string;
      noKk: string;
      alamat: string;
      desa: string;
      kecamatan: string;
      poktan: {
        nama: string;
        ketua: string;
        kecamatan: string;
      };
      alokasiPupuk?: Array<{
        tahun: number;
        musimTanam: string;
        sisaUreaKg: number;
        sisaNpkKg: number;
        sisaOrganikKg: number;
      }>;
    };
  };
}

export default function NotaPrintClient({ data }: PenyaluranProps) {
  const [format, setFormat] = useState<'A4' | 'THERMAL'>('A4');
  const [copied, setCopied] = useState(false);
  const [includePhotosInThermal, setIncludePhotosInThermal] = useState(false);

  const HET_UREA = 2250;
  const HET_NPK = 2300;
  const HET_ORGANIK = 800;

  const biayaUrea = data.jumlahUreaKg * HET_UREA;
  const biayaNpk = data.jumlahNpkKg * HET_NPK;
  const biayaOrganik = data.jumlahOrganikKg * HET_ORGANIK;
  const totalBiayaCalculated = (biayaUrea + biayaNpk + biayaOrganik) > 0 
    ? (biayaUrea + biayaNpk + biayaOrganik) 
    : (data.totalBiayaRp || 0);

  const verificationUrl = `https://pertanian.lembeyan.go.id/verifikasi/nota/${data.nomorNota}`;

  const copyLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(data.tanggalPenyaluran).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = new Date(data.tanggalPenyaluran).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const activeAlokasi = data.petani?.alokasiPupuk?.[0];

  const formatMusimTanam = (mt?: string) => {
    if (!mt) return 'MT 1 (Walikan)';
    if (mt.includes('1')) return 'MT 1 (Walikan)';
    if (mt.includes('2')) return 'MT 2 (Kemarau)';
    if (mt.includes('3')) return 'MT 3 (Rendeng)';
    return mt;
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-8 text-slate-800 print:bg-white print:py-0">
      {/* Top Action Bar (Hidden during print) */}
      <div className="max-w-4xl mx-auto px-4 mb-6 flex flex-wrap items-center justify-between gap-4 no-print">
        <Link
          href="/penyaluran"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Penyaluran</span>
        </Link>

        {/* Format Selector Pills & Print Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs text-xs font-bold">
            <button
              onClick={() => setFormat('A4')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                format === 'A4'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Format A4 Resmi</span>
            </button>
            <button
              onClick={() => setFormat('THERMAL')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                format === 'THERMAL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Slip Struk POS (80mm)</span>
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* OPSI 1: FORMAT LEMBAR RESMI A4 / KUARTO (STANDAR DINAS & ARSIP KIOS) */}
      {/* ===================================================================== */}
      {format === 'A4' && (
        <div className="max-w-4xl mx-auto bg-white border border-slate-300 shadow-xl rounded-2xl p-4 sm:p-12 w-full overflow-hidden sm:overflow-visible print-page print:border-none print:shadow-none print:p-0">
          {/* Header Kop Resmi dengan QR Code Verifikasi */}
          <div className="border-b-4 border-double border-slate-900 pb-4 mb-6 flex items-center justify-between gap-4">
            <div className="w-20 text-center shrink-0">
              <QrCodeView
                value={verificationUrl}
                size={70}
                caption="SCAN VALIDASI"
              />
            </div>

            <div className="text-center flex-1">
              <h3 className="text-xs sm:text-sm font-bold tracking-widest text-slate-700 uppercase">
                PEMERINTAH KECAMATAN LEMBEYAN &bull; BPP KECAMATAN LEMBEYAN
              </h3>
              <h2 className="text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">
                SURAT BUKTI PENEBUSAN PUPUK BERSUBSIDI (E-RDKK)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Penyalur Resmi KPL: <strong className="text-slate-800">{data.namaKios}</strong> &bull; Wilayah Kerja BPP Kecamatan Lembeyan
              </p>
              <p className="text-[11px] text-slate-500 italic mt-0.5">
                Sistem Terpadu Penyaluran Pupuk Bersubsidi &bull; Pengembang: Supriyanto Abadi Jaya
              </p>
            </div>

            <div className="w-20 shrink-0 text-center hidden sm:block">
              <div className="border border-emerald-600 text-emerald-800 bg-emerald-50 rounded-xl p-2 text-[10px] font-bold">
                <ShieldCheck className="w-6 h-6 mx-auto text-emerald-600 mb-0.5" />
                LUNAS & VALID
              </div>
            </div>
          </div>

          {/* Meta Nomor Nota & Tanggal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 mb-6 gap-2 text-xs">
            <div>
              <span className="text-slate-500 font-semibold">Nomor Nota Transaksi: </span>
              <span className="font-mono font-black text-emerald-800 text-sm tracking-wide">
                {data.nomorNota}
              </span>
            </div>
            <div className="text-slate-600">
              <span>Waktu Penyaluran: </span>
              <strong className="text-slate-900 font-medium">
                {formattedDate}, {formattedTime} WIB
              </strong>
            </div>
          </div>

          {/* Section I: Data Identitas Penerima */}
          <div className="mb-6">
            <h4 className="text-xs font-black uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded text-slate-800 mb-2 border-l-4 border-emerald-600">
              I. IDENTITAS PETANI PENERIMA HAK SUBSIDI (e-RDKK)
            </h4>

            {/* Desktop & Print Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-1.5 font-semibold text-slate-600 w-44">Nama Petani</td>
                    <td className="py-1.5 font-bold text-slate-900">: {data.petani?.nama}</td>
                    <td className="py-1.5 font-semibold text-slate-600 w-36">Kelompok Tani (Poktan)</td>
                    <td className="py-1.5 font-bold text-slate-900">: {data.petani?.poktan?.nama}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1.5 font-semibold text-slate-600">Nomor Induk Kependudukan (NIK)</td>
                    <td className="py-1.5 font-mono font-bold text-slate-900">: {data.petani?.nik}</td>
                    <td className="py-1.5 font-semibold text-slate-600">Ketua Kelompok Tani</td>
                    <td className="py-1.5 text-slate-900">: {data.petani?.poktan?.ketua || '-'}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1.5 font-semibold text-slate-600">Nomor Kartu Keluarga (KK)</td>
                    <td className="py-1.5 font-mono text-slate-900">: {data.petani?.noKk}</td>
                    <td className="py-1.5 font-semibold text-slate-600">Desa / Kecamatan</td>
                    <td className="py-1.5 text-slate-900">: {data.petani?.desa}, Kec. {data.petani?.kecamatan}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-semibold text-slate-600">Alamat Lengkap Domisili</td>
                    <td colSpan={3} className="py-1.5 text-slate-700">: {data.petani?.alamat}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile Smartphone View */}
            <div className="block sm:hidden space-y-1.5 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-500 font-semibold w-28 shrink-0">Nama Petani</span>
                <span className="font-bold text-slate-900 text-right">: {data.petani?.nama}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-500 font-semibold w-28 shrink-0">Kelompok Tani</span>
                <span className="font-bold text-slate-900 text-right">: {data.petani?.poktan?.nama}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-500 font-semibold w-28 shrink-0">NIK Petani</span>
                <span className="font-mono font-bold text-slate-900 text-right">: {data.petani?.nik}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-500 font-semibold w-28 shrink-0">Ketua Poktan</span>
                <span className="text-slate-900 text-right">: {data.petani?.poktan?.ketua || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-500 font-semibold w-28 shrink-0">No. KK</span>
                <span className="font-mono text-slate-900 text-right">: {data.petani?.noKk}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-500 font-semibold w-28 shrink-0">Desa / Kec.</span>
                <span className="text-slate-900 text-right">: {data.petani?.desa}, Kec. {data.petani?.kecamatan}</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-slate-500 font-semibold w-28 shrink-0">Alamat Domisili</span>
                <span className="text-slate-700 text-right">: {data.petani?.alamat}</span>
              </div>
            </div>
          </div>

          {/* Section II: Rincian Penebusan & HET */}
          <div className="mb-6">
            <h4 className="text-xs font-black uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded text-slate-800 mb-2 border-l-4 border-emerald-600">
              II. RINCIAN KOMODITAS PUPUK BERSUBSIDI & BIAYA PENEBUSAN (HET)
            </h4>

            {/* Mobile Smartphone Card View (< sm) */}
            <div className="block sm:hidden space-y-2.5 print:hidden">
              {data.jumlahUreaKg > 0 && (
                <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-bold text-slate-900 text-xs">Urea Bersubsidi</span>
                    <span className="font-mono font-black text-emerald-800 text-xs">{formatRupiah(biayaUrea)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-1.5 text-[11px] text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Volume</span>
                      <strong className="text-slate-900 font-mono">{formatAngka(data.jumlahUreaKg)} Kg</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Kemasan</span>
                      <span className="font-mono">&asymp; {Math.round(data.jumlahUreaKg / 50)} Sak</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">HET / Kg</span>
                      <span className="font-mono">{formatRupiah(HET_UREA)}</span>
                    </div>
                  </div>
                </div>
              )}

              {data.jumlahNpkKg > 0 && (
                <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-bold text-slate-900 text-xs">NPK Phonska (15-10-12)</span>
                    <span className="font-mono font-black text-emerald-800 text-xs">{formatRupiah(biayaNpk)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-1.5 text-[11px] text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Volume</span>
                      <strong className="text-slate-900 font-mono">{formatAngka(data.jumlahNpkKg)} Kg</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Kemasan</span>
                      <span className="font-mono">&asymp; {Math.round(data.jumlahNpkKg / 50)} Sak</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">HET / Kg</span>
                      <span className="font-mono">{formatRupiah(HET_NPK)}</span>
                    </div>
                  </div>
                </div>
              )}

              {data.jumlahOrganikKg > 0 && (
                <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-bold text-slate-900 text-xs">Organik Petroganik</span>
                    <span className="font-mono font-black text-emerald-800 text-xs">{formatRupiah(biayaOrganik)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-1.5 text-[11px] text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Volume</span>
                      <strong className="text-slate-900 font-mono">{formatAngka(data.jumlahOrganikKg)} Kg</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Kemasan</span>
                      <span className="font-mono">&asymp; {Math.round(data.jumlahOrganikKg / 40)} Sak</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">HET / Kg</span>
                      <span className="font-mono">{formatRupiah(HET_ORGANIK)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Total Card Mobile */}
              <div className="bg-emerald-900 text-white p-3 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-200 block">Total Volume</span>
                  <span className="font-mono font-bold text-sm">
                    {formatAngka(data.jumlahUreaKg + data.jumlahNpkKg + data.jumlahOrganikKg)} Kg (&plusmn;{Math.round((data.jumlahUreaKg + data.jumlahNpkKg + data.jumlahOrganikKg) / 50)} Sak)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-200 block">Total Biaya (HET)</span>
                  <span className="font-mono font-black text-base text-amber-300">
                    {formatRupiah(totalBiayaCalculated)}
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop & Print Table View */}
            <div className="hidden sm:block print:block overflow-x-auto -mx-1 sm:mx-0 rounded-xl border border-slate-300">
              <table className="w-full text-xs min-w-[500px] sm:min-w-full">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 border-r text-center w-12">No</th>
                    <th className="py-2.5 px-3 border-r text-left">Jenis Pupuk Bersubsidi</th>
                    <th className="py-2.5 px-3 border-r text-right">Volume (Kg)</th>
                    <th className="py-2.5 px-3 border-r text-right">Kemasan Sak</th>
                    <th className="py-2.5 px-3 border-r text-right">HET / Kg</th>
                    <th className="py-2.5 px-3 text-right">Jumlah Biaya (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.jumlahUreaKg > 0 && (
                    <tr>
                      <td className="py-2 px-3 border-r font-mono text-center">1</td>
                      <td className="py-2 px-3 border-r font-bold text-slate-900">
                        Urea Bersubsidi (Pupuk Indonesia)
                      </td>
                      <td className="py-2 px-3 border-r font-mono font-bold text-right text-slate-800">
                        {formatAngka(data.jumlahUreaKg)} Kg
                      </td>
                      <td className="py-2 px-3 border-r font-mono text-right text-slate-600">
                        &asymp; {Math.round(data.jumlahUreaKg / 50)} Sak
                      </td>
                      <td className="py-2 px-3 border-r font-mono text-right text-slate-600">
                        {formatRupiah(HET_UREA)}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-right text-slate-900">
                        {formatRupiah(biayaUrea)}
                      </td>
                    </tr>
                  )}

                  {data.jumlahNpkKg > 0 && (
                    <tr>
                      <td className="py-2 px-3 border-r font-mono text-center">2</td>
                      <td className="py-2 px-3 border-r font-bold text-slate-900">
                        NPK Phonska Bersubsidi (15-10-12)
                      </td>
                      <td className="py-2 px-3 border-r font-mono font-bold text-right text-slate-800">
                        {formatAngka(data.jumlahNpkKg)} Kg
                      </td>
                      <td className="py-2 px-3 border-r font-mono text-right text-slate-600">
                        &asymp; {Math.round(data.jumlahNpkKg / 50)} Sak
                      </td>
                      <td className="py-2 px-3 border-r font-mono text-right text-slate-600">
                        {formatRupiah(HET_NPK)}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-right text-slate-900">
                        {formatRupiah(biayaNpk)}
                      </td>
                    </tr>
                  )}

                  {data.jumlahOrganikKg > 0 && (
                    <tr>
                      <td className="py-2 px-3 border-r font-mono text-center">3</td>
                      <td className="py-2 px-3 border-r font-bold text-slate-900">
                        Pupuk Organik Petroganik Bersubsidi
                      </td>
                      <td className="py-2 px-3 border-r font-mono font-bold text-right text-slate-800">
                        {formatAngka(data.jumlahOrganikKg)} Kg
                      </td>
                      <td className="py-2 px-3 border-r font-mono text-right text-slate-600">
                        &asymp; {Math.round(data.jumlahOrganikKg / 40)} Sak
                      </td>
                      <td className="py-2 px-3 border-r font-mono text-right text-slate-600">
                        {formatRupiah(HET_ORGANIK)}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-right text-slate-900">
                        {formatRupiah(biayaOrganik)}
                      </td>
                    </tr>
                  )}

                  {/* Total Row */}
                  <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={2} className="py-3 px-3 border-r text-center uppercase tracking-wider">
                      Total Volume & Pembayaran Resmi (HET)
                    </td>
                    <td className="py-3 px-3 border-r font-mono text-right text-emerald-800 text-sm">
                      {formatAngka(data.jumlahUreaKg + data.jumlahNpkKg + data.jumlahOrganikKg)} Kg
                    </td>
                    <td className="py-3 px-3 border-r text-right font-mono text-slate-500">
                      &plusmn; {Math.round((data.jumlahUreaKg + data.jumlahNpkKg + data.jumlahOrganikKg) / 50)} Sak
                    </td>
                    <td className="py-3 px-3 border-r text-center text-slate-400 font-normal">-</td>
                    <td className="py-3 px-3 font-mono text-right text-base text-emerald-900">
                      {formatRupiah(totalBiayaCalculated)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section III: Status Sisa Alokasi e-RDKK Petani */}
          {activeAlokasi && (
            <div className="mb-6 bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 text-xs">
              <span className="font-bold text-emerald-950 block mb-1">
                Sisa Kuota e-RDKK Petani Pasca Penebusan Ini (Musim Tanam {formatMusimTanam(activeAlokasi.musimTanam)} {activeAlokasi.tahun}):
              </span>
              <div className="grid grid-cols-3 gap-3 text-center mt-2">
                <div className="bg-white p-2 rounded-lg border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">Sisa Urea</span>
                  <strong className="text-emerald-800 font-mono text-sm">{activeAlokasi.sisaUreaKg} Kg</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">Sisa NPK Phonska</span>
                  <strong className="text-emerald-800 font-mono text-sm">{activeAlokasi.sisaNpkKg} Kg</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">Sisa Pupuk Organik</span>
                  <strong className="text-emerald-800 font-mono text-sm">{activeAlokasi.sisaOrganikKg} Kg</strong>
                </div>
              </div>
            </div>
          )}

          {/* Section IV: Lampiran Dokumentasi Fisik Verifikasi */}
          <div className="mb-6">
            <h4 className="text-xs font-black uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded text-slate-800 mb-2 border-l-4 border-emerald-600">
              III. DOKUMENTASI FISIK VERIFIKASI IDENTITAS DI MEJA KIOS
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-300 rounded-xl p-2 bg-slate-50 text-center flex flex-col items-center">
                <div className="h-28 w-full flex items-center justify-center overflow-hidden rounded-lg bg-white border border-slate-200 mb-1.5">
                  <img
                    src={data.fotoKtp}
                    alt="Foto KTP Asli Petani"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-700">Foto KTP Asli Petani</span>
                <span className="text-[10px] text-slate-400">Verifikasi NIK Kependudukan</span>
              </div>

              <div className="border border-slate-300 rounded-xl p-2 bg-slate-50 text-center flex flex-col items-center">
                <div className="h-28 w-full flex items-center justify-center overflow-hidden rounded-lg bg-white border border-slate-200 mb-1.5">
                  <img
                    src={data.fotoDiri}
                    alt="Foto Diri Petani Penerima"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-700">Foto Wajah Diri Penerima</span>
                <span className="text-[10px] text-slate-400">Penebusan Langsung di KPL</span>
              </div>
            </div>
          </div>

          {/* Section V: Tanda Tangan & Cap Pengesahan */}
          <div className="pt-4 border-t-2 border-slate-200">
            <div className="flex items-center justify-between mb-6 text-xs text-slate-600">
              <div>
                Developer Pengembang: <span className="font-bold text-slate-900">Supriyanto Abadi Jaya</span>
              </div>
              <div>
                Kecamatan Lembeyan, {formattedDate}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-6 text-center text-[10px] sm:text-xs">
              <div>
                <p className="font-semibold text-slate-600">Petani Penerima Manfaat,</p>
                <div className="h-20 flex items-center justify-center relative my-1">
                  {data.signatures?.petaniSig ? (
                    <img
                      src={data.signatures.petaniSig}
                      alt="TTD Petani"
                      className="h-14 object-contain relative z-10"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-300 italic">[Tanda Tangan Petani]</span>
                  )}
                </div>
                <p className="font-bold text-slate-900 underline uppercase">{data.petani?.nama}</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {data.signatures?.petaniNip || `NIK: ${data.petani?.nik}`}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-600">Saksi Pengurus Kelompok Tani,</p>
                <div className="h-20 flex items-center justify-center relative my-1">
                  {data.signatures?.poktanStamp && (
                    <img
                      src={data.signatures.poktanStamp}
                      alt="Stempel Poktan"
                      className="h-18 w-18 object-contain absolute left-1/2 -translate-x-14 opacity-80 pointer-events-none"
                    />
                  )}
                  {data.signatures?.poktanSig ? (
                    <img
                      src={data.signatures.poktanSig}
                      alt="TTD Poktan"
                      className="h-14 object-contain relative z-10"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-300 italic">[Tanda Tangan & Stempel]</span>
                  )}
                </div>
                <p className="font-bold text-slate-900 underline uppercase">{data.namaPengurusPoktan}</p>
                <p className="text-[10px] font-mono text-slate-600">{data.signatures?.poktanNip}</p>
                <p className="text-[10px] text-slate-400">{data.petani?.poktan?.nama}</p>
              </div>

              <div>
                <p className="font-semibold text-slate-600">Penanggung Jawab Kios Penyalur (KPL),</p>
                <div className="h-20 flex items-center justify-center relative my-1">
                  {data.signatures?.kiosStamp && (
                    <img
                      src={data.signatures.kiosStamp}
                      alt="Stempel Kios KPL"
                      className="h-18 w-18 object-contain absolute left-1/2 -translate-x-14 opacity-80 pointer-events-none"
                    />
                  )}
                  {data.signatures?.kiosSig ? (
                    <img
                      src={data.signatures.kiosSig}
                      alt="TTD Kios KPL"
                      className="h-14 object-contain relative z-10"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-300 italic">[Stempel Resmi Kios]</span>
                  )}
                </div>
                <p className="font-bold text-slate-900 underline uppercase">{data.petugasKios}</p>
                <p className="text-[10px] font-mono text-slate-600">{data.signatures?.kiosNip}</p>
                <p className="text-[10px] text-slate-400">{data.namaKios}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* OPSI 2: FORMAT SLIP STRUK KASIR MINI / THERMAL POS 80MM */}
      {/* ===================================================================== */}
      {format === 'THERMAL' && (
        <div className="max-w-xs sm:max-w-sm mx-auto bg-white border border-slate-300 shadow-xl rounded-2xl p-6 print-page print:border-none print:shadow-none print:p-0 font-mono text-xs text-slate-900">
          {/* Header Struk Mini */}
          <div className="text-center pb-3 border-b-2 border-dashed border-slate-400 space-y-1">
            <h2 className="font-black text-sm uppercase tracking-wider">{data.namaKios}</h2>
            <p className="text-[10px] text-slate-600">KIOS PUPUK LENGKAP (KPL) RESMI</p>
            <p className="text-[10px] text-slate-500">Jl. Raya Lembeyan No. 45 &bull; BPP Lembeyan</p>
            <p className="text-[10px] text-slate-500">Kecamatan Lembeyan &bull; Dev: Supriyanto Abadi Jaya</p>
          </div>

          {/* Info Transaksi */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>No Nota:</span>
              <span className="font-bold">{data.nomorNota}</span>
            </div>
            <div className="flex justify-between">
              <span>Waktu:</span>
              <span>{formattedDate} {formattedTime}</span>
            </div>
            <div className="flex justify-between">
              <span>Kasir/KPL:</span>
              <span>{data.petugasKios}</span>
            </div>
            <div className="flex justify-between">
              <span>Petani:</span>
              <span className="font-bold">{data.petani?.nama}</span>
            </div>
            <div className="flex justify-between">
              <span>NIK:</span>
              <span>{data.petani?.nik}</span>
            </div>
            <div className="flex justify-between">
              <span>Poktan:</span>
              <span>{data.petani?.poktan?.nama}</span>
            </div>
          </div>

          {/* Rincian Item Pupuk */}
          <div className="py-3 border-b-2 border-dashed border-slate-400 space-y-2 text-[11px]">
            <div className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
              Rincian Penebusan Pupuk:
            </div>

            {data.jumlahUreaKg > 0 && (
              <div>
                <div className="flex justify-between font-bold">
                  <span>UREA BERSUBSIDI</span>
                  <span>{formatRupiah(biayaUrea)}</span>
                </div>
                <div className="text-slate-500 text-[10px]">
                  {data.jumlahUreaKg} Kg x {formatRupiah(HET_UREA)}
                </div>
              </div>
            )}

            {data.jumlahNpkKg > 0 && (
              <div>
                <div className="flex justify-between font-bold">
                  <span>NPK PHONSKA SUBSIDI</span>
                  <span>{formatRupiah(biayaNpk)}</span>
                </div>
                <div className="text-slate-500 text-[10px]">
                  {data.jumlahNpkKg} Kg x {formatRupiah(HET_NPK)}
                </div>
              </div>
            )}

            {data.jumlahOrganikKg > 0 && (
              <div>
                <div className="flex justify-between font-bold">
                  <span>ORGANIK PETROGANIK</span>
                  <span>{formatRupiah(biayaOrganik)}</span>
                </div>
                <div className="text-slate-500 text-[10px]">
                  {data.jumlahOrganikKg} Kg x {formatRupiah(HET_ORGANIK)}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm">
              <span>TOTAL (HET)</span>
              <span>{formatRupiah(totalBiayaCalculated)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Status Bayar</span>
              <span className="font-bold text-emerald-800">LUNAS TUNAI</span>
            </div>
          </div>

          {/* Sisa Kuota Musim Tanam */}
          {activeAlokasi && (
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[10px] text-slate-600 space-y-0.5">
              <span className="font-bold text-slate-800 block">Sisa Kuota e-RDKK {formatMusimTanam(activeAlokasi.musimTanam)}:</span>
              <div className="flex justify-between">
                <span>Urea:</span>
                <span className="font-bold">{activeAlokasi.sisaUreaKg} Kg</span>
              </div>
              <div className="flex justify-between">
                <span>NPK:</span>
                <span className="font-bold">{activeAlokasi.sisaNpkKg} Kg</span>
              </div>
              <div className="flex justify-between">
                <span>Organik:</span>
                <span className="font-bold">{activeAlokasi.sisaOrganikKg} Kg</span>
              </div>
            </div>
          )}

          {/* QR Code Mini Verifikasi */}
          <div className="pt-4 pb-2 text-center flex flex-col items-center">
            <QrCodeView value={verificationUrl} size={90} caption="SCAN UNTUK CEK KEASLIAN" />
            <p className="text-[9px] text-slate-400 mt-2 italic">
              Pupuk Bersubsidi Barang Dalam Pengawasan Pemerintah Republik Indonesia.
            </p>
            <p className="text-[10px] font-bold text-slate-700 mt-1">
              *** TERIMA KASIH ***
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
