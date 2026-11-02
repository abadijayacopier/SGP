'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  Users,
  Plus,
  Search,
  Filter,
  MapPin,
  Sprout,
  FileText,
  Printer,
  ChevronRight,
  X,
  Compass,
  Layers,
  ShieldCheck,
  Building,
  Building2,
  Phone,
  CheckCircle2,
  CreditCard,
  Edit3,
  Trash2,
} from 'lucide-react';
import {
  showSuccess,
  showError,
  showWarning,
  showConfirm,
  showDeleteConfirm,
  showToast,
} from '@/lib/sweetalert';

export default function PetaniPage() {
  const { currentUser, permissions } = useAuth();
  const [activeTab, setActiveTab] = useState<'petani' | 'poktan' | 'kades'>('petani');
  const [petaniList, setPetaniList] = useState<any[]>([]);
  const [poktanList, setPoktanList] = useState<any[]>([]);
  const [kadesList, setKadesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPoktan, setFilterPoktan] = useState('SEMUA');

  // State Edit Kepala Desa
  const [editingKades, setEditingKades] = useState<any | null>(null);
  const [savingKades, setSavingKades] = useState(false);
  const [kadesFeedback, setKadesFeedback] = useState<string | null>(null);

  // Modal Tambah / Edit Petani
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPetaniId, setEditingPetaniId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nik: '',
    nama: '',
    noKk: '',
    tempatLahir: 'Magetan',
    tanggalLahir: '',
    namaIbuKandung: '',
    telepon: '',
    alamat: '',
    desa: 'Kediren',
    kecamatan: 'Lembeyan',
    kabupaten: 'Magetan',
    poktanId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal Tambah / Edit Poktan
  const [poktanModalOpen, setPoktanModalOpen] = useState(false);
  const [editingPoktanId, setEditingPoktanId] = useState<string | null>(null);
  const [poktanFormData, setPoktanFormData] = useState({
    nama: '',
    ketua: '',
    kontak: '',
    desa: 'Kediren',
    kecamatan: 'Lembeyan',
    kabupaten: 'Magetan',
  });
  const [submittingPoktan, setSubmittingPoktan] = useState(false);

  // Modal Detail Petani (Menampilkan daftar blok-blok sawah lengkap)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPetani, setSelectedPetani] = useState<any | null>(null);

  const fetchPetani = async () => {
    try {
      setLoading(true);
      // Akun PETANI hanya melihat dirinya sendiri; POKTAN hanya melihat anggota Poktannya
      const timestamp = Date.now();
      let url = `/api/petani?_t=${timestamp}`;
      if (currentUser.role === 'PETANI' && currentUser.petaniId) {
        url += `&petaniId=${currentUser.petaniId}`;
      } else if (currentUser.role === 'POKTAN' && currentUser.poktanId) {
        url += `&poktanId=${currentUser.poktanId}`;
      } else if (filterPoktan !== 'SEMUA') {
        url += `&poktanId=${filterPoktan}`;
      }
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setPetaniList(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPoktan = async () => {
    try {
      const res = await fetch(`/api/poktan?_t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        const myPoktanId = currentUser.poktanId;
        const list =
          (currentUser.role === 'POKTAN' || currentUser.role === 'PETANI') && myPoktanId
            ? json.data.filter((p: any) => p.id === myPoktanId)
            : json.data;
        setPoktanList(list);
        if (list.length > 0 && !formData.poktanId) {
          setFormData((prev) => ({ ...prev, poktanId: list[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchKades = async () => {
    try {
      const res = await fetch('/api/kepala-desa');
      const json = await res.json();
      if (json.success) {
        setKadesList(json.data);
      }
    } catch (e) {
      console.error(e);
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
        showSuccess('Data Diperbarui', `Data ${editingKades.jabatan} berhasil diperbarui!`);
        setEditingKades(null);
        setKadesFeedback(null);
      } else {
        showError('Gagal Menyimpan', json.error || 'Gagal menyimpan data Kepala Desa.');
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    } finally {
      setSavingKades(false);
    }
  };

  useEffect(() => {
    fetchPetani();
    fetchPoktan();
    fetchKades();

    const handlePetaniSync = () => {
      fetchPetani();
      fetchPoktan();
    };
    window.addEventListener('petani-updated', handlePetaniSync);
    window.addEventListener('poktan-updated', handlePetaniSync);
    window.addEventListener('storage', handlePetaniSync);
    window.addEventListener('focus', handlePetaniSync);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handlePetaniSync();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('petani-updated', handlePetaniSync);
      window.removeEventListener('poktan-updated', handlePetaniSync);
      window.removeEventListener('storage', handlePetaniSync);
      window.removeEventListener('focus', handlePetaniSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPoktan, currentUser.role, currentUser.poktanId, currentUser.petaniId]);

  const handleOpenCreatePetani = () => {
    setEditingPetaniId(null);
    setFormData({
      nik: '',
      nama: '',
      noKk: '',
      tempatLahir: 'Magetan',
      tanggalLahir: '',
      namaIbuKandung: '',
      telepon: '',
      alamat: '',
      desa: 'Kediren',
      kecamatan: 'Lembeyan',
      kabupaten: 'Magetan',
      poktanId: poktanList[0]?.id || '',
    });
    setModalOpen(true);
  };

  const handleOpenEditPetani = (p: any) => {
    setEditingPetaniId(p.id);
    setFormData({
      nik: p.nik || '',
      nama: p.nama || '',
      noKk: p.noKk || '',
      tempatLahir: p.tempatLahir || 'Magetan',
      tanggalLahir: p.tanggalLahir || '',
      namaIbuKandung: p.namaIbuKandung || '',
      telepon: p.telepon || '',
      alamat: p.alamat || '',
      desa: p.desa || 'Kediren',
      kecamatan: p.kecamatan || 'Lembeyan',
      kabupaten: p.kabupaten || 'Magetan',
      poktanId: p.poktanId || poktanList[0]?.id || '',
    });
    setModalOpen(true);
  };

  const handleDeletePetani = async (p: any) => {
    const confirmDelete = await showDeleteConfirm(
      p.nama,
      `Hapus data petani <strong>${p.nama}</strong> (NIK: ${p.nik}) beserta seluruh blok lahan dan riwayat kuotanya?<br/><span class="text-xs text-rose-600 block mt-1 font-semibold">Tindakan ini tidak dapat dibatalkan.</span>`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/petani?id=${p.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showSuccess('Petani Dihapus', `Data petani "${p.nama}" berhasil dihapus.`);
        if (selectedPetani?.id === p.id) setDetailModalOpen(false);
        if (typeof window !== 'undefined') {
          try {
            const rawCached = localStorage.getItem('gis_lembeyan_cached_petani_v1');
            if (rawCached) {
              const list = JSON.parse(rawCached).filter((item: any) => item.id !== p.id && item.nik !== p.nik);
              localStorage.setItem('gis_lembeyan_cached_petani_v1', JSON.stringify(list));
            }
          } catch {}
          window.dispatchEvent(new CustomEvent('petani-updated'));
          window.dispatchEvent(new CustomEvent('poktan-updated'));
          try {
            localStorage.setItem('pertanian_last_petani_update', Date.now().toString());
            localStorage.setItem('pertanian_last_poktan_update', Date.now().toString());
          } catch {}
        }
        fetchPetani();
        fetchPoktan();
      } else {
        showError('Gagal Menghapus', json.error || 'Gagal menghapus petani.');
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    }
  };

  const handleSubmitPetani = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nik || !formData.nama || !formData.poktanId) {
      showWarning('Form Belum Lengkap', 'NIK, Nama lengkap, dan Kelompok Tani wajib diisi!');
      return;
    }

    try {
      setSubmitting(true);
      const method = editingPetaniId ? 'PATCH' : 'POST';
      const payload = editingPetaniId ? { ...formData, id: editingPetaniId } : formData;
      const res = await fetch('/api/petani', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        showSuccess(
          editingPetaniId ? 'Petani Diperbarui' : 'Petani Terdaftar',
          editingPetaniId
            ? `Data petani "${formData.nama}" berhasil diperbarui!`
            : `Petani baru "${formData.nama}" berhasil didaftarkan!`
        );
        setModalOpen(false);
        setEditingPetaniId(null);
        setFormData({
          nik: '',
          nama: '',
          noKk: '',
          tempatLahir: 'Magetan',
          tanggalLahir: '',
          namaIbuKandung: '',
          telepon: '',
          alamat: '',
          desa: 'Kediren',
          kecamatan: 'Lembeyan',
          kabupaten: 'Magetan',
          poktanId: poktanList[0]?.id || '',
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('petani-updated', { detail: json.data }));
          window.dispatchEvent(new CustomEvent('poktan-updated'));
          try {
            localStorage.setItem('pertanian_last_petani_update', Date.now().toString());
            localStorage.setItem('pertanian_last_poktan_update', Date.now().toString());
          } catch {}
        }
        fetchPetani();
        fetchPoktan();
      } else {
        showError('Gagal Menyimpan', json.error);
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCreatePoktan = () => {
    setEditingPoktanId(null);
    setPoktanFormData({
      nama: '',
      ketua: '',
      kontak: '',
      desa: 'Kediren',
      kecamatan: 'Lembeyan',
      kabupaten: 'Magetan',
    });
    setPoktanModalOpen(true);
  };

  const handleOpenEditPoktan = (pok: any) => {
    setEditingPoktanId(pok.id);
    setPoktanFormData({
      nama: pok.nama || '',
      ketua: pok.ketua || '',
      kontak: pok.kontak || '',
      desa: pok.desa || 'Kediren',
      kecamatan: pok.kecamatan || 'Lembeyan',
      kabupaten: pok.kabupaten || 'Magetan',
    });
    setPoktanModalOpen(true);
  };

  const handleDeletePoktan = async (pok: any) => {
    const anggotaCount = pok.anggota?.length || 0;
    if (anggotaCount > 0) {
      showWarning(
        'Tidak Dapat Dihapus',
        `Kelompok Tani <strong>${pok.nama}</strong> masih memiliki <strong>${anggotaCount}</strong> anggota petani terdaftar.<br/><span class="text-xs text-slate-500 mt-2 block">Silakan pindahkan anggota ke Kelompok Tani lain atau hapus data petani terlebih dahulu sebelum menghapus Poktan ini.</span>`
      );
      return;
    }

    const confirmDelete = await showDeleteConfirm(
      pok.nama,
      `Hapus kelompok tani <strong>${pok.nama}</strong> (Desa ${pok.desa})?<br/><span class="text-xs text-rose-600 block mt-1 font-semibold">Tindakan ini tidak dapat dibatalkan.</span>`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/poktan?id=${pok.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showSuccess('Poktan Dihapus', `Kelompok Tani "${pok.nama}" berhasil dihapus.`);
        if (filterPoktan === pok.id) setFilterPoktan('SEMUA');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('poktan-updated'));
          try {
            localStorage.setItem('pertanian_last_poktan_update', Date.now().toString());
          } catch {}
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('poktan-updated'));
          try {
            localStorage.setItem('pertanian_last_poktan_update', Date.now().toString());
          } catch {}
        }
        fetchPoktan();
      } else {
        showError('Gagal Menghapus', json.error || 'Gagal menghapus kelompok tani.');
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    }
  };

  const handleSubmitPoktan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poktanFormData.nama || !poktanFormData.ketua || !poktanFormData.desa) {
      showWarning('Form Belum Lengkap', 'Nama Poktan, Ketua, dan Desa wajib diisi!');
      return;
    }

    try {
      setSubmittingPoktan(true);
      const method = editingPoktanId ? 'PATCH' : 'POST';
      const payload = editingPoktanId ? { ...poktanFormData, id: editingPoktanId } : poktanFormData;
      const res = await fetch('/api/poktan', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        showSuccess(
          editingPoktanId ? 'Poktan Diperbarui' : 'Poktan Ditambahkan',
          editingPoktanId
            ? `Data Kelompok Tani "${poktanFormData.nama}" berhasil diperbarui!`
            : `Kelompok Tani "${poktanFormData.nama}" berhasil ditambahkan!`
        );
        setPoktanModalOpen(false);
        setEditingPoktanId(null);
        setPoktanFormData({
          nama: '',
          ketua: '',
          kontak: '',
          desa: 'Kediren',
          kecamatan: 'Lembeyan',
          kabupaten: 'Magetan',
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('poktan-updated'));
          try {
            localStorage.setItem('pertanian_last_poktan_update', Date.now().toString());
          } catch {}
        }
        fetchPoktan();
      } else {
        showError('Gagal Menyimpan', json.error);
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    } finally {
      setSubmittingPoktan(false);
    }
  };

  const filteredPetani = petaniList.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.nama.toLowerCase().includes(q) || p.nik.includes(q) || p.desa.toLowerCase().includes(q);
  });

  // Statistik Ringkas
  const totalBlokSawah = petaniList.reduce((acc, p) => acc + (p.lahan?.length || 0), 0);
  const totalLuasTerdaftar = petaniList.reduce((acc, p) => acc + (p.totalLuasLahan || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            Data Petani & Kelompok Tani (Poktan)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Database induk petani terdaftar, manajemen kelembagaan Poktan, akumulasi blok sawah, dan kuota e-RDKK.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tab Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setActiveTab('petani')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'petani'
                  ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Daftar Petani ({petaniList.length})
            </button>
            <button
              onClick={() => setActiveTab('poktan')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'poktan'
                  ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Kelompok Tani ({poktanList.length})
            </button>
            <button
              onClick={() => setActiveTab('kades')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'kades'
                  ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-indigo-600" />
              Kepala Desa ({kadesList.length} Desa)
            </button>
          </div>

          {activeTab === 'poktan' && (permissions.canDigitasiGis || currentUser.role === 'ADMIN_DINAS') && (
            <button
              onClick={handleOpenCreatePoktan}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Poktan
            </button>
          )}

          {activeTab === 'petani' && (permissions.canDigitasiGis || currentUser.role === 'ADMIN_DINAS' || currentUser.role === 'POKTAN') && (
            <button
              onClick={handleOpenCreatePetani}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Petani Baru
            </button>
          )}
        </div>
      </div>

      {/* Ringkasan Statistik Cepat */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Petani Terdaftar</span>
          <div className="text-xl font-black text-slate-900 mt-1">{petaniList.length} Orang</div>
          <span className="text-[11px] text-emerald-600 font-medium">Terverifikasi NIK & KK</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kelompok Tani</span>
          <div className="text-xl font-black text-slate-900 mt-1">{poktanList.length} Poktan</div>
          <span className="text-[11px] text-blue-600 font-medium">Wilayah BPP Kec. Lembeyan</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Blok Sawah</span>
          <div className="text-xl font-black text-emerald-700 mt-1">{totalBlokSawah} Petak</div>
          <span className="text-[11px] text-slate-500">Terpetakan poligon GIS</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Luas Baku</span>
          <div className="text-xl font-black text-amber-700 mt-1">{totalLuasTerdaftar.toFixed(2)} Ha</div>
          <span className="text-[11px] text-slate-500">Akumulasi seluruh petani</span>
        </div>
      </div>

      {/* TAB 1: DAFTAR PETANI */}
      {activeTab === 'petani' && (
        <>
          {/* Filter and Search */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5" /> Kelompok Tani:
              </span>
              <button
                onClick={() => setFilterPoktan('SEMUA')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
                  filterPoktan === 'SEMUA'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Poktan
              </button>
              {poktanList.map((pok) => (
                <button
                  key={pok.id}
                  onClick={() => setFilterPoktan(pok.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                    filterPoktan === pok.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pok.nama}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, NIK, atau desa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Table Petani */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-base">
                Daftar Anggota Petani ({filteredPetani.length} Orang)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Klik baris petani (misal: Kasdi Mulyono atau Sukirno) untuk melihat rincian daftar blok-blok sawah miliknya.
              </p>
            </div>

            {/* Mobile Card View (Smartphone friendly - No horizontal scrolling!) */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {filteredPetani.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Tidak ada data petani yang sesuai pencarian.
                </div>
              ) : (
                filteredPetani.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-slate-50/80 transition space-y-2.5 cursor-pointer"
                    onClick={() => {
                      setSelectedPetani(item);
                      setDetailModalOpen(true);
                    }}
                  >
                    {/* Top Row: Name, NIK & Total Luas */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-slate-900 text-sm leading-tight truncate">
                          {item.nama}
                        </h4>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                          NIK: {item.nik}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-emerald-800 text-sm block leading-tight">
                          {Number(item.totalLuasLahan || 0).toFixed(2)} Ha
                        </span>
                        <span className="text-[10px] text-slate-400">Total Luas</span>
                      </div>
                    </div>

                    {/* Meta Badges: Poktan, Desa, Blok Sawah, e-RDKK */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md border border-slate-200">
                        🌾 {item.poktan?.nama || 'Poktan'}
                      </span>
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                        📍 {item.desa || 'Lembeyan'}
                      </span>
                      <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                        {item.lahan?.length || 0} Blok Sawah
                      </span>
                      {item.alokasiPupuk?.length > 0 ? (
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-300">
                          e-RDKK: {item.alokasiPupuk[0].komoditas}
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md">
                          Belum Ada e-RDKK
                        </span>
                      )}
                    </div>

                    {/* Action Buttons: Kartu Tani, Blok Sawah, Edit, Hapus */}
                    <div
                      className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href={`/cetak-kartu-tani/${item.id}`}
                        target="_blank"
                        className="flex-1 min-w-[110px] inline-flex items-center justify-center gap-1 bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-black text-xs py-2 px-2.5 rounded-xl shadow-xs transition"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Kartu Tani</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPetani(item);
                          setDetailModalOpen(true);
                        }}
                        className="flex-1 min-w-[110px] inline-flex items-center justify-center gap-1 bg-slate-900 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs py-2 px-2.5 rounded-xl shadow-xs transition"
                      >
                        <span>Blok Sawah</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditPetani(item)}
                        className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 transition"
                        title="Edit Data Petani"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePetani(item)}
                        className="p-2 rounded-xl border border-rose-300 text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-95 transition shadow-2xs"
                        title="Hapus Data Petani"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View (lg screens and above) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Nama Petani & NIK</th>
                    <th className="py-3 px-4">Kelompok Tani</th>
                    <th className="py-3 px-4">Domisili / Desa</th>
                    <th className="py-3 px-4">Total Luas Terakumulasi</th>
                    <th className="py-3 px-4">Daftar Blok Sawah</th>
                    <th className="py-3 px-4">Alokasi e-RDKK</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPetani.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 transition cursor-pointer"
                      onClick={() => {
                        setSelectedPetani(item);
                        setDetailModalOpen(true);
                      }}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{item.nama}</div>
                        <div className="text-[11px] font-mono text-slate-500">NIK: {item.nik}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{item.poktan?.nama}</span>
                        <div className="text-[10px] text-slate-400">Ketua: {item.poktan?.ketua}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div>
                          {item.desa}, {item.kecamatan}
                        </div>
                        <div className="text-[10px] text-slate-400">{item.alamat}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-black text-emerald-800 text-sm">
                          {Number(item.totalLuasLahan || 0).toFixed(2)} Ha
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-300 text-xs shadow-2xs hover:bg-emerald-200 transition">
                          <Layers className="w-3.5 h-3.5" />
                          {item.lahan?.length || 0} Blok Sawah
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.alokasiPupuk?.length > 0 ? (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                            Aktif ({item.alokasiPupuk[0].komoditas})
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Belum Ada</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/cetak-kartu-tani/${item.id}`}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-1.5 rounded-lg shadow-2xs transition whitespace-nowrap"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Kartu Tani
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPetani(item);
                              setDetailModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 bg-slate-900 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition whitespace-nowrap"
                          >
                            Blok Sawah <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditPetani(item);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                            title="Edit Data Petani"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePetani(item);
                            }}
                            className="p-1.5 rounded-lg border border-rose-300 text-rose-600 bg-rose-50/80 hover:bg-rose-100 transition shadow-2xs"
                            title="Hapus Data Petani"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: MANAJEMEN KELOMPOK TANI (POKTAN) */}
      {activeTab === 'poktan' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {poktanList.map((pok) => {
            const anggota = pok.anggota || [];
            const totalPetak = anggota.reduce((sum: number, p: any) => sum + (p.lahan?.length || 0), 0);
            const totalLuas = anggota.reduce((sum: number, p: any) => sum + (p.totalLuasLahan || 0), 0);
            const totalUrea = anggota.reduce(
              (sum: number, p: any) =>
                sum + (p.alokasiPupuk?.reduce((s: number, a: any) => s + (a.jatahUreaKg || 0), 0) || 0),
              0
            );
            const totalNpk = anggota.reduce(
              (sum: number, p: any) =>
                sum + (p.alokasiPupuk?.reduce((s: number, a: any) => s + (a.jatahNpkKg || 0), 0) || 0),
              0
            );

            return (
              <div
                key={pok.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition p-6 flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
                      Desa {pok.desa} &bull; Kec. {pok.kecamatan}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3 h-3" /> Terdaftar Simluhtan
                    </span>
                  </div>

                  <h3 className="font-black text-slate-900 text-lg">{pok.nama}</h3>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <p className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Ketua Poktan: <strong className="text-slate-900">{pok.ketua}</strong>
                      </span>
                    </p>
                    {pok.kontak && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono">{pok.kontak}</span>
                      </p>
                    )}
                  </div>

                  {/* Statistik Kelembagaan Poktan */}
                  <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Anggota</span>
                      <strong className="text-sm font-black text-slate-900">{anggota.length} Petani</strong>
                    </div>
                    <div className="bg-emerald-50/60 p-2.5 rounded-2xl border border-emerald-100">
                      <span className="text-[10px] text-emerald-700 block font-bold uppercase">Blok GIS</span>
                      <strong className="text-sm font-black text-emerald-900">{totalPetak} Petak</strong>
                    </div>
                    <div className="bg-blue-50/60 p-2.5 rounded-2xl border border-blue-100">
                      <span className="text-[10px] text-blue-700 block font-bold uppercase">Total Luas</span>
                      <strong className="text-sm font-black text-blue-900">{totalLuas.toFixed(2)} Ha</strong>
                    </div>
                  </div>

                  {/* Alokasi Kolektif Poktan */}
                  <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Kuota e-RDKK Kolektif:</span>
                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-green-800 bg-green-100 px-2 py-0.5 rounded-md">
                        Urea: {totalUrea.toLocaleString('id-ID')} Kg
                      </span>
                      <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        NPK: {totalNpk.toLocaleString('id-ID')} Kg
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterPoktan(pok.id);
                      setActiveTab('petani');
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-2xs cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Lihat Anggota ({anggota.length})
                  </button>

                  {(permissions.canDigitasiGis ||
                    currentUser.role === 'ADMIN_DINAS' ||
                    currentUser.role === 'PPL' ||
                    (currentUser.role === 'POKTAN' && currentUser.poktanId === pok.id)) && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPoktan(pok)}
                        title="Edit Data Poktan"
                        className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {(currentUser.role === 'ADMIN_DINAS' || currentUser.role === 'PPL') && (
                        <button
                          type="button"
                          onClick={() => handleDeletePoktan(pok)}
                          title="Hapus Kelompok Tani"
                          className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: DATA KEPALA DESA / LURAH SE-KECAMATAN LEMBEYAN */}
      {activeTab === 'kades' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full text-indigo-100">
                Pemerintahan Desa & Kelurahan
              </span>
              <h2 className="text-xl font-black mt-2">
                Daftar Kepala Desa & Lurah Se-Kecamatan Lembeyan
              </h2>
              <p className="text-xs text-indigo-200 mt-1 max-w-2xl leading-relaxed">
                Data Kepala Desa / Lurah digunakan secara otomatis pada pengesahan resmi pengajuan kuota pupuk bersubsidi (e-RDKK), verifikasi spasial lahan, dan berita acara penyuluhan.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-4 rounded-2xl text-center shrink-0">
              <span className="text-[11px] font-bold text-indigo-200 block uppercase">Wilayah Administrasi</span>
              <span className="text-2xl font-black text-white">{kadesList.length} Desa / Kel.</span>
            </div>
          </div>

          {/* Alert Feedback */}
          {kadesFeedback && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {kadesFeedback}
            </div>
          )}

          {/* Grid Kartu Kepala Desa */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kadesList.map((kades) => (
              <div
                key={kades.id || kades.desa}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition p-6 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-800 px-3 py-1 rounded-full border border-indigo-200">
                      Desa {kades.desa}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Kec. Lembeyan
                    </span>
                  </div>

                  <h3 className="font-black text-slate-900 text-lg">{kades.nama}</h3>
                  <p className="text-xs font-semibold text-indigo-700 mt-0.5">
                    {kades.jabatan || `Kepala Desa ${kades.desa}`}
                  </p>

                  <div className="mt-4 space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">NIP / Identitas:</span>
                      <span className="font-mono font-bold text-slate-800">{kades.nip || 'NIP. -'}</span>
                    </div>
                    {kades.kontak && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Kontak HP/WA:</span>
                        <span className="font-mono text-slate-700">{kades.kontak}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Pengesahan e-RDKK:</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Tersinkron
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setEditingKades({ ...kades });
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold text-xs py-2.5 rounded-xl transition shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Data Kepala Desa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Edit Kepala Desa */}
      {editingKades && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 pb-20 sm:pb-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-100 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto my-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Edit Kepala Desa {editingKades.desa}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kecamatan Lembeyan, Kabupaten Magetan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingKades(null)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveKades} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Lengkap & Gelar Kepala Desa / Lurah *
                </label>
                <input
                  type="text"
                  required
                  value={editingKades.nama}
                  onChange={(e) => setEditingKades({ ...editingKades, nama: e.target.value })}
                  placeholder="Contoh: Dwi Santoso, S.Sos"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    NIP (Jika PNS / Pejabat)
                  </label>
                  <input
                    type="text"
                    value={editingKades.nip}
                    onChange={(e) => setEditingKades({ ...editingKades, nip: e.target.value })}
                    placeholder="Contoh: NIP. 1974... (atau NIP. -)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alamat Kantor Desa
                </label>
                <input
                  type="text"
                  value={editingKades.alamat}
                  onChange={(e) => setEditingKades({ ...editingKades, alamat: e.target.value })}
                  placeholder="Contoh: Kantor Desa Kediren, Kec. Lembeyan"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingKades(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingKades}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl shadow-sm transition"
                >
                  {savingKades ? 'Menyimpan...' : 'Simpan Data Kades'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Poktan Baru */}
      {poktanModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 pb-20 sm:pb-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                {editingPoktanId ? 'Edit Data Kelompok Tani (Poktan)' : 'Daftarkan Kelompok Tani (Poktan)'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setPoktanModalOpen(false);
                  setEditingPoktanId(null);
                }}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPoktan} className="space-y-4 my-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Kelompok Tani (Poktan) *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Poktan Harapan Jaya IV"
                  value={poktanFormData.nama}
                  onChange={(e) => setPoktanFormData({ ...poktanFormData, nama: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Ketua Poktan *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama lengkap ketua pengurus"
                  value={poktanFormData.ketua}
                  onChange={(e) => setPoktanFormData({ ...poktanFormData, ketua: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Kontak / HP Pengurus</label>
                <input
                  type="text"
                  placeholder="08xxxxxxxxxx"
                  value={poktanFormData.kontak}
                  onChange={(e) => setPoktanFormData({ ...poktanFormData, kontak: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Desa *</label>
                  <input
                    type="text"
                    required
                    value={poktanFormData.desa}
                    onChange={(e) => setPoktanFormData({ ...poktanFormData, desa: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kecamatan *</label>
                  <input
                    type="text"
                    required
                    value={poktanFormData.kecamatan}
                    onChange={(e) => setPoktanFormData({ ...poktanFormData, kecamatan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPoktanModalOpen(false);
                    setEditingPoktanId(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingPoktan}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {submittingPoktan
                    ? 'Menyimpan...'
                    : editingPoktanId
                    ? 'Simpan Perubahan'
                    : 'Simpan Poktan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Petani Baru */}
      {modalOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 pb-20 sm:pb-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                {editingPetaniId ? 'Perbarui Data Petani' : 'Daftarkan Petani Baru'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPetani} className="space-y-4 my-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Petani *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama sesuai KTP"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Induk Kependudukan (NIK) *</label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    placeholder="16 digit NIK"
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Kartu Keluarga (KK)</label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="16 digit No KK"
                    value={formData.noKk}
                    onChange={(e) => setFormData({ ...formData, noKk: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kelompok Tani (Poktan) *</label>
                <select
                  value={formData.poktanId}
                  onChange={(e) => setFormData({ ...formData, poktanId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {poktanList.map((pok) => (
                    <option key={pok.id} value={pok.id}>
                      {pok.nama} (Ketua: {pok.ketua}) - {pok.desa}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  type="text"
                  placeholder="08xxxxxxxxxx"
                  value={formData.telepon}
                  onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    placeholder="Contoh: Magetan"
                    value={formData.tempatLahir}
                    onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.tanggalLahir}
                    onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Ibu Kandung</label>
                  <input
                    type="text"
                    placeholder="Nama gadis ibu kandung"
                    value={formData.namaIbuKandung}
                    onChange={(e) => setFormData({ ...formData, namaIbuKandung: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alamat Dusun / RT / RW</label>
                <input
                  type="text"
                  placeholder="Contoh: Dusun Krajan RT 02 / RW 04"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Desa</label>
                  <input
                    type="text"
                    value={formData.desa}
                    onChange={(e) => setFormData({ ...formData, desa: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kecamatan</label>
                  <input
                    type="text"
                    value={formData.kecamatan}
                    onChange={(e) => setFormData({ ...formData, kecamatan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kabupaten / Kota</label>
                  <input
                    type="text"
                    value={formData.kabupaten}
                    onChange={(e) => setFormData({ ...formData, kabupaten: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Petani'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Profil Petani & DAFTAR LENGKAP BLOK-BLOK SAWAH */}
      {detailModalOpen && selectedPetani && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 pb-20 sm:pb-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto my-auto space-y-4">
            {/* Header Profil Petani */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-block">
                  Profil Petani & Kepemilikan Lahan
                </span>
                <h3 className="font-black text-slate-900 text-lg sm:text-xl">{selectedPetani.nama}</h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 font-mono">
                  <span>NIK: <strong className="text-slate-800">{selectedPetani.nik}</strong></span>
                  <span>&bull;</span>
                  <span>No KK: <strong className="text-slate-800">{selectedPetani.noKk || '-'}</strong></span>
                  <span>&bull;</span>
                  <span className="text-emerald-700 font-bold">{selectedPetani.poktan?.nama}</span>
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5 pt-0.5">
                  <div>
                    TTL: <strong className="text-slate-700">{selectedPetani.tempatLahir || 'Magetan'}{selectedPetani.tanggalLahir ? `, ${selectedPetani.tanggalLahir}` : ''}</strong> &bull; Ibu Kandung: <strong className="text-slate-700">{selectedPetani.namaIbuKandung || '-'}</strong>
                  </div>
                  <div>
                    Alamat Domisili: <strong className="text-slate-700">{selectedPetani.alamat ? `${selectedPetani.alamat}, ` : ''}Desa {selectedPetani.desa}, Kec. {selectedPetani.kecamatan}, Kab. {selectedPetani.kabupaten || 'Magetan'}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Statistik Akumulasi Luas Petani */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">Jumlah Blok Sawah</span>
                <p className="text-xl font-black text-emerald-950 mt-0.5">
                  {selectedPetani.lahan?.length || 0} Petak
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
                <span className="text-[10px] font-bold text-blue-800 uppercase">Total Luas Terdaftar</span>
                <p className="text-xl font-black text-blue-950 mt-0.5">
                  {Number(selectedPetani.totalLuasLahan || 0).toFixed(2)} Ha
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                <span className="text-[10px] font-bold text-amber-800 uppercase">Kelompok Tani</span>
                <p className="text-xs font-bold text-amber-950 mt-1 truncate">
                  {selectedPetani.poktan?.nama}
                </p>
              </div>
            </div>

            <div className="space-y-6 text-xs">
              {/* DAFTAR BLOK-BLOK SAWAH MILIK PETANI */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-1.5 text-emerald-800">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Daftar Blok-Blok Sawah ({selectedPetani.lahan?.length || 0} Petak)
                  </h4>
                  <Link
                    href={`/peta`}
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    Buka Semua di Peta GIS &rarr;
                  </Link>
                </div>

                {selectedPetani.lahan && selectedPetani.lahan.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedPetani.lahan.map((l: any, idx: number) => (
                      <div
                        key={l.id}
                        className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:bg-emerald-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[10px] font-bold bg-white text-emerald-800 border border-slate-200 px-2 py-0.5 rounded">
                              Blok #{idx + 1} &bull; {l.kodeLahan}
                            </span>
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                              {l.komoditas}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {l.statusKepemilikan} ({l.statusIrigasi})
                            </span>
                          </div>

                          <h5 className="font-extrabold text-slate-900 text-sm">{l.namaLahan}</h5>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Luas: <strong className="text-emerald-800">{l.luasHa} Ha</strong> ({l.luasM2?.toLocaleString('id-ID')} m²)
                            {l.nomorPipil && (
                              <span className="ml-2 font-mono text-amber-800">
                                &bull; Pipil: {l.nomorPipil}
                              </span>
                            )}
                          </p>
                          {(l.batasUtara || l.batasSelatan) && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              Batas: Utara ({l.batasUtara || '-'}), Selatan ({l.batasSelatan || '-'}), Timur ({l.batasTimur || '-'}), Barat ({l.batasBarat || '-'})
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                          <Link
                            href={`/peta`}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 text-[11px] font-bold bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition shadow-2xs"
                          >
                            <Compass className="w-3.5 h-3.5 text-emerald-600" />
                            Peta
                          </Link>
                          <Link
                            href={`/cetak-lahan/${l.id}`}
                            target="_blank"
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-slate-900 text-white px-3 py-2 rounded-xl hover:bg-emerald-700 transition shadow-2xs"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-300" />
                            Cetak Kartu Lahan
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                    Petani ini belum memiliki petak lahan yang dipetakan.
                    <div className="mt-2">
                      <Link
                        href="/peta"
                        className="text-emerald-600 font-bold hover:underline text-xs"
                      >
                        + Buka Peta GIS & Digitasi Lahan Sekarang
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Alokasi Pupuk e-RDKK Terakumulasi */}
              <div>
                <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-1.5 text-emerald-800">
                  <Sprout className="w-4 h-4 text-emerald-600" />
                  Alokasi Kuota Pupuk Subsidi e-RDKK
                </h4>
                {selectedPetani.alokasiPupuk && selectedPetani.alokasiPupuk.length > 0 ? (
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                    {selectedPetani.alokasiPupuk.map((a: any) => (
                      <div key={a.id}>
                        <div className="text-[11px] font-semibold text-slate-600 mb-2">
                          Musim Tanam: <strong>{a.musimTanam}</strong> &bull; Komoditas: <strong>{a.komoditas}</strong> &bull; Total Luas Tanam: <strong>{a.luasTanamHa} Ha</strong>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-white p-2.5 rounded-xl border border-green-200">
                            <span className="text-[10px] text-green-700 font-bold block uppercase">Sisa Urea</span>
                            <span className="font-black text-green-800 text-base">{a.sisaUreaKg} Kg</span>
                            <span className="text-[10px] text-slate-400 block">Jatah: {a.jatahUreaKg} Kg</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                            <span className="text-[10px] text-amber-700 font-bold block uppercase">Sisa NPK</span>
                            <span className="font-black text-amber-800 text-base">{a.sisaNpkKg} Kg</span>
                            <span className="text-[10px] text-slate-400 block">Jatah: {a.jatahNpkKg} Kg</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-700 font-bold block uppercase">Sisa Organik</span>
                            <span className="font-black text-slate-800 text-base">{a.sisaOrganikKg} Kg</span>
                            <span className="text-[10px] text-slate-400 block">Jatah: {a.jatahOrganikKg} Kg</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Belum ada alokasi pupuk untuk petani ini.</p>
                )}
              </div>
            </div>

            {/* Footer Aksi Responsif & Rapi */}
            <div className="pt-4 border-t border-slate-200 mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Sisi Kiri (Desktop) / Sisi Bawah (Mobile): Tombol Hapus */}
              <div className="order-last sm:order-first">
                {(permissions.canVerifyPpl || permissions.canApproveDinas || permissions.canManageUsers || currentUser.role === 'ADMIN_DINAS' || currentUser.role === 'PPL') && (
                  <button
                    type="button"
                    onClick={() => handleDeletePetani(selectedPetani)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 font-bold rounded-xl text-xs border border-rose-200/90 transition shadow-2xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Hapus Petani Ini</span>
                  </button>
                )}
              </div>

              {/* Sisi Kanan (Desktop) / Sisi Atas (Mobile): Cetak Kartu Tani & Tutup Rincian */}
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:flex sm:items-center gap-2">
                <Link
                  href={`/cetak-kartu-tani/${selectedPetani.id}`}
                  target="_blank"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-black rounded-xl text-xs transition shadow-2xs text-center"
                >
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <span>Cetak Kartu Tani Digital</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-2xs cursor-pointer"
                >
                  Tutup Rincian
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
