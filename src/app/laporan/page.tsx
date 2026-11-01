'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  CheckCircle2,
  Copy,
  Send,
  Filter,
  Upload,
  Download,
  Plus,
  X,
  AlertCircle,
  Check,
  Layers,
  Search,
  Building2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  exportPenyaluranPupukExcel,
  exportLahanExcel,
  exportErdkkExcel,
  exportKementanErdkkExcel,
  downloadTemplateKementanExcel,
} from '@/lib/export-excel';
import { formatRupiah } from '@/lib/calculations';
import QrCodeView from '@/components/ui/QrCodeView';
import { useAuth } from '@/lib/auth-context';
import {
  getDefaultNipForRole,
  generateAutoSignatureSvg,
  generateOfficialStampSvg,
} from '@/lib/signature-utils';
import {
  showSuccess,
  showError,
  showWarning,
  showToast,
} from '@/lib/sweetalert';

export default function LaporanPage() {
  const { currentUser } = useAuth();
  const [penyaluranData, setPenyaluranData] = useState<any[]>([]);
  const [lahanData, setLahanData] = useState<any[]>([]);
  const [erdkkData, setErdkkData] = useState<any[]>([]);
  const [petaniData, setPetaniData] = useState<any[]>([]);
  const [poktanList, setPoktanList] = useState<any[]>([]);

  // State Data Kepala Desa Se-Kecamatan Lembeyan
  const [kadesList, setKadesList] = useState<any[]>([]);
  const [showKadesModal, setShowKadesModal] = useState(false);
  const [editingKades, setEditingKades] = useState<{
    desa: string;
    nama: string;
    jabatan: string;
    nip: string;
    kontak: string;
    alamat: string;
  } | null>(null);
  const [savingKades, setSavingKades] = useState(false);
  const [kadesFeedback, setKadesFeedback] = useState<string | null>(null);

  // State Modal Impor Excel/CSV Kementan
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [targetImportPoktanId, setTargetImportPoktanId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [pplSigner, setPplSigner] = useState<{
    name: string;
    wilayah: string;
    nip: string;
    signatureUrl: string;
    stampUrl: string;
  }>({
    name: 'Iis Sugiarti, S.P',
    wilayah: 'BPP Kecamatan Lembeyan',
    nip: getDefaultNipForRole('PPL'),
    signatureUrl: generateAutoSignatureSvg('Iis Sugiarti, S.P'),
    stampUrl: generateOfficialStampSvg('PPL', 'BPP Kecamatan Lembeyan'),
  });
  const [adminSigner, setAdminSigner] = useState<{
    name: string;
    wilayah: string;
    nip: string;
    signatureUrl: string;
    stampUrl: string;
  }>({
    name: 'Supriyanto',
    wilayah: 'Pemerintah Kecamatan Lembeyan',
    nip: getDefaultNipForRole('ADMIN_DINAS'),
    signatureUrl: generateAutoSignatureSvg('Supriyanto'),
    stampUrl: generateOfficialStampSvg('ADMIN_DINAS', 'Pemerintah Kecamatan Lembeyan'),
  });
  const [loading, setLoading] = useState(true);

  // Filter untuk Laporan Cetak PDF (Default: KEMENTAN_ERDKK)
  const [jenisLaporanCetak, setJenisLaporanCetak] = useState<
    'PENYALURAN' | 'LAHAN' | 'ERDKK' | 'KEMENTAN_ERDKK'
  >('KEMENTAN_ERDKK');
  const [filterPoktan, setFilterPoktan] = useState<string>('SEMUA');
  const [overrideDesa, setOverrideDesa] = useState<string>('AUTO');
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('landscape');

  // Google Sheets Webhook State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState('http://localhost:3000');
  const [scriptTab, setScriptTab] = useState<'pull' | 'receiver'>('pull');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resPenyaluran, resLahan, resErdkk, resPoktan, resUsers, resPetani, resKades] =
        await Promise.all([
          fetch('/api/pupuk/penyaluran'),
          fetch('/api/lahan'),
          fetch('/api/pupuk/alokasi'),
          fetch('/api/poktan'),
          fetch('/api/users'),
          fetch('/api/petani'),
          fetch('/api/kepala-desa'),
        ]);
      const jsonP = await resPenyaluran.json();
      const jsonL = await resLahan.json();
      const jsonE = await resErdkk.json();
      const jsonPok = await resPoktan.json();
      const jsonU = await resUsers.json();
      const jsonPet = await resPetani.json();
      const jsonKades = await resKades.json();

      if (jsonP.success) setPenyaluranData(jsonP.data);
      if (jsonL.success) setLahanData(jsonL.data);
      if (jsonE.success) setErdkkData(jsonE.data);
      if (jsonKades.success) setKadesList(jsonKades.data);
      if (jsonPok.success) {
        setPoktanList(jsonPok.data);
        if (jsonPok.data.length > 0 && !targetImportPoktanId) {
          setTargetImportPoktanId(jsonPok.data[0].id);
        }
      }
      if (jsonPet.success) setPetaniData(jsonPet.data);
      if (jsonU.success && Array.isArray(jsonU.data)) {
        const foundPpl = jsonU.data.find((u: any) => u.role === 'PPL');
        if (foundPpl) {
          setPplSigner({
            name: foundPpl.name,
            wilayah: foundPpl.wilayah || 'BPP Kecamatan Lembeyan',
            nip: foundPpl.nip || getDefaultNipForRole('PPL'),
            signatureUrl: foundPpl.signatureUrl || generateAutoSignatureSvg(foundPpl.name),
            stampUrl:
              foundPpl.stampUrl !== undefined && foundPpl.stampUrl !== null
                ? foundPpl.stampUrl
                : generateOfficialStampSvg('PPL', foundPpl.wilayah),
          });
        }
        const foundAdmin = jsonU.data.find((u: any) => u.role === 'ADMIN_DINAS');
        if (foundAdmin) {
          setAdminSigner({
            name: foundAdmin.name,
            wilayah: foundAdmin.wilayah || 'Pemerintah Kecamatan Lembeyan',
            nip: foundAdmin.nip || getDefaultNipForRole('ADMIN_DINAS'),
            signatureUrl: foundAdmin.signatureUrl || generateAutoSignatureSvg(foundAdmin.name),
            stampUrl:
              foundAdmin.stampUrl !== undefined && foundAdmin.stampUrl !== null
                ? foundAdmin.stampUrl
                : generateOfficialStampSvg('ADMIN_DINAS', foundAdmin.wilayah),
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKades = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKades) return;
    try {
      setSavingKades(true);
      setKadesFeedback(null);
      const res = await fetch('/api/kepala-desa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingKades),
      });
      const json = await res.json();
      if (json.success) {
        setKadesList(json.data);
        setKadesFeedback(`Data ${editingKades.jabatan} berhasil diperbarui!`);
        showSuccess('Berhasil Disimpan', `Data ${editingKades.jabatan} berhasil diperbarui!`);
        setTimeout(() => {
          setEditingKades(null);
          setKadesFeedback(null);
        }, 1500);
      } else {
        showError('Gagal Menyimpan', json.error || 'Gagal menyimpan data Kepala Desa.');
      }
    } catch (err: any) {
      showError('Kesalahan Server', `Terjadi error: ${err.message}`);
    } finally {
      setSavingKades(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  // Set filter default jika login sebagai POKTAN
  useEffect(() => {
    if (currentUser?.poktanId && poktanList.length > 0) {
      const match = poktanList.find((p) => p.id === currentUser.poktanId);
      if (match) {
        setFilterPoktan(match.nama);
      }
    }
  }, [currentUser?.poktanId, poktanList]);

  // Handler Kirim Webhook ke Google Sheets
  const handleTriggerWebhook = async () => {
    if (!webhookUrl) {
      showWarning('URL Kosong', 'Masukkan URL Google Apps Script Webhook terlebih dahulu!');
      return;
    }

    try {
      setSyncing(true);
      setSyncStatus('Mengirim data ke Google Sheets...');
      const res = await fetch('/api/sinkronisasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      });
      const json = await res.json();
      if (json.success) {
        setSyncStatus('✅ Berhasil disinkronkan ke Google Sheets!');
        showSuccess('Sinkronisasi Sukses', 'Data transaksi berhasil disinkronkan ke Google Sheets!');
      } else {
        setSyncStatus(`❌ Gagal: ${json.error}`);
        showError('Sinkronisasi Gagal', json.error || 'Gagal mengirim data ke Google Sheets');
      }
    } catch (err: any) {
      setSyncStatus(`❌ Terjadi error: ${err.message}`);
      showError('Kesalahan Jaringan', err.message);
    } finally {
      setSyncing(false);
    }
  };

  // 1. Script Penarik Otomatis (Pull dari Google Sheets)
  const appsScriptPullCode = `function syncSistemPertanian() {
  // URL API Sistem Pertanian BPP Lembeyan
  var url = "${currentOrigin}/api/sinkronisasi";
  var res = UrlFetchApp.fetch(url);
  var json = JSON.parse(res.getContentText());
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Bersihkan sheet & buat header kolom
  sheet.clear();
  sheet.appendRow([
    "No Nota", "Tanggal", "Nama Petani", "NIK", "Poktan", 
    "Desa", "Kecamatan", "Urea (Kg)", "NPK (Kg)", "Organik (Kg)", 
    "Total Biaya (Rp)", "Kios Penyalur", "Pengurus Poktan", "Status"
  ]);
  
  // Tulis baris data
  json.data.forEach(function(row) {
    sheet.appendRow([
      row.nomorNota,
      row.tanggal,
      row.namaPetani,
      "'" + row.nik,
      row.poktan,
      row.desa,
      row.kecamatan,
      row.ureaKg,
      row.npkKg,
      row.organikKg,
      row.totalBiayaRp,
      row.kios,
      row.pengurusPoktan,
      row.status
    ]);
  });
}`;

  // 2. Script Penerima Webhook (Push dari Web Aplikasi ke Google Sheets)
  const appsScriptReceiverCode = `function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var data = contents.data;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    sheet.clear();
    sheet.appendRow([
      "No Nota", "Tanggal", "Nama Petani", "NIK", "Poktan", 
      "Desa", "Kecamatan", "Urea (Kg)", "NPK (Kg)", "Organik (Kg)", 
      "Total Biaya (Rp)", "Kios Penyalur", "Pengurus Poktan", "Status"
    ]);
    
    data.forEach(function(row) {
      sheet.appendRow([
        row.nomorNota,
        row.tanggal,
        row.namaPetani,
        "'" + row.nik,
        row.poktan,
        row.desa,
        row.kecamatan,
        row.ureaKg,
        row.npkKg,
        row.organikKg,
        row.totalBiayaRp,
        row.kios,
        row.pengurusPoktan,
        row.status
      ]);
    });
    
    return ContentService.createTextOutput(JSON.stringify({ result: "success", count: data.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const currentDisplayScript = scriptTab === 'pull' ? appsScriptPullCode : appsScriptReceiverCode;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(currentDisplayScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  // Handle parsing file Excel/CSV di client side
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportFeedback(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setImportRows(data);
      } catch (err: any) {
        setImportFeedback({
          type: 'error',
          message: `Gagal membaca file: ${err.message}`,
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  // Eksekusi pengiriman data impor ke API Standar Kementan
  const handleExecuteImport = async () => {
    if (importRows.length === 0) {
      showWarning('File Kosong', 'Pilih file Excel/CSV terlebih dahulu.');
      return;
    }
    try {
      setImporting(true);
      setImportFeedback(null);
      const res = await fetch('/api/petani/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: importRows,
          defaultPoktanId: targetImportPoktanId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setImportFeedback({
          type: 'success',
          message: json.message || 'Impor data berhasil diproses!',
        });
        // Refresh data di halaman laporan
        await fetchData();
        setTimeout(() => {
          setShowImportModal(false);
          setImportRows([]);
          setImportFileName('');
        }, 2200);
      } else {
        setImportFeedback({
          type: 'error',
          message: json.error || 'Gagal mengimpor data.',
        });
      }
    } catch (err: any) {
      setImportFeedback({
        type: 'error',
        message: `Terjadi kesalahan jaringan: ${err.message}`,
      });
    } finally {
      setImporting(false);
    }
  };

  // Helper to format string to Title Case (e.g. 'KEDIREN' -> 'Kediren')
  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Data yang difilter sesuai pilihan Poktan / cakupan Kios
  const filteredPenyaluran = penyaluranData.filter((item) => {
    if (currentUser?.role === 'KIOS' && currentUser?.kiosName) {
      const matchKios = (item.kios && item.kios.includes(currentUser.kiosName)) || item.namaKios === currentUser.kiosName;
      if (!matchKios) return false;
    }
    return filterPoktan === 'SEMUA' ? true : item.petani?.poktan?.nama?.trim().toLowerCase() === filterPoktan.trim().toLowerCase();
  });
  const filteredLahan = lahanData.filter((item) =>
    filterPoktan === 'SEMUA' ? true : item.petani?.poktan?.nama?.trim().toLowerCase() === filterPoktan.trim().toLowerCase()
  );
  const filteredErdkk = erdkkData.filter((item) =>
    filterPoktan === 'SEMUA' ? true : item.petani?.poktan?.nama?.trim().toLowerCase() === filterPoktan.trim().toLowerCase()
  );
  const filteredPetani = petaniData.filter((item) =>
    filterPoktan === 'SEMUA' ? true : item.poktan?.nama?.trim().toLowerCase() === filterPoktan.trim().toLowerCase()
  );

  // Kalkulasi Total untuk Footer Laporan
  const totalUreaSalur = filteredPenyaluran.reduce((acc, i) => acc + (i.jumlahUreaKg || 0), 0);
  const totalNpkSalur = filteredPenyaluran.reduce((acc, i) => acc + (i.jumlahNpkKg || 0), 0);
  const totalOrgSalur = filteredPenyaluran.reduce((acc, i) => acc + (i.jumlahOrganikKg || 0), 0);
  const totalBiayaSalur = filteredPenyaluran.reduce((acc, i) => acc + (i.totalBiayaRp || 0), 0);

  const totalLuasLahanGis = filteredLahan.reduce((acc, i) => acc + (i.luasHa || 0), 0);
  const totalLuasPetaniKementan = filteredPetani.reduce((acc, i) => {
    const luas =
      i.totalLuasLahan > 0
        ? i.totalLuasLahan
        : i.lahan?.reduce((sum: number, l: any) => sum + (l.luasHa || 0), 0) || 0.5;
    return acc + luas;
  }, 0);

  // Penentuan Poktan Aktif: sesuai pilihan filter, atau cari Poktan di Kediren (sentra utama), atau Poktan pertama
  const activePoktan =
    filterPoktan !== 'SEMUA'
      ? poktanList.find((p) => p.nama?.trim().toLowerCase() === filterPoktan.trim().toLowerCase())
      : poktanList.find((p) => p.desa?.trim().toLowerCase() === 'kediren') || poktanList[0];

  // Deteksi Desa Otomatis dari Kelompok Tani yang Aktif
  const detectedDesa = activePoktan?.desa ? toTitleCase(activePoktan.desa) : 'Kediren';
  // Jika pengguna memilih override desa secara manual, gunakan override; jika 'AUTO' gunakan desa dari Poktan
  const effectiveDesa = overrideDesa !== 'AUTO' ? overrideDesa : detectedDesa;

  // Dapatkan data Kepala Desa yang sesuai dengan Desa yang berlaku
  const activeKades =
    kadesList.find((k) => k.desa?.trim().toLowerCase() === effectiveDesa.trim().toLowerCase()) ||
    kadesList[0] || {
      desa: effectiveDesa,
      nama: 'Dwi Santoso, S.Sos',
      jabatan: `Kepala Desa ${effectiveDesa}`,
      nip: 'NIP. 19740512 200701 1 014',
      signatureUrl: generateAutoSignatureSvg('Dwi Santoso, S.Sos'),
      stampUrl: generateOfficialStampSvg('KADES', effectiveDesa),
    };

  const ketuaPoktanName =
    activePoktan?.ketua ||
    (currentUser?.role === 'POKTAN' ? currentUser.name : 'H. Suparman');

  const namaPoktanTitle =
    activePoktan?.nama ||
    (currentUser?.role === 'POKTAN' ? currentUser.wilayah || 'Poktan Tani Makmur I' : 'Poktan Tani Makmur I');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-8 print:p-0 print:m-0 print:max-w-none print:space-y-0 print:bg-white">
      {/* Dynamic CSS Inject Khusus Cetak / Print PDF agar tabel lebar fit 100% tanpa terpotong & bersih putih tanpa background abu-abu */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 ${printOrientation};
                margin: 6mm 8mm 6mm 8mm;
              }
              html,
              body,
              main,
              div,
              section {
                background: #ffffff !important;
                background-color: #ffffff !important;
                color: #0f172a !important;
              }
              .print-page {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                background: #ffffff !important;
                background-color: #ffffff !important;
              }
              .overflow-x-auto {
                overflow: visible !important;
              }
              table {
                width: 100% !important;
                max-width: 100% !important;
                table-layout: auto !important;
                background: #ffffff !important;
                background-color: #ffffff !important;
                border-collapse: collapse !important;
              }
              thead th,
              tfoot td,
              tbody td,
              tbody tr,
              th,
              td {
                min-width: 0 !important;
                background: #ffffff !important;
                background-color: #ffffff !important;
              }
            }
          `,
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            Laporan, Ekspor Data & Sinkronisasi Google Sheets
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Ekspor rekapitulasi data ke format Excel (.xlsx), cetak dokumen resmi PDF per Poktan, dan sinkronisasi realtime dengan Google Sheets.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <Printer className="w-4 h-4 text-emerald-300" />
          Cetak Rekap PDF Resmi
        </button>
      </div>

      {/* BANNER KHUSUS: DOKUMEN SPJ MODEL F-6 PUPUK INDONESIA HOLDING */}
      <div className="no-print bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-700 text-white p-5 rounded-3xl shadow-md border border-amber-400/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-black/20 px-2.5 py-0.5 rounded-full text-amber-100">
              <CheckCircle2 className="w-3 h-3 text-emerald-300" />
              Format Resmi Pupuk Indonesia Holding Company (PIHC)
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              Cetak Dokumen SPJ Model F-6 (Laporan Penyaluran & Stok Pengecer Lengkap)
            </h3>
            <p className="text-xs text-amber-100 max-w-2xl leading-relaxed">
              Laporan resmi bulanan Kios Pupuk Lengkap (KPL) ke seluruh Poktan se-Kecamatan Lembeyan dilengkapi rincian stok awal, penerimaan DO, penyaluran HET, dan pengesahan Tripartit resmi dengan QR Code.
            </p>
          </div>
        </div>

        <Link
          href="/cetak-f6"
          className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-black text-xs sm:text-sm shadow-lg transition transform hover:-translate-y-0.5"
        >
          <Printer className="w-4 h-4 text-amber-600" />
          Buka & Cetak Model F-6
        </Link>
      </div>

      {/* SECTION 1: KARTU EKSPOR EXCEL (.XLSX) */}
      <div className="no-print">
        <h2 className="text-base font-black text-slate-800 mb-3 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          1. Unduh Data dalam Format Microsoft Excel (.xlsx) & Impor Standar Nasional
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Standar Nasional e-RDKK Kementan RI */}
          <div className="bg-white rounded-3xl border-2 border-emerald-500/50 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition relative overflow-hidden bg-gradient-to-b from-emerald-50/30 to-white">
            <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-xs">
              Standar Kementan
            </span>
            <div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold mb-3 shadow-sm">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-black text-slate-900 text-sm mb-1 leading-snug">
                Daftar e-RDKK Petani (Standar Kementan)
              </h3>
              <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                Format 9 kolom wajib Kementan RI: NIK, Nama, TTL, Ibu Kandung, Alamat, Luas (Ha), & Koordinat GIS.
              </p>
              <div className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 p-2 rounded-xl mb-3 flex items-center justify-between">
                <span>Total Petani:</span>
                <span className="font-mono">{filteredPetani.length} Orang</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <button
                onClick={() => exportKementanErdkkExcel(filteredPetani)}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Excel Kementan
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-300 font-bold py-1.5 rounded-xl text-xs transition shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5" />
                Impor Excel / CSV
              </button>
            </div>
          </div>

          {/* Card 2: Penyaluran Pupuk */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-3">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1 leading-snug">
                Rekap Penyaluran Pupuk
              </h3>
              <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                Rincian transaksi penebusan pupuk bersubsidi (Urea, NPK, Organik), NIK petani, poktan, & saksi.
              </p>
              <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 p-2 rounded-xl mb-3 flex items-center justify-between">
                <span>Total Transaksi:</span>
                <span className="font-mono">{penyaluranData.length}</span>
              </div>
            </div>
            <button
              onClick={() => exportPenyaluranPupukExcel(penyaluranData)}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Excel Penyaluran
            </button>
          </div>

          {/* Card 3: Master Lahan Pertanian GIS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold mb-3">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1 leading-snug">
                Master Lahan Pertanian GIS
              </h3>
              <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                Daftar petak lahan sawah/tegalan, luas Ha dan m², koordinat GPS pusat, dan nomor pipil/SPPT tanah.
              </p>
              <div className="text-[11px] font-bold text-blue-800 bg-blue-50 p-2 rounded-xl mb-3 flex items-center justify-between">
                <span>Total Petak:</span>
                <span className="font-mono">{lahanData.length}</span>
              </div>
            </div>
            <button
              onClick={() => exportLahanExcel(lahanData)}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Excel Lahan GIS
            </button>
          </div>

          {/* Card 4: Alokasi e-RDKK */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold mb-3">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1 leading-snug">
                Alokasi Kuota e-RDKK Petani
              </h3>
              <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                Tabel alokasi resmi kuota pupuk subsidi per musim tanam, jatah awal, dan sisa kuota tebus.
              </p>
              <div className="text-[11px] font-bold text-amber-800 bg-amber-50 p-2 rounded-xl mb-3 flex items-center justify-between">
                <span>Total Alokasi:</span>
                <span className="font-mono">{erdkkData.length}</span>
              </div>
            </div>
            <button
              onClick={() => exportErdkkExcel(erdkkData)}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-xl text-xs transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Excel Kuota
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: SINKRONISASI GOOGLE SHEETS */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm no-print space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-600" />
              2. Fitur Sinkronisasi Google Sheets
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hubungkan database Sistem Pertanian langsung ke Google Spreadsheet Anda secara otomatis.
            </p>
          </div>
          <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> API Endpoint Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          {/* Opsi A: Trigger Webhook */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">Opsi A: Kirim Real-Time via Webhook</h3>
            <p className="text-slate-500 leading-relaxed">
              Jika Anda memiliki Webhook Google Apps Script (URL Web App), masukkan di sini untuk memicu pengiriman data langsung dari server.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
              />
              <button
                onClick={handleTriggerWebhook}
                disabled={syncing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                {syncing ? 'Mengirim...' : 'Sinkronkan'}
              </button>
            </div>

            {syncStatus && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                {syncStatus}
              </div>
            )}
          </div>

          {/* Opsi B: Google Apps Script Template */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setScriptTab('pull')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    scriptTab === 'pull'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tarik Data (Pull)
                </button>
                <button
                  type="button"
                  onClick={() => setScriptTab('receiver')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    scriptTab === 'receiver'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Penerima Webhook (doPost)
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyScript}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedScript ? 'Tersalin!' : 'Salin Kode Script'}
              </button>
            </div>

            <p className="text-slate-500 leading-relaxed text-[11px]">
              {scriptTab === 'pull' ? (
                <>
                  Buka Google Sheets &rarr; <em>Extensions (Ekstensi) &rarr; Apps Script</em>, paste kode di bawah lalu klik <strong>Run / Jalankan</strong> (atau pasang Trigger jam untuk update otomatis):
                </>
              ) : (
                <>
                  Pasang kode ini di Apps Script, lalu klik <strong>Deploy &rarr; New Deployment &rarr; Web App</strong> (akses: <em>Anyone</em>), lalu salin URL Web App ke kotak Opsi A di sebelah kiri.
                </>
              )}
            </p>

            <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[10.5px] font-mono overflow-x-auto max-h-40 leading-relaxed border border-slate-800">
              {currentDisplayScript}
            </pre>
          </div>
        </div>
      </div>

      {/* FILTER KONTROL LAPORAN CETAK RESMI (HANYA TAMPIL DI LAYAR) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs no-print flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
            <FileText className="w-4 h-4 text-emerald-600" />
            Jenis Laporan Cetak:
          </span>
          {[
            { id: 'KEMENTAN_ERDKK', label: 'Daftar e-RDKK Petani (Standar Kementan)', badge: '10 Kolom' },
            { id: 'PENYALURAN', label: 'Rekap Penyaluran Pupuk' },
            { id: 'LAHAN', label: 'Rekap Pemetaan Lahan GIS' },
            { id: 'ERDKK', label: 'Rekap Alokasi Kuota e-RDKK' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setJenisLaporanCetak(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                jenisLaporanCetak === tab.id
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                    jenisLaporanCetak === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tombol Aksi Cepat: Print, Export, Import, Kelola Kades & Pilihan Orientasi Kertas */}
          <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3">
            <button
              onClick={() => window.print()}
              title="Cetak Halaman Laporan / Simpan PDF"
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-300" />
              Print
            </button>
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200" title="Pilih orientasi halaman cetak">
              <button
                type="button"
                onClick={() => setPrintOrientation('landscape')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition ${
                  printOrientation === 'landscape'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Landscape
              </button>
              <button
                type="button"
                onClick={() => setPrintOrientation('portrait')}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition ${
                  printOrientation === 'portrait'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Portrait
              </button>
            </div>
            <button
              onClick={() => {
                if (jenisLaporanCetak === 'KEMENTAN_ERDKK') {
                  exportKementanErdkkExcel(filteredPetani);
                } else if (jenisLaporanCetak === 'PENYALURAN') {
                  exportPenyaluranPupukExcel(filteredPenyaluran);
                } else if (jenisLaporanCetak === 'LAHAN') {
                  exportLahanExcel(filteredLahan);
                } else {
                  exportErdkkExcel(filteredErdkk);
                }
              }}
              title="Ekspor Data ke Format Excel"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              title="Impor Data Excel / CSV Standar Kementan"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Import
            </button>
            <button
              onClick={() => {
                const targetKades =
                  kadesList.find((k) => k.desa?.toLowerCase() === effectiveDesa?.toLowerCase()) ||
                  kadesList[0];
                if (targetKades) {
                  setEditingKades({ ...targetKades });
                }
                setShowKadesModal(true);
              }}
              title="Kelola & Isi Data Kepala Desa Wilayah Kecamatan"
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              Data Kades
            </button>
          </div>

          {/* Pilihan Filter Poktan */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Poktan:
            </span>
            <select
              value={filterPoktan}
              onChange={(e) => {
                const val = e.target.value;
                setFilterPoktan(val);
                setOverrideDesa('AUTO');
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="SEMUA">Semua Kelompok Tani</option>
              {poktanList.map((pok) => (
                <option key={pok.id} value={pok.nama}>
                  {pok.nama} (Desa {toTitleCase(pok.desa)})
                </option>
              ))}
            </select>
          </div>

          {/* Selector Pengesahan Kepala Desa (Hanya Tampil Jika Memilih Poktan Tertentu) */}
          {filterPoktan !== 'SEMUA' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Kades Pengesah:
              </span>
              <select
                value={overrideDesa === 'AUTO' ? `AUTO_${effectiveDesa}` : overrideDesa}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('AUTO_')) {
                    setOverrideDesa('AUTO');
                  } else {
                    setOverrideDesa(val);
                  }
                }}
                className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                title="Pilih Desa untuk pengesahan Kepala Desa di laporan"
              >
                <option value={`AUTO_${effectiveDesa}`}>
                  ⚡ Otomatis ({effectiveDesa})
                </option>
                {kadesList.map((k) => (
                  <option key={k.desa} value={k.desa}>
                    Desa {k.desa} ({k.nama})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: LEMBAR LAPORAN RESMI FORMAT CETAK (PDF READY) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm print-page print:border-none print:shadow-none print:p-0 print:rounded-none print:bg-white">
        {/* Kop Dinas */}
        <div className="border-b-4 border-double border-slate-900 pb-4 mb-6 flex items-center justify-between gap-4">
          <div className="text-left">
            <h3 className="text-xs font-bold tracking-widest text-slate-700 uppercase">
              PEMERINTAH KECAMATAN LEMBEYAN &bull; BALAI PENYULUHAN PERTANIAN (BPP)
            </h3>
            <h2 className="text-base font-black tracking-wide text-slate-900 uppercase mt-0.5">
              {jenisLaporanCetak === 'KEMENTAN_ERDKK' && 'DAFTAR e-RDKK PETANI PENERIMA PUPUK BERSUBSIDI (FORMAT STANDAR KEMENTAN RI)'}
              {jenisLaporanCetak === 'PENYALURAN' && 'LAPORAN REKAPITULASI PENYALURAN PUPUK BERSUBSIDI'}
              {jenisLaporanCetak === 'LAHAN' && 'LAPORAN MASTER PEMETAAN POLIGON LAHAN PERTANIAN (GIS)'}
              {jenisLaporanCetak === 'ERDKK' && 'LAPORAN DAFTAR ALOKASI KUOTA PUPUK BERSUBSIDI (e-RDKK)'}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Wilayah Kerja BPP Kecamatan Lembeyan &bull; Kelompok Tani:{' '}
              <strong className="text-slate-900">
                {filterPoktan === 'SEMUA' ? 'Seluruh Poktan Se-Kecamatan Lembeyan' : filterPoktan}
              </strong>{' '}
              {filterPoktan !== 'SEMUA' && `(Desa ${effectiveDesa})`} &mdash; Tahun Anggaran 2026
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 italic">
              Sistem Informasi Pertanian Terpadu Kecamatan Lembeyan &bull; Balai Penyuluhan Pertanian (BPP)
            </p>
          </div>

          <QrCodeView
            value={`https://pertanian.lembeyan.go.id/verifikasi/laporan/${jenisLaporanCetak.toLowerCase()}-2026`}
            size={64}
            caption="VALIDASI KEC."
          />
        </div>

        {/* OPSI TABEL 0: FORMAT STANDAR NASIONAL KEMENTAN RI (10 KOLOM LENGKAP DENGAN KOMODITAS) */}
        {jenisLaporanCetak === 'KEMENTAN_ERDKK' && (
          <div className="overflow-x-auto mb-6 print:overflow-visible">
            <table className="w-full text-left text-xs border border-slate-300 print:text-[9.5px] print:border-collapse">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px] print:text-[9px]">
                <tr>
                  <th className="py-2.5 px-3 print:py-1.5 print:px-1 border-r text-center w-12 print:w-[3.5%]">NO</th>
                  <th className="py-2.5 px-3 print:py-1.5 print:px-1.5 border-r min-w-[130px] print:min-w-0 print:w-[15%]">Nama Petani</th>
                  <th className="py-2.5 px-3 print:py-1.5 print:px-1 border-r font-mono min-w-[125px] print:min-w-0 print:w-[13%]">KTP</th>
                  <th className="py-2.5 px-3 print:py-1.5 print:px-1 border-r min-w-[95px] print:min-w-0 print:w-[8.5%]">Tempat Lahir</th>
                  <th className="py-2.5 px-3 print:py-1.5 print:px-1 border-r min-w-[90px] print:min-w-0 print:w-[8.5%] text-center">Tanggal Lahir</th>
                  <th className="py-2.5 px-3 print:py-1.5 print:px-1.5 border-r min-w-[115px] print:min-w-0 print:w-[11%]">Nama Ibu Kandung</th>
                  <th className="py-2.5 px-3 print:py-1.5 print:px-1.5 border-r min-w-[170px] print:min-w-0 print:w-[15.5%]">Alamat</th>
                  <th className="py-2.5 px-3 print:py-1.5 print:px-1 border-r text-center min-w-[75px] print:min-w-0 print:w-[6%]">luas(ha)</th>
                  <th className="py-2.5 px-3 print:py-1.5 print:px-1 border-r font-mono min-w-[150px] print:min-w-0 print:w-[9.5%]">koordinat</th>
                  <th className="py-2.5 px-3 print:py-1.5 print:px-1.5 min-w-[160px] print:min-w-0 print:w-[9.5%]">Komoditas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredPetani.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-slate-400 italic">
                      Tidak ada data petani pada kelompok tani ini. Silakan impor data atau pilih kelompok tani lain.
                    </td>
                  </tr>
                ) : (
                  filteredPetani.map((item, index) => {
                    const lat = item.lahan?.[0]?.centerLat;
                    const lng = item.lahan?.[0]?.centerLng;
                    const koordinatStr =
                      lat !== undefined && lng !== undefined
                        ? `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
                        : item.koordinat || '-';

                    const totalLuas =
                      item.totalLuasLahan > 0
                        ? item.totalLuasLahan
                        : item.lahan?.reduce((acc: number, l: any) => acc + (l.luasHa || 0), 0) || 0.5;

                    const fullAlamat = item.alamat
                      ? item.desa
                        ? `${item.alamat}, Desa ${item.desa}`
                        : item.alamat
                      : item.desa
                      ? `Desa ${item.desa}, Kec. Lembeyan`
                      : 'Kecamatan Lembeyan';

                    const komoditasStr =
                      item.komoditas ||
                      (item.alokasiPupuk && item.alokasiPupuk.length > 0
                        ? item.alokasiPupuk.map((a: any) => `${a.musimTanam || 'MT'}: ${a.komoditas}`).join(', ')
                        : item.lahan?.[0]?.komoditas
                        ? `MT1 ${item.lahan[0].komoditas}, MT2 Jagung, MT3 Padi`
                        : 'MT1 Padi, MT2 Jagung, MT3 Padi');

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition print:break-inside-avoid">
                        <td className="py-2 px-3 print:py-1 print:px-1 border-r font-mono text-center font-semibold">{index + 1}</td>
                        <td className="py-2 px-3 print:py-1 print:px-1.5 border-r font-bold text-slate-900">{item.nama}</td>
                        <td className="py-2 px-3 print:py-1 print:px-1 border-r font-mono text-slate-700 text-xs print:text-[8.5px]">{item.nik}</td>
                        <td className="py-2 px-3 print:py-1 print:px-1 border-r">{item.tempatLahir || 'Magetan'}</td>
                        <td className="py-2 px-3 print:py-1 print:px-1 border-r text-center font-mono text-xs print:text-[8.5px]">{item.tanggalLahir || '-'}</td>
                        <td className="py-2 px-3 print:py-1 print:px-1.5 border-r">{item.namaIbuKandung || '-'}</td>
                        <td className="py-2 px-3 print:py-1 print:px-1.5 border-r text-[11px] print:text-[8.5px] break-words">{fullAlamat}</td>
                        <td className="py-2 px-3 print:py-1 print:px-1 border-r font-black text-center text-slate-900">
                          {Number(totalLuas).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 print:py-1 print:px-1 border-r font-mono text-[10px] print:text-[7.5px] text-slate-600 break-all">
                          {koordinatStr}
                        </td>
                        <td className="py-2 px-3 print:py-1 print:px-1.5 font-semibold text-emerald-800 text-[11px] print:text-[8.5px] whitespace-normal break-words">
                          {komoditasStr}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 print:break-inside-avoid">
                <tr>
                  <td colSpan={7} className="py-2.5 px-3 print:py-1.5 print:px-2 border-r text-right uppercase print:text-[9.5px]">
                    Total Rekapitulasi e-RDKK ({filteredPetani.length} Petani Terdaftar):
                  </td>
                  <td className="py-2.5 px-3 print:py-1.5 print:px-1 border-r text-center print:text-[9.5px]">
                    {totalLuasPetaniKementan.toFixed(2)}
                  </td>
                  <td colSpan={2} className="py-2.5 px-3 print:py-1.5 print:px-2 text-[10px] print:text-[8px] text-slate-500 italic">
                    Format Standar Kementan RI &bull; 10 Kolom Terpadu
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* OPSI TABEL 1: PENYALURAN PUPUK */}
        {jenisLaporanCetak === 'PENYALURAN' && (
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                <tr>
                  <th className="py-2 px-3 border-r">No</th>
                  <th className="py-2 px-3 border-r">No. Nota</th>
                  <th className="py-2 px-3 border-r">Nama Petani</th>
                  <th className="py-2 px-3 border-r">NIK</th>
                  <th className="py-2 px-3 border-r">Kelompok Tani</th>
                  <th className="py-2 px-3 border-r text-center">Urea (Kg)</th>
                  <th className="py-2 px-3 border-r text-center">NPK (Kg)</th>
                  <th className="py-2 px-3 border-r text-center">Organik (Kg)</th>
                  <th className="py-2 px-3 border-r text-right">Total Biaya (Rp)</th>
                  <th className="py-2 px-3">Validasi Poktan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPenyaluran.map((item, index) => (
                  <tr key={item.id}>
                    <td className="py-2 px-3 border-r font-mono text-center">{index + 1}</td>
                    <td className="py-2 px-3 border-r font-mono font-bold text-slate-700">{item.nomorNota}</td>
                    <td className="py-2 px-3 border-r font-bold text-slate-900">{item.petani?.nama}</td>
                    <td className="py-2 px-3 border-r font-mono">{item.petani?.nik}</td>
                    <td className="py-2 px-3 border-r">{item.petani?.poktan?.nama}</td>
                    <td className="py-2 px-3 border-r font-bold text-center">{item.jumlahUreaKg}</td>
                    <td className="py-2 px-3 border-r font-bold text-center">{item.jumlahNpkKg}</td>
                    <td className="py-2 px-3 border-r font-bold text-center">{item.jumlahOrganikKg}</td>
                    <td className="py-2 px-3 border-r font-bold text-right">{formatRupiah(item.totalBiayaRp)}</td>
                    <td className="py-2 px-3 text-slate-700">{item.namaPengurusPoktan}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 border-r text-right uppercase">
                    Total Akumulasi Penyaluran:
                  </td>
                  <td className="py-2.5 px-3 border-r text-center">{totalUreaSalur} Kg</td>
                  <td className="py-2.5 px-3 border-r text-center">{totalNpkSalur} Kg</td>
                  <td className="py-2.5 px-3 border-r text-center">{totalOrgSalur} Kg</td>
                  <td className="py-2.5 px-3 border-r text-right">{formatRupiah(totalBiayaSalur)}</td>
                  <td className="py-2.5 px-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* OPSI TABEL 2: MASTER LAHAN GIS */}
        {jenisLaporanCetak === 'LAHAN' && (
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                <tr>
                  <th className="py-2 px-3 border-r">No</th>
                  <th className="py-2 px-3 border-r">Kode Lahan</th>
                  <th className="py-2 px-3 border-r">Nama Blok / Petak Sawah</th>
                  <th className="py-2 px-3 border-r">Nama Petani & NIK</th>
                  <th className="py-2 px-3 border-r">Kelompok Tani</th>
                  <th className="py-2 px-3 border-r">Komoditas</th>
                  <th className="py-2 px-3 border-r text-center">Luas (Ha)</th>
                  <th className="py-2 px-3 border-r">No. Pipil / SPPT</th>
                  <th className="py-2 px-3">Titik Koordinat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLahan.map((item, index) => (
                  <tr key={item.id}>
                    <td className="py-2 px-3 border-r font-mono text-center">{index + 1}</td>
                    <td className="py-2 px-3 border-r font-mono font-bold text-slate-700">{item.kodeLahan}</td>
                    <td className="py-2 px-3 border-r font-semibold text-slate-900">{item.namaLahan}</td>
                    <td className="py-2 px-3 border-r">
                      <div className="font-bold">{item.petani?.nama}</div>
                      <div className="text-[10px] font-mono text-slate-500">{item.petani?.nik}</div>
                    </td>
                    <td className="py-2 px-3 border-r">{item.petani?.poktan?.nama}</td>
                    <td className="py-2 px-3 border-r font-bold">{item.komoditas}</td>
                    <td className="py-2 px-3 border-r font-black text-center">{item.luasHa} Ha</td>
                    <td className="py-2 px-3 border-r font-mono">{item.nomorPipil || '-'}</td>
                    <td className="py-2 px-3 font-mono text-[10px]">
                      {item.centerLat?.toFixed(5)}, {item.centerLng?.toFixed(5)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={6} className="py-2.5 px-3 border-r text-right uppercase">
                    Total Luas Lahan Terpetakan ({filteredLahan.length} Petak):
                  </td>
                  <td className="py-2.5 px-3 border-r text-center">{totalLuasLahanGis.toFixed(2)} Ha</td>
                  <td colSpan={2} className="py-2.5 px-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* OPSI TABEL 3: ALOKASI e-RDKK */}
        {jenisLaporanCetak === 'ERDKK' && (
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                <tr>
                  <th className="py-2 px-3 border-r">No</th>
                  <th className="py-2 px-3 border-r">Nama Petani</th>
                  <th className="py-2 px-3 border-r">NIK</th>
                  <th className="py-2 px-3 border-r">Kelompok Tani</th>
                  <th className="py-2 px-3 border-r">Komoditas</th>
                  <th className="py-2 px-3 border-r text-center">Luas Tanam</th>
                  <th className="py-2 px-3 border-r text-center">Jatah / Sisa Urea</th>
                  <th className="py-2 px-3 border-r text-center">Jatah / Sisa NPK</th>
                  <th className="py-2 px-3 text-center">Jatah / Sisa Organik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredErdkk.map((item, index) => (
                  <tr key={item.id}>
                    <td className="py-2 px-3 border-r font-mono text-center">{index + 1}</td>
                    <td className="py-2 px-3 border-r font-bold text-slate-900">{item.petani?.nama}</td>
                    <td className="py-2 px-3 border-r font-mono">{item.petani?.nik}</td>
                    <td className="py-2 px-3 border-r">{item.petani?.poktan?.nama}</td>
                    <td className="py-2 px-3 border-r font-semibold">{item.komoditas}</td>
                    <td className="py-2 px-3 border-r font-bold text-center">{item.luasTanamHa} Ha</td>
                    <td className="py-2 px-3 border-r text-center font-mono">
                      <strong>{item.jatahUreaKg}</strong> / {item.sisaUreaKg} Kg
                    </td>
                    <td className="py-2 px-3 border-r text-center font-mono">
                      <strong>{item.jatahNpkKg}</strong> / {item.sisaNpkKg} Kg
                    </td>
                    <td className="py-2 px-3 text-center font-mono">
                      <strong>{item.jatahOrganikKg}</strong> / {item.sisaOrganikKg} Kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tanda Tangan Resmi Pengesahan Laporan */}
        {/* Jika 'SEMUA' Poktan: Hanya 2 Kolom Pengesahan Tingkat Kecamatan (PPL & Koordinator Wilayah Kec. Lembeyan), TTD Kades & Poktan tidak ditampilkan */}
        {/* Jika Poktan Tertentu: 3 Kolom Lengkap (PPL, Mengetahui Kepala Desa sesuai desa poktan, dan Ketua Kelompok Tani) */}
        <div className="pt-6 border-t-2 border-slate-200 print:pt-4 print:mt-4 print:break-inside-avoid print:page-break-inside-avoid">
          <div className="flex items-center justify-between text-xs print:text-[10px] text-slate-600 mb-6 print:mb-3">
            <span className="font-semibold text-slate-500">
              Dokumen Resmi Pengajuan e-RDKK &bull; Kecamatan Lembeyan
            </span>
            <span className="font-semibold">
              Kecamatan Lembeyan, {(() => {
                const d = new Date();
                const bln = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
                return `${d.getDate()} ${bln[d.getMonth()]} ${d.getFullYear()}`;
              })()}
            </span>
          </div>

          {filterPoktan === 'SEMUA' ? (
            /* Mode Rekapitulasi Seluruh Poktan Se-Kecamatan: 2 Kolom (PPL & Koordinator Wilayah Kecamatan) */
            <div className="grid grid-cols-2 gap-8 text-center text-xs print:text-[10px] max-w-3xl mx-auto print:max-w-none print:break-inside-avoid">
              {/* Kolom 1 (Kiri): Koordinator BPP / Petugas PPL */}
              <div>
                <p className="font-semibold text-slate-600">Koordinator BPP / Petugas PPL Kec. Lembeyan,</p>
                <div className="h-20 print:h-16 flex items-center justify-center relative my-1">
                  {(currentUser.role === 'PPL' && currentUser.stampUrl !== undefined
                    ? currentUser.stampUrl
                    : pplSigner.stampUrl) && (
                    <img
                      src={
                        (currentUser.role === 'PPL' && currentUser.stampUrl
                          ? currentUser.stampUrl
                          : pplSigner.stampUrl) || ''
                      }
                      alt="Stempel BPP"
                      className="h-18 w-18 print:h-16 print:w-16 object-contain absolute left-1/2 -translate-x-14 print:-translate-x-12 opacity-80 pointer-events-none"
                    />
                  )}
                  <img
                    src={
                      (currentUser.role === 'PPL' && currentUser.signatureUrl
                        ? currentUser.signatureUrl
                        : pplSigner.signatureUrl) || ''
                    }
                    alt="TTD PPL"
                    className="h-14 print:h-12 object-contain relative z-10"
                  />
                </div>
                <p className="font-bold text-slate-900 underline uppercase print:text-[10px]">
                  {currentUser.role === 'PPL' ? currentUser.name : pplSigner.name}
                </p>
                <p className="text-[10px] print:text-[8.5px] font-mono text-slate-600">
                  {currentUser.role === 'PPL' && currentUser.nip ? currentUser.nip : pplSigner.nip}
                </p>
                <p className="text-[10px] print:text-[8.5px] text-slate-400">
                  {currentUser.role === 'PPL' ? currentUser.wilayah : pplSigner.wilayah}
                </p>
              </div>

              {/* Kolom 2 (Kanan): Mengetahui, Koordinator Wilayah Kecamatan Lembeyan */}
              <div>
                <p className="font-semibold text-slate-600">
                  Mengetahui, Koordinator Wilayah Kecamatan Lembeyan,
                </p>
                <div className="h-20 print:h-16 flex items-center justify-center relative my-1">
                  {(currentUser.role === 'ADMIN_DINAS' && currentUser.stampUrl !== undefined
                    ? currentUser.stampUrl
                    : adminSigner.stampUrl) && (
                    <img
                      src={
                        (currentUser.role === 'ADMIN_DINAS' && currentUser.stampUrl
                          ? currentUser.stampUrl
                          : adminSigner.stampUrl) || ''
                      }
                      alt="Stempel Kecamatan"
                      className="h-18 w-18 print:h-16 print:w-16 object-contain absolute left-1/2 -translate-x-14 print:-translate-x-12 opacity-85 pointer-events-none"
                    />
                  )}
                  <img
                    src={
                      (currentUser.role === 'ADMIN_DINAS' && currentUser.signatureUrl
                        ? currentUser.signatureUrl
                        : adminSigner.signatureUrl) || ''
                    }
                    alt="TTD Koordinator Wilayah"
                    className="h-14 print:h-12 object-contain relative z-10"
                  />
                </div>
                <p className="font-bold text-slate-900 underline uppercase print:text-[10px]">
                  {currentUser.role === 'ADMIN_DINAS' ? currentUser.name : adminSigner.name}
                </p>
                <p className="text-[10px] print:text-[8.5px] font-mono text-slate-600">
                  {currentUser.role === 'ADMIN_DINAS' && currentUser.nip
                    ? currentUser.nip
                    : adminSigner.nip}
                </p>
                <p className="text-[10px] print:text-[8.5px] text-slate-400">
                  {currentUser.role === 'ADMIN_DINAS'
                    ? currentUser.wilayah
                    : adminSigner.wilayah}
                </p>
              </div>
            </div>
          ) : (
            /* Mode Kelompok Tani Spesifik: 3 Kolom (PPL, Mengetahui Kepala Desa, dan Ketua Kelompok Tani) */
            <div className="grid grid-cols-3 gap-4 sm:gap-6 text-center text-xs print:text-[10px] print:gap-4 print:break-inside-avoid">
              {/* Kolom 1 (Kiri): Koordinator BPP / Petugas PPL */}
              <div>
                <p className="font-semibold text-slate-600">Koordinator BPP / Petugas PPL Kec. Lembeyan,</p>
                <div className="h-20 print:h-16 flex items-center justify-center relative my-1">
                  {(currentUser.role === 'PPL' && currentUser.stampUrl !== undefined
                    ? currentUser.stampUrl
                    : pplSigner.stampUrl) && (
                    <img
                      src={
                        (currentUser.role === 'PPL' && currentUser.stampUrl
                          ? currentUser.stampUrl
                          : pplSigner.stampUrl) || ''
                      }
                      alt="Stempel BPP"
                      className="h-18 w-18 print:h-16 print:w-16 object-contain absolute left-1/2 -translate-x-14 print:-translate-x-12 opacity-80 pointer-events-none"
                    />
                  )}
                  <img
                    src={
                      (currentUser.role === 'PPL' && currentUser.signatureUrl
                        ? currentUser.signatureUrl
                        : pplSigner.signatureUrl) || ''
                    }
                    alt="TTD PPL"
                    className="h-14 print:h-12 object-contain relative z-10"
                  />
                </div>
                <p className="font-bold text-slate-900 underline uppercase print:text-[10px]">
                  {currentUser.role === 'PPL' ? currentUser.name : pplSigner.name}
                </p>
                <p className="text-[10px] print:text-[8.5px] font-mono text-slate-600">
                  {currentUser.role === 'PPL' && currentUser.nip ? currentUser.nip : pplSigner.nip}
                </p>
                <p className="text-[10px] print:text-[8.5px] text-slate-400">
                  {currentUser.role === 'PPL' ? currentUser.wilayah : pplSigner.wilayah}
                </p>
              </div>

              {/* Kolom 2 (Tengah): Mengetahui, Kepala Desa */}
              <div>
                <p className="font-semibold text-slate-600">
                  Mengetahui, {activeKades?.jabatan || `Kepala Desa ${effectiveDesa}`},
                </p>
                <div className="h-20 print:h-16 flex items-center justify-center relative my-1">
                  {activeKades?.stampUrl && (
                    <img
                      src={activeKades.stampUrl}
                      alt="Stempel Kepala Desa"
                      className="h-18 w-18 print:h-16 print:w-16 object-contain absolute left-1/2 -translate-x-14 print:-translate-x-12 opacity-80 pointer-events-none"
                    />
                  )}
                  {activeKades?.signatureUrl && (
                    <img
                      src={activeKades.signatureUrl}
                      alt="TTD Kepala Desa"
                      className="h-14 print:h-12 object-contain relative z-10"
                    />
                  )}
                </div>
                <p className="font-bold text-slate-900 underline uppercase print:text-[10px]">
                  {activeKades?.nama || 'Dwi Santoso, S.Sos'}
                </p>
                <p className="text-[10px] print:text-[8.5px] font-mono text-slate-600">
                  {activeKades?.nip || 'NIP. -'}
                </p>
                <p className="text-[10px] print:text-[8.5px] text-slate-400">
                  Pemerintah Desa {effectiveDesa}
                </p>
              </div>

              {/* Kolom 3 (Kanan): Ketua Kelompok Tani */}
              <div>
                <p className="font-semibold text-slate-600">
                  Ketua {namaPoktanTitle},
                </p>
                <div className="h-20 print:h-16 flex items-center justify-center relative my-1">
                  <img
                    src={generateOfficialStampSvg('POKTAN', namaPoktanTitle)}
                    alt="Stempel Poktan"
                    className="h-18 w-18 print:h-16 print:w-16 object-contain absolute left-1/2 -translate-x-14 print:-translate-x-12 opacity-80 pointer-events-none"
                  />
                  <img
                    src={
                      (currentUser.role === 'POKTAN' && currentUser.signatureUrl
                        ? currentUser.signatureUrl
                        : generateAutoSignatureSvg(ketuaPoktanName)) || ''
                    }
                    alt="TTD Ketua Poktan"
                    className="h-14 print:h-12 object-contain relative z-10"
                  />
                </div>
                <p className="font-bold text-slate-900 underline uppercase print:text-[10px]">
                  {ketuaPoktanName}
                </p>
                <p className="text-[10px] print:text-[8.5px] font-mono text-slate-600">
                  Ketua Kelompok Tani
                </p>
                <p className="text-[10px] print:text-[8.5px] text-slate-400">
                  {namaPoktanTitle} (Desa {effectiveDesa})
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL IMPOR EXCEL/CSV KEMENTAN RI */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Impor Data e-RDKK (Format Standar Kementan)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Upload file Excel (.xlsx / .xls) atau CSV sesuai 9 kolom standar pengajuan Kementan RI
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportRows([]);
                  setImportFileName('');
                  setImportFeedback(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Kolom Standar Information */}
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-emerald-700" /> 9 Kolom Wajib Standar Nasional Kementan:
                </span>
                <button
                  type="button"
                  onClick={() => downloadTemplateKementanExcel()}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-100 px-2.5 py-1 rounded-xl transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Template Kosong (.xlsx)
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[11px] text-emerald-800 pt-1">
                <span>1. NO</span>
                <span>2. Nama Petani</span>
                <span>3. KTP (16 Digit)</span>
                <span>4. Tempat Lahir</span>
                <span>5. Tanggal Lahir</span>
                <span>6. Nama Ibu Kandung</span>
                <span>7. Alamat</span>
                <span>8. luas(ha)</span>
                <span>9. koordinat (Lat, Lng)</span>
              </div>
            </div>

            {/* Form Input File & Kelompok Tani */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kelompok Tani (Poktan) Tujuan Impor:
                </label>
                <select
                  value={targetImportPoktanId}
                  onChange={(e) => setTargetImportPoktanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                  {poktanList.map((pok) => (
                    <option key={pok.id} value={pok.id}>
                      {pok.nama} &mdash; Desa {pok.desa} (Ketua: {pok.ketua})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Petani baru yang diimpor akan otomatis terdaftar di kelompok tani ini dan petak sawahnya langsung terpetakan di sistem GIS.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Berkas Excel / CSV:
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 file:cursor-pointer border border-slate-200 rounded-xl bg-slate-50 p-1"
                />
              </div>

              {/* Preview Baris File */}
              {importRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Preview Berkas: {importFileName}</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg">
                      {importRows.length} Baris Terbaca
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-48 text-[11px]">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold sticky top-0">
                        <tr>
                          <th className="p-2 border-r">Nama Petani</th>
                          <th className="p-2 border-r">KTP / NIK</th>
                          <th className="p-2 border-r">Tempat / Tgl Lahir</th>
                          <th className="p-2 border-r">Ibu Kandung</th>
                          <th className="p-2 border-r">Luas(ha)</th>
                          <th className="p-2">Koordinat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importRows.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 border-r font-bold text-slate-800">
                              {row['Nama Petani'] || row['Nama'] || '-'}
                            </td>
                            <td className="p-2 border-r font-mono">
                              {row['KTP'] || row['NIK'] || '-'}
                            </td>
                            <td className="p-2 border-r text-slate-600">
                              {row['Tempat Lahir'] || '-'}, {row['Tanggal Lahir'] || '-'}
                            </td>
                            <td className="p-2 border-r text-slate-600">
                              {row['Nama Ibu Kandung'] || '-'}
                            </td>
                            <td className="p-2 border-r font-bold text-center">
                              {row['luas(ha)'] || row['Luas (Ha)'] || '-'}
                            </td>
                            <td className="p-2 font-mono text-[10px]">
                              {row['koordinat'] || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importRows.length > 5 && (
                    <p className="text-[11px] text-slate-400 italic">
                      + {importRows.length - 5} baris lainnya akan otomatis diproses saat tombol impor diklik.
                    </p>
                  )}
                </div>
              )}

              {/* Feedback Alert */}
              {importFeedback && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2 ${
                    importFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {importFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{importFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportRows([]);
                  setImportFileName('');
                  setImportFeedback(null);
                }}
                disabled={importing}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={importing || importRows.length === 0}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Memproses Impor...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Mulai Impor Sekarang
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL KELOLA DATA KEPALA DESA SE-KECAMATAN */}
      {showKadesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Kelola Data Kepala Desa Se-Kecamatan Lembeyan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Data nama Kepala Desa/Lurah & NIP otomatis tersinkron ke pengesahan dokumen cetak e-RDKK
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowKadesModal(false);
                  setEditingKades(null);
                  setKadesFeedback(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Edit Kepala Desa (jika sedang memilih desa) */}
            {editingKades ? (
              <form onSubmit={handleSaveKades} className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wide">
                    Edit Data: Desa {editingKades.desa}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEditingKades(null)}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700"
                  >
                    Batal Edit
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nama Kepala Desa / Lurah *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingKades.nama}
                      onChange={(e) => setEditingKades({ ...editingKades, nama: e.target.value })}
                      placeholder="Contoh: Dwi Santoso, S.Sos"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Jabatan Resmi *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingKades.jabatan}
                      onChange={(e) => setEditingKades({ ...editingKades, jabatan: e.target.value })}
                      placeholder="Contoh: Kepala Desa Kediren"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      NIP (Nomor Induk Pegawai)
                    </label>
                    <input
                      type="text"
                      value={editingKades.nip}
                      onChange={(e) => setEditingKades({ ...editingKades, nip: e.target.value })}
                      placeholder="Contoh: NIP. 19740512 200701 1 014 (atau NIP. -)"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Isi dengan 'NIP. -' jika Kepala Desa bukan berstatus PNS.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nomor Telepon / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={editingKades.kontak}
                      onChange={(e) => setEditingKades({ ...editingKades, kontak: e.target.value })}
                      placeholder="Contoh: 081234567890"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingKades(null)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingKades}
                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-1.5 rounded-xl text-xs shadow-sm transition"
                  >
                    {savingKades ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            ) : null}

            {/* Alert Feedback */}
            {kadesFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {kadesFeedback}
              </div>
            )}

            {/* Daftar 10 Desa Wilayah Kecamatan Lembeyan */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center justify-between">
                <span>Daftar 10 Desa Wilayah Kecamatan Lembeyan:</span>
                <span className="text-[11px] font-bold text-indigo-700 lowercase bg-indigo-50 px-2 py-0.5 rounded-md">
                  Klik tombol Edit untuk memperbarui nama & NIP
                </span>
              </h4>

              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 border-r">Desa</th>
                      <th className="py-2.5 px-3 border-r">Nama Kepala Desa</th>
                      <th className="py-2.5 px-3 border-r font-mono">NIP</th>
                      <th className="py-2.5 px-3 border-r">Kontak</th>
                      <th className="py-2.5 px-3 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kadesList.map((kades) => (
                      <tr key={kades.id || kades.desa} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 border-r font-black text-slate-800">
                          {kades.desa}
                        </td>
                        <td className="py-2.5 px-3 border-r font-bold text-indigo-950">
                          {kades.nama}
                        </td>
                        <td className="py-2.5 px-3 border-r font-mono text-[11px] text-slate-600">
                          {kades.nip || 'NIP. -'}
                        </td>
                        <td className="py-2.5 px-3 border-r text-slate-600">
                          {kades.kontak || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingKades({
                                desa: kades.desa,
                                nama: kades.nama,
                                jabatan: kades.jabatan || `Kepala Desa ${kades.desa}`,
                                nip: kades.nip || 'NIP. -',
                                kontak: kades.kontak || '',
                                alamat: kades.alamat || '',
                              });
                            }}
                            className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded-lg text-[11px] transition"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowKadesModal(false);
                  setEditingKades(null);
                  setKadesFeedback(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
