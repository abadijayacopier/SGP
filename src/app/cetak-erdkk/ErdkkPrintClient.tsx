'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Printer, ArrowLeft, Download, Filter, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import {
  mapPengajuanToErdkkRows,
  generateErdkkCsvContent,
} from '@/lib/erdkk-format';
import {
  getDefaultNipForRole,
  generateAutoSignatureSvg,
  generateOfficialStampSvg,
} from '@/lib/signature-utils';

interface ErdkkPrintClientProps {
  pengajuanList: any[];
  adminPejabat: {
    nama: string;
    jabatan: string;
    instansi: string;
    nip: string | null;
    signatureUrl: string | null;
    stampUrl: string | null;
  };
  pplPejabat: {
    nama: string;
    jabatan: string;
    instansi: string;
    nip: string | null;
    signatureUrl: string | null;
    stampUrl: string | null;
  };
}

export default function ErdkkPrintClient({
  pengajuanList,
  adminPejabat,
  pplPejabat,
}: ErdkkPrintClientProps) {
  const [filterStatus, setFilterStatus] = useState<'SEMUA' | 'DISETUJUI_DINAS'>('SEMUA');
  const [filterDesa, setFilterDesa] = useState<string>('SEMUA');

  const desaOptions = Array.from(
    new Set(pengajuanList.map((p) => p.desa || 'Kediren'))
  );

  const filteredList = pengajuanList.filter((item) => {
    const matchStatus =
      filterStatus === 'SEMUA' || item.status === filterStatus;
    const matchDesa =
      filterDesa === 'SEMUA' || (item.desa || 'Kediren') === filterDesa;
    return matchStatus && matchDesa;
  });

  const rows = mapPengajuanToErdkkRows(filteredList, pplPejabat.nama);

  const totalLuas = rows.reduce((acc, r) => acc + r.luasHa, 0);
  const totalUrea = rows.reduce((acc, r) => acc + r.totalUrea, 0);
  const totalNpk = rows.reduce((acc, r) => acc + r.totalNpk, 0);
  const totalOrganik = rows.reduce((acc, r) => acc + r.totalOrganik, 0);

  const adminSigSrc =
    adminPejabat.signatureUrl ||
    generateAutoSignatureSvg(adminPejabat.nama, '#1e3a8a');
  const adminStampSrc =
    adminPejabat.stampUrl ||
    generateOfficialStampSvg('ADMIN_DINAS', adminPejabat.instansi);
  const adminNip =
    adminPejabat.nip || getDefaultNipForRole('ADMIN_DINAS', 'admin_lembeyan');

  const pplSigSrc =
    pplPejabat.signatureUrl ||
    generateAutoSignatureSvg(pplPejabat.nama, '#065f46');
  const pplStampSrc =
    pplPejabat.stampUrl ||
    generateOfficialStampSvg('PPL', pplPejabat.instansi);
  const pplNip =
    pplPejabat.nip || getDefaultNipForRole('PPL', 'ppl_iissugiarti');

  const handleDownloadCsv = () => {
    const csv = generateErdkkCsvContent(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Lampiran-Resmi-eRDKK-Kec-Lembeyan-${new Date().getFullYear()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const tanggalCetak = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:p-0">
      {/* Toolbar Non-Print */}
      <div className="max-w-7xl mx-auto mb-6 bg-white rounded-2xl p-4 shadow-md border border-slate-200 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/pengajuan"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke e-RDKK
          </Link>
          <div>
            <h1 className="text-sm font-black text-slate-900">
              Cetak SK & Lampiran Resmi e-RDKK Standar Kementerian Pertanian
            </h1>
            <p className="text-xs text-slate-500">
              Format Landscape A4/F4 • Lengkap dengan Tempat/Tgl Lahir, Ibu Kandung, Kabupaten, & Tanda Tangan Digital
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-semibold">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none"
            >
              <option value="SEMUA">Semua Usulan ({pengajuanList.length})</option>
              <option value="DISETUJUI_DINAS">Hanya Disahkan SK Kecamatan</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-500 font-semibold">Desa:</span>
            <select
              value={filterDesa}
              onChange={(e) => setFilterDesa(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none"
            >
              <option value="SEMUA">Se-Kecamatan Lembeyan</option>
              {desaOptions.map((d) => (
                <option key={d} value={d}>
                  Desa {d}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV/Excel Kementan
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak Dokumen SK e-RDKK (PDF)
          </button>
        </div>
      </div>

      {/* Lembar Dokumen Resmi SK e-RDKK */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-8 print:shadow-none print:border-none print:p-2 text-slate-900">
        {/* KOP SURAT PEMERINTAH KABUPATEN MAGETAN - KECAMATAN LEMBEYAN */}
        <div className="border-b-4 border-double border-slate-900 pb-4 mb-5 text-center relative">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-700">
            PEMERINTAH KABUPATEN MAGETAN
          </p>
          <h2 className="text-xl font-black uppercase tracking-wide text-slate-900 mt-0.5">
            KECAMATAN LEMBEYAN — BALAI PENYULUHAN PERTANIAN (BPP)
          </h2>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">
             Sekretariat e-RDKK & Informasi Geospasial Pertanian Kecamatan Lembeyan, Kabupaten Magetan, Provinsi Jawa Timur
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Jl. Raya Lembeyan No. 14, Kec. Lembeyan, Kab. Magetan • Kode Pos 63372 • Sistem Terpadu e-RDKK & GIS
          </p>
        </div>

        {/* JUDUL LAMPIRAN KEPUTUSAN */}
        <div className="text-center mb-5">
          <h3 className="text-base font-black uppercase underline decoration-2 underline-offset-4">
            LAMPIRAN KEPUTUSAN PENGESAHAN RENCANA DEFINITIF KEBUTUHAN KELOMPOK (e-RDKK) PUPUK BERSUBSIDI
          </h3>
          <p className="text-xs font-bold text-slate-700 mt-1">
            Nomor SK: 521.3 / {new Date().getFullYear()} / BPP-LBY / MAGETAN &bull; Tahun Anggaran {new Date().getFullYear()}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-2 text-xs text-slate-600">
            <span><strong>Kabupaten:</strong> Magetan</span>
            <span><strong>Kecamatan:</strong> Lembeyan</span>
            <span><strong>Wilayah Desa:</strong> {filterDesa === 'SEMUA' ? 'Seluruh Desa se-Kecamatan Lembeyan' : `Desa ${filterDesa}`}</span>
            <span><strong>Kios Pengecer Resmi:</strong> UD. Tani Subur (KPL-LBY-001)</span>
          </div>
        </div>

        {/* TABEL STANDAR KEMENTAN */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-900 text-[10px]">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold text-center">
                <th rowSpan={2} className="border border-slate-900 px-1.5 py-2 w-7">No</th>
                <th rowSpan={2} className="border border-slate-900 px-2 py-2">NIK & Nama Petani</th>
                <th rowSpan={2} className="border border-slate-900 px-2 py-2">Tempat, Tgl Lahir</th>
                <th rowSpan={2} className="border border-slate-900 px-2 py-2">Nama Gadis Ibu Kandung</th>
                <th rowSpan={2} className="border border-slate-900 px-2 py-2">Desa / Kec / Kabupaten</th>
                <th rowSpan={2} className="border border-slate-900 px-2 py-2">Kelompok Tani (Poktan)</th>
                <th rowSpan={2} className="border border-slate-900 px-1.5 py-2">Komoditas</th>
                <th rowSpan={2} className="border border-slate-900 px-1.5 py-2">Luas Lahan (Ha)</th>
                <th colSpan={3} className="border border-slate-900 px-2 py-1 bg-emerald-50">MT-1 Walikan (Padi)</th>
                <th colSpan={3} className="border border-slate-900 px-2 py-1 bg-blue-50">MT-2 Kemarau (Palawija)</th>
                <th colSpan={3} className="border border-slate-900 px-2 py-1 bg-amber-50">MT-3 Rendeng (Padi)</th>
                <th colSpan={3} className="border border-slate-900 px-2 py-1 bg-slate-200">Total Kuota 1 Tahun (Kg)</th>
              </tr>
              <tr className="bg-slate-50 text-slate-800 font-bold text-center text-[9px]">
                <th className="border border-slate-900 px-1 py-1">Urea</th>
                <th className="border border-slate-900 px-1 py-1">NPK</th>
                <th className="border border-slate-900 px-1 py-1">Org</th>
                <th className="border border-slate-900 px-1 py-1">Urea</th>
                <th className="border border-slate-900 px-1 py-1">NPK</th>
                <th className="border border-slate-900 px-1 py-1">Org</th>
                <th className="border border-slate-900 px-1 py-1">Urea</th>
                <th className="border border-slate-900 px-1 py-1">NPK</th>
                <th className="border border-slate-900 px-1 py-1">Org</th>
                <th className="border border-slate-900 px-1.5 py-1 bg-slate-100">Urea</th>
                <th className="border border-slate-900 px-1.5 py-1 bg-slate-100">NPK</th>
                <th className="border border-slate-900 px-1.5 py-1 bg-slate-100">Organik</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={20} className="border border-slate-900 py-8 text-center text-slate-500">
                    Tidak ada data pengajuan e-RDKK sesuai filter yang dipilih.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={`${r.nik}-${r.no}`} className="hover:bg-slate-50">
                    <td className="border border-slate-900 px-1.5 py-1.5 text-center font-bold">{r.no}</td>
                    <td className="border border-slate-900 px-2 py-1.5">
                      <div className="font-bold text-slate-900">{r.namaPetani}</div>
                      <div className="font-mono text-[9px] text-slate-600">{r.nik}</div>
                    </td>
                    <td className="border border-slate-900 px-2 py-1.5">
                      {r.tempatLahir}, {r.tanggalLahir}
                    </td>
                    <td className="border border-slate-900 px-2 py-1.5 font-semibold">
                      {r.namaIbuKandung}
                    </td>
                    <td className="border border-slate-900 px-2 py-1.5">
                      <div>Desa {r.desa}</div>
                      <div className="text-[9px] text-slate-600">Kec. {r.kecamatan}, Kab. {r.kabupaten}</div>
                    </td>
                    <td className="border border-slate-900 px-2 py-1.5 font-medium">{r.namaPoktan}</td>
                    <td className="border border-slate-900 px-1.5 py-1.5 text-center">{r.komoditas}</td>
                    <td className="border border-slate-900 px-1.5 py-1.5 text-right font-bold">{r.luasHa.toFixed(2)}</td>
                    <td className="border border-slate-900 px-1 py-1.5 text-right">{r.ureaMt1}</td>
                    <td className="border border-slate-900 px-1 py-1.5 text-right">{r.npkMt1}</td>
                    <td className="border border-slate-900 px-1 py-1.5 text-right">{r.organikMt1}</td>
                    <td className="border border-slate-900 px-1 py-1.5 text-right">{r.ureaMt2}</td>
                    <td className="border border-slate-900 px-1 py-1.5 text-right">{r.npkMt2}</td>
                    <td className="border border-slate-900 px-1 py-1.5 text-right">{r.organikMt2}</td>
                    <td className="border border-slate-900 px-1 py-1.5 text-right">{r.ureaMt3}</td>
                    <td className="border border-slate-900 px-1 py-1.5 text-right">{r.npkMt3}</td>
                    <td className="border border-slate-900 px-1 py-1.5 text-right">{r.organikMt3}</td>
                    <td className="border border-slate-900 px-1.5 py-1.5 text-right font-bold bg-slate-50">{r.totalUrea}</td>
                    <td className="border border-slate-900 px-1.5 py-1.5 text-right font-bold bg-slate-50">{r.totalNpk}</td>
                    <td className="border border-slate-900 px-1.5 py-1.5 text-right font-bold bg-slate-50">{r.totalOrganik}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black text-slate-900">
                <td colSpan={7} className="border border-slate-900 px-3 py-2 text-right uppercase">
                  TOTAL AKUMULASI KUOTA e-RDKK ({rows.length} PETANI):
                </td>
                <td className="border border-slate-900 px-1.5 py-2 text-right">{totalLuas.toFixed(2)} Ha</td>
                <td colSpan={9} className="border border-slate-900 px-2 py-2 text-center text-[9px] text-slate-600">
                  Proporsi Distribusi Musim Tanam: MT-1 (40%) • MT-2 (40%) • MT-3 (20%)
                </td>
                <td className="border border-slate-900 px-1.5 py-2 text-right">{totalUrea.toLocaleString('id-ID')} Kg</td>
                <td className="border border-slate-900 px-1.5 py-2 text-right">{totalNpk.toLocaleString('id-ID')} Kg</td>
                <td className="border border-slate-900 px-1.5 py-2 text-right">{totalOrganik.toLocaleString('id-ID')} Kg</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* BLOK PENGESAHAN & TANDA TANGAN DIGITAL TERINTEGRASI PROFIL */}
        <div className="grid grid-cols-2 gap-8 mt-8 text-xs break-inside-avoid">
          <div className="text-center">
            <p className="text-slate-600">Diverifikasi & Diukur Secara Spasial Oleh,</p>
            <p className="font-bold text-slate-900 uppercase mt-0.5">
              Penyuluh Pertanian Lapangan (PPL) BPP Lembeyan
            </p>
            <div className="relative h-24 flex items-center justify-center my-1">
              <img
                src={pplStampSrc}
                alt="Stempel BPP"
                className="w-24 h-24 object-contain absolute left-1/2 -translate-x-20 opacity-80 pointer-events-none"
              />
              <img
                src={pplSigSrc}
                alt="TTD PPL"
                className="h-20 object-contain relative z-10"
              />
            </div>
            <p className="font-black text-slate-900 underline decoration-slate-800">
              {pplPejabat.nama}
            </p>
            <p className="text-[11px] text-slate-600 font-mono">NIP. {pplNip}</p>
          </div>

          <div className="text-center">
            <p className="text-slate-600">Lembeyan, Magetan, {tanggalCetak}</p>
            <p className="font-bold text-slate-900 uppercase mt-0.5">
              Mengesahkan: Koordinator / Admin Kecamatan Lembeyan
            </p>
            <div className="relative h-24 flex items-center justify-center my-1">
              <img
                src={adminStampSrc}
                alt="Stempel Kecamatan"
                className="w-24 h-24 object-contain absolute left-1/2 -translate-x-20 opacity-85 pointer-events-none"
              />
              <img
                src={adminSigSrc}
                alt="TTD Koordinator"
                className="h-20 object-contain relative z-10"
              />
            </div>
            <p className="font-black text-slate-900 underline decoration-slate-800">
              {adminPejabat.nama}
            </p>
            <p className="text-[11px] text-slate-600 font-mono">NIP. {adminNip}</p>
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
          <span>Dokumen Sah Sistem Informasi Pertanian Terpadu (GIS & e-RDKK) Kecamatan Lembeyan, Kabupaten Magetan</span>
          <span>Balai Penyuluhan Pertanian (BPP)</span>
        </div>
      </div>
    </div>
  );
}
