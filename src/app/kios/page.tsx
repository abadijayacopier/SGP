'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Box,
  PlusCircle,
  SlidersHorizontal,
  FileSpreadsheet,
  Printer,
  Truck,
  RotateCcw,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  X,
  UserCheck,
  FileText,
  Warehouse,
  History,
  Layers,
  Store,
  Plus,
  Building2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { exportStokKiosExcel, exportMutasiStokExcel } from '@/lib/export-excel';
import { generateRecommendedUsernames } from '@/lib/signature-utils';
import {
  showSuccess,
  showError,
  showWarning,
  showConfirm,
  showDeleteConfirm,
  showToast,
} from '@/lib/sweetalert';

interface StokItem {
  id: string;
  namaKios: string;
  jenisPupuk: string;
  stokAwalKg: number;
  stokMasukKg: number;
  stokTersalurKg: number;
  stokSisaKg: number;
  updatedAt: string;
}

interface MutasiItem {
  id: string;
  namaKios: string;
  jenisPupuk: string;
  tipeMutasi: 'MASUK_DISTRIBUTOR' | 'PENYALURAN_PETANI' | 'PENYESUAIAN_OPNAME' | 'DISTRIBUSI_POKTAN';
  jumlahKg: number;
  stokSebelumKg: number;
  stokSesudahKg: number;
  nomorReferensi?: string;
  namaDistributor?: string;
  nomorPolisi?: string;
  namaSupir?: string;
  petugas?: string;
  keterangan?: string;
  tanggal: string;
  createdAt: string;
}

interface SummaryData {
  totalAwalKg: number;
  totalMasukKg: number;
  totalTersalurKg: number;
  totalSisaKg: number;
  persenTersalur: number;
}

interface KiosSummary {
  id: string;
  namaKios: string;
  kodeKios: string;
  pengelola: string;
  username: string;
  phone?: string | null;
  email?: string | null;
  wilayah?: string | null;
  totalSisaKg: number;
}

export default function KiosPage() {
  const { currentUser } = useAuth();

  // Multi-Kios & Switcher State
  const [kiosList, setKiosList] = useState<KiosSummary[]>([]);
  const [selectedKios, setSelectedKios] = useState<string>(
    currentUser?.kiosName || 'UD. Tani Subur Barokah'
  );
  const [showTambahKiosModal, setShowTambahKiosModal] = useState(false);
  const [submittingKios, setSubmittingKios] = useState(false);

  // Form State: Tambah Kios Baru
  const [formTambahKios, setFormTambahKios] = useState({
    namaKios: '',
    kodeKios: 'KPL-LMB-009',
    pengelola: '',
    wilayah: 'Desa Lembeyan Kulon, Kec. Lembeyan',
    phone: '',
    email: '',
    username: '',
    password: '123456',
    stokAwalUreaKg: '15000',
    stokAwalNpkKg: '10000',
    stokAwalOrganikKg: '5000',
  });

  // State Data Gudang
  const [stokList, setStokList] = useState<StokItem[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [mutasiList, setMutasiList] = useState<MutasiItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search Mutasi
  const [filterTipe, setFilterTipe] = useState<string>('SEMUA');
  const [filterPupuk, setFilterPupuk] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showMasukModal, setShowMasukModal] = useState(false);
  const [showOpnameModal, setShowOpnameModal] = useState(false);
  const [showBastModal, setShowBastModal] = useState(false);
  const [selectedMutasiBast, setSelectedMutasiBast] = useState<MutasiItem | null>(null);

  // Form State: Penerimaan Masuk Distributor
  const [formMasuk, setFormMasuk] = useState({
    stokId: '',
    inputUnit: 'KG' as 'KG' | 'SAK',
    jumlahInput: '',
    nomorDo: '',
    namaDistributor: 'PT Pupuk Indonesia Niaga - Lini III',
    nomorPolisi: '',
    namaSupir: '',
    petugas: currentUser?.name || 'Petugas KPL',
    tanggalMasuk: new Date().toISOString().slice(0, 10),
    keterangan: 'Penerimaan pasokan pupuk bersubsidi distributor resmi, sak utuh berlogo resmi.',
  });

  // Form State: Penyesuaian Opname
  const [formOpname, setFormOpname] = useState({
    stokId: '',
    stokFisikBaruKg: '',
    alasan: 'Audit stok fisik rutin berkala gudang',
    petugas: currentUser?.name || 'Petugas KPL',
  });

  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch Daftar Seluruh Kios KPL
  const fetchKiosList = async () => {
    try {
      const res = await fetch('/api/kios');
      const json = await res.json();
      if (json.success && json.data) {
        setKiosList(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchKiosList();
  }, []);

  // Sinkronkan selectedKios saat currentUser berganti
  useEffect(() => {
    if (currentUser?.kiosName) {
      setSelectedKios(currentUser.kiosName);
    }
  }, [currentUser?.kiosName]);

  // Fetch Data Stok & Mutasi untuk Kios Aktif
  const fetchData = async () => {
    try {
      setLoading(true);
      const activeKios = selectedKios || currentUser?.kiosName || 'UD. Tani Subur Barokah';
      const [resStok, resMutasi] = await Promise.all([
        fetch(`/api/kios/stok?namaKios=${encodeURIComponent(activeKios)}`),
        fetch(`/api/kios/mutasi?namaKios=${encodeURIComponent(activeKios)}&limit=100`),
      ]);

      const jsonStok = await resStok.json();
      const jsonMutasi = await resMutasi.json();

      if (jsonStok.success) {
        setStokList(jsonStok.data);
        setSummary(jsonStok.summary);
      }
      if (jsonMutasi.success) {
        setMutasiList(jsonMutasi.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedKios, currentUser?.kiosName]);

  // Update default petugas form jika user berganti
  useEffect(() => {
    if (currentUser?.name) {
      setFormMasuk((prev) => ({ ...prev, petugas: currentUser.name }));
      setFormOpname((prev) => ({ ...prev, petugas: currentUser.name }));
    }
  }, [currentUser]);

  // Handle Submit Masuk DO
  const handleSubmitMasuk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMasuk.stokId) {
      showWarning('Pilih Pupuk', 'Silakan pilih jenis pupuk yang diterima!');
      return;
    }
    const val = parseFloat(formMasuk.jumlahInput);
    if (!val || val <= 0) {
      showWarning('Jumlah Tidak Valid', 'Masukkan jumlah pupuk yang valid!');
      return;
    }

    const jumlahKg = formMasuk.inputUnit === 'SAK' ? val * 50 : val;

    try {
      setSubmitting(true);
      const res = await fetch('/api/kios/masuk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stokId: formMasuk.stokId,
          jumlahKg,
          nomorDo: formMasuk.nomorDo,
          namaDistributor: formMasuk.namaDistributor,
          nomorPolisi: formMasuk.nomorPolisi,
          namaSupir: formMasuk.namaSupir,
          petugas: formMasuk.petugas,
          tanggalMasuk: formMasuk.tanggalMasuk,
          keterangan: formMasuk.keterangan,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showSuccess('Pasokan Diterima', `Berhasil menerima pasokan ${jumlahKg.toLocaleString('id-ID')} Kg dari distributor!`);
        setShowMasukModal(false);
        setFormMasuk({
          stokId: '',
          inputUnit: 'KG',
          jumlahInput: '',
          nomorDo: '',
          namaDistributor: 'PT Pupuk Indonesia Niaga - Lini III',
          nomorPolisi: '',
          namaSupir: '',
          petugas: currentUser?.name || 'Petugas KPL',
          tanggalMasuk: new Date().toISOString().slice(0, 10),
          keterangan: 'Penerimaan pasokan pupuk bersubsidi distributor resmi, sak utuh berlogo resmi.',
        });
        fetchData();
      } else {
        showError('Gagal Menerima Pasokan', json.error);
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Submit Opname
  const handleSubmitOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOpname.stokId) {
      showWarning('Pilih Pupuk', 'Silakan pilih jenis pupuk untuk disesuaikan!');
      return;
    }
    const fisik = parseFloat(formOpname.stokFisikBaruKg);
    if (isNaN(fisik) || fisik < 0) {
      showWarning('Jumlah Tidak Valid', 'Masukkan jumlah stok fisik yang valid!');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/kios/stok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stokId: formOpname.stokId,
          stokFisikBaruKg: fisik,
          alasan: formOpname.alasan,
          petugas: formOpname.petugas,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showSuccess('Opname Tersimpan', `Penyesuaian stok opname berhasil disimpan! (Selisih: ${json.selisihKg >= 0 ? '+' : ''}${json.selisihKg} Kg)`);
        setShowOpnameModal(false);
        setFormOpname({
          stokId: '',
          stokFisikBaruKg: '',
          alasan: 'Audit stok fisik rutin berkala gudang',
          petugas: currentUser?.name || 'Petugas KPL',
        });
        fetchData();
      } else {
        showError('Gagal Opname', json.error);
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Tambah Kios Baru
  const handleTambahKios = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTambahKios.namaKios.trim()) {
      showWarning('Form Belum Lengkap', 'Nama Kios / Usaha Dagang wajib diisi!');
      return;
    }
    if (!formTambahKios.pengelola.trim()) {
      showWarning('Form Belum Lengkap', 'Nama Penanggung Jawab Kios wajib diisi!');
      return;
    }
    if (!formTambahKios.username.trim()) {
      showWarning('Form Belum Lengkap', 'Username login akun Kios wajib diisi!');
      return;
    }

    try {
      setSubmittingKios(true);
      const res = await fetch('/api/kios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formTambahKios),
      });

      const json = await res.json();
      if (json.success) {
        showSuccess('Kios Terdaftar', json.message || `Kios KPL "${formTambahKios.namaKios}" berhasil didaftarkan!`);
        setShowTambahKiosModal(false);
        const newKiosName = formTambahKios.namaKios.trim();
        await fetchKiosList();
        setSelectedKios(newKiosName);
        setFormTambahKios({
          namaKios: '',
          kodeKios: 'KPL-LMB-009',
          pengelola: '',
          wilayah: 'Desa Lembeyan Kulon, Kec. Lembeyan',
          phone: '',
          email: '',
          username: '',
          password: '123456',
          stokAwalUreaKg: '15000',
          stokAwalNpkKg: '10000',
          stokAwalOrganikKg: '5000',
        });
      } else {
        showError('Gagal Mendaftarkan Kios', json.error);
      }
    } catch (err: any) {
      showError('Gagal Koneksi', err.message || 'Terjadi kesalahan jaringan saat mendaftarkan kios baru');
    } finally {
      setSubmittingKios(false);
    }
  };

  // Filter Mutasi
  const filteredMutasi = mutasiList.filter((m) => {
    const matchTipe = filterTipe === 'SEMUA' || m.tipeMutasi === filterTipe;
    const matchPupuk = filterPupuk === 'SEMUA' || m.jenisPupuk.toLowerCase().includes(filterPupuk.toLowerCase());
    const matchSearch =
      searchQuery === '' ||
      m.nomorReferensi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.namaDistributor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.keterangan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.petugas?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchTipe && matchPupuk && matchSearch;
  });

  const openBast = (mutasi: MutasiItem) => {
    setSelectedMutasiBast(mutasi);
    setShowBastModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
      {/* Toast Notifikasi */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs sm:text-sm font-semibold transition animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-300">
              Kios Pupuk Lengkap (KPL) Terverifikasi
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full border border-blue-300">
              Lini IV - Pupuk Indonesia
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 flex items-center gap-2.5">
            <Warehouse className="w-7 h-7 text-emerald-600" />
            Manajemen Stok & Mutasi Pupuk KPL
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitoring fisik gudang, pencatatan pasokan delivery order (DO) distributor, dan pembukuan mutasi penebusan otomatis.
          </p>
        </div>

        {/* Action Buttons Top */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => exportStokKiosExcel(stokList)}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-2xs transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Stok Excel</span>
          </button>

          <button
            onClick={() => setShowOpnameModal(true)}
            className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-2xs transition"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-700" />
            <span>Penyesuaian Opname</span>
          </button>

          <button
            onClick={() => setShowMasukModal(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Truck className="w-4 h-4 text-emerald-200" />
            <span>+ Catat Pasokan Masuk (DO)</span>
          </button>

          <Link
            href="/distribusi"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <FileText className="w-4 h-4 text-blue-200" />
            <span>+ Kirim ke Poktan (Surat Jalan)</span>
          </Link>

          {currentUser?.role === 'ADMIN_DINAS' && (
            <button
              onClick={() => {
                const nextNum = (kiosList.length + 8).toString().padStart(3, '0');
                setFormTambahKios({
                  namaKios: '',
                  kodeKios: `KPL-LMB-${nextNum}`,
                  pengelola: '',
                  wilayah: 'Desa Lembeyan Kulon, Kec. Lembeyan',
                  phone: '',
                  email: '',
                  username: '',
                  password: '123456',
                  stokAwalUreaKg: '15000',
                  stokAwalNpkKg: '10000',
                  stokAwalOrganikKg: '5000',
                });
                setShowTambahKiosModal(true);
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4 text-amber-200" />
              <span>+ Tambah Kios / KPL Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* KIOS SELECTOR & MULTI-KIOS SWITCHER */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs space-y-2.5 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-black text-slate-800">
              Pilih Kios Pengecer Lengkap (KPL) Aktif:
            </span>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
              {kiosList.length || 1} KPL Terdaftar
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Pilih KPL untuk memonitor fisik gudang, DO masuk, dan audit opname.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {kiosList.map((k) => {
            const isSelected = (selectedKios || currentUser?.kiosName) === k.namaKios;
            return (
              <button
                key={k.id || k.namaKios}
                type="button"
                onClick={() => setSelectedKios(k.namaKios)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                  isSelected
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs ring-2 ring-emerald-300'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Warehouse className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-slate-400'}`} />
                <span>{k.namaKios}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isSelected ? 'bg-emerald-900/60 text-emerald-100' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {k.kodeKios || 'KPL'}
                </span>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* INFO BANNER KIOS */}
      {(() => {
        const activeKios = selectedKios || currentUser?.kiosName || 'UD. Tani Subur Barokah';
        const activeKiosObj = kiosList.find((k) => k.namaKios === activeKios);
        const displayKode = activeKiosObj?.kodeKios || 'KPL-LMB-008';
        const displayWilayah = activeKiosObj?.wilayah || 'Wilayah Kecamatan Lembeyan';
        const displayPengelola = activeKiosObj?.pengelola || currentUser?.name || 'Petugas KPL';

        return (
          <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 rounded-3xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 bg-emerald-800/80 text-emerald-200 text-[11px] font-semibold px-3 py-1 rounded-full border border-emerald-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Kode KPL Resmi: {displayKode} &bull; {displayWilayah}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  {activeKios}
                </h2>
                <p className="text-xs text-emerald-200/80 leading-relaxed max-w-2xl">
                  Wilayah Distribusi: {displayWilayah} &bull; Pengelola / Penanggung Jawab:{' '}
                  <span className="text-white font-bold">{displayPengelola}</span>
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 text-center">
                  <div className="text-[10px] text-emerald-300 font-semibold uppercase">Status KPL</div>
                  <div className="text-sm font-black text-white flex items-center gap-1.5 justify-center mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Aktif & Valid
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 text-center">
                  <div className="text-[10px] text-emerald-300 font-semibold uppercase">Musim Tanam</div>
                  <div className="text-sm font-black text-white mt-0.5">MT 1 (Walikan) 2026</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SUMMARY STATS GRID */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Stok Tersedia</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Warehouse className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {summary.totalSisaKg.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-bold text-slate-500">Kg</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Setara &plusmn; {Math.round(summary.totalSisaKg / 50).toLocaleString('id-ID')} Sak (50 Kg)
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pasokan Masuk (DO)</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-800 mt-2">
              +{summary.totalMasukKg.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-bold text-slate-500">Kg</span>
            </div>
            <p className="text-[11px] text-blue-600 font-medium">Dari distributor resmi musim ini</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Tersalur ke Petani</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-purple-800 mt-2">
              {summary.totalTersalurKg.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-bold text-slate-500">Kg</span>
            </div>
            <p className="text-[11px] text-purple-600 font-medium">Penebusan kuota e-RDKK</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Tingkat Penyerapan</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-800 mt-2">
              {summary.persenTersalur}%
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${summary.persenTersalur}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* STOCK PER JENIS PUPUK CARDS */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Box className="w-5 h-5 text-emerald-600" />
              Rincian Stok Pupuk Fisik Gudang
            </h2>
            <p className="text-xs text-slate-500">
              Rasio ketersediaan stok fisik terhadap alokasi masuk dan penebusan petani.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stokList.map((item) => {
            const totalAlokasi = item.stokAwalKg + item.stokMasukKg;
            const persenTersalur = totalAlokasi > 0 ? Math.round((item.stokTersalurKg / totalAlokasi) * 100) : 0;
            const isUrea = item.jenisPupuk.toLowerCase().includes('urea');
            const isNpk = item.jenisPupuk.toLowerCase().includes('npk');
            const isOrganik = item.jenisPupuk.toLowerCase().includes('organik');

            const themeColor = isUrea
              ? 'border-emerald-200 bg-emerald-500 text-emerald-700'
              : isNpk
              ? 'border-amber-200 bg-amber-500 text-amber-700'
              : 'border-teal-200 bg-teal-500 text-teal-700';

            const badgeBg = isUrea ? 'bg-emerald-50 text-emerald-800' : isNpk ? 'bg-amber-50 text-amber-800' : 'bg-teal-50 text-teal-800';

            const isLowStock = item.stokSisaKg < 8000;

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition p-6 space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-slate-200 ${badgeBg}`}>
                      {isUrea ? 'Pupuk Makro Utama' : isNpk ? 'Pupuk Majemuk NPK' : 'Pembenah Tanah'}
                    </span>
                    {isLowStock ? (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-300">
                        <AlertCircle className="w-3 h-3 text-amber-600" /> Siaga Stok
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Stok Aman
                      </span>
                    )}
                  </div>

                  <h3 className="font-black text-slate-900 text-base mt-2.5">{item.jenisPupuk}</h3>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">
                      {item.stokSisaKg.toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs font-bold text-slate-500">Kg Sisa Fisik</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    &asymp; {Math.round(item.stokSisaKg / 50).toLocaleString('id-ID')} Sak (Kemasan 50 Kg)
                  </p>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">Tersalurkan ke Petani</span>
                      <span className="text-slate-900">{persenTersalur}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          isUrea ? 'bg-emerald-600' : isNpk ? 'bg-amber-500' : 'bg-teal-600'
                        }`}
                        style={{ width: `${persenTersalur}%` }}
                      />
                    </div>
                  </div>

                  {/* 3 Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-semibold">Stok Awal</span>
                      <strong className="text-xs text-slate-800">
                        {(item.stokAwalKg / 1000).toFixed(1)} <span className="text-[10px] text-slate-500">Ton</span>
                      </strong>
                    </div>
                    <div className="bg-blue-50/50 p-2 rounded-2xl border border-blue-100">
                      <span className="text-[10px] text-blue-500 block font-semibold">Pasokan (DO)</span>
                      <strong className="text-xs text-blue-900">
                        +{(item.stokMasukKg / 1000).toFixed(1)} <span className="text-[10px] text-blue-500">Ton</span>
                      </strong>
                    </div>
                    <div className="bg-emerald-50/50 p-2 rounded-2xl border border-emerald-100">
                      <span className="text-[10px] text-emerald-600 block font-semibold">Tersalur</span>
                      <strong className="text-xs text-emerald-900">
                        {(item.stokTersalurKg / 1000).toFixed(1)} <span className="text-[10px] text-emerald-600">Ton</span>
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi Cepat pada Card */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setFormMasuk((prev) => ({ ...prev, stokId: item.id }));
                      setShowMasukModal(true);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-xl transition shadow-2xs"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    + Pasokan DO
                  </button>
                  <button
                    onClick={() => {
                      setFormOpname((prev) => ({
                        ...prev,
                        stokId: item.id,
                        stokFisikBaruKg: String(item.stokSisaKg),
                      }));
                      setShowOpnameModal(true);
                    }}
                    className="inline-flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition"
                    title="Penyesuaian Opname"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Opname</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION KARTU KENDALI & RIWAYAT MUTASI STOK */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              Kartu Kendali Mutasi Stok Kios (Buku Induk Logistik)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Riwayat kronologis seluruh aliran pupuk: penerimaan DO distributor, penebusan resmi oleh petani, dan penyesuaian opname.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => exportMutasiStokExcel(filteredMutasi)}
              className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-2 rounded-xl transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Unduh Excel Kartu Mutasi</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Tabs Tipe Mutasi */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'SEMUA', label: 'Semua Aliran' },
              { id: 'MASUK_DISTRIBUTOR', label: 'Pasokan DO Masuk' },
              { id: 'DISTRIBUSI_POKTAN', label: 'Distribusi ke Poktan' },
              { id: 'PENYALURAN_PETANI', label: 'Penyaluran Petani' },
              { id: 'PENYESUAIAN_OPNAME', label: 'Stock Opname' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTipe(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                  filterTipe === tab.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Pupuk */}
            <select
              value={filterPupuk}
              onChange={(e) => setFilterPupuk(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
            >
              <option value="SEMUA">Semua Jenis Pupuk</option>
              <option value="Urea">Urea Bersubsidi</option>
              <option value="NPK">NPK Phonska</option>
              <option value="Organik">Pupuk Organik</option>
            </select>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari No. DO / Nota..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 w-44 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Mobile Card View (Smartphone Friendly) */}
        <div className="block lg:hidden divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">Memuat data mutasi stok...</div>
          ) : filteredMutasi.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs italic">
              Belum ada riwayat mutasi yang sesuai filter.
            </div>
          ) : (
            filteredMutasi.map((item) => {
              const isMasuk = item.tipeMutasi === 'MASUK_DISTRIBUTOR';
              const isDistribusi = item.tipeMutasi === 'DISTRIBUSI_POKTAN';
              const isKeluar = item.tipeMutasi === 'PENYALURAN_PETANI';
              const isOpname = item.tipeMutasi === 'PENYESUAIAN_OPNAME';

              return (
                <div key={item.id} className="p-4 hover:bg-slate-50/80 transition space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {isMasuk && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                          <Truck className="w-3 h-3 text-blue-600" />
                          DO Masuk Pasokan
                        </span>
                      )}
                      {isDistribusi && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                          <Truck className="w-3 h-3 text-amber-600" />
                          Kirim ke Poktan
                        </span>
                      )}
                      {isKeluar && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                          <ArrowUpRight className="w-3 h-3 text-purple-600" />
                          Penyaluran Petani
                        </span>
                      )}
                      {isOpname && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                          <SlidersHorizontal className="w-3 h-3 text-amber-600" />
                          Stock Opname
                        </span>
                      )}
                      <h4 className="font-black text-slate-900 text-sm mt-1 leading-tight">
                        {item.jenisPupuk}
                      </h4>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black block">
                        {isMasuk && <span className="text-blue-700">+{item.jumlahKg.toLocaleString('id-ID')} Kg</span>}
                        {isDistribusi && <span className="text-amber-700">-{item.jumlahKg.toLocaleString('id-ID')} Kg</span>}
                        {isKeluar && <span className="text-purple-700">-{item.jumlahKg.toLocaleString('id-ID')} Kg</span>}
                        {isOpname && <span className="text-amber-700">&plusmn;{item.jumlahKg.toLocaleString('id-ID')} Kg</span>}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.stokSebelumKg.toLocaleString('id-ID')} &rarr; {item.stokSesudahKg.toLocaleString('id-ID')} Kg
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span>📅 {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span>&bull;</span>
                    <span className="font-mono">Ref: {item.nomorReferensi || '-'}</span>
                    {item.namaDistributor && <span>&bull; {item.namaDistributor}</span>}
                  </div>

                  {item.keterangan && (
                    <p className="text-[11px] text-slate-500 italic leading-snug">
                      &quot;{item.keterangan}&quot;
                    </p>
                  )}

                  {/* Tombol Aksi Dokumen Mobile */}
                  <div className="pt-2 border-t border-slate-100">
                    {isMasuk ? (
                      <button
                        type="button"
                        onClick={() => openBast(item)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs active:scale-95 transition"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Cetak Berita Acara DO</span>
                      </button>
                    ) : isDistribusi ? (
                      <Link
                        href="/distribusi"
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs active:scale-95 transition"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>Lihat Surat Jalan Distribusi</span>
                      </Link>
                    ) : isKeluar ? (
                      <Link
                        href={item.nomorReferensi ? `/cetak-nota/${item.nomorReferensi}` : '/penyaluran'}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs active:scale-95 transition"
                      >
                        <FileText className="w-3.5 h-3.5 text-purple-600" />
                        <span>Cetak Nota Penyaluran</span>
                      </Link>
                    ) : (
                      <span className="text-slate-400 text-xs italic block text-center py-1">Pencatatan Internal KPL</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3.5">Waktu / Tanggal</th>
                <th className="py-3 px-3.5">Tipe Mutasi</th>
                <th className="py-3 px-3.5">Jenis Pupuk</th>
                <th className="py-3 px-3.5">No. Referensi (DO / Nota)</th>
                <th className="py-3 px-3.5 text-right">Volume (Kg)</th>
                <th className="py-3 px-3.5 text-right">Stok Sebelum &rarr; Sesudah</th>
                <th className="py-3 px-3.5">Keterangan & Petugas</th>
                <th className="py-3 px-3.5 text-center">Aksi Dokumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Memuat data mutasi stok...
                  </td>
                </tr>
              ) : filteredMutasi.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Belum ada riwayat mutasi yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredMutasi.map((item) => {
                  const isMasuk = item.tipeMutasi === 'MASUK_DISTRIBUTOR';
                  const isDistribusi = item.tipeMutasi === 'DISTRIBUSI_POKTAN';
                  const isKeluar = item.tipeMutasi === 'PENYALURAN_PETANI';
                  const isOpname = item.tipeMutasi === 'PENYESUAIAN_OPNAME';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 font-medium">
                        {new Date(item.tanggal).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        <span className="block text-[10px] text-slate-400">
                          {new Date(item.tanggal).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })} WIB
                        </span>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {isMasuk && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                            <Truck className="w-3 h-3 text-blue-600" />
                            DO Masuk
                          </span>
                        )}
                        {isDistribusi && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                            <Truck className="w-3 h-3 text-amber-600" />
                            Kirim Poktan
                          </span>
                        )}
                        {isKeluar && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                            <ArrowUpRight className="w-3 h-3 text-purple-600" />
                            Penyaluran Petani
                          </span>
                        )}
                        {isOpname && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                            <SlidersHorizontal className="w-3 h-3 text-amber-600" />
                            Stock Opname
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap font-bold text-slate-800">
                        {item.jenisPupuk}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap font-mono font-bold text-slate-700">
                        {item.nomorReferensi || '-'}
                        {item.namaDistributor && (
                          <span className="block text-[10px] font-sans text-slate-500 font-normal">
                            {item.namaDistributor}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap text-right font-black">
                        {isMasuk && (
                          <span className="text-blue-700">+{item.jumlahKg.toLocaleString('id-ID')} Kg</span>
                        )}
                        {isDistribusi && (
                          <span className="text-amber-700">-{item.jumlahKg.toLocaleString('id-ID')} Kg</span>
                        )}
                        {isKeluar && (
                          <span className="text-purple-700">-{item.jumlahKg.toLocaleString('id-ID')} Kg</span>
                        )}
                        {isOpname && (
                          <span className="text-amber-700">&plusmn;{item.jumlahKg.toLocaleString('id-ID')} Kg</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap text-right font-mono text-[11px] text-slate-600">
                        {item.stokSebelumKg.toLocaleString('id-ID')} &rarr;{' '}
                        <strong className="text-slate-900">{item.stokSesudahKg.toLocaleString('id-ID')}</strong> Kg
                      </td>

                      <td className="py-3 px-3.5 text-slate-600 max-w-xs">
                        <p className="line-clamp-1">{item.keterangan || '-'}</p>
                        <span className="text-[10px] text-slate-400">Petugas: {item.petugas || '-'}</span>
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {isMasuk ? (
                          <button
                            onClick={() => openBast(item)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg transition"
                          >
                            <FileText className="w-3 h-3 text-emerald-600" />
                            Berita Acara DO
                          </button>
                        ) : isDistribusi ? (
                          <Link
                            href="/distribusi"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg transition"
                          >
                            <FileText className="w-3 h-3 text-amber-600" />
                            Surat Jalan
                          </Link>
                        ) : isKeluar ? (
                          <Link
                            href={item.nomorReferensi ? `/cetak-nota/${item.nomorReferensi}` : '/penyaluran'}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-1 rounded-lg transition"
                          >
                            <FileText className="w-3 h-3 text-purple-600" />
                            Cetak Nota
                          </Link>
                        ) : (
                          <span className="text-slate-300 text-[10px] italic">Internal</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: FORM TERIMA PASOKAN DISTRIBUTOR (DELIVERY ORDER - DO) */}
      {/* ========================================================================= */}
      {showMasukModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  Pencatatan Pasokan Masuk Distributor (DO)
                </h3>
                <p className="text-xs text-slate-500">
                  Masukkan data Surat Jalan / Delivery Order resmi dari Distributor Pupuk Indonesia.
                </p>
              </div>
              <button
                onClick={() => setShowMasukModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitMasuk} className="space-y-4 text-xs">
              {/* Pilih Jenis Pupuk */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jenis Pupuk Bersubsidi <span className="text-red-500">*</span>
                </label>
                <select
                  value={formMasuk.stokId}
                  onChange={(e) => setFormMasuk({ ...formMasuk, stokId: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Jenis Pupuk --</option>
                  {stokList.map((stok) => (
                    <option key={stok.id} value={stok.id}>
                      {stok.jenisPupuk} (Sisa saat ini: {stok.stokSisaKg.toLocaleString('id-ID')} Kg)
                    </option>
                  ))}
                </select>
              </div>

              {/* Jumlah Masuk (Kg / Sak) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Satuan Input
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormMasuk({ ...formMasuk, inputUnit: 'KG' })}
                      className={`flex-1 py-2 font-bold rounded-xl border text-center transition ${
                        formMasuk.inputUnit === 'KG'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Kilogram (Kg)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormMasuk({ ...formMasuk, inputUnit: 'SAK' })}
                      className={`flex-1 py-2 font-bold rounded-xl border text-center transition ${
                        formMasuk.inputUnit === 'SAK'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Sak (50 Kg)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Volume Masuk {formMasuk.inputUnit === 'SAK' ? '(Sak)' : '(Kg)'}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder={formMasuk.inputUnit === 'SAK' ? 'Contoh: 100 Sak' : 'Contoh: 5000 Kg'}
                    value={formMasuk.jumlahInput}
                    onChange={(e) => setFormMasuk({ ...formMasuk, jumlahInput: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                  {formMasuk.inputUnit === 'SAK' && formMasuk.jumlahInput && (
                    <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                      &asymp; {(parseFloat(formMasuk.jumlahInput) * 50 || 0).toLocaleString('id-ID')} Kg
                    </span>
                  )}
                </div>
              </div>

              {/* No DO & Nama Distributor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    No. Delivery Order (DO) / Surat Jalan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: DO-PIN-2026-0099"
                    value={formMasuk.nomorDo}
                    onChange={(e) => setFormMasuk({ ...formMasuk, nomorDo: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Distributor Pengirim
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Distributor Resmi"
                    value={formMasuk.namaDistributor}
                    onChange={(e) => setFormMasuk({ ...formMasuk, namaDistributor: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* No Polisi & Supir */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    No. Polisi Armada Truk
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: P 8923 UJ"
                    value={formMasuk.nomorPolisi}
                    onChange={(e) => setFormMasuk({ ...formMasuk, nomorPolisi: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl font-mono uppercase focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Driver / Supir Truk
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Supir"
                    value={formMasuk.namaSupir}
                    onChange={(e) => setFormMasuk({ ...formMasuk, namaSupir: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Tanggal & Petugas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tanggal Penerimaan Fisik
                  </label>
                  <input
                    type="date"
                    value={formMasuk.tanggalMasuk}
                    onChange={(e) => setFormMasuk({ ...formMasuk, tanggalMasuk: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Petugas Penerima Gudang Kios
                  </label>
                  <input
                    type="text"
                    value={formMasuk.petugas}
                    onChange={(e) => setFormMasuk({ ...formMasuk, petugas: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan / Kondisi Fisik Sak
                </label>
                <textarea
                  rows={2}
                  value={formMasuk.keterangan}
                  onChange={(e) => setFormMasuk({ ...formMasuk, keterangan: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Tombol Aksi */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMasukModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? 'Menyimpan...' : 'Simpan & Tambah Stok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: FORM PENYESUAIAN STOCK OPNAME */}
      {/* ========================================================================= */}
      {showOpnameModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-amber-600" />
                  Penyesuaian Stok Gudang (Stock Opname)
                </h3>
                <p className="text-xs text-slate-500">
                  Sinkronisasi selisih fisik riil hasil inventarisasi fisik di gudang dengan catatan sistem.
                </p>
              </div>
              <button
                onClick={() => setShowOpnameModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitOpname} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pilih Pupuk yang Di-Opname <span className="text-red-500">*</span>
                </label>
                <select
                  value={formOpname.stokId}
                  onChange={(e) => {
                    const selected = stokList.find((s) => s.id === e.target.value);
                    setFormOpname({
                      ...formOpname,
                      stokId: e.target.value,
                      stokFisikBaruKg: selected ? String(selected.stokSisaKg) : '',
                    });
                  }}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Pilih Pupuk --</option>
                  {stokList.map((stok) => (
                    <option key={stok.id} value={stok.id}>
                      {stok.jenisPupuk}
                    </option>
                  ))}
                </select>
              </div>

              {formOpname.stokId && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                  {(() => {
                    const item = stokList.find((s) => s.id === formOpname.stokId);
                    const stokSistem = item ? item.stokSisaKg : 0;
                    const stokFisik = parseFloat(formOpname.stokFisikBaruKg) || 0;
                    const selisih = stokFisik - stokSistem;

                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Stok Tercatat Sistem:</span>
                          <span className="font-bold text-slate-900">{stokSistem.toLocaleString('id-ID')} Kg</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                          <span className="text-slate-500">Selisih Opname (Fisik - Sistem):</span>
                          <span
                            className={`font-black text-sm ${
                              selisih === 0
                                ? 'text-slate-600'
                                : selisih > 0
                                ? 'text-emerald-700'
                                : 'text-red-700'
                            }`}
                          >
                            {selisih >= 0 ? `+${selisih}` : selisih} Kg
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Stok Fisik Riil Terhitung (Kg) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Masukkan jumlah fisik aktual hasil hitung..."
                  value={formOpname.stokFisikBaruKg}
                  onChange={(e) => setFormOpname({ ...formOpname, stokFisikBaruKg: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-black text-base text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alasan Penyesuaian / Hasil Berita Acara <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formOpname.alasan}
                  onChange={(e) => setFormOpname({ ...formOpname, alasan: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Petugas Pemeriksa / Auditor
                </label>
                <input
                  type="text"
                  value={formOpname.petugas}
                  onChange={(e) => setFormOpname({ ...formOpname, petugas: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowOpnameModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? 'Menyimpan...' : 'Simpan Opname'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PREVIEW BERITA ACARA SERAH TERIMA DO (SIAP CETAK) */}
      {/* ========================================================================= */}
      {showBastModal && selectedMutasiBast && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 print:p-0 print:border-none print:shadow-none">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 no-print">
              <h3 className="font-bold text-slate-900 text-sm">
                Berita Acara Serah Terima Pasokan Pupuk (BAST-DO)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  Cetak / PDF
                </button>
                <button
                  onClick={() => setShowBastModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* LEMBAR BAST RESMI */}
            <div className="border border-slate-300 rounded-2xl p-6 bg-white space-y-4 text-xs text-slate-800">
              <div className="border-b-2 border-slate-900 pb-3 text-center">
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-600">
                  PT PUPUK INDONESIA (PERSERO) &bull; WILAYAH DISTRIBUSI JAWA TIMUR
                </h4>
                <h3 className="font-black text-sm uppercase text-slate-900 mt-0.5">
                  BERITA ACARA SERAH TERIMA PASOKAN PUPUK BERSUBSIDI (BAST-DO)
                </h3>
                <p className="font-mono text-[11px] font-bold text-emerald-800 mt-1">
                  Nomor Referensi: {selectedMutasiBast.nomorReferensi || 'DO-PIN-2026-XXXX'}
                </p>
              </div>

              <p className="leading-relaxed text-slate-600">
                Pada hari ini, <strong className="text-slate-900">{new Date(selectedMutasiBast.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>, telah dilakukan serah terima pasokan pupuk bersubsidi dengan rincian sebagai berikut:
              </p>

              <table className="w-full text-xs border border-slate-200">
                <tbody>
                  <tr className="border-b">
                    <td className="py-1.5 px-3 font-semibold text-slate-600 w-40 bg-slate-50">Nama Kios Penerima</td>
                    <td className="py-1.5 px-3 font-bold text-slate-900">{selectedMutasiBast.namaKios}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 px-3 font-semibold text-slate-600 bg-slate-50">Distributor Pengirim</td>
                    <td className="py-1.5 px-3 text-slate-800">{selectedMutasiBast.namaDistributor || 'PT Pupuk Indonesia Niaga'}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 px-3 font-semibold text-slate-600 bg-slate-50">Komoditas / Jenis Pupuk</td>
                    <td className="py-1.5 px-3 font-bold text-emerald-800">{selectedMutasiBast.jenisPupuk}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 px-3 font-semibold text-slate-600 bg-slate-50">Volume Diterima Fisik</td>
                    <td className="py-1.5 px-3 font-black text-slate-900">
                      {selectedMutasiBast.jumlahKg.toLocaleString('id-ID')} Kg{' '}
                      <span className="font-normal text-slate-500">
                        (&plusmn; {Math.round(selectedMutasiBast.jumlahKg / 50)} Sak @ 50 Kg)
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 px-3 font-semibold text-slate-600 bg-slate-50">Armada Truk / No. Polisi</td>
                    <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{selectedMutasiBast.nomorPolisi || '-'}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 px-3 font-semibold text-slate-600 bg-slate-50">Driver / Supir</td>
                    <td className="py-1.5 px-3 text-slate-800">{selectedMutasiBast.namaSupir || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-semibold text-slate-600 bg-slate-50">Kondisi & Catatan</td>
                    <td className="py-1.5 px-3 text-slate-700 italic">{selectedMutasiBast.keterangan || 'Kondisi kemasan utuh berlabel SNI dan segel resmi.'}</td>
                  </tr>
                </tbody>
              </table>

              {/* Tanda Tangan */}
              <div className="pt-4 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <p className="font-semibold text-slate-600">Pihak Pengirim (Distributor / Supir),</p>
                  <div className="h-16" />
                  <p className="font-bold text-slate-900 underline uppercase">{selectedMutasiBast.namaSupir || 'Supir Ekspedisi'}</p>
                  <p className="text-[10px] text-slate-400">Armada {selectedMutasiBast.nomorPolisi || 'Truk'}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-600">Pihak Penerima (Pengelola Kios KPL),</p>
                  <div className="h-16" />
                  <p className="font-bold text-slate-900 underline uppercase">
                    {currentUser?.role === 'KIOS'
                      ? currentUser.name
                      : selectedMutasiBast.petugas || 'Hj. Siti Romlah'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {currentUser?.kiosName || 'UD. Tani Subur Barokah'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: TAMBAH KIOS / KPL BARU */}
      {showTambahKiosModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black">Daftarkan Kios Pupuk Lengkap (KPL) Baru</h3>
                  <p className="text-xs text-amber-100">
                    Registrasi KPL resmi, akun petugas kasir gudang, serta alokasi stok pupuk bersubsidi awal MT-1
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTambahKiosModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleTambahKios} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
              {/* Bagian 1: Identitas Kios */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b pb-1.5">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  1. Identitas Usaha Dagang (UD) / Kios Resmi
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Nama UD / Kios Resmi KPL *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTambahKios.namaKios}
                      onChange={(e) => {
                        const val = e.target.value;
                        const recUsernames = generateRecommendedUsernames(val, 'KIOS');
                        setFormTambahKios((prev) => ({
                          ...prev,
                          namaKios: val,
                          username: prev.username || (recUsernames[0] || ''),
                        }));
                      }}
                      placeholder="Contoh: UD. Sumber Makmur Barokah"
                      className="w-full bg-white border border-slate-300 focus:border-amber-600 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Kode KPL Resmi *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTambahKios.kodeKios}
                      onChange={(e) => setFormTambahKios({ ...formTambahKios, kodeKios: e.target.value })}
                      placeholder="Contoh: KPL-LMB-009"
                      className="w-full bg-white border border-slate-300 focus:border-amber-600 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Wilayah Lokasi / Domisili Desa Kios *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTambahKios.wilayah}
                    onChange={(e) => setFormTambahKios({ ...formTambahKios, wilayah: e.target.value })}
                    placeholder="Contoh: Desa Lembeyan Kulon, Kec. Lembeyan"
                    className="w-full bg-white border border-slate-300 focus:border-amber-600 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Bagian 2: Pengelola & Akun Login */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b pb-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  2. Pengelola & Akun Login Petugas Kasir
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Nama Penanggung Jawab / Pengelola *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTambahKios.pengelola}
                      onChange={(e) => setFormTambahKios({ ...formTambahKios, pengelola: e.target.value })}
                      placeholder="Contoh: H. Mulyadi Santoso"
                      className="w-full bg-white border border-slate-300 focus:border-amber-600 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Nomor WhatsApp / HP *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTambahKios.phone}
                      onChange={(e) => setFormTambahKios({ ...formTambahKios, phone: e.target.value })}
                      placeholder="Contoh: 081234567890"
                      className="w-full bg-white border border-slate-300 focus:border-amber-600 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Username Login Akun *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTambahKios.username}
                      onChange={(e) => setFormTambahKios({ ...formTambahKios, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      placeholder="Contoh: kios_sumbermakmur"
                      className="w-full bg-white border border-slate-300 focus:border-amber-600 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none"
                    />
                    {formTambahKios.namaKios && (
                      <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                        <span className="text-[10px] text-slate-400">Saran:</span>
                        {generateRecommendedUsernames(formTambahKios.namaKios, 'KIOS').map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setFormTambahKios({ ...formTambahKios, username: s })}
                            className="text-[10px] bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 font-mono px-1.5 py-0.5 rounded border border-slate-200"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Kata Sandi Default
                    </label>
                    <input
                      type="text"
                      value={formTambahKios.password}
                      onChange={(e) => setFormTambahKios({ ...formTambahKios, password: e.target.value })}
                      placeholder="123456"
                      className="w-full bg-white border border-slate-300 focus:border-amber-600 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Standar: 123456 (dapat diubah nanti oleh pengelola)</p>
                  </div>
                </div>
              </div>

              {/* Bagian 3: Stok Fisik Awal Musim Tanam MT-1 */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Box className="w-4 h-4 text-blue-600" />
                    3. Alokasi Stok Pupuk Awal MT 1 (Walikan 2026)
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Otomatis Tercatat Opname
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-2xl space-y-1">
                    <label className="block font-bold text-emerald-900 text-xs">Urea Bersubsidi</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={formTambahKios.stokAwalUreaKg}
                        onChange={(e) => setFormTambahKios({ ...formTambahKios, stokAwalUreaKg: e.target.value })}
                        className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none"
                      />
                      <span className="text-[10px] text-slate-400 font-bold absolute right-3 top-2">Kg</span>
                    </div>
                    <p className="text-[10px] text-emerald-700">
                      &plusmn; {Math.round((parseFloat(formTambahKios.stokAwalUreaKg) || 0) / 50)} Sak (@ 50 Kg)
                    </p>
                  </div>

                  <div className="bg-blue-50/60 border border-blue-200 p-3 rounded-2xl space-y-1">
                    <label className="block font-bold text-blue-900 text-xs">NPK Phonska</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={formTambahKios.stokAwalNpkKg}
                        onChange={(e) => setFormTambahKios({ ...formTambahKios, stokAwalNpkKg: e.target.value })}
                        className="w-full bg-white border border-blue-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none"
                      />
                      <span className="text-[10px] text-slate-400 font-bold absolute right-3 top-2">Kg</span>
                    </div>
                    <p className="text-[10px] text-blue-700">
                      &plusmn; {Math.round((parseFloat(formTambahKios.stokAwalNpkKg) || 0) / 50)} Sak (@ 50 Kg)
                    </p>
                  </div>

                  <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-2xl space-y-1">
                    <label className="block font-bold text-amber-900 text-xs">Pupuk Organik</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={formTambahKios.stokAwalOrganikKg}
                        onChange={(e) => setFormTambahKios({ ...formTambahKios, stokAwalOrganikKg: e.target.value })}
                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none"
                      />
                      <span className="text-[10px] text-slate-400 font-bold absolute right-3 top-2">Kg</span>
                    </div>
                    <p className="text-[10px] text-amber-700">
                      &plusmn; {Math.round((parseFloat(formTambahKios.stokAwalOrganikKg) || 0) / 50)} Sak (@ 50 Kg)
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTambahKiosModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingKios}
                  className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {submittingKios ? 'Mendaftarkan...' : 'Simpan & Daftarkan Kios KPL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
