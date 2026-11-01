'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Printer,
  Calendar,
  Building,
  User,
  MapPin,
  Sprout,
  ExternalLink,
  QrCode,
  ArrowRight,
  Sparkles,
  Layers,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { formatRupiah } from '@/lib/calculations';

function VerifikasiContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || searchParams.get('code') || '';

  const [inputCode, setInputCode] = useState(queryParam);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerify = async (codeToVerify?: string) => {
    const target = (codeToVerify !== undefined ? codeToVerify : inputCode).trim();
    if (!target) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/verifikasi?q=${encodeURIComponent(target)}`);
      const json = await res.json();
      if (json.success) {
        setResult(json);
      } else {
        setErrorMsg(json.error || 'Gagal memverifikasi dokumen');
      }
    } catch (err: any) {
      setErrorMsg('Terjadi gangguan jaringan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryParam) {
      setInputCode(queryParam);
      handleVerify(queryParam);
    }
  }, [queryParam]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950 text-slate-100 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 1. Header Resmi Portal Verifikasi Pemerintah */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-400/30 px-4 py-1.5 rounded-full text-xs font-bold text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            PORTAL RESMI VALIDASI & KEABSAHAN DOKUMEN PEMKAB MAGETAN
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Verifikasi Keaslian Dokumen Pertanian & GIS
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Periksa keaslian Kartu Tani Digital, Kuitansi Penebusan Kasir Poktan, Sertifikat Kadaster Lahan GIS, dan Surat Keputusan e-RDKK Kecamatan Lembeyan.
          </p>
        </div>

        {/* 2. Search & Scan Box */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-4 sm:p-6 border border-white/15 shadow-2xl space-y-4 no-print">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <div className="relative flex-1">
              <QrCode className="w-5 h-5 text-emerald-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Scan QR atau ketik NIK Petani, No. Nota (NT-POK/...), atau Kode Lahan (LHN-...)"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-950/70 border border-white/20 rounded-2xl text-white font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-slate-400 font-semibold"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputCode.trim()}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Memvalidasi...' : 'Verifikasi Dokumen'}</span>
            </button>
          </form>

          {/* Quick Examples */}
          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px] font-bold">Contoh Cepat untuk Diuji:</span>
            <button
              type="button"
              onClick={() => {
                setInputCode('3509011208720002');
                handleVerify('3509011208720002');
              }}
              className="bg-white/10 hover:bg-emerald-600 text-emerald-300 hover:text-white px-2.5 py-1 rounded-xl text-[11px] font-mono border border-white/10 transition"
            >
              🪪 Kartu Tani (3509011208720002)
            </button>
            <button
              type="button"
              onClick={() => {
                setInputCode('NT-POK/2026/001');
                handleVerify('NT-POK/2026/001');
              }}
              className="bg-white/10 hover:bg-emerald-600 text-amber-300 hover:text-white px-2.5 py-1 rounded-xl text-[11px] font-mono border border-white/10 transition"
            >
              🧾 Nota Kasir (NT-POK/2026/001)
            </button>
            <button
              type="button"
              onClick={() => {
                setInputCode('LHN-2026-001');
                handleVerify('LHN-2026-001');
              }}
              className="bg-white/10 hover:bg-emerald-600 text-sky-300 hover:text-white px-2.5 py-1 rounded-xl text-[11px] font-mono border border-white/10 transition"
            >
              🗺️ Lahan GIS (LHN-2026-001)
            </button>
          </div>
        </div>

        {/* 3. HASIL VERIFIKASI DOKUMEN */}
        {result && result.found && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 text-slate-900 shadow-2xl border border-slate-200 space-y-6 relative overflow-hidden animate-fade-in print:p-0 print:border-none print:shadow-none">
            {/* Watermark Garis Pengaman */}
            <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/5 rounded-full pointer-events-none -mr-20 -mt-20" />

            {/* Banner Status Asli & Sah */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <div className="inline-block bg-white/20 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider mb-1">
                    {result.statusBadge}
                  </div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                    DOKUMEN DINYATAKAN ASLI, SAH & TERCATAT RESMI
                  </h2>
                </div>
              </div>
              <div className="text-right text-[11px] text-emerald-100 sm:border-l sm:border-white/20 sm:pl-4">
                <span className="block opacity-80">Terverifikasi Sistem Pada:</span>
                <span className="font-mono font-bold text-white">
                  {new Date(result.verifiedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB
                </span>
              </div>
            </div>

            {/* Identitas Dokumen */}
            <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  {result.docTypeLabel}
                </span>
                <div className="text-xl sm:text-2xl font-black text-slate-950 font-mono mt-1">
                  {result.nomorDokumen}
                </div>
              </div>
              <div className="no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Cetak Sertifikat Keabsahan</span>
                </button>
              </div>
            </div>

            {/* Rincian Pihak Terkait */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Pihak Penerima / Pemilik:
                </span>
                <div className="text-sm font-black text-slate-900">
                  {result.pihakTerkait.nama || result.pihakTerkait.namaPemilik || result.pihakTerkait.namaPemohon}
                </div>
                <div className="text-slate-600 font-mono mt-0.5">
                  NIK: <span className="font-bold text-slate-800">{result.pihakTerkait.identitasMasked}</span>
                </div>
                <div className="text-slate-500 mt-0.5">
                  Kelompok Tani: <strong className="text-slate-700">{result.pihakTerkait.poktan}</strong>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Wilayah Kedudukan / Administrasi:
                </span>
                <div className="text-xs font-semibold text-slate-800">
                  {result.pihakTerkait.desa}
                </div>
                <div className="text-emerald-700 font-bold mt-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Status: Terverifikasi di Pangkalan Data Resmi</span>
                </div>
              </div>
            </div>

            {/* Rincian Khusus Per Dokumen */}
            {/* A. Rincian Kartu Tani */}
            {result.docType === 'KARTU_TANI' && result.dataSpasialDanAlokasi && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Rincian Hak Kuota Pupuk Bersubsidi e-RDKK 2026:
                </h4>
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Pupuk Urea</span>
                    <strong className="text-base font-black text-emerald-800 font-mono block mt-1">
                      {result.dataSpasialDanAlokasi.alokasiUreaKg} Kg
                    </strong>
                    <span className="text-[10px] text-emerald-700">Sisa Kuota: {result.dataSpasialDanAlokasi.sisaUreaKg} Kg</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Pupuk NPK Phonska</span>
                    <strong className="text-base font-black text-amber-800 font-mono block mt-1">
                      {result.dataSpasialDanAlokasi.alokasiNpkKg} Kg
                    </strong>
                    <span className="text-[10px] text-amber-700">Sisa Kuota: {result.dataSpasialDanAlokasi.sisaNpkKg} Kg</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Pupuk Organik</span>
                    <strong className="text-base font-black text-teal-800 font-mono block mt-1">
                      {result.dataSpasialDanAlokasi.alokasiOrganikKg} Kg
                    </strong>
                    <span className="text-[10px] text-teal-700">Sisa Kuota: {result.dataSpasialDanAlokasi.sisaOrganikKg} Kg</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  Akumulasi luas baku lahan terdata: <strong>{result.dataSpasialDanAlokasi.totalLuasLahanHa} Ha</strong> ({result.dataSpasialDanAlokasi.jumlahBlokSawah} Petak Hamparan Sawah GIS).
                </p>
              </div>
            )}

            {/* B. Rincian Nota Penebusan Kasir Poktan */}
            {(result.docType === 'NOTA_KASIR_POKTAN' || result.docType === 'NOTA_KIOS_KPL') && result.rincianTransaksi && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Rincian Penebusan Pupuk Bersubsidi:
                </h4>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-slate-600">
                    <span>Waktu Penebusan:</span>
                    <strong className="text-slate-900 font-semibold">{result.rincianTransaksi.tanggalPenebusan}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Pupuk Ditebus:</span>
                    <strong className="text-slate-900 font-mono">
                      {result.rincianTransaksi.ureaKg} Kg Urea ({result.rincianTransaksi.ureaSak} Sak) &bull;{' '}
                      {result.rincianTransaksi.npkKg} Kg NPK ({result.rincianTransaksi.npkSak} Sak) &bull;{' '}
                      {result.rincianTransaksi.organikKg} Kg Organik ({result.rincianTransaksi.organikSak} Sak)
                    </strong>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
                    <span>Total Pembayaran:</span>
                    <span className="text-emerald-700 font-mono">{formatRupiah(result.rincianTransaksi.totalBayarRp)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* C. Rincian Lahan GIS */}
            {result.docType === 'SERTIFIKAT_LAHAN_GIS' && result.spesifikasiLahan && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Spesifikasi Kadastral Poligon Lahan:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nama Hamparan:</span>
                    <strong className="text-slate-900">{result.spesifikasiLahan.namaHamparan}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Komoditas:</span>
                    <strong className="text-emerald-700">{result.spesifikasiLahan.komoditas}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Luas Baku:</span>
                    <strong className="text-slate-900 font-mono">{result.spesifikasiLahan.luasHa} Ha ({result.spesifikasiLahan.luasM2} m²)</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Koordinat Pusat:</span>
                    <strong className="text-slate-900 font-mono text-[11px]">{result.spesifikasiLahan.koordinatPusat}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* D. Rincian Surat Jalan Distribusi */}
            {result.docType === 'SURAT_JALAN_DISTRIBUSI' && result.muatanPupuk && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Rincian Pengiriman Muatan Pupuk DO:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Pupuk Urea</span>
                    <strong className="text-sm font-black text-emerald-800 block mt-1">
                      {result.muatanPupuk.urea}
                    </strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Pupuk NPK Phonska</span>
                    <strong className="text-sm font-black text-blue-800 block mt-1">
                      {result.muatanPupuk.npk}
                    </strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Pupuk Organik</span>
                    <strong className="text-sm font-black text-amber-800 block mt-1">
                      {result.muatanPupuk.organik}
                    </strong>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 bg-blue-50/60 p-3 rounded-xl border border-blue-200">
                  <span>Armada & Sopir: <strong>{result.pihakTerkait.sopir}</strong></span>
                  <span>Tanggal Kirim: <strong>{result.muatanPupuk.tanggalKirim}</strong></span>
                  <span>Penerima: <strong>{result.pihakTerkait.penerima}</strong></span>
                </div>
              </div>
            )}

            {/* Rincian SPJ Model F-6 Pengecer Pupuk Indonesia */}
            {result.docType === 'SPJ_MODEL_F6' && result.rincianSPJ && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Rincian Verifikasi SPJ Model F-6:
                </h4>
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Kios Pengecer Resmi:</span>
                      <strong className="text-slate-900 font-bold">{result.pihakTerkait.instansiPengecer}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Distributor Penyalur:</span>
                      <strong className="text-slate-900 font-bold">{result.pihakTerkait.distributor}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Wilayah Kerja:</span>
                      <strong className="text-slate-900 font-bold">{result.pihakTerkait.wilayahKerja}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Petugas Verifikator:</span>
                      <strong className="text-slate-900 font-bold">{result.pihakTerkait.verifikator}</strong>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-900 font-medium">
                    <span>Legalitas: <strong>{result.rincianSPJ.legalitas}</strong></span>
                    <span className="bg-emerald-200/70 text-emerald-950 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                      STATUS RESMI KEMENTAN & PIHC
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Bagian Tanda Tangan & Stempel Resmi Pengesah */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-xs text-slate-500 max-w-sm space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Building className="w-4 h-4 text-emerald-600" />
                  <span>Otoritas Penjamin Dokumen:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {result.keterangan}
                </p>
              </div>

              {/* Stempel & Tanda Tangan */}
              <div className="flex flex-wrap items-center justify-end gap-6 shrink-0 text-center">
                {/* TTD Petani Penerima (Khusus Nota Kasir Poktan / Kios) */}
                {result.pihakTerkait?.tandaTanganPetani && (
                  <div className="border border-slate-200/80 bg-slate-50/50 p-2.5 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">
                      Petani Penerima Pupuk:
                    </span>
                    <div className="w-28 h-12 mx-auto flex items-center justify-center">
                      <img
                        src={result.pihakTerkait.tandaTanganPetani}
                        alt="TTD Petani"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <strong className="block text-xs text-slate-900 border-t border-slate-300 pt-1 font-bold">
                      {result.pihakTerkait.nama}
                    </strong>
                    <span className="text-[10px] text-emerald-700 block font-semibold">
                      Terverifikasi Lunas
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {result.pejabatPengesah.stampUrl && (
                    <div className="w-20 h-20 shrink-0">
                      <img
                        src={result.pejabatPengesah.stampUrl}
                        alt="Stempel Resmi"
                        className="w-full h-full object-contain opacity-90"
                      />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">
                      Pengurus Kasir / Pengesah:
                    </span>
                    <div className="w-28 h-12 mx-auto flex items-center justify-center">
                      {result.pejabatPengesah.signatureUrl && (
                        <img
                          src={result.pejabatPengesah.signatureUrl}
                          alt="Tanda Tangan Elektronik"
                          className="max-h-full max-w-full object-contain"
                        />
                      )}
                    </div>
                    <strong className="block text-xs text-slate-900 border-t border-slate-300 pt-1 font-bold">
                      {result.pejabatPengesah.koordinator}
                    </strong>
                    <span className="text-[10px] text-slate-500 block font-mono">
                      {result.pejabatPengesah.nip}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. HASIL JIKA DOKUMEN TIDAK DITEMUKAN */}
        {result && !result.found && (
          <div className="bg-white rounded-3xl p-8 sm:p-10 text-center space-y-4 shadow-xl border-2 border-rose-200 animate-fade-in text-slate-900">
            <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 border border-rose-300 flex items-center justify-center mx-auto shadow-xs">
              <XCircle className="w-9 h-9" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 px-3 py-1 rounded-full border border-rose-200">
                Peringatan: Dokumen Tidak Terdaftar
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 mt-2">
                Dokumen Ini Tidak Ditemukan di Database Resmi
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mt-2 leading-relaxed">
                {result.message}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-w-md mx-auto text-xs text-left space-y-1">
              <strong className="text-slate-800 block font-bold">Saran Pemeriksaan:</strong>
              <p className="text-slate-500 text-[11px]">&bull; Pastikan 16 digit NIK atau nomor nota diinput tanpa salah ketik.</p>
              <p className="text-slate-500 text-[11px]">&bull; Untuk konfirmasi langsung, hubungi Kantor BPP Kecamatan Lembeyan atau Admin Dinas.</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setResult(null);
                setInputCode('');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Coba Masukkan Nomor Lain</span>
            </button>
          </div>
        )}

        {/* 5. Footer Informasi Publik */}
        <div className="text-center text-xs text-slate-400 space-y-1 pt-6 no-print">
          <p className="font-semibold text-slate-300">
            Sistem Informasi Pertanian & Pelayanan e-RDKK Terintegrasi &bull; Kecamatan Lembeyan &copy; 2026
          </p>
          <p className="text-[11px] text-slate-500">
            Dikelola oleh Pemerintah Kecamatan Lembeyan bekerjasama dengan BPP Lembeyan &bull; Pengembang: <strong>Supriyanto Abadi Jaya</strong>
          </p>
          <div className="pt-2">
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline text-[11px]">
              Masuk ke Portal Petugas / Login Sistem &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifikasiPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
          <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3" />
        </div>
      }
    >
      <VerifikasiContent />
    </Suspense>
  );
}
