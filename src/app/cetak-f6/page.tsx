'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Printer,
  Download,
  Share2,
  ArrowLeft,
  RefreshCw,
  Building2,
  CheckCircle2,
  Store,
  Calendar,
  FileText,
  FileSpreadsheet,
  QrCode,
  ShieldCheck,
  Send,
  Sparkles,
} from 'lucide-react';
import { formatRupiah, formatAngka } from '@/lib/calculations';
import QrCodeView from '@/components/ui/QrCodeView';
import { exportModelF6Excel } from '@/lib/export-excel';
import { useAuth } from '@/lib/auth-context';
import { showSuccess, showToast } from '@/lib/sweetalert';

const BULAN_OPTIONS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
];

export default function CetakModelF6Page() {
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [kiosList, setKiosList] = useState<string[]>([]);

  // Filters
  const [selectedKios, setSelectedKios] = useState<string>(currentUser?.kiosName || '');
  const [selectedBulan, setSelectedBulan] = useState<number>(10); // Oktober
  const [selectedTahun, setSelectedTahun] = useState<number>(2026);

  const fetchF6Data = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        kios: selectedKios,
        bulan: String(selectedBulan),
        tahun: String(selectedTahun),
      });

      const res = await fetch(`/api/laporan/f6?${query.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setReportData(json.data);
      }
    } catch (err) {
      console.error('Error load F6 data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Muat daftar Kios
  useEffect(() => {
    fetch('/api/kios')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const names = json.data.map((k: any) => k.namaKios || k.name).filter(Boolean);
          const uniqueNames = Array.from(new Set(names)) as string[];
          setKiosList(uniqueNames);
          if (!selectedKios && uniqueNames.length > 0) {
            setSelectedKios(uniqueNames[0]);
          }
        }
      })
      .catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    fetchF6Data();
  }, [selectedKios, selectedBulan, selectedTahun]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!reportData) return;
    exportModelF6Excel(
      {
        namaKios: reportData.kiosInfo.namaKios,
        kodeKios: reportData.kiosInfo.kodeKios,
        pengelola: reportData.kiosInfo.pengelola,
        alamat: reportData.kiosInfo.alamat,
        distributor: reportData.kiosInfo.distributor,
        bulan: reportData.periode.bulanNama,
        tahun: reportData.periode.tahun,
      },
      reportData.poktanRows,
      reportData.grandTotal,
      `SPJ_Model_F6_${reportData.kiosInfo.namaKios.replace(/\s+/g, '_')}_${reportData.periode.bulanNama}_${reportData.periode.tahun}.xlsx`
    );
    showSuccess('Ekspor Berhasil', 'Dokumen SPJ Model F-6 berhasil diunduh dalam format Excel!');
  };

  const handleShareWhatsApp = () => {
    if (!reportData) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const verifUrl = `${origin}/verifikasi?q=${encodeURIComponent(reportData.kodeVerifikasi)}`;

    const text =
      `*📑 DOKUMEN SPJ PENYALURAN PUPUK BERSUBSIDI MODEL F-6*\n` +
      `--------------------------------------------------\n` +
      `*Pengecer/KPL*: ${reportData.kiosInfo.namaKios}\n` +
      `*Kode KPL*: ${reportData.kiosInfo.kodeKios}\n` +
      `*Penanggung Jawab*: ${reportData.kiosInfo.pengelola}\n` +
      `*Periode*: Bulan ${reportData.periode.bulanNama} ${reportData.periode.tahun}\n` +
      `--------------------------------------------------\n` +
      `*REKAP PENYALURAN BULAN INI:*\n` +
      `• Urea: ${formatAngka(reportData.grandTotal.salurUrea)} Kg (${reportData.grandTotal.salurUreaSak} Sak)\n` +
      `• NPK Phonska: ${formatAngka(reportData.grandTotal.salurNpk)} Kg (${reportData.grandTotal.salurNpkSak} Sak)\n` +
      `• Pupuk Organik: ${formatAngka(reportData.grandTotal.salurOrganik)} Kg (${reportData.grandTotal.salurOrganikSak} Sak)\n` +
      `• Total Omzet HET: ${formatRupiah(reportData.grandTotal.totalNilaiHet)}\n` +
      `--------------------------------------------------\n` +
      `*SISA STOK GUDANG AKHIR BULAN:*\n` +
      `• Urea: ${formatAngka(reportData.grandTotal.sisaUrea)} Kg\n` +
      `• NPK Phonska: ${formatAngka(reportData.grandTotal.sisaNpk)} Kg\n` +
      `• Organik: ${formatAngka(reportData.grandTotal.sisaOrganik)} Kg\n` +
      `--------------------------------------------------\n` +
      `Dokumen resmi disahkan oleh PPL BPP Wilbin & Koordinator BPP Kec. Lembeyan.\n\n` +
      `🔍 *Cek & Verifikasi Keaslian Dokumen:*\n${verifUrl}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const verifikasiUrl =
    typeof window !== 'undefined' && reportData
      ? `${window.location.origin}/verifikasi?q=${encodeURIComponent(reportData.kodeVerifikasi)}`
      : 'https://bpp-lembeyan.magetan.go.id/verifikasi';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 py-6 px-3 sm:px-6 print:p-0 print:bg-white print:text-black">
      {/* ==============================================================
          BARIS NAVIGASI & KONTROL (HANYA MUNCUL DI LAYAR / NO-PRINT)
      ============================================================== */}
      <div className="max-w-[1300px] mx-auto mb-6 no-print space-y-4">
        {/* Top bar back & actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/distribusi"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Cetak Dokumen SPJ Format F-6 Resmi Pupuk Indonesia
              </h1>
              <p className="text-xs text-slate-500">
                Laporan Bulanan Penyaluran dan Stok Pupuk Bersubsidi Tingkat Pengecer (KPL) ke Seluruh Kelompok Tani
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchF6Data}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Muat Ulang
            </button>

            <button
              onClick={handleExportExcel}
              disabled={loading || !reportData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Unduh Excel
            </button>

            <button
              onClick={handleShareWhatsApp}
              disabled={loading || !reportData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition"
            >
              <Send className="w-4 h-4" />
              Kirim ke WhatsApp
            </button>

            <button
              onClick={handlePrint}
              disabled={loading || !reportData}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              Cetak SPJ F-6 (Print)
            </button>
          </div>
        </div>

        {/* Filter Bar: Kios, Bulan, Tahun */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-700">Pilih Kios (KPL):</span>
            <select
              value={selectedKios}
              onChange={(e) => setSelectedKios(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-1.5 font-semibold text-slate-800 focus:outline-emerald-500 bg-white"
            >
              {kiosList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
              {kiosList.length === 0 && (
                <option value="UD. Tani Subur Barokah">UD. Tani Subur Barokah</option>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-700">Bulan:</span>
            <select
              value={selectedBulan}
              onChange={(e) => setSelectedBulan(Number(e.target.value))}
              className="border border-slate-300 rounded-xl px-3 py-1.5 font-semibold text-slate-800 focus:outline-emerald-500 bg-white"
            >
              {BULAN_OPTIONS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Tahun:</span>
            <select
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(Number(e.target.value))}
              className="border border-slate-300 rounded-xl px-3 py-1.5 font-semibold text-slate-800 focus:outline-emerald-500 bg-white"
            >
              <option value={2026}>2026 (Tahun Anggaran Berjalan)</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          <div className="ml-auto text-[11px] text-slate-500 font-medium">
            💡 <em>Gunakan kertas A4 atau F4 mode <strong>Landscape</strong> untuk hasil cetak terbaik.</em>
          </div>
        </div>
      </div>

      {/* ==============================================================
          LEMBAR DOKUMEN CETAK MODEL F-6 (PRINT-READY A4/F4 LANDSCAPE)
      ============================================================== */}
      <div className="max-w-[1300px] mx-auto bg-white border border-slate-300 rounded-2xl shadow-xl p-8 sm:p-10 print:p-0 print:border-none print:shadow-none print:rounded-none">
        {loading && (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-600">
              Sedang menyusun data Dokumen SPJ Model F-6 resmi...
            </p>
          </div>
        )}

        {!loading && reportData && (
          <div className="space-y-6 text-slate-900">
            {/* 1. KOP SURAT RESMI */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                  {/* Lambang Garuda / Lambang Magetan */}
                  <div className="w-16 h-16 rounded-full border-2 border-slate-800 flex flex-col items-center justify-center text-center p-1 font-bold text-[9px] uppercase leading-tight bg-slate-50">
                    <span className="text-[10px]">🇮🇩</span>
                    BPP LEMBEYAN
                  </div>
                </div>

                <div className="text-center flex-1 space-y-1">
                  <div className="text-[11px] font-bold tracking-widest text-slate-600 uppercase">
                    PUPUK INDONESIA HOLDING COMPANY & KEMENTERIAN PERTANIAN RI
                  </div>
                  <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-950">
                    LAPORAN PENYALURAN DAN STOK PUPUK BERSUBSIDI TINGKAT PENGECER
                  </h2>
                  <div className="inline-block bg-slate-900 text-white font-mono font-black text-xs px-3 py-0.5 rounded tracking-wider">
                    FORMAT RESMI: MODEL F - 6
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    Kios Pengecer Lengkap (KPL) Resmi Wilayah Kerja BPP Kecamatan Lembeyan, Kabupaten Magetan
                  </div>
                </div>

                <div className="w-24 text-right shrink-0">
                  <div className="border border-slate-800 px-2 py-1 text-center font-mono text-[10px] font-bold">
                    LAMPIRAN SPJ
                    <div className="text-[9px] font-normal text-slate-600">Model F-6</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. IDENTITAS KIOS PENYALUR & PERIODE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs border border-slate-300 p-4 rounded-xl bg-slate-50/60 print:bg-transparent print:p-2">
              <div className="space-y-1">
                <div className="flex">
                  <span className="w-40 font-bold text-slate-600">Nama Pengecer / KPL</span>
                  <span className="font-black text-slate-900">: {reportData.kiosInfo.namaKios}</span>
                </div>
                <div className="flex">
                  <span className="w-40 font-bold text-slate-600">Kode Registrasi KPL</span>
                  <span className="font-mono font-bold text-slate-900">: {reportData.kiosInfo.kodeKios}</span>
                </div>
                <div className="flex">
                  <span className="w-40 font-bold text-slate-600">Penanggung Jawab</span>
                  <span className="font-semibold text-slate-900">: {reportData.kiosInfo.pengelola}</span>
                </div>
                <div className="flex">
                  <span className="w-40 font-bold text-slate-600">Alamat Gudang Kios</span>
                  <span className="text-slate-800">: {reportData.kiosInfo.alamat}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex">
                  <span className="w-36 font-bold text-slate-600">Bulan / Periode</span>
                  <span className="font-black text-slate-900">
                    : Bulan {reportData.periode.bulanNama} {reportData.periode.tahun}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-36 font-bold text-slate-600">Kecamatan / Kab.</span>
                  <span className="text-slate-800">: Lembeyan / Magetan (Jawa Timur)</span>
                </div>
                <div className="flex">
                  <span className="w-36 font-bold text-slate-600">Distributor Penyalur</span>
                  <span className="font-semibold text-slate-900">: {reportData.kiosInfo.distributor}</span>
                </div>
                <div className="flex">
                  <span className="w-36 font-bold text-slate-600">Nomor Registrasi SPJ</span>
                  <span className="font-mono font-bold text-emerald-800">: {reportData.nomorDokumen}</span>
                </div>
              </div>
            </div>

            {/* 3. TABEL UTAMA REKAPITULASI MODEL F-6 */}
            <div className="overflow-x-auto">
              <table className="w-full text-[10.5px] border-collapse border border-slate-800">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 text-center font-black">
                    <th rowSpan={2} className="border border-slate-700 px-1.5 py-2 w-8">
                      NO
                    </th>
                    <th rowSpan={2} className="border border-slate-700 px-3 py-2 text-left min-w-[150px]">
                      KELOMPOK TANI (POKTAN)
                    </th>
                    <th rowSpan={2} className="border border-slate-700 px-2 py-2 text-left w-24">
                      DESA
                    </th>
                    <th colSpan={3} className="border border-slate-700 px-2 py-1 bg-slate-300">
                      STOK AWAL BULAN (KG)
                    </th>
                    <th colSpan={3} className="border border-slate-700 px-2 py-1 bg-slate-300">
                      PENERIMAAN DO DISTRIBUTOR (KG)
                    </th>
                    <th colSpan={3} className="border border-slate-700 px-2 py-1 bg-emerald-200/90 text-emerald-950">
                      PENYALURAN KE PETANI (KG)
                    </th>
                    <th colSpan={3} className="border border-slate-700 px-2 py-1 bg-amber-200/90 text-amber-950">
                      SISA STOK AKHIR DI KIOS (KG)
                    </th>
                    <th rowSpan={2} className="border border-slate-700 px-2 py-2 text-right min-w-[100px] bg-slate-300">
                      NILAI HET (RP)
                    </th>
                  </tr>
                  <tr className="bg-slate-100 text-slate-800 text-center font-bold text-[9.5px]">
                    {/* Stok Awal */}
                    <th className="border border-slate-700 px-1 py-1 w-14">Urea</th>
                    <th className="border border-slate-700 px-1 py-1 w-14">NPK</th>
                    <th className="border border-slate-700 px-1 py-1 w-14">Org</th>
                    {/* Penerimaan */}
                    <th className="border border-slate-700 px-1 py-1 w-14">Urea</th>
                    <th className="border border-slate-700 px-1 py-1 w-14">NPK</th>
                    <th className="border border-slate-700 px-1 py-1 w-14">Org</th>
                    {/* Penyaluran */}
                    <th className="border border-slate-700 px-1 py-1 w-14 bg-emerald-50">Urea</th>
                    <th className="border border-slate-700 px-1 py-1 w-14 bg-emerald-50">NPK</th>
                    <th className="border border-slate-700 px-1 py-1 w-14 bg-emerald-50">Org</th>
                    {/* Sisa Stok */}
                    <th className="border border-slate-700 px-1 py-1 w-14 bg-amber-50">Urea</th>
                    <th className="border border-slate-700 px-1 py-1 w-14 bg-amber-50">NPK</th>
                    <th className="border border-slate-700 px-1 py-1 w-14 bg-amber-50">Org</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.poktanRows.map((row: any, idx: number) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition">
                      <td className="border border-slate-700 px-1.5 py-1.5 text-center font-bold">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-700 px-3 py-1.5 font-bold text-slate-900">
                        {row.namaPoktan}
                        <span className="block text-[9px] font-normal text-slate-500">
                          {row.jumlahAnggota} Petani Terdaftar
                        </span>
                      </td>
                      <td className="border border-slate-700 px-2 py-1.5 font-medium text-slate-700">
                        {row.desa}
                      </td>

                      {/* Stok Awal */}
                      <td className="border border-slate-700 px-1 py-1.5 text-right font-mono">
                        {formatAngka(row.stokAwalUrea)}
                      </td>
                      <td className="border border-slate-700 px-1 py-1.5 text-right font-mono">
                        {formatAngka(row.stokAwalNpk)}
                      </td>
                      <td className="border border-slate-700 px-1 py-1.5 text-right font-mono">
                        {formatAngka(row.stokAwalOrganik)}
                      </td>

                      {/* Penerimaan DO */}
                      <td className="border border-slate-700 px-1 py-1.5 text-right font-mono">
                        {formatAngka(row.penerimaanUrea)}
                      </td>
                      <td className="border border-slate-700 px-1 py-1.5 text-right font-mono">
                        {formatAngka(row.penerimaanNpk)}
                      </td>
                      <td className="border border-slate-700 px-1 py-1.5 text-right font-mono">
                        {formatAngka(row.penerimaanOrganik)}
                      </td>

                      {/* Penyaluran */}
                      <td className="border border-slate-700 px-1 py-1.5 text-right font-mono font-bold bg-emerald-50/50">
                        {formatAngka(row.salurUrea)}
                      </td>
                      <td className="border border-slate-700 px-1 py-1.5 text-right font-mono font-bold bg-emerald-50/50">
                        {formatAngka(row.salurNpk)}
                      </td>
                      <td className="border border-slate-700 px-1 py-1.5 text-right font-mono font-bold bg-emerald-50/50">
                        {formatAngka(row.salurOrganik)}
                      </td>

                      {/* Sisa Stok */}
                      <td className="border border-slate-700 px-1 py-1.5 text-right font-mono font-semibold bg-amber-50/50">
                        {formatAngka(row.sisaUrea)}
                      </td>
                      <td className="border border-slate-700 px-1 py-1.5 text-right font-mono font-semibold bg-amber-50/50">
                        {formatAngka(row.sisaNpk)}
                      </td>
                      <td className="border border-slate-700 px-1 py-1.5 text-right font-mono font-semibold bg-amber-50/50">
                        {formatAngka(row.sisaOrganik)}
                      </td>

                      {/* Nilai HET */}
                      <td className="border border-slate-700 px-2 py-1.5 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(row.totalNilaiHet)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-300 font-black text-slate-950 text-center">
                    <td colSpan={3} className="border border-slate-800 px-3 py-2 text-left uppercase tracking-wider">
                      JUMLAH TOTAL REKAPITULASI
                    </td>

                    {/* Stok Awal */}
                    <td className="border border-slate-800 px-1 py-2 text-right font-mono">
                      {formatAngka(reportData.grandTotal.stokAwalUrea)}
                    </td>
                    <td className="border border-slate-800 px-1 py-2 text-right font-mono">
                      {formatAngka(reportData.grandTotal.stokAwalNpk)}
                    </td>
                    <td className="border border-slate-800 px-1 py-2 text-right font-mono">
                      {formatAngka(reportData.grandTotal.stokAwalOrganik)}
                    </td>

                    {/* Penerimaan DO */}
                    <td className="border border-slate-800 px-1 py-2 text-right font-mono">
                      {formatAngka(reportData.grandTotal.penerimaanUrea)}
                    </td>
                    <td className="border border-slate-800 px-1 py-2 text-right font-mono">
                      {formatAngka(reportData.grandTotal.penerimaanNpk)}
                    </td>
                    <td className="border border-slate-800 px-1 py-2 text-right font-mono">
                      {formatAngka(reportData.grandTotal.penerimaanOrganik)}
                    </td>

                    {/* Penyaluran */}
                    <td className="border border-slate-800 px-1 py-2 text-right font-mono bg-emerald-200">
                      {formatAngka(reportData.grandTotal.salurUrea)}
                    </td>
                    <td className="border border-slate-800 px-1 py-2 text-right font-mono bg-emerald-200">
                      {formatAngka(reportData.grandTotal.salurNpk)}
                    </td>
                    <td className="border border-slate-800 px-1 py-2 text-right font-mono bg-emerald-200">
                      {formatAngka(reportData.grandTotal.salurOrganik)}
                    </td>

                    {/* Sisa Stok */}
                    <td className="border border-slate-800 px-1 py-2 text-right font-mono bg-amber-200">
                      {formatAngka(reportData.grandTotal.sisaUrea)}
                    </td>
                    <td className="border border-slate-800 px-1 py-2 text-right font-mono bg-amber-200">
                      {formatAngka(reportData.grandTotal.sisaNpk)}
                    </td>
                    <td className="border border-slate-800 px-1 py-2 text-right font-mono bg-amber-200">
                      {formatAngka(reportData.grandTotal.sisaOrganik)}
                    </td>

                    {/* Total Nilai HET */}
                    <td className="border border-slate-800 px-2 py-2 text-right font-mono text-emerald-950 font-black">
                      {formatRupiah(reportData.grandTotal.totalNilaiHet)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 4. CATATAN FORMULA & STANDAR HET */}
            <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-600 border-t border-b border-slate-200 py-2">
              <div>
                <strong>Standar HET Kementan RI:</strong> Urea: Rp 2.250/Kg (Rp 112.500/Sak 50Kg) | NPK
                Phonska: Rp 2.300/Kg (Rp 115.000/Sak 50Kg) | Pupuk Organik: Rp 800/Kg (Rp 32.000/Sak 40Kg).
              </div>
              <div className="font-mono text-slate-500">
                <em>Rumus: Sisa Stok Akhir = (Stok Awal + Penerimaan DO) - Penyaluran</em>
              </div>
            </div>

            {/* 5. TANDA TANGAN 3 PIHAK RESMI (TRIPARTIT SPJ PUPUK INDONESIA) */}
            <div className="pt-4">
              <div className="text-right text-xs mb-4">
                Magetan, {reportData.tanggalCetak}
              </div>

              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                {/* Kolom 1: Pengecer Resmi KPL */}
                <div className="flex flex-col items-center justify-between border border-slate-300 p-3 rounded-xl bg-slate-50/40 print:border-none print:bg-transparent">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 uppercase block text-[11px]">
                      Pengecer Resmi (KPL)
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {reportData.pejabat.kpl.instansi}
                    </span>
                  </div>

                  {/* Stempel & TTD Kios */}
                  <div className="relative w-40 h-24 my-1 flex items-center justify-center">
                    {reportData.pejabat.kpl.stampUrl && (
                      <img
                        src={reportData.pejabat.kpl.stampUrl}
                        alt="Stempel Kios"
                        className="absolute inset-0 w-full h-full object-contain opacity-75 pointer-events-none"
                      />
                    )}
                    {reportData.pejabat.kpl.signatureUrl && (
                      <img
                        src={reportData.pejabat.kpl.signatureUrl}
                        alt="TTD Kios"
                        className="relative z-10 w-32 h-16 object-contain"
                      />
                    )}
                  </div>

                  <div className="border-t border-slate-700 w-36 pt-1">
                    <strong className="block text-slate-900 font-bold underline">
                      {reportData.pejabat.kpl.nama}
                    </strong>
                    <span className="text-[10px] text-slate-600 block">
                      {reportData.pejabat.kpl.kodeReg}
                    </span>
                  </div>
                </div>

                {/* Kolom 2: Penyuluh Pertanian Wilbin (PPL) */}
                <div className="flex flex-col items-center justify-between border border-slate-300 p-3 rounded-xl bg-slate-50/40 print:border-none print:bg-transparent">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 uppercase block text-[11px]">
                      Diperiksa & Diverifikasi:
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {reportData.pejabat.ppl.jabatan}
                    </span>
                  </div>

                  {/* TTD PPL */}
                  <div className="relative w-40 h-24 my-1 flex items-center justify-center">
                    {reportData.pejabat.ppl.stampUrl && (
                      <img
                        src={reportData.pejabat.ppl.stampUrl}
                        alt="Stempel BPP"
                        className="absolute inset-0 w-full h-full object-contain opacity-65 pointer-events-none"
                      />
                    )}
                    {reportData.pejabat.ppl.signatureUrl && (
                      <img
                        src={reportData.pejabat.ppl.signatureUrl}
                        alt="TTD PPL"
                        className="relative z-10 w-32 h-16 object-contain"
                      />
                    )}
                  </div>

                  <div className="border-t border-slate-700 w-36 pt-1">
                    <strong className="block text-slate-900 font-bold underline">
                      {reportData.pejabat.ppl.nama}
                    </strong>
                    <span className="text-[10px] text-slate-600 block">
                      {reportData.pejabat.ppl.nip}
                    </span>
                  </div>
                </div>

                {/* Kolom 3: Mengetahui Koordinator BPP */}
                <div className="flex flex-col items-center justify-between border border-slate-300 p-3 rounded-xl bg-slate-50/40 print:border-none print:bg-transparent">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 uppercase block text-[11px]">
                      Mengetahui / Mengesahkan:
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {reportData.pejabat.koordinator.jabatan}
                    </span>
                  </div>

                  {/* Stempel & TTD Koordinator */}
                  <div className="relative w-40 h-24 my-1 flex items-center justify-center">
                    {reportData.pejabat.koordinator.stampUrl && (
                      <img
                        src={reportData.pejabat.koordinator.stampUrl}
                        alt="Stempel Kecamatan"
                        className="absolute inset-0 w-full h-full object-contain opacity-80 pointer-events-none"
                      />
                    )}
                    {reportData.pejabat.koordinator.signatureUrl && (
                      <img
                        src={reportData.pejabat.koordinator.signatureUrl}
                        alt="TTD Koordinator"
                        className="relative z-10 w-32 h-16 object-contain"
                      />
                    )}
                  </div>

                  <div className="border-t border-slate-700 w-36 pt-1">
                    <strong className="block text-slate-900 font-bold underline">
                      {reportData.pejabat.koordinator.nama}
                    </strong>
                    <span className="text-[10px] text-slate-600 block">
                      {reportData.pejabat.koordinator.nip}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. VERIFIKASI QR CODE DIGITAL & INTEGRITAS DOKUMEN */}
            <div className="border-t-2 border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-1 bg-white border border-slate-300 rounded-lg shrink-0 shadow-xs">
                  <QrCodeView value={verifikasiUrl} size={70} />
                </div>
                <div className="text-[10px] text-slate-600 space-y-1">
                  <div className="flex items-center gap-1 font-bold text-slate-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>DOKUMEN ELEKTRONIK RESMI TERVERIFIKASI SISTEM</span>
                  </div>
                  <p className="max-w-md text-[9.5px] leading-relaxed">
                    Dokumen Model F-6 ini diterbitkan secara otomatis dan tersinkronisasi penuh dengan
                    Master Database e-Alokasi, Simluhtan, dan GIS Pertanian BPP Kecamatan Lembeyan.
                    Scan QR code di samping untuk memverifikasi keabsahan laporan ini di portal resmi.
                  </p>
                  <div className="font-mono text-[9px] text-slate-400">
                    TOKEN KEASLIAN: {reportData.kodeVerifikasi}
                  </div>
                </div>
              </div>

              <div className="text-right text-[10px] text-slate-500 font-mono">
                <div>Dicetak Oleh: {currentUser?.name || 'Petugas Kios Resmi'}</div>
                <div>Status Jaringan: SINKRON BPP LEMBEYAN 2026</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global CSS for Print Mode */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          @page {
            size: landscape;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
