'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  Truck,
  Package,
  Calendar,
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  Filter,
  Search,
  Building2,
  UserCheck,
  ChevronDown,
  FileCheck,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Edit3,
  Trash2,
  X,
  Store,
  Warehouse,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import { generateAutoSignatureSvg, generateOfficialStampSvg } from '@/lib/signature-utils';
import { exportDistribusiKiosExcel } from '@/lib/export-excel';
import QrCodeView from '@/components/ui/QrCodeView';
import { generateWhatsAppSuratJalan, openWhatsApp } from '@/lib/whatsapp';
import {
  showSuccess,
  showError,
  showWarning,
  showConfirm,
  showDeleteConfirm,
  showPrompt,
  showToast,
} from '@/lib/sweetalert';

interface DistribusiItem {
  id: string;
  nomorSuratJalan: string;
  namaKios: string;
  kodeKios: string;
  poktanId: string;
  namaPoktan: string;
  desa: string;
  kloter: string;
  tanggalKirim: string;
  namaSopir: string;
  nomorPolisi: string;
  jumlahUreaSak: number;
  jumlahUreaKg: number;
  jumlahNpkSak: number;
  jumlahNpkKg: number;
  jumlahOrganikSak: number;
  jumlahOrganikKg: number;
  status: 'DIKIRIM' | 'DITERIMA';
  tanggalDiterima: string | null;
  namaPenerima: string;
  jabatanPenerima: string;
  catatan?: string;
}

export default function DistribusiKiosPage() {
  const { currentUser } = useAuth();

  const [distribusiList, setDistribusiList] = useState<DistribusiItem[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [poktanList, setPoktanList] = useState<any[]>([]);
  const [kiosList, setKiosList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterKios, setFilterKios] = useState<string>('SEMUA');
  const [filterPoktan, setFilterPoktan] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');

  // Live Warehouse Stock
  const [kiosStock, setKiosStock] = useState({ ureaKg: 0, npkKg: 0, organikKg: 0 });
  const [loadingStock, setLoadingStock] = useState(false);

  // Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState<DistribusiItem | null>(null);
  const [docType, setDocType] = useState<'SURAT_JALAN' | 'TANDA_TERIMA'>('SURAT_JALAN');

  // Form Pengiriman Baru
  const [formKios, setFormKios] = useState(currentUser?.kiosName || 'BUMI SUBUR');
  const [formPoktanId, setFormPoktanId] = useState('');
  const [formKloter, setFormKloter] = useState('');
  const [formTanggalKirim, setFormTanggalKirim] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [formSopir, setFormSopir] = useState('');
  const [formNopol, setFormNopol] = useState('');
  const [formUreaSak, setFormUreaSak] = useState<number>(0);
  const [formNpkSak, setFormNpkSak] = useState<number>(0);
  const [formOrgSak, setFormOrgSak] = useState<number>(0);
  const [formCatatan, setFormCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal Edit Pengiriman State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DistribusiItem | null>(null);
  const [editForm, setEditForm] = useState({
    namaSopir: '',
    nomorPolisi: '',
    kloter: '',
    tanggalKirim: '',
    jumlahUreaSak: 0,
    jumlahNpkSak: 0,
    jumlahOrganikSak: 0,
    catatan: '',
  });

  // Sinkronisasi Kios dari User yang login
  useEffect(() => {
    if (currentUser?.kiosName) {
      setFormKios(currentUser.kiosName);
      if (currentUser.role === 'KIOS') {
        setFilterKios(currentUser.kiosName);
      }
    }
  }, [currentUser]);

  // Fetch Ketersediaan Stok Fisik Gudang Kios Riil
  const fetchKiosStock = async (kiosName: string) => {
    if (!kiosName) return;
    try {
      setLoadingStock(true);
      const res = await fetch(`/api/kios/stok?namaKios=${encodeURIComponent(kiosName)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const u = json.data.find((s: any) => s.jenisPupuk.toLowerCase().includes('urea'));
        const n = json.data.find((s: any) => s.jenisPupuk.toLowerCase().includes('npk'));
        const o = json.data.find((s: any) => s.jenisPupuk.toLowerCase().includes('organik'));
        setKiosStock({
          ureaKg: u ? u.stokSisaKg : 0,
          npkKg: n ? n.stokSisaKg : 0,
          organikKg: o ? o.stokSisaKg : 0,
        });
      }
    } catch (err) {
      console.error('Error fetching kios stock:', err);
    } finally {
      setLoadingStock(false);
    }
  };

  // Load Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const targetKios = currentUser?.role === 'KIOS' ? (currentUser.kiosName || 'BUMI SUBUR') : filterKios;
      const [resDist, resPok, resKios] = await Promise.all([
        fetch(`/api/distribusi?namaKios=${encodeURIComponent(targetKios)}&poktanId=${filterPoktan}&status=${filterStatus}`),
        fetch('/api/poktan'),
        fetch('/api/kios'),
      ]);

      const jsonDist = await resDist.json();
      const jsonPok = await resPok.json();
      const jsonKios = await resKios.json();

      if (jsonDist.success) {
        setDistribusiList(jsonDist.data);
        setSummary(jsonDist.summary);
      }
      if (jsonPok.success) {
        setPoktanList(jsonPok.data);
        if (jsonPok.data.length > 0 && !formPoktanId) {
          setFormPoktanId(jsonPok.data[0].id);
        }
      }
      if (jsonKios.success && Array.isArray(jsonKios.data)) {
        setKiosList(jsonKios.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterKios, filterPoktan, filterStatus, currentUser?.kiosName]);

  const handleOpenFormModal = () => {
    const activeKios = currentUser?.kiosName || (filterKios !== 'SEMUA' ? filterKios : 'BUMI SUBUR');
    setFormKios(activeKios);
    setFormSopir('');
    setFormNopol('');
    setFormKloter(`Kloter ${distribusiList.length + 1}`);
    setFormUreaSak(0);
    setFormNpkSak(0);
    setFormOrgSak(0);
    setFormCatatan('');
    fetchKiosStock(activeKios);
    setShowFormModal(true);
  };

  // Handle Submit Pengiriman Baru
  const handleCreatePengiriman = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPoktan = poktanList.find((p) => p.id === formPoktanId);
    if (!targetPoktan) {
      showWarning('Pilih Poktan', 'Pilih kelompok tani tujuan terlebih dahulu.');
      return;
    }

    if (!formSopir.trim()) {
      showWarning('Nama Sopir Wajib', 'Silakan masukkan nama sopir / pengemudi armada!');
      return;
    }

    if (!formNopol.trim()) {
      showWarning('Nomor Polisi Wajib', 'Silakan masukkan nomor polisi (plat) kendaraan!');
      return;
    }

    const totalSak = (formUreaSak || 0) + (formNpkSak || 0) + (formOrgSak || 0);
    if (totalSak <= 0) {
      showWarning('Muatan Kosong', 'Silakan masukkan minimal 1 sak pupuk untuk dikirim!');
      return;
    }

    if (formUreaSak * 50 > kiosStock.ureaKg) {
      showWarning('Stok Urea Kurang', `Stok Urea di gudang "${formKios}" hanya tersisa ${Math.floor(kiosStock.ureaKg / 50)} Sak (${kiosStock.ureaKg.toLocaleString('id-ID')} Kg)!`);
      return;
    }

    if (formNpkSak * 50 > kiosStock.npkKg) {
      showWarning('Stok NPK Kurang', `Stok NPK Phonska di gudang "${formKios}" hanya tersisa ${Math.floor(kiosStock.npkKg / 50)} Sak (${kiosStock.npkKg.toLocaleString('id-ID')} Kg)!`);
      return;
    }

    if (formOrgSak * 40 > kiosStock.organikKg) {
      showWarning('Stok Organik Kurang', `Stok Organik di gudang "${formKios}" hanya tersisa ${Math.floor(kiosStock.organikKg / 40)} Sak (${kiosStock.organikKg.toLocaleString('id-ID')} Kg)!`);
      return;
    }

    const currentKiosObj = kiosList.find((k) => k.namaKios === formKios);

    try {
      setSubmitting(true);
      const res = await fetch('/api/distribusi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namaKios: formKios,
          kodeKios: currentKiosObj?.kodeKios || 'KPL-LMB-008',
          poktanId: targetPoktan.id,
          namaPoktan: targetPoktan.nama,
          desa: targetPoktan.desa,
          kloter: formKloter || `Kloter ${distribusiList.length + 1}`,
          tanggalKirim: new Date(formTanggalKirim).toISOString(),
          namaSopir: formSopir.trim(),
          nomorPolisi: formNopol.trim().toUpperCase(),
          jumlahUreaSak: formUreaSak,
          jumlahNpkSak: formNpkSak,
          jumlahOrganikSak: formOrgSak,
          catatan: formCatatan,
          status: 'DIKIRIM',
          petugas: currentUser?.name || 'Petugas KPL',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowFormModal(false);
        showSuccess('Surat Jalan Terbit', json.message || 'Surat jalan pengiriman pupuk berhasil diterbitkan dan stok gudang terpotong.');
        fetchData();
        // Buka langsung preview surat jalan
        setDocType('SURAT_JALAN');
        setShowDocModal(json.data);
      } else {
        showError('Gagal Menerbitkan', json.error || 'Gagal menyimpan pengiriman');
      }
    } catch (e) {
      showError('Gagal Koneksi', 'Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Konfirmasi Terima Pupuk oleh Poktan
  const handleConfirmTerima = async (item: DistribusiItem) => {
    const namaPenerima = await showPrompt({
      title: 'Konfirmasi Tiba di Poktan',
      text: `Pengiriman untuk ${item.namaPoktan}. Masukkan nama Ketua / Petugas Poktan yang menerima fisik pupuk:`,
      inputValue: item.namaPenerima || 'Samsi',
      inputPlaceholder: 'Nama Pengurus Penerima',
      confirmButtonText: 'Sahkan Penerimaan',
    });
    if (!namaPenerima) return;

    try {
      const res = await fetch('/api/distribusi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          namaPenerima,
          status: 'DITERIMA',
          catatan: 'Pupuk telah tiba, diperiksa, dan disimpan di gudang Poktan.',
        }),
      });

      const json = await res.json();
      if (json.success) {
        showSuccess('Penerimaan Disahkan', 'Pengiriman berhasil dikonfirmasi dan pupuk resmi diterima Poktan!');
        fetchData();
        // Tampilkan Tanda Terima
        setDocType('TANDA_TERIMA');
        setShowDocModal(json.data);
      } else {
        showError('Gagal Konfirmasi', json.error || 'Gagal mengonfirmasi penerimaan');
      }
    } catch (e) {
      showError('Gagal Koneksi', 'Terjadi kesalahan koneksi.');
    }
  };

  // 1. Buka Modal Edit Pengiriman
  const handleOpenEdit = (item: DistribusiItem) => {
    setEditingItem(item);
    setEditForm({
      namaSopir: item.namaSopir || '',
      nomorPolisi: item.nomorPolisi || '',
      kloter: item.kloter || '',
      tanggalKirim: item.tanggalKirim ? item.tanggalKirim.split('T')[0] : new Date().toISOString().split('T')[0],
      jumlahUreaSak: item.jumlahUreaSak || 0,
      jumlahNpkSak: item.jumlahNpkSak || 0,
      jumlahOrganikSak: item.jumlahOrganikSak || 0,
      catatan: item.catatan || '',
    });
    setShowEditModal(true);
  };

  // Simpan Edit Pengiriman ke API
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/distribusi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          action: 'UPDATE_PENGIRIMAN',
          namaSopir: editForm.namaSopir,
          nomorPolisi: editForm.nomorPolisi,
          kloter: editForm.kloter,
          tanggalKirim: new Date(editForm.tanggalKirim).toISOString(),
          jumlahUreaSak: Number(editForm.jumlahUreaSak),
          jumlahNpkSak: Number(editForm.jumlahNpkSak),
          jumlahOrganikSak: Number(editForm.jumlahOrganikSak),
          catatan: editForm.catatan,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowEditModal(false);
        setEditingItem(null);
        showSuccess('Pengiriman Diperbarui', 'Data surat jalan pengiriman berhasil diperbarui!');
        fetchData();
      } else {
        showError('Gagal Memperbarui', json.error || 'Gagal memperbarui pengiriman');
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Hapus Surat Jalan Pengiriman
  const handleDeleteDistribusi = async (item: DistribusiItem) => {
    const confirmDelete = await showDeleteConfirm(
      item.nomorSuratJalan,
      `Hapus surat jalan pengiriman nomor <strong>${item.nomorSuratJalan}</strong> untuk Poktan <strong>${item.namaPoktan}</strong>?`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/distribusi?id=${item.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        showSuccess('Surat Jalan Dihapus', json.message || 'Surat jalan berhasil dihapus.');
        fetchData();
      } else {
        showError('Gagal Menghapus', json.error || 'Gagal menghapus surat jalan');
      }
    } catch (err: any) {
      showError('Gagal Menghapus', err.message);
    }
  };

  // Filter Search
  const filteredList = distribusiList.filter((item) => {
    return (
      item.nomorSuratJalan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.namaPoktan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kloter.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.namaSopir.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nomorPolisi.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-12 space-y-6">
      {/* Header Halaman */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden no-print">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold mb-3">
              <Truck className="w-3.5 h-3.5" />
              Rantai Pasok Pupuk Bersubsidi Kecamatan Lembeyan
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Distribusi Pupuk Kios ke Poktan
            </h1>
            <p className="text-blue-100/80 text-xs sm:text-sm mt-1 max-w-2xl">
              Pencatatan pengiriman pupuk dari gudang Kios Pengecer Lengkap (KPL) ke Kelompok Tani (Poktan) per kloter/tahap, rekap harian, pembuatan Surat Jalan, dan Surat Tanda Terima resmi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/cetak-f6"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-xs border border-amber-400/40 transition cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-300" />
              Cetak SPJ Model F-6
            </Link>
            <button
              onClick={() => exportDistribusiKiosExcel(distribusiList)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-300" />
              Export Excel
            </button>
            <button
              onClick={handleOpenFormModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Kirim Pupuk Baru (Kloter)
            </button>
          </div>
        </div>

        {/* Ringkasan Statistik Logistik */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-blue-800/50 relative z-10">
          <div className="bg-blue-950/40 border border-blue-700/40 p-3.5 rounded-2xl">
            <span className="text-[11px] text-blue-300 font-semibold block">Total Kloter Terkirim</span>
            <strong className="text-xl font-black text-white">
              {summary.totalPengiriman || 0} <span className="text-xs font-normal text-blue-300">Pengiriman</span>
            </strong>
            <span className="text-[10px] text-emerald-400 block mt-0.5">
              &bull; Selesai Diterima: {distribusiList.filter((d) => d.status === 'DITERIMA').length}
            </span>
          </div>

          <div className="bg-blue-950/40 border border-blue-700/40 p-3.5 rounded-2xl">
            <span className="text-[11px] text-blue-300 font-semibold block">Distribusi Urea</span>
            <strong className="text-xl font-black text-white">
              {(summary.totalUreaKg || 0).toLocaleString('id-ID')}{' '}
              <span className="text-xs font-normal text-blue-300">Kg</span>
            </strong>
            <span className="text-[10px] text-blue-300/80 block mt-0.5">
              ({summary.totalUreaSak || 0} Sak @ 50 Kg)
            </span>
          </div>

          <div className="bg-blue-950/40 border border-blue-700/40 p-3.5 rounded-2xl">
            <span className="text-[11px] text-blue-300 font-semibold block">Distribusi NPK Phonska</span>
            <strong className="text-xl font-black text-white">
              {(summary.totalNpkKg || 0).toLocaleString('id-ID')}{' '}
              <span className="text-xs font-normal text-blue-300">Kg</span>
            </strong>
            <span className="text-[10px] text-blue-300/80 block mt-0.5">
              ({summary.totalNpkSak || 0} Sak @ 50 Kg)
            </span>
          </div>

          <div className="bg-blue-950/40 border border-blue-700/40 p-3.5 rounded-2xl">
            <span className="text-[11px] text-blue-300 font-semibold block">Distribusi Organik</span>
            <strong className="text-xl font-black text-white">
              {(summary.totalOrganikKg || 0).toLocaleString('id-ID')}{' '}
              <span className="text-xs font-normal text-blue-300">Kg</span>
            </strong>
            <span className="text-[10px] text-blue-300/80 block mt-0.5">
              ({summary.totalOrganikSak || 0} Sak @ 40 Kg)
            </span>
          </div>
        </div>
      </div>

      {/* FILTER & PENCARIAN */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari No. Surat Jalan, Poktan, Sopir, Plat Nomor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2"
            />
          </div>

          {/* Kios Selector / Badge */}
          {currentUser?.role === 'KIOS' ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Store className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-800">
                Gudang KPL: {currentUser.kiosName || 'BUMI SUBUR'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Kios (KPL):</span>
              <select
                value={filterKios}
                onChange={(e) => setFilterKios(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2"
              >
                <option value="SEMUA">Semua KPL Gudang</option>
                {kiosList.map((k) => (
                  <option key={k.namaKios} value={k.namaKios}>
                    {k.namaKios}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Poktan:</span>
            <select
              value={filterPoktan}
              onChange={(e) => setFilterPoktan(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2"
            >
              <option value="SEMUA">Semua Poktan</option>
              {poktanList.map((pok) => (
                <option key={pok.id} value={pok.id}>
                  {pok.nama} ({pok.desa})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2"
            >
              <option value="SEMUA">Semua Status</option>
              <option value="DIKIRIM">Dalam Perjalanan (DIKIRIM)</option>
              <option value="DITERIMA">Selesai Tiba (DITERIMA)</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABEL REKAP DISTRIBUSI */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 no-print">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Rekapitulasi Pengiriman Pupuk ke Poktan
          </h3>
          <span className="text-xs text-slate-500 font-semibold">
            Menampilkan {filteredList.length} data pengiriman kloter
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 border-r text-center">No</th>
                <th className="py-2.5 px-3 border-r">No. Surat Jalan</th>
                <th className="py-2.5 px-3 border-r">Tanggal & Waktu</th>
                <th className="py-2.5 px-3 border-r">Poktan Tujuan</th>
                <th className="py-2.5 px-3 border-r">Kloter / Keterangan</th>
                <th className="py-2.5 px-3 border-r">Sopir & Armada</th>
                <th className="py-2.5 px-3 border-r text-center">Urea</th>
                <th className="py-2.5 px-3 border-r text-center">NPK</th>
                <th className="py-2.5 px-3 border-r text-center">Organik</th>
                <th className="py-2.5 px-3 border-r text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Cetak & Validasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    Memuat data distribusi...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 italic">
                    Belum ada riwayat pengiriman pupuk sesuai filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, index) => {
                  const isDiterima = item.status === 'DITERIMA';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 border-r text-center font-mono">{index + 1}</td>
                      <td className="py-2.5 px-3 border-r font-mono font-bold text-slate-900">
                        {item.nomorSuratJalan}
                      </td>
                      <td className="py-2.5 px-3 border-r text-slate-600">
                        {new Date(item.tanggalKirim).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-2.5 px-3 border-r">
                        <strong className="text-slate-900 block">{item.namaPoktan}</strong>
                        <span className="text-[10px] text-slate-500">Desa {item.desa}</span>
                      </td>
                      <td className="py-2.5 px-3 border-r font-semibold text-slate-700">
                        {item.kloter}
                      </td>
                      <td className="py-2.5 px-3 border-r">
                        <span className="font-semibold block">{item.namaSopir}</span>
                        <span className="font-mono text-[10px] text-slate-500">{item.nomorPolisi}</span>
                      </td>
                      <td className="py-2.5 px-3 border-r text-center">
                        <span className="font-black text-emerald-800">{item.jumlahUreaSak} Sak</span>
                        <span className="text-[10px] text-slate-400 block">({item.jumlahUreaKg} Kg)</span>
                      </td>
                      <td className="py-2.5 px-3 border-r text-center">
                        <span className="font-black text-blue-800">{item.jumlahNpkSak} Sak</span>
                        <span className="text-[10px] text-slate-400 block">({item.jumlahNpkKg} Kg)</span>
                      </td>
                      <td className="py-2.5 px-3 border-r text-center">
                        <span className="font-black text-amber-800">{item.jumlahOrganikSak} Sak</span>
                        <span className="text-[10px] text-slate-400 block">({item.jumlahOrganikKg} Kg)</span>
                      </td>
                      <td className="py-2.5 px-3 border-r text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isDiterima
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800 animate-pulse'
                          }`}
                        >
                          {isDiterima ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Tombol Cetak Surat Jalan */}
                          <button
                            type="button"
                            onClick={() => {
                              setDocType('SURAT_JALAN');
                              setShowDocModal(item);
                            }}
                            title="Cetak Surat Jalan (DO)"
                            className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[10px] flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            Surat Jalan
                          </button>

                          {/* Tombol Cetak Tanda Terima atau Konfirmasi Terima */}
                          {isDiterima ? (
                            <button
                              type="button"
                              onClick={() => {
                                setDocType('TANDA_TERIMA');
                                setShowDocModal(item);
                              }}
                              title="Cetak Surat Tanda Terima Resmi"
                              className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] flex items-center gap-1"
                            >
                              <FileCheck className="w-3 h-3" />
                              Tanda Terima
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleConfirmTerima(item)}
                              title="Konfirmasi bahwa pupuk telah sampai dan diterima Poktan"
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Konfirmasi Tiba
                            </button>
                          )}

                          {/* Tombol Edit Pengiriman */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Data Pengiriman"
                            className="p-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>

                          {/* Tombol Hapus Surat Jalan */}
                          <button
                            type="button"
                            onClick={() => handleDeleteDistribusi(item)}
                            title="Hapus Surat Jalan"
                            className="p-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INPUT PENGIRIMAN KLOTER BARU */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Form Pengiriman Pupuk ke Poktan</h3>
                  <p className="text-xs text-slate-500">Penerbitan Surat Jalan DO & Muatan Armada Kios</p>
                </div>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleCreatePengiriman} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Kios Pengirim (KPL):</label>
                {currentUser?.role === 'KIOS' ? (
                  <div className="flex items-center gap-2 bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800">
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span>{formKios}</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full ml-auto">
                      Kios Resmi Anda
                    </span>
                  </div>
                ) : (
                  <select
                    value={formKios}
                    onChange={(e) => {
                      setFormKios(e.target.value);
                      fetchKiosStock(e.target.value);
                    }}
                    className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    {kiosList.map((k) => (
                      <option key={k.namaKios} value={k.namaKios}>
                        {k.namaKios} ({k.kodeKios || 'KPL'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* LIVE WAREHOUSE STOCK INDICATOR */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 border border-blue-200/90 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Warehouse className="w-4 h-4 text-blue-600" />
                    Stok Fisik Tersedia di Gudang "{formKios}":
                  </span>
                  {loadingStock && (
                    <span className="text-[10px] text-blue-600 font-semibold animate-pulse">
                      Memeriksa stok...
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                  <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-semibold">Urea Gudang</span>
                    <strong className="text-emerald-700 font-black text-sm">
                      {Math.floor(kiosStock.ureaKg / 50)} Sak
                    </strong>
                    <span className="text-[9px] text-slate-400 block font-mono">
                      ({kiosStock.ureaKg.toLocaleString('id-ID')} Kg)
                    </span>
                  </div>
                  <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-semibold">NPK Gudang</span>
                    <strong className="text-blue-700 font-black text-sm">
                      {Math.floor(kiosStock.npkKg / 50)} Sak
                    </strong>
                    <span className="text-[9px] text-slate-400 block font-mono">
                      ({kiosStock.npkKg.toLocaleString('id-ID')} Kg)
                    </span>
                  </div>
                  <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-semibold">Organik Gudang</span>
                    <strong className="text-amber-700 font-black text-sm">
                      {Math.floor(kiosStock.organikKg / 40)} Sak
                    </strong>
                    <span className="text-[9px] text-slate-400 block font-mono">
                      ({kiosStock.organikKg.toLocaleString('id-ID')} Kg)
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Kelompok Tani (Penerima):</label>
                  <select
                    value={formPoktanId}
                    onChange={(e) => setFormPoktanId(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {poktanList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} (Desa {p.desa})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nama Kloter / Tahap:</label>
                  <input
                    type="text"
                    value={formKloter}
                    onChange={(e) => setFormKloter(e.target.value)}
                    placeholder="Contoh: Kloter 1 MT-1"
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal Kirim:</label>
                  <input
                    type="date"
                    value={formTanggalKirim}
                    onChange={(e) => setFormTanggalKirim(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nama Sopir:</label>
                  <input
                    type="text"
                    value={formSopir}
                    onChange={(e) => setFormSopir(e.target.value)}
                    placeholder="Nama Pengemudi / Sopir..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nomor Polisi (Plat):</label>
                  <input
                    type="text"
                    value={formNopol}
                    onChange={(e) => setFormNopol(e.target.value)}
                    placeholder="Contoh: AE 8412 UN"
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono uppercase"
                    required
                  />
                </div>
              </div>

              {/* Rincian Muatan Sak */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-black text-slate-800 block">Rincian Muatan Pupuk (Jumlah Sak):</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-emerald-800 block mb-1">Urea (Sak):</label>
                    <input
                      type="number"
                      min="0"
                      value={formUreaSak === 0 ? '' : formUreaSak}
                      placeholder="0"
                      onChange={(e) => setFormUreaSak(parseInt(e.target.value) || 0)}
                      className={`w-full text-sm font-bold bg-white border rounded-xl px-3 py-2 text-right ${
                        formUreaSak * 50 > kiosStock.ureaKg
                          ? 'border-red-500 text-red-700 bg-red-50/50 focus:ring-2 focus:ring-red-400'
                          : 'border-slate-300'
                      }`}
                    />
                    <span className="text-[10px] text-slate-500 block text-right mt-0.5">
                      = {formUreaSak * 50} Kg
                    </span>
                    {formUreaSak * 50 > kiosStock.ureaKg && (
                      <span className="text-[10px] text-red-600 font-bold block text-right mt-0.5">
                        Melebihi stok gudang! Maks: {Math.floor(kiosStock.ureaKg / 50)} Sak
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-blue-800 block mb-1">NPK Phonska (Sak):</label>
                    <input
                      type="number"
                      min="0"
                      value={formNpkSak === 0 ? '' : formNpkSak}
                      placeholder="0"
                      onChange={(e) => setFormNpkSak(parseInt(e.target.value) || 0)}
                      className={`w-full text-sm font-bold bg-white border rounded-xl px-3 py-2 text-right ${
                        formNpkSak * 50 > kiosStock.npkKg
                          ? 'border-red-500 text-red-700 bg-red-50/50 focus:ring-2 focus:ring-red-400'
                          : 'border-slate-300'
                      }`}
                    />
                    <span className="text-[10px] text-slate-500 block text-right mt-0.5">
                      = {formNpkSak * 50} Kg
                    </span>
                    {formNpkSak * 50 > kiosStock.npkKg && (
                      <span className="text-[10px] text-red-600 font-bold block text-right mt-0.5">
                        Melebihi stok gudang! Maks: {Math.floor(kiosStock.npkKg / 50)} Sak
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-amber-800 block mb-1">Organik (Sak):</label>
                    <input
                      type="number"
                      min="0"
                      value={formOrgSak === 0 ? '' : formOrgSak}
                      placeholder="0"
                      onChange={(e) => setFormOrgSak(parseInt(e.target.value) || 0)}
                      className={`w-full text-sm font-bold bg-white border rounded-xl px-3 py-2 text-right ${
                        formOrgSak * 40 > kiosStock.organikKg
                          ? 'border-red-500 text-red-700 bg-red-50/50 focus:ring-2 focus:ring-red-400'
                          : 'border-slate-300'
                      }`}
                    />
                    <span className="text-[10px] text-slate-500 block text-right mt-0.5">
                      = {formOrgSak * 40} Kg
                    </span>
                    {formOrgSak * 40 > kiosStock.organikKg && (
                      <span className="text-[10px] text-red-600 font-bold block text-right mt-0.5">
                        Melebihi stok gudang! Maks: {Math.floor(kiosStock.organikKg / 40)} Sak
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Tambahan:</label>
                <input
                  type="text"
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  placeholder="Keterangan pengantaran / kondisi barang..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    formUreaSak * 50 > kiosStock.ureaKg ||
                    formNpkSak * 50 > kiosStock.npkKg ||
                    formOrgSak * 40 > kiosStock.organikKg
                  }
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold transition shadow-sm"
                >
                  {submitting ? 'Menerbitkan...' : 'Terbitkan Surat Jalan & Kirim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT PENGIRIMAN SURAT JALAN */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Edit Surat Jalan Pengiriman
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {editingItem.nomorSuratJalan} &bull; Tujuan: {editingItem.namaPoktan}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nama Kloter / Tahap:</label>
                  <input
                    type="text"
                    value={editForm.kloter}
                    onChange={(e) => setEditForm({ ...editForm, kloter: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal Kirim:</label>
                  <input
                    type="date"
                    value={editForm.tanggalKirim}
                    onChange={(e) => setEditForm({ ...editForm, tanggalKirim: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nama Sopir:</label>
                  <input
                    type="text"
                    value={editForm.namaSopir}
                    onChange={(e) => setEditForm({ ...editForm, namaSopir: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nomor Polisi (Plat):</label>
                  <input
                    type="text"
                    value={editForm.nomorPolisi}
                    onChange={(e) => setEditForm({ ...editForm, nomorPolisi: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono uppercase"
                    required
                  />
                </div>
              </div>

              {/* Rincian Muatan Sak */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-black text-slate-800 block">Rincian Muatan Pupuk (Jumlah Sak):</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-emerald-800 block mb-1">Urea (Sak):</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.jumlahUreaSak}
                      onChange={(e) => setEditForm({ ...editForm, jumlahUreaSak: parseInt(e.target.value) || 0 })}
                      className="w-full text-sm font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-right"
                    />
                    <span className="text-[10px] text-slate-500 block text-right mt-0.5">
                      = {editForm.jumlahUreaSak * 50} Kg
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-blue-800 block mb-1">NPK/Phonska (Sak):</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.jumlahNpkSak}
                      onChange={(e) => setEditForm({ ...editForm, jumlahNpkSak: parseInt(e.target.value) || 0 })}
                      className="w-full text-sm font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-right"
                    />
                    <span className="text-[10px] text-slate-500 block text-right mt-0.5">
                      = {editForm.jumlahNpkSak * 50} Kg
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-amber-800 block mb-1">Organik (Sak @ 40Kg):</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.jumlahOrganikSak}
                      onChange={(e) => setEditForm({ ...editForm, jumlahOrganikSak: parseInt(e.target.value) || 0 })}
                      className="w-full text-sm font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-right"
                    />
                    <span className="text-[10px] text-slate-500 block text-right mt-0.5">
                      = {editForm.jumlahOrganikSak * 40} Kg
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Tambahan:</label>
                <input
                  type="text"
                  value={editForm.catatan}
                  onChange={(e) => setEditForm({ ...editForm, catatan: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CETAK RESMI: SURAT JALAN & SURAT TANDA TERIMA */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[95vh] overflow-y-auto">
            {/* Header Dialog */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 no-print">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDocType('SURAT_JALAN')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                    docType === 'SURAT_JALAN' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Surat Jalan (DO Kios)
                </button>
                <button
                  type="button"
                  onClick={() => setDocType('TANDA_TERIMA')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                    docType === 'TANDA_TERIMA' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Surat Tanda Terima (Poktan)
                </button>
              </div>
              <button
                onClick={() => setShowDocModal(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Tutup
              </button>
            </div>

            {/* LEMBAR CETAK DOKUMEN (SURAT JALAN / TANDA TERIMA) */}
            <div className="border border-slate-300 p-8 rounded-2xl bg-white text-slate-900 font-sans space-y-6 print:border-none print:p-0">
              {/* Kop Dokumen */}
              <div className="border-b-4 border-double border-slate-900 pb-4 flex items-center justify-between gap-4">
                <div className="w-20 text-center shrink-0">
                  <QrCodeView
                    value={`/verifikasi?code=${encodeURIComponent(showDocModal.nomorSuratJalan)}`}
                    size={68}
                    caption="VALIDASI RESMI"
                  />
                </div>

                <div className="text-center flex-1">
                  <h3 className="text-xs font-bold tracking-widest uppercase text-slate-700">
                    {docType === 'SURAT_JALAN' ? 'KIOS PENGECEK RESMI (KPL) KECAMATAN LEMBEYAN' : 'KELOMPOK TANI (POKTAN) DESA'}
                  </h3>
                  <h2 className="text-lg font-black uppercase text-slate-900 mt-0.5">
                    {docType === 'SURAT_JALAN' ? showDocModal.namaKios : showDocModal.namaPoktan}
                  </h2>
                  <p className="text-xs text-slate-600">
                    Kecamatan Lembeyan &bull; Kabupaten Magetan &bull; Kode Pos 63372
                  </p>
                  <p className="text-[10px] text-slate-500 italic">
                    Sistem Informasi Logistik Distribusi Pupuk Bersubsidi Terpadu
                  </p>
                </div>

                <div className="w-20 hidden sm:block shrink-0" />
              </div>

              {/* Judul Surat */}
              <div className="text-center space-y-1">
                <h4 className="text-base font-black underline uppercase">
                  {docType === 'SURAT_JALAN'
                    ? 'SURAT JALAN PENGIRIMAN PUPUK (DELIVERY ORDER)'
                    : 'SURAT TANDA TERIMA / BERITA ACARA PENERIMAAN PUPUK'}
                </h4>
                <p className="text-xs font-mono font-bold text-slate-700">
                  Nomor: {showDocModal.nomorSuratJalan}
                </p>
              </div>

              {/* Informasi Surat */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <p><strong>Pengirim:</strong> {showDocModal.namaKios}</p>
                  <p><strong>Tujuan Poktan:</strong> {showDocModal.namaPoktan}</p>
                  <p><strong>Lokasi Desa:</strong> Desa {showDocModal.desa}, Kec. Lembeyan</p>
                  <p><strong>Kloter / Musim:</strong> {showDocModal.kloter}</p>
                </div>
                <div className="space-y-1">
                  <p><strong>Tanggal Kirim:</strong> {new Date(showDocModal.tanggalKirim).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p><strong>Nama Sopir:</strong> {showDocModal.namaSopir}</p>
                  <p><strong>No. Polisi Armada:</strong> <span className="font-mono">{showDocModal.nomorPolisi}</span></p>
                  <p><strong>Status Logistik:</strong> <span className="font-bold text-emerald-800">{showDocModal.status}</span></p>
                </div>
              </div>

              {/* Tabel Muatan */}
              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-100 font-bold border-b border-slate-300 text-center">
                  <tr>
                    <th className="py-2 px-3 border-r w-10">No</th>
                    <th className="py-2 px-3 border-r text-left">Jenis Pupuk Bersubsidi</th>
                    <th className="py-2 px-3 border-r text-center">Kemasan</th>
                    <th className="py-2 px-3 border-r text-center">Jumlah (Sak)</th>
                    <th className="py-2 px-3 text-center">Berat Bersih (Kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-2 px-3 border-r text-center font-mono">1</td>
                    <td className="py-2 px-3 border-r font-bold">Pupuk UREA Bersubsidi</td>
                    <td className="py-2 px-3 border-r text-center">Sak @ 50 Kg</td>
                    <td className="py-2 px-3 border-r text-center font-bold">{showDocModal.jumlahUreaSak} Sak</td>
                    <td className="py-2 px-3 text-center font-bold">{showDocModal.jumlahUreaKg.toLocaleString('id-ID')} Kg</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 border-r text-center font-mono">2</td>
                    <td className="py-2 px-3 border-r font-bold">Pupuk NPK PHONSKA Bersubsidi</td>
                    <td className="py-2 px-3 border-r text-center">Sak @ 50 Kg</td>
                    <td className="py-2 px-3 border-r text-center font-bold">{showDocModal.jumlahNpkSak} Sak</td>
                    <td className="py-2 px-3 text-center font-bold">{showDocModal.jumlahNpkKg.toLocaleString('id-ID')} Kg</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 border-r text-center font-mono">3</td>
                    <td className="py-2 px-3 border-r font-bold">Pupuk ORGANIK (Petroganik)</td>
                    <td className="py-2 px-3 border-r text-center">Sak @ 50 Kg</td>
                    <td className="py-2 px-3 border-r text-center font-bold">{showDocModal.jumlahOrganikSak} Sak</td>
                    <td className="py-2 px-3 text-center font-bold">{showDocModal.jumlahOrganikKg.toLocaleString('id-ID')} Kg</td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 font-black border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={3} className="py-2 px-3 border-r text-right uppercase">
                      Total Muatan Distribusi:
                    </td>
                    <td className="py-2 px-3 border-r text-center">
                      {showDocModal.jumlahUreaSak + showDocModal.jumlahNpkSak + showDocModal.jumlahOrganikSak} Sak
                    </td>
                    <td className="py-2 px-3 text-center">
                      {(showDocModal.jumlahUreaKg + showDocModal.jumlahNpkKg + showDocModal.jumlahOrganikKg).toLocaleString('id-ID')} Kg
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Tanda Tangan Pengesahan (3 Pihak: Pengirim Kios, Sopir, Penerima Poktan) */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-xs">
                <div>
                  <p className="font-semibold text-slate-600">Petugas Gudang Kios,</p>
                  <div className="h-18 flex items-center justify-center relative my-1">
                    <img
                      src={generateOfficialStampSvg('KIOS', showDocModal.namaKios)}
                      alt="Stempel Kios"
                      className="h-16 w-16 object-contain absolute opacity-75 pointer-events-none"
                    />
                    <img
                      src={generateAutoSignatureSvg(showDocModal.namaKios)}
                      alt="TTD Kios"
                      className="h-12 object-contain relative z-10"
                    />
                  </div>
                  <p className="font-bold underline uppercase">Penanggung Jawab KPL</p>
                  <p className="text-[10px] text-slate-500">{showDocModal.namaKios}</p>
                </div>

                <div>
                  <p className="font-semibold text-slate-600">Sopir / Ekspedisi,</p>
                  <div className="h-18 flex items-center justify-center my-1">
                    <img
                      src={generateAutoSignatureSvg(showDocModal.namaSopir)}
                      alt="TTD Sopir"
                      className="h-12 object-contain"
                    />
                  </div>
                  <p className="font-bold underline uppercase">{showDocModal.namaSopir}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{showDocModal.nomorPolisi}</p>
                </div>

                <div>
                  <p className="font-semibold text-slate-600">Penerima Kelompok Tani,</p>
                  <div className="h-18 flex items-center justify-center relative my-1">
                    <img
                      src={generateOfficialStampSvg('POKTAN', showDocModal.namaPoktan)}
                      alt="Stempel Poktan"
                      className="h-16 w-16 object-contain absolute opacity-75 pointer-events-none"
                    />
                    <img
                      src={generateAutoSignatureSvg(showDocModal.namaPenerima || 'Samsi')}
                      alt="TTD Poktan"
                      className="h-12 object-contain relative z-10"
                    />
                  </div>
                  <p className="font-bold underline uppercase">{showDocModal.namaPenerima || 'Samsi'}</p>
                  <p className="text-[10px] text-slate-500">{showDocModal.namaPoktan}</p>
                </div>
              </div>
            </div>

            {/* Tombol Cetak Dokumen & WhatsApp */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 no-print">
              <button
                type="button"
                onClick={() => {
                  const targetPoktanObj = poktanList.find((p) => p.id === showDocModal.poktanId);
                  const msg = generateWhatsAppSuratJalan({
                    nomorSuratJalan: showDocModal.nomorSuratJalan,
                    namaKios: showDocModal.namaKios,
                    namaPoktan: showDocModal.namaPoktan,
                    desa: showDocModal.desa,
                    namaSopir: showDocModal.namaSopir,
                    nomorPolisi: showDocModal.nomorPolisi,
                    jumlahUreaSak: showDocModal.jumlahUreaSak,
                    jumlahUreaKg: showDocModal.jumlahUreaKg,
                    jumlahNpkSak: showDocModal.jumlahNpkSak,
                    jumlahNpkKg: showDocModal.jumlahNpkKg,
                    jumlahOrganikSak: showDocModal.jumlahOrganikSak,
                    jumlahOrganikKg: showDocModal.jumlahOrganikKg,
                    tanggalKirim: showDocModal.tanggalKirim,
                  });
                  const telp = targetPoktanObj?.kontak || '';
                  openWhatsApp(telp, msg);
                }}
                className="w-full sm:w-auto py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
              >
                <MessageCircle className="w-4 h-4 text-emerald-200" />
                Kirim Info Pengiriman ke WA Poktan
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
              >
                <Printer className="w-4 h-4 text-emerald-300" />
                Cetak {docType === 'SURAT_JALAN' ? 'Surat Jalan (DO)' : 'Surat Tanda Terima'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
