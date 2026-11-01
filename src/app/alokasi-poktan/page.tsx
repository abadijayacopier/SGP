'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Calculator,
  Upload,
  Download,
  Save,
  CheckCircle2,
  FileSpreadsheet,
  Users,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Package,
  Edit3,
  Trash2,
  UserPlus,
  RotateCcw,
  X,
  Plus,
} from 'lucide-react';
import {
  downloadTemplateAlokasiPoktanExcel,
  exportAlokasiPoktanExcel,
} from '@/lib/export-excel';
import {
  showSuccess,
  showError,
  showWarning,
  showConfirm,
  showDeleteConfirm,
  showToast,
} from '@/lib/sweetalert';

interface AlokasiItem {
  no: number;
  petaniId: string;
  nik: string;
  nama: string;
  desa: string;
  poktanId: string;
  namaPoktan: string;
  luasHa: number;
  komoditas: string;
  alokasiId: string | null;
  jatahUreaKg: number;
  sisaUreaKg: number;
  jatahNpkKg: number;
  sisaNpkKg: number;
  jatahOrganikKg: number;
  sisaOrganikKg: number;
  status: string;
}

export default function AlokasiPoktanPage() {
  const { currentUser } = useAuth();

  const [poktanList, setPoktanList] = useState<any[]>([]);
  const [selectedPoktanId, setSelectedPoktanId] = useState<string>('');
  const [musimTanam, setMusimTanam] = useState<string>('MT 1');
  const [tahun, setTahun] = useState<number>(2026);

  const [alokasiList, setAlokasiList] = useState<AlokasiItem[]>([]);
  const [summary, setSummary] = useState<any>({
    totalPetani: 0,
    totalLuasHa: 0,
    totalUreaKg: 0,
    totalNpkKg: 0,
    totalOrganikKg: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Kalkulator Rumus Proporsional Otomatis
  const [showKalkulator, setShowKalkulator] = useState(false);
  const [kiosUreaInput, setKiosUreaInput] = useState<string>('13500');
  const [kiosNpkInput, setKiosNpkInput] = useState<string>('12650');
  const [kiosOrganikInput, setKiosOrganikInput] = useState<string>('10000');
  const [modePembulatan, setModePembulatan] = useState<'BULAT' | 'DESIMAL_3' | 'DESIMAL_2' | 'SAK_50KG'>('BULAT');

  // Import Excel State
  const [importing, setImporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Modal Edit Alokasi
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AlokasiItem | null>(null);
  const [editForm, setEditForm] = useState({
    komoditas: 'Padi',
    luasHa: 0.5,
    jatahUreaKg: 0,
    jatahNpkKg: 0,
    jatahOrganikKg: 0,
    resetSisa: false,
  });

  // State Modal Tambah Alokasi Petani
  const [tambahModalOpen, setTambahModalOpen] = useState(false);
  const [petaniCandidates, setPetaniCandidates] = useState<any[]>([]);
  const [selectedNewPetaniId, setSelectedNewPetaniId] = useState('');
  const [tambahForm, setTambahForm] = useState({
    komoditas: 'Padi',
    luasHa: 0.5,
    jatahUreaKg: 63,
    jatahNpkKg: 50,
    jatahOrganikKg: 25,
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Load Poktan Awal (dengan safe retry saat Fast Refresh / Recompile)
  useEffect(() => {
    let isMounted = true;
    const loadPoktan = async (retries = 2) => {
      try {
        const res = await fetch('/api/poktan');
        if (!res.ok) return;
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setPoktanList(json.data);
          if (currentUser?.role === 'POKTAN' && currentUser?.wilayah) {
            const matched = json.data.find(
              (p: any) => p.nama.toLowerCase() === currentUser.wilayah?.toLowerCase()
            );
            setSelectedPoktanId(matched ? matched.id : json.data[0].id);
          } else {
            setSelectedPoktanId(json.data[0].id);
          }
        }
      } catch (err) {
        // Retry otomatis jika dev server sedang hot-reload
        if (retries > 0 && isMounted) {
          setTimeout(() => loadPoktan(retries - 1), 600);
        }
      }
    };

    loadPoktan();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Load Alokasi Petani
  const fetchAlokasi = async () => {
    if (!selectedPoktanId) return;
    try {
      setLoading(true);
      const res = await fetch(
        `/api/alokasi-poktan?poktanId=${selectedPoktanId}&musimTanam=${musimTanam}&tahun=${tahun}`
      );
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAlokasiList(json.data);
        setSummary(json.summary);
      }
    } catch (e) {
      // Tangani silently saat hot-reload dev server
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlokasi();
  }, [selectedPoktanId, musimTanam, tahun]);

  // Handle Edit Nilai Alokasi Per Baris
  const handleItemChange = (index: number, field: string, value: number) => {
    setAlokasiList((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: Math.max(0, value) };
      updated[index] = item;
      return updated;
    });
  };

  // Realtime Total dari Alokasi Tabel Aktif (Selalu Sinkron Saat Dihitung / Diedit)
  const activeTotalPetani = alokasiList.length;
  const activeTotalLuasHa = Number(
    alokasiList.reduce((acc, i) => acc + (Number(i.luasHa) || 0), 0).toFixed(2)
  );
  const activeTotalUreaKg = Number(
    alokasiList.reduce((acc, i) => acc + (Number(i.jatahUreaKg) || 0), 0).toFixed(3)
  );
  const activeTotalNpkKg = Number(
    alokasiList.reduce((acc, i) => acc + (Number(i.jatahNpkKg) || 0), 0).toFixed(3)
  );
  const activeTotalOrganikKg = Number(
    alokasiList.reduce((acc, i) => acc + (Number(i.jatahOrganikKg) || 0), 0).toFixed(3)
  );
  const activeTotalBiaya = alokasiList.reduce(
    (acc, i) =>
      acc +
      ((Number(i.jatahUreaKg) || 0) * 2250 +
        (Number(i.jatahNpkKg) || 0) * 2300 +
        (Number(i.jatahOrganikKg) || 0) * 800),
    0
  );

  // Helper Parse Angka Format Indonesia
  // Koma (,) = desimal  -> "13,5"   = 13.5
  // Titik (.) = ribuan  -> "13.500" = 13500
  const parseNumberFlexible = (val: string | number): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let s = String(val).trim().replace(/\s/g, '');
    if (s.includes(',')) {
      // Format Indonesia: hapus titik ribuan, koma jadi desimal
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      // Hanya titik dengan pola ribuan (misal 13.500 / 1.250.000)
      s = s.replace(/\./g, '');
    }
    return parseFloat(s) || 0;
  };

  // Format angka gaya Indonesia (titik ribuan, koma desimal)
  const fmtID = (n: number, maxDec = 3) =>
    n.toLocaleString('id-ID', { maximumFractionDigits: maxDec });

  // Hitung Rumus Proporsional Otomatis
  // Pembagi rumus DIAMBIL MURNI dari Total Luas Lahan yang masuk di aplikasi (activeTotalLuasHa)
  // Rumus: Alokasi Petani = (Total Pupuk dari Kios / Total Luas Sawah Masuk di Aplikasi) * Luas Lahan Petani
  const handleHitungProporsional = () => {
    const totalLuasDiAplikasi = activeTotalLuasHa > 0 ? activeTotalLuasHa : 1;
    const ureaKios = parseNumberFlexible(kiosUreaInput);
    const npkKios = parseNumberFlexible(kiosNpkInput);
    const organikKios = parseNumberFlexible(kiosOrganikInput);

    if (activeTotalLuasHa <= 0) {
      showWarning('Perhatian', 'Belum ada data luas lahan petani yang terdaftar di aplikasi.');
      return;
    }

    const updated = alokasiList.map((item) => {
      const luas = item.luasHa > 0 ? item.luasHa : 0.5;
      const rasio = luas / totalLuasDiAplikasi;

      // Hasil di dalam tabel BULAT TANPA KOMA (Integer)
      let jatahUrea = Math.round(ureaKios * rasio);
      let jatahNpk = Math.round(npkKios * rasio);
      let jatahOrganik = Math.round(organikKios * rasio);

      if (modePembulatan === 'DESIMAL_3') {
        jatahUrea = parseFloat((ureaKios * rasio).toFixed(3));
        jatahNpk = parseFloat((npkKios * rasio).toFixed(3));
        jatahOrganik = parseFloat((organikKios * rasio).toFixed(3));
      } else if (modePembulatan === 'SAK_50KG') {
        jatahUrea = Math.round((ureaKios * rasio) / 50) * 50;
        jatahNpk = Math.round((npkKios * rasio) / 50) * 50;
        jatahOrganik = Math.round((organikKios * rasio) / 40) * 40; // 1 Sak Organik = 40 Kg
      }

      return {
        ...item,
        jatahUreaKg: jatahUrea,
        sisaUreaKg: jatahUrea,
        jatahNpkKg: jatahNpk,
        sisaNpkKg: jatahNpk,
        jatahOrganikKg: jatahOrganik,
        sisaOrganikKg: jatahOrganik,
      };
    });

    setAlokasiList(updated);
    setSaveMessage(
      `Perhitungan rumus proporsional berhasil diterapkan berdasarkan total luas lahan di aplikasi (${activeTotalLuasHa} Ha)! Klik "Simpan & Sinkronkan" untuk menyimpan permanen.`
    );
    setShowKalkulator(false);
  };

  // Simpan Alokasi ke Database
  const handleSimpanAlokasi = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/alokasi-poktan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: alokasiList,
          tahun,
          musimTanam,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showSuccess('Berhasil Disimpan', 'Data alokasi e-RDKK berhasil disimpan & tersinkronisasi otomatis!');
        fetchAlokasi();
      } else {
        showError('Gagal Menyimpan', json.error || 'Gagal menyimpan alokasi.');
      }
    } catch (e) {
      showError('Gagal Koneksi', 'Terjadi kesalahan jaringan.');
    } finally {
      setSaving(false);
    }
  };

  // Import Excel Submit
  const handleUploadExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showWarning('Pilih File', 'Silakan pilih file Excel terlebih dahulu.');
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('tahun', String(tahun));
      formData.append('musimTanam', musimTanam);
      formData.append('poktanId', selectedPoktanId);

      const res = await fetch('/api/alokasi-poktan/import', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setImportResult(json);
        showSuccess('Import Berhasil', json.message || 'File Excel berhasil diproses.');
        fetchAlokasi();
      } else {
        showError('Gagal Mengimpor', json.error || 'Gagal mengimpor file Excel.');
      }
    } catch (e) {
      showError('Kesalahan Import', 'Terjadi kesalahan saat memproses file Excel.');
    } finally {
      setImporting(false);
    }
  };

  // --- OPERASI CRUD ALOKASI PETANI ---

  // 1. Buka Modal Edit Alokasi Petani
  const handleOpenEdit = (item: AlokasiItem) => {
    setEditingItem(item);
    setEditForm({
      komoditas: item.komoditas || 'Padi',
      luasHa: Number(item.luasHa) || 0.5,
      jatahUreaKg: Math.round(item.jatahUreaKg),
      jatahNpkKg: Math.round(item.jatahNpkKg),
      jatahOrganikKg: Math.round(item.jatahOrganikKg),
      resetSisa: false,
    });
    setEditModalOpen(true);
  };

  // Simpan Edit Alokasi ke Server
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      setActionLoading(true);
      const res = await fetch('/api/alokasi-poktan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.alokasiId,
          petaniId: editingItem.petaniId,
          tahun,
          musimTanam,
          komoditas: editForm.komoditas,
          luasHa: Number(editForm.luasHa),
          jatahUreaKg: Number(editForm.jatahUreaKg),
          jatahNpkKg: Number(editForm.jatahNpkKg),
          jatahOrganikKg: Number(editForm.jatahOrganikKg),
          resetSisa: editForm.resetSisa,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showSuccess('Alokasi Diperbarui', `Alokasi pupuk untuk petani ${editingItem.nama} berhasil diperbarui!`);
        setEditModalOpen(false);
        setEditingItem(null);
        fetchAlokasi();
      } else {
        showError('Gagal Memperbarui', json.error || 'Gagal memperbarui alokasi');
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Hapus Alokasi Petani dari Musim Tanam Aktif
  const handleDeleteAlokasi = async (item: AlokasiItem) => {
    const confirmDelete = await showDeleteConfirm(
      item.nama,
      `Hapus alokasi e-RDKK untuk petani <strong>${item.nama}</strong> (NIK: ${item.nik}) pada Musim Tanam <strong>${musimTanam} ${tahun}</strong>?`
    );
    if (!confirmDelete) return;

    try {
      setActionLoading(true);
      const url = item.alokasiId
        ? `/api/alokasi-poktan?id=${item.alokasiId}`
        : `/api/alokasi-poktan?petaniId=${item.petaniId}&tahun=${tahun}&musimTanam=${encodeURIComponent(musimTanam)}`;

      const res = await fetch(url, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showSuccess('Alokasi Dihapus', `Alokasi untuk ${item.nama} berhasil dikeluarkan dari daftar.`);
        fetchAlokasi();
      } else {
        showError('Gagal Menghapus', json.error || 'Gagal menghapus alokasi');
      }
    } catch (err: any) {
      showError('Gagal Menghapus', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Reset Kuota Petani ke Jatah Standar Berdasarkan Luas Lahan
  const handleResetKuotaPetani = async (item: AlokasiItem) => {
    const luas = Number(item.luasHa) > 0 ? Number(item.luasHa) : 0.5;
    const stdUrea = Math.round(luas * 125);
    const stdNpk = Math.round(luas * 100);
    const stdOrg = Math.round(luas * 50);

    const confirmReset = await showConfirm({
      title: 'Reset Kuota Rekomendasi Dinas?',
      text: `Reset jatah "${item.nama}" ke dosis standar dinas (${luas} Ha): Urea ${stdUrea} Kg, NPK ${stdNpk} Kg, Organik ${stdOrg} Kg?`,
      confirmButtonText: 'Ya, Reset Kuota',
      icon: 'question',
    });
    if (!confirmReset) return;

    try {
      setActionLoading(true);
      const res = await fetch('/api/alokasi-poktan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.alokasiId,
          petaniId: item.petaniId,
          tahun,
          musimTanam,
          komoditas: item.komoditas || 'Padi',
          luasHa: luas,
          jatahUreaKg: stdUrea,
          jatahNpkKg: stdNpk,
          jatahOrganikKg: stdOrg,
          resetSisa: true,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showSuccess('Kuota Direset', `Alokasi petani ${item.nama} telah direset ke dosis standar.`);
        fetchAlokasi();
      } else {
        showError('Gagal Reset', json.error || 'Gagal mereset alokasi');
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Buka Modal Tambah Petani Baru ke Alokasi e-RDKK
  const handleOpenTambahModal = async () => {
    try {
      setActionLoading(true);
      // Ambil seluruh petani terdaftar di poktan ini
      const res = await fetch(`/api/petani?poktanId=${selectedPoktanId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // Filter petani yang belum memiliki alokasi di tabel ini
        const existingPetaniIds = new Set(alokasiList.map((a) => a.petaniId));
        const available = json.data.filter((p: any) => !existingPetaniIds.has(p.id));
        setPetaniCandidates(available.length > 0 ? available : json.data);

        if (available.length > 0) {
          const first = available[0];
          setSelectedNewPetaniId(first.id);
          const luas = Number(first.totalLuasLahan) || 0.5;
          setTambahForm({
            komoditas: first.lahan?.[0]?.komoditas || 'Padi',
            luasHa: luas,
            jatahUreaKg: Math.round(luas * 125),
            jatahNpkKg: Math.round(luas * 100),
            jatahOrganikKg: Math.round(luas * 50),
          });
        }
      }
      setTambahModalOpen(true);
    } catch (err: any) {
      showError('Gagal Memuat', 'Gagal memuat daftar petani.');
    } finally {
      setActionLoading(false);
    }
  };

  // Simpan Tambah Petani ke Alokasi
  const handleSaveTambahPetani = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNewPetaniId) {
      showWarning('Pilih Petani', 'Silakan pilih petani terlebih dahulu.');
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch('/api/alokasi-poktan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petaniId: selectedNewPetaniId,
          tahun,
          musimTanam,
          komoditas: tambahForm.komoditas,
          luasHa: Number(tambahForm.luasHa),
          jatahUreaKg: Number(tambahForm.jatahUreaKg),
          jatahNpkKg: Number(tambahForm.jatahNpkKg),
          jatahOrganikKg: Number(tambahForm.jatahOrganikKg),
        }),
      });
      const json = await res.json();
      if (json.success) {
        showSuccess('Petani Ditambahkan', 'Petani berhasil ditambahkan ke Daftar Alokasi e-RDKK!');
        setTambahModalOpen(false);
        fetchAlokasi();
      } else {
        showError('Gagal Menambahkan', json.error || 'Gagal menambahkan petani.');
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredItems = alokasiList.filter(
    (item) =>
      item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nik.includes(searchQuery)
  );

  const selectedPoktan = poktanList.find((p) => p.id === selectedPoktanId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-12 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden no-print">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold mb-3">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Manajemen Pasokan & Alokasi e-RDKK Pupuk Bersubsidi
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Alokasi Pupuk e-RDKK Poktan
            </h1>
            <p className="text-emerald-100/80 text-xs sm:text-sm mt-1 max-w-2xl">
              Atur kuota pupuk tiap petani per musim tanam, impor dari Excel (NO | NIK | Nama | Urea | NPK/Phonska | Organik), atau hitung otomatis proporsional berdasarkan pasokan kios dan luas lahan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => downloadTemplateAlokasiPoktanExcel(alokasiList)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition cursor-pointer"
              title="Unduh template Excel dengan daftar petani Poktan ini"
            >
              <Download className="w-4 h-4 text-emerald-300" />
              Download Template Excel
            </button>
            <button
              onClick={() => {
                setImportResult(null);
                setSelectedFile(null);
                setImportModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition shadow-md cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Import dari Excel
            </button>
          </div>
        </div>

        {/* Ringkasan Alokasi Poktan (Realtime Sinkron) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-emerald-700/50 relative z-10 text-center sm:text-left">
          <div className="bg-emerald-950/40 border border-emerald-700/40 p-3 rounded-2xl">
            <span className="text-[10px] text-emerald-300 font-semibold block">Total Petani</span>
            <strong className="text-lg font-black text-white">{activeTotalPetani}</strong> Orang
          </div>
          <div className="bg-emerald-950/40 border border-emerald-700/40 p-3 rounded-2xl">
            <span className="text-[10px] text-emerald-300 font-semibold block">Total Luas Sawah</span>
            <strong className="text-lg font-black text-white">{activeTotalLuasHa}</strong> Ha
          </div>
          <div className="bg-emerald-950/40 border border-emerald-700/40 p-3 rounded-2xl">
            <span className="text-[10px] text-emerald-300 font-semibold block">Total Jatah Urea</span>
            <strong className="text-lg font-black text-emerald-300">{Math.round(activeTotalUreaKg).toLocaleString('id-ID')}</strong> Kg
          </div>
          <div className="bg-emerald-950/40 border border-emerald-700/40 p-3 rounded-2xl">
            <span className="text-[10px] text-emerald-300 font-semibold block">Total Jatah NPK</span>
            <strong className="text-lg font-black text-blue-300">{Math.round(activeTotalNpkKg).toLocaleString('id-ID')}</strong> Kg
          </div>
          <div className="bg-emerald-950/40 border border-emerald-700/40 p-3 rounded-2xl">
            <span className="text-[10px] text-emerald-300 font-semibold block">Total Jatah Organik</span>
            <strong className="text-lg font-black text-amber-300">{Math.round(activeTotalOrganikKg).toLocaleString('id-ID')}</strong> Kg
          </div>
        </div>
      </div>

      {/* TOOLBAR & PENGATURAN KALKULATOR */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Kelompok Tani (Poktan):</label>
              <select
                value={selectedPoktanId}
                onChange={(e) => setSelectedPoktanId(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
              >
                {poktanList.map((pok) => (
                  <option key={pok.id} value={pok.id}>
                    {pok.nama} (Desa {pok.desa})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Musim Tanam (MT):</label>
              <select
                value={musimTanam}
                onChange={(e) => setMusimTanam(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
              >
                <option value="MT 1">MT 1 (Walikan - Padi)</option>
                <option value="MT 2">MT 2 (Kemarau - Jagung, Palawija dll)</option>
                <option value="MT 3">MT 3 (Rendeng - Padi)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Tahun Anggaran:</label>
              <select
                value={tahun}
                onChange={(e) => setTahun(parseInt(e.target.value))}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowKalkulator(!showKalkulator)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              {showKalkulator ? 'Tutup Rumus Proporsional' : 'Rumus Proporsional Pasokan Kios'}
            </button>

            <button
              type="button"
              onClick={() => exportAlokasiPoktanExcel(alokasiList)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor
            </button>

            <button
              type="button"
              onClick={handleSimpanAlokasi}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan & Sinkronkan'}
            </button>
          </div>
        </div>

        {/* NOTIFIKASI SUKSES */}
        {saveMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            {saveMessage}
          </div>
        )}

        {/* PANEL KALKULATOR RUMUS PROPORSIONAL */}
        {showKalkulator && (
          <div className="bg-indigo-50/70 border border-indigo-200 p-5 rounded-2xl space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Kalkulator Otomatis Jatah Pupuk dari Kios / PPL
                </h4>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Pembagi rumus murni dari total luas sawah yang terdaftar di aplikasi (<strong>{activeTotalLuasHa} Ha</strong> dari {activeTotalPetani} Petani): <code className="bg-white/80 px-1 rounded border border-indigo-200 font-bold">Jatah = (Pupuk Kios &divide; {activeTotalLuasHa} Ha) &times; Luas Petani</code>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                <label className="text-xs font-bold text-emerald-950 block mb-1">
                  Jatah UREA dari Kios (Kg):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={kiosUreaInput}
                    onChange={(e) => setKiosUreaInput(e.target.value)}
                    placeholder="Contoh: 13500"
                    className="w-full text-sm font-black bg-slate-50 border border-emerald-300 rounded-lg px-3 py-2 text-right text-emerald-950 focus:bg-white"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">Kg</span>
                </div>
                <p className="text-[10px] text-emerald-800 mt-1 font-bold">
                  Terbaca: {fmtID(parseNumberFlexible(kiosUreaInput))} Kg
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs">
                <label className="text-xs font-bold text-blue-950 block mb-1">
                  Jatah NPK PHONSKA dari Kios (Kg):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={kiosNpkInput}
                    onChange={(e) => setKiosNpkInput(e.target.value)}
                    placeholder="Contoh: 12650"
                    className="w-full text-sm font-black bg-slate-50 border border-blue-300 rounded-lg px-3 py-2 text-right text-blue-950 focus:bg-white"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">Kg</span>
                </div>
                <p className="text-[10px] text-emerald-800 mt-1 font-bold">
                  Terbaca: {fmtID(parseNumberFlexible(kiosNpkInput))} Kg
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs">
                <label className="text-xs font-bold text-amber-950 block mb-1">
                  Jatah ORGANIK dari Kios (Kg):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={kiosOrganikInput}
                    onChange={(e) => setKiosOrganikInput(e.target.value)}
                    placeholder="Contoh: 10000"
                    className="w-full text-sm font-black bg-slate-50 border border-amber-300 rounded-lg px-3 py-2 text-right text-amber-950 focus:bg-white"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">Kg</span>
                </div>
                <p className="text-[10px] text-emerald-800 mt-1 font-bold">
                  Terbaca: {fmtID(parseNumberFlexible(kiosOrganikInput))} Kg
                </p>
              </div>
            </div>

            {/* Pratinjau Perhitungan Live per Petani */}
            {activeTotalLuasHa > 0 && alokasiList.length > 0 && (
              <div className="bg-white border border-indigo-200 rounded-xl p-3 text-[11px] space-y-1">
                <div className="font-bold text-indigo-900 mb-1">
                  Pratinjau Rumus Urea: (Jatah Kios &divide; {fmtID(activeTotalLuasHa, 2)} Ha) &times; Luas Petani
                </div>
                {alokasiList.slice(0, 5).map((p) => {
                  const luas = p.luasHa > 0 ? p.luasHa : 0.5;
                  const kios = parseNumberFlexible(kiosUreaInput);
                  const presisi = (kios / activeTotalLuasHa) * luas;
                  return (
                    <div key={p.petaniId} className="font-mono text-slate-700">
                      {p.nama}: ({fmtID(kios)} &divide; {fmtID(activeTotalLuasHa, 2)}) &times; {fmtID(luas, 2)} ={' '}
                      <span className="text-slate-500">{fmtID(presisi)}</span> &rarr;{' '}
                      <strong className="text-emerald-700">{fmtID(Math.round(presisi), 0)} Kg</strong>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tombol Terapkan Otomatis ke Petani */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-slate-600 font-medium">
                * Hasil otomatis terbagi adil ke setiap petani dalam <strong>bilangan bulat (tanpa koma)</strong>.
              </span>

              <button
                type="button"
                onClick={handleHitungProporsional}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer self-end"
              >
                <Calculator className="w-4 h-4" />
                Hitung & Terapkan Otomatis ke Petani
              </button>
            </div>
          </div>
        )}

        {/* PENCARIAN PETANI */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari berdasarkan NIK atau Nama Petani..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2"
          />
        </div>
      </div>

      {/* TABEL MANAJEMEN ALOKASI PUPUK PETANI */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Daftar Alokasi e-RDKK Petani &mdash; {selectedPoktan?.nama || 'Poktan'}
            </h3>
            <p className="text-xs text-slate-500">
              Musim Tanam {musimTanam} &bull; Tahun Anggaran {tahun}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 mr-1">
              Total {filteredItems.length} Petani
            </span>
            <button
              type="button"
              onClick={handleOpenTambahModal}
              disabled={actionLoading}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Tambah Petani ke Alokasi
            </button>
          </div>
        </div>

        {/* Mobile Card View (Smartphone friendly - No horizontal scrolling) */}
        <div className="block lg:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Memuat data alokasi pupuk...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              Belum ada petani terdaftar pada kelompok tani ini.
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const biayaHet =
                item.jatahUreaKg * 2250 +
                item.jatahNpkKg * 2300 +
                item.jatahOrganikKg * 800;

              return (
                <div key={item.petaniId} className="p-4 hover:bg-slate-50 transition space-y-3">
                  {/* Top: No & Name & Luas */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          #{index + 1}
                        </span>
                        <h4 className="font-black text-slate-900 text-sm leading-tight truncate">
                          {item.nama}
                        </h4>
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        NIK: {item.nik}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-emerald-800 text-sm block leading-tight">
                        {item.luasHa} Ha
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {item.komoditas}
                      </span>
                    </div>
                  </div>

                  {/* 3 Quota Input Boxes Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2 text-center">
                      <label className="text-[10px] font-bold text-emerald-950 block mb-1">
                        Urea (Kg)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={Math.round(item.jatahUreaKg)}
                        onChange={(e) =>
                          handleItemChange(index, 'jatahUreaKg', parseInt(e.target.value) || 0)
                        }
                        className="w-full text-xs font-black text-emerald-900 bg-white border border-emerald-300 rounded-lg py-1 px-1.5 text-center focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="block text-[9px] text-emerald-700 mt-0.5 font-mono">
                        &asymp; {(item.jatahUreaKg / 50).toFixed(1)} Sak
                      </span>
                    </div>

                    <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-2 text-center">
                      <label className="text-[10px] font-bold text-blue-950 block mb-1">
                        NPK (Kg)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={Math.round(item.jatahNpkKg)}
                        onChange={(e) =>
                          handleItemChange(index, 'jatahNpkKg', parseInt(e.target.value) || 0)
                        }
                        className="w-full text-xs font-black text-blue-900 bg-white border border-blue-300 rounded-lg py-1 px-1.5 text-center focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="block text-[9px] text-blue-700 mt-0.5 font-mono">
                        &asymp; {(item.jatahNpkKg / 50).toFixed(1)} Sak
                      </span>
                    </div>

                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2 text-center">
                      <label className="text-[10px] font-bold text-amber-950 block mb-1">
                        Organik (Kg)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={Math.round(item.jatahOrganikKg)}
                        onChange={(e) =>
                          handleItemChange(index, 'jatahOrganikKg', parseInt(e.target.value) || 0)
                        }
                        className="w-full text-xs font-black text-amber-900 bg-white border border-amber-300 rounded-lg py-1 px-1.5 text-center focus:ring-1 focus:ring-amber-500"
                      />
                      <span className="block text-[9px] text-amber-700 mt-0.5 font-mono">
                        &asymp; {(item.jatahOrganikKg / 40).toFixed(1)} Sak
                      </span>
                    </div>
                  </div>

                  {/* Footer: Total HET & Reset Button */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Biaya HET:</span>
                      <span className="text-xs font-black text-emerald-900 font-mono">
                        Rp {Math.round(biayaHet).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResetKuotaPetani(item)}
                      className="text-[10px] font-bold text-slate-600 hover:text-emerald-700 active:scale-95 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      <span>Reset Dosis</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 border-r text-center w-10">No</th>
                <th className="py-2.5 px-3 border-r min-w-[130px]">Nama Petani</th>
                <th className="py-2.5 px-3 border-r font-mono min-w-[130px]">NIK Petani</th>
                <th className="py-2.5 px-3 border-r text-center min-w-[90px]">Luas Lahan</th>
                <th className="py-2.5 px-3 border-r text-center min-w-[80px]">Komoditas</th>
                <th className="py-2.5 px-3 border-r text-center min-w-[110px] bg-emerald-50 text-emerald-900">
                  Urea (Kg)
                </th>
                <th className="py-2.5 px-3 border-r text-center min-w-[110px] bg-blue-50 text-blue-900">
                  NPK/Phonska (Kg)
                </th>
                <th className="py-2.5 px-3 border-r text-center min-w-[110px] bg-amber-50 text-amber-900">
                  Organik (Kg)
                </th>
                <th className="py-2.5 px-3 border-r text-right min-w-[110px]">Total Biaya HET</th>
                <th className="py-2.5 px-3 text-center min-w-[110px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Memuat data alokasi pupuk...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                    Belum ada petani terdaftar pada kelompok tani ini.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const biayaHet =
                    item.jatahUreaKg * 2250 +
                    item.jatahNpkKg * 2300 +
                    item.jatahOrganikKg * 800;

                  return (
                    <tr key={item.petaniId} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 border-r text-center font-mono">{index + 1}</td>
                      <td className="py-2.5 px-3 border-r font-bold text-slate-900">{item.nama}</td>
                      <td className="py-2.5 px-3 border-r font-mono text-slate-600">{item.nik}</td>
                      <td className="py-2.5 px-3 border-r text-center font-bold text-slate-800">
                        {item.luasHa} Ha
                      </td>
                      <td className="py-2.5 px-3 border-r text-center text-slate-600">
                        {item.komoditas}
                      </td>
                      <td className="py-2 px-3 border-r bg-emerald-50/40 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={Math.round(item.jatahUreaKg)}
                          onChange={(e) =>
                            handleItemChange(index, 'jatahUreaKg', parseInt(e.target.value) || 0)
                          }
                          className="w-24 text-xs font-black text-emerald-800 bg-white border border-emerald-300 rounded-lg px-2 py-1 text-center"
                        />
                        <span className="block text-[9px] text-slate-400 mt-0.5">
                          &asymp; {(item.jatahUreaKg / 50).toFixed(1)} Sak
                        </span>
                      </td>
                      <td className="py-2 px-3 border-r bg-blue-50/40 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={Math.round(item.jatahNpkKg)}
                          onChange={(e) =>
                            handleItemChange(index, 'jatahNpkKg', parseInt(e.target.value) || 0)
                          }
                          className="w-24 text-xs font-black text-blue-800 bg-white border border-blue-300 rounded-lg px-2 py-1 text-center"
                        />
                        <span className="block text-[9px] text-slate-400 mt-0.5">
                          &asymp; {(item.jatahNpkKg / 50).toFixed(1)} Sak
                        </span>
                      </td>
                      <td className="py-2 px-3 border-r bg-amber-50/40 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={Math.round(item.jatahOrganikKg)}
                          onChange={(e) =>
                            handleItemChange(index, 'jatahOrganikKg', parseInt(e.target.value) || 0)
                          }
                          className="w-24 text-xs font-black text-amber-800 bg-white border border-amber-300 rounded-lg px-2 py-1 text-center"
                        />
                        <span className="block text-[9px] text-slate-400 mt-0.5">
                          &asymp; {(item.jatahOrganikKg / 40).toFixed(1)} Sak (@ 40 Kg)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 border-r text-right font-mono font-bold text-slate-900">
                        Rp {Math.round(biayaHet).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                            title="Edit Data Alokasi Petani"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResetKuotaPetani(item)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                            title="Reset ke Kuota Standar Dinas Sesuai Luas Lahan"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAlokasi(item)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition"
                            title="Hapus Petani dari Alokasi e-RDKK Musim Tanam Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td colSpan={3} className="py-2.5 px-3 border-r text-right uppercase">
                  Total Alokasi Kelompok Tani:
                </td>
                <td className="py-2.5 px-3 border-r text-center">
                  {activeTotalLuasHa} Ha
                </td>
                <td className="py-2.5 px-3 border-r text-center">-</td>
                <td className="py-2.5 px-3 border-r text-center text-emerald-800">
                  {Math.round(activeTotalUreaKg).toLocaleString('id-ID')} Kg
                  <span className="block text-[9px] text-slate-500 font-normal">
                    (&asymp; {(activeTotalUreaKg / 50).toFixed(1)} Sak)
                  </span>
                </td>
                <td className="py-2.5 px-3 border-r text-center text-blue-800">
                  {Math.round(activeTotalNpkKg).toLocaleString('id-ID')} Kg
                  <span className="block text-[9px] text-slate-500 font-normal">
                    (&asymp; {(activeTotalNpkKg / 50).toFixed(1)} Sak)
                  </span>
                </td>
                <td className="py-2.5 px-3 border-r text-center text-amber-800">
                  {Math.round(activeTotalOrganikKg).toLocaleString('id-ID')} Kg
                  <span className="block text-[9px] text-slate-500 font-normal">
                    (&asymp; {(activeTotalOrganikKg / 40).toFixed(1)} Sak)
                  </span>
                </td>
                <td className="py-2.5 px-3 border-r text-right font-black text-slate-900">
                  Rp {Math.round(activeTotalBiaya).toLocaleString('id-ID')}
                </td>
                <td className="py-2.5 px-3 text-center text-slate-400 font-normal">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MODAL IMPORT EXCEL ALOKASI e-RDKK */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Import Alokasi e-RDKK dari Excel</h3>
                  <p className="text-xs text-slate-500">Format: NO | NIK | Nama | Urea | NPK/Phonska | Organik</p>
                </div>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Tutup
              </button>
            </div>

            {/* Info Format Kolom */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs space-y-1 text-slate-600">
              <p className="font-bold text-slate-900">Format Kolom Excel Standar:</p>
              <p className="font-mono text-[11px] text-emerald-800 bg-white p-2 rounded-xl border border-slate-200">
                NO | NIK | Nama | Urea | NPK/Phonska | Organik
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                * Sistem mencocokkan NIK petani secara otomatis. Angka kuota akan menyinkronkan data di database.
              </p>
            </div>

            {/* Upload File Input */}
            <form onSubmit={handleUploadExcel} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Pilih File Excel (.xlsx / .xls / .csv):
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer border border-slate-200 rounded-xl p-2"
                  required
                />
              </div>

              {/* Hasil Import */}
              {importResult && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2 text-emerald-900">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    {importResult.message}
                  </div>
                  <p>
                    &bull; Data Petani Tersinkron: <strong>{importResult.successCount}</strong> orang
                  </p>
                  {importResult.notFoundCount > 0 && (
                    <p className="text-amber-800">
                      &bull; Data Petani Tidak Ditemukan: {importResult.notFoundCount} baris
                    </p>
                  )}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Selesai
                </button>
                <button
                  type="submit"
                  disabled={importing || !selectedFile}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold transition shadow-xs"
                >
                  {importing ? 'Memproses Import...' : 'Unggah & Sinkronkan Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT RINCIAN ALOKASI PETANI */}
      {editModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Edit Alokasi e-RDKK Petani
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {editingItem.nama} &bull; NIK: {editingItem.nik}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Komoditas Tanam *</label>
                  <select
                    value={editForm.komoditas}
                    onChange={(e) => setEditForm({ ...editForm, komoditas: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="Padi">Padi</option>
                    <option value="Jagung">Jagung</option>
                    <option value="Kedelai">Kedelai</option>
                    <option value="Tebu">Tebu</option>
                    <option value="Hortikultura">Hortikultura</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Luas Lahan Tanam (Ha) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editForm.luasHa}
                    onChange={(e) => {
                      const newLuas = parseFloat(e.target.value) || 0;
                      setEditForm({ ...editForm, luasHa: newLuas });
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Input Jatah Pupuk */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  Jatah Kuota Pupuk Subsidi (Kg):
                </span>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
                    <label className="font-black text-emerald-900 block text-[11px] mb-1">
                      Urea (Kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={editForm.jatahUreaKg}
                      onChange={(e) =>
                        setEditForm({ ...editForm, jatahUreaKg: parseInt(e.target.value) || 0 })
                      }
                      className="w-full font-black text-emerald-800 bg-white border border-emerald-300 rounded-lg px-2 py-1.5 text-center"
                    />
                    <span className="block text-[10px] text-slate-500 mt-1 text-center">
                      &asymp; {(editForm.jatahUreaKg / 50).toFixed(1)} Sak
                    </span>
                  </div>

                  <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-200">
                    <label className="font-black text-blue-900 block text-[11px] mb-1">
                      NPK (Kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={editForm.jatahNpkKg}
                      onChange={(e) =>
                        setEditForm({ ...editForm, jatahNpkKg: parseInt(e.target.value) || 0 })
                      }
                      className="w-full font-black text-blue-800 bg-white border border-blue-300 rounded-lg px-2 py-1.5 text-center"
                    />
                    <span className="block text-[10px] text-slate-500 mt-1 text-center">
                      &asymp; {(editForm.jatahNpkKg / 50).toFixed(1)} Sak
                    </span>
                  </div>

                  <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200">
                    <label className="font-black text-amber-900 block text-[11px] mb-1">
                      Organik (Kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={editForm.jatahOrganikKg}
                      onChange={(e) =>
                        setEditForm({ ...editForm, jatahOrganikKg: parseInt(e.target.value) || 0 })
                      }
                      className="w-full font-black text-amber-800 bg-white border border-amber-300 rounded-lg px-2 py-1.5 text-center"
                    />
                    <span className="block text-[10px] text-slate-500 mt-1 text-center">
                      &asymp; {(editForm.jatahOrganikKg / 40).toFixed(1)} Sak
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="font-bold text-slate-600">Total Biaya HET:</span>
                  <span className="font-mono font-black text-sm text-slate-900">
                    Rp {(
                      editForm.jatahUreaKg * 2250 +
                      editForm.jatahNpkKg * 2300 +
                      editForm.jatahOrganikKg * 800
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Checkbox Reset Sisa Kuota */}
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  checked={editForm.resetSisa}
                  onChange={(e) => setEditForm({ ...editForm, resetSisa: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-[11px] text-slate-700">
                  <strong>Reset Sisa Kuota Petani</strong> (Jadikan sisa kuota sama penuh dengan jatah baru)
                </span>
              </label>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {actionLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PETANI KE ALOKASI e-RDKK */}
      {tambahModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Tambah Petani ke Alokasi e-RDKK
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedPoktan?.nama} &bull; {musimTanam} {tahun}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTambahModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTambahPetani} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Petani Terdaftar *</label>
                <select
                  value={selectedNewPetaniId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedNewPetaniId(id);
                    const found = petaniCandidates.find((p) => p.id === id);
                    if (found) {
                      const luas = Number(found.totalLuasLahan) || 0.5;
                      setTambahForm({
                        ...tambahForm,
                        luasHa: luas,
                        jatahUreaKg: Math.round(luas * 125),
                        jatahNpkKg: Math.round(luas * 100),
                        jatahOrganikKg: Math.round(luas * 50),
                      });
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                  required
                >
                  <option value="">-- Pilih Petani --</option>
                  {petaniCandidates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} (NIK: {p.nik} - Luas: {p.totalLuasLahan || 0.5} Ha)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Komoditas Tanam *</label>
                  <select
                    value={tambahForm.komoditas}
                    onChange={(e) => setTambahForm({ ...tambahForm, komoditas: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="Padi">Padi</option>
                    <option value="Jagung">Jagung</option>
                    <option value="Kedelai">Kedelai</option>
                    <option value="Tebu">Tebu</option>
                    <option value="Hortikultura">Hortikultura</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Luas Tanam (Ha) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={tambahForm.luasHa}
                    onChange={(e) => {
                      const l = parseFloat(e.target.value) || 0;
                      setTambahForm({
                        ...tambahForm,
                        luasHa: l,
                        jatahUreaKg: Math.round(l * 125),
                        jatahNpkKg: Math.round(l * 100),
                        jatahOrganikKg: Math.round(l * 50),
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Dosis Jatah Pupuk */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  Jatah Kuota Pupuk yang Dialokasikan (Kg):
                </span>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
                    <label className="font-black text-emerald-900 block text-[11px] mb-1">
                      Urea (Kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={tambahForm.jatahUreaKg}
                      onChange={(e) =>
                        setTambahForm({ ...tambahForm, jatahUreaKg: parseInt(e.target.value) || 0 })
                      }
                      className="w-full font-black text-emerald-800 bg-white border border-emerald-300 rounded-lg px-2 py-1.5 text-center"
                    />
                    <span className="block text-[10px] text-slate-500 mt-1 text-center">
                      &asymp; {(tambahForm.jatahUreaKg / 50).toFixed(1)} Sak
                    </span>
                  </div>

                  <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-200">
                    <label className="font-black text-blue-900 block text-[11px] mb-1">
                      NPK (Kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={tambahForm.jatahNpkKg}
                      onChange={(e) =>
                        setTambahForm({ ...tambahForm, jatahNpkKg: parseInt(e.target.value) || 0 })
                      }
                      className="w-full font-black text-blue-800 bg-white border border-blue-300 rounded-lg px-2 py-1.5 text-center"
                    />
                    <span className="block text-[10px] text-slate-500 mt-1 text-center">
                      &asymp; {(tambahForm.jatahNpkKg / 50).toFixed(1)} Sak
                    </span>
                  </div>

                  <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200">
                    <label className="font-black text-amber-900 block text-[11px] mb-1">
                      Organik (Kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={tambahForm.jatahOrganikKg}
                      onChange={(e) =>
                        setTambahForm({ ...tambahForm, jatahOrganikKg: parseInt(e.target.value) || 0 })
                      }
                      className="w-full font-black text-amber-800 bg-white border border-amber-300 rounded-lg px-2 py-1.5 text-center"
                    />
                    <span className="block text-[10px] text-slate-500 mt-1 text-center">
                      &asymp; {(tambahForm.jatahOrganikKg / 40).toFixed(1)} Sak
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="font-bold text-slate-600">Total Biaya HET:</span>
                  <span className="font-mono font-black text-sm text-slate-900">
                    Rp {(
                      tambahForm.jatahUreaKg * 2250 +
                      tambahForm.jatahNpkKg * 2300 +
                      tambahForm.jatahOrganikKg * 800
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTambahModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedNewPetaniId}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {actionLoading ? 'Menambahkan...' : 'Tambahkan ke Alokasi e-RDKK'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
