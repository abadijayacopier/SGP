'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Building2,
  Users,
  Search,
  Edit,
  Phone,
  MapPin,
  FileCheck2,
  CheckCircle2,
  ShieldCheck,
  Save,
  X,
  RefreshCw,
  Stamp,
  PenTool,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { showSuccess, showError, showToast } from '@/lib/sweetalert';
import { generateAutoSignatureSvg, generateOfficialStampSvg } from '@/lib/signature-utils';

interface KadesItem {
  id: string;
  desa: string;
  nama: string;
  jabatan: string;
  nip: string;
  kontak: string;
  alamat: string;
  signatureUrl?: string;
  stampUrl?: string;
  updatedAt?: string;
}

export default function KepalaDesaPage() {
  const { currentUser, isMounted } = useAuth();
  const [kadesList, setKadesList] = useState<KadesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDesaFilter, setSelectedDesaFilter] = useState('SEMUA');

  // Modal Edit State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedKades, setSelectedKades] = useState<KadesItem | null>(null);
  const [formData, setFormData] = useState({
    desa: '',
    nama: '',
    jabatan: '',
    nip: '',
    kontak: '',
    alamat: '',
    signatureUrl: '',
    stampUrl: '',
  });
  const [saving, setSaving] = useState(false);

  // Deteksi wewenang desa untuk Kelompok Tani (POKTAN)
  const isPoktan = currentUser.role === 'POKTAN';
  const isAdminOrPpl = currentUser.role === 'ADMIN_DINAS' || currentUser.role === 'PPL';

  // Ekstraksi nama desa dari currentUser.wilayah (misal: "Desa Kediren, Kec. Lembeyan" -> "Kediren")
  const poktanDesaName = React.useMemo(() => {
    if (!isPoktan) return '';
    const wil = currentUser.wilayah || '';
    const match = wil.match(/(?:Desa|Kelurahan)\s+([^,]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    // Fallback jika format "Kediren, Kec. Lembeyan"
    const parts = wil.split(',');
    return parts[0].replace(/^(desa|kelurahan)\s+/i, '').trim();
  }, [isPoktan, currentUser.wilayah]);

  const loadKadesData = () => {
    setLoading(true);
    let url = '/api/kepala-desa';
    if (isPoktan && poktanDesaName) {
      url += `?desa=${encodeURIComponent(poktanDesaName)}`;
    }

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setKadesList(json.data);
        }
      })
      .catch((err) => {
        showToast('Gagal memuat data Kepala Desa: ' + err.message, 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadKadesData();
  }, [isPoktan, poktanDesaName]);

  // Filter List sesuai Role & Input Pencarian
  const filteredList = React.useMemo(() => {
    return kadesList.filter((k) => {
      // Jika Poktan, harus desa miliknya
      if (isPoktan && poktanDesaName) {
        const cleanKadesDesa = k.desa.toLowerCase().replace(/^(desa|kelurahan)\s+/i, '');
        const cleanUserDesa = poktanDesaName.toLowerCase();
        if (!cleanKadesDesa.includes(cleanUserDesa) && !cleanUserDesa.includes(cleanKadesDesa)) {
          return false;
        }
      }

      // Filter Tab Desa untuk Admin
      if (selectedDesaFilter !== 'SEMUA' && k.desa !== selectedDesaFilter) {
        return false;
      }

      // Filter Pencarian Teks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = k.nama.toLowerCase().includes(q);
        const matchDesa = k.desa.toLowerCase().includes(q);
        const matchNip = k.nip.toLowerCase().includes(q);
        return matchNama || matchDesa || matchNip;
      }

      return true;
    });
  }, [kadesList, isPoktan, poktanDesaName, selectedDesaFilter, searchQuery]);

  const handleOpenEdit = (item: KadesItem) => {
    setSelectedKades(item);
    setFormData({
      desa: item.desa,
      nama: item.nama,
      jabatan: item.jabatan || `Kepala Desa ${item.desa}`,
      nip: item.nip || 'NIP. -',
      kontak: item.kontak || '',
      alamat: item.alamat || `Kantor Desa ${item.desa}, Kec. Lembeyan`,
      signatureUrl: item.signatureUrl || generateAutoSignatureSvg(item.nama),
      stampUrl: item.stampUrl || generateOfficialStampSvg('KADES', item.desa),
    });
    setEditModalOpen(true);
  };

  const handleRegenerateSignature = () => {
    if (formData.nama.trim()) {
      const newSig = generateAutoSignatureSvg(formData.nama.trim());
      setFormData((prev) => ({ ...prev, signatureUrl: newSig }));
      showToast('Tanda tangan digital diperbarui otomatis', 'info');
    }
  };

  const handleRegenerateStamp = () => {
    if (formData.desa.trim()) {
      const newStamp = generateOfficialStampSvg('KADES', formData.desa.trim());
      setFormData((prev) => ({ ...prev, stampUrl: newStamp }));
      showToast('Stempel dinas diperbarui otomatis', 'info');
    }
  };

  const handleSaveKades = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      showError('Validasi Gagal', 'Nama Kepala Desa wajib diisi.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/kepala-desa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userRole: currentUser.role,
          userDesa: poktanDesaName || currentUser.wilayah,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showSuccess('Berhasil Menyimpan', `Data Kepala Desa ${formData.desa} telah diperbarui di sistem.`);
        setEditModalOpen(false);
        loadKadesData();
      } else {
        showError('Gagal Menyimpan', json.error || 'Terjadi kesalahan sistem.');
      }
    } catch (err: any) {
      showError('Gangguan Jaringan', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Daftar unik desa untuk tab filter admin
  const allVillages = [
    'SEMUA',
    'Kediren',
    'Lembeyan Kulon',
    'Lembeyan Wetan',
    'Dukuh',
    'Nguri',
    'Tapen',
    'Tunggur',
    'Pupus',
    'Kedungpanji',
    'Krowe',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 text-[11px] font-extrabold px-3 py-1 rounded-full border border-emerald-200">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            KELEMBAGAAN PEMERINTAHAN DESA SE-KECAMATAN LEMBEYAN
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {isPoktan
              ? `Data Kepala Desa Wilayah Anda (Desa ${poktanDesaName || 'Kediren'})`
              : 'Data Kepala Desa & Perangkat Desa se-Kecamatan Lembeyan'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            {isPoktan
              ? `Khusus Kelompok Tani (${currentUser.name}): Anda hanya berwenang melihat & menyunting data Kepala Desa di wilayah ${poktanDesaName || 'desa Anda'} untuk keperluan pengesahan usulan e-RDKK.`
              : 'Manajemen nama pejabat, NIP, kontak dinas, stempel resmi, dan tanda tangan digital Kepala Desa untuk pencetakan dokumen legal e-RDKK, Surat Pengesahan, dan Berita Acara.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadKadesData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </button>
        </div>
      </div>

      {/* Notice Banner Khusus Poktan */}
      {isPoktan && (
        <div className="bg-gradient-to-r from-emerald-900 to-green-900 text-white p-4 sm:p-5 rounded-2xl border border-emerald-700 shadow-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <ShieldCheck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <p className="text-xs font-black text-amber-300 uppercase tracking-wider">
                ISOLASI AKSES DESA AKTIF
              </p>
              <p className="text-xs sm:text-sm text-emerald-100 font-medium">
                Akun Poktan <strong className="text-white">{currentUser.name}</strong> terkunci pada wilayah kerja{' '}
                <strong className="text-white underline">Desa {poktanDesaName || 'Kediren'}</strong>. Data desa lain terlindungi &amp; tidak ditampilkan.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-emerald-200 border border-white/15">
            Wilayah Mandiri
          </span>
        </div>
      )}

      {/* Filter & Pencarian (Tampil untuk Admin & PPL) */}
      {isAdminOrPpl && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cari Kepala Desa, NIP, atau Desa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Menampilkan <strong>{filteredList.length}</strong> dari <strong>{kadesList.length}</strong> Desa di Kec. Lembeyan
            </div>
          </div>

          {/* Tab Filter Nama Desa */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
            {allVillages.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setSelectedDesaFilter(v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedDesaFilter === v
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {v === 'SEMUA' ? 'Semua Desa (10)' : `Desa ${v}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid Kartu Kepala Desa */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Memuat data pejabat Kepala Desa...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Tidak ada data Kepala Desa ditemukan.</p>
          <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau reset filter desa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
            >
              {/* Card Header: Desa & Status Badge */}
              <div className="p-5 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                    <Building2 className="w-3 h-3 text-emerald-600" />
                    DESA {item.desa.toUpperCase()}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">
                    KEC. LEMBEYAN
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  {item.nama}
                </h3>
                <p className="text-xs text-emerald-700 font-bold mt-0.5">{item.jabatan}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{item.nip}</p>
              </div>

              {/* Card Body: Kontak, Alamat, Stempel & TTD Preview */}
              <div className="p-5 space-y-4 text-xs">
                <div className="space-y-2 text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-700">{item.kontak || 'Belum ada nomor telepon'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-relaxed">{item.alamat || `Kantor Desa ${item.desa}`}</span>
                  </div>
                </div>

                {/* Stempel & Tanda Tangan Digital Preview */}
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/60">
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Stempel Resmi</p>
                    <div className="h-16 flex items-center justify-center p-1 bg-white rounded-xl border border-slate-200">
                      {item.stampUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.stampUrl}
                          alt={`Stempel ${item.desa}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <Stamp className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Tanda Tangan</p>
                    <div className="h-16 flex items-center justify-center p-1 bg-white rounded-xl border border-slate-200">
                      {item.signatureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.signatureUrl}
                          alt={`TTD ${item.nama}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <PenTool className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Tombol Aksi */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                {item.kontak ? (
                  <a
                    href={`https://wa.me/${item.kontak.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">No kontak belum ada</span>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenEdit(item)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer ml-auto"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Data Kades</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Edit Kepala Desa */}
      {editModalOpen && selectedKades && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-900 to-green-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Edit className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black">
                    Perbarui Data Kepala Desa {formData.desa}
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Wilayah Administrasi Kecamatan Lembeyan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSaveKades} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Desa / Kelurahan
                </label>
                <input
                  type="text"
                  value={formData.desa}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Nama wilayah desa dikunci sesuai data pemerintahan resmi.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Lengkap Kepala Desa &amp; Gelar *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dwi Santoso, S.Sos"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jabatan Resmi
                  </label>
                  <input
                    type="text"
                    value={formData.jabatan}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    NIP (Jika PNS / Kosongkan jika Non-PNS)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 19740512 200701 1 014 atau NIP. -"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nomor Kontak / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={formData.kontak}
                    onChange={(e) => setFormData({ ...formData, kontak: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Alamat Balai / Kantor Desa
                  </label>
                  <input
                    type="text"
                    value={formData.alamat}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Preview Stempel & TTD Elektronik */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block">
                  Spesimen Stempel Resmi &amp; Tanda Tangan Digital:
                </span>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="space-y-1.5 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block">Stempel Dinas</span>
                    <div className="h-20 bg-white rounded-xl border border-slate-200 p-1 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.stampUrl}
                        alt="Stempel Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRegenerateStamp}
                      className="text-[10px] text-emerald-700 hover:underline font-bold"
                    >
                      Regenerate Stempel
                    </button>
                  </div>
                  <div className="space-y-1.5 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block">TTD Digital</span>
                    <div className="h-20 bg-white rounded-xl border border-slate-200 p-1 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.signatureUrl}
                        alt="TTD Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRegenerateSignature}
                      className="text-[10px] text-emerald-700 hover:underline font-bold"
                    >
                      Regenerate TTD
                    </button>
                  </div>
                </div>
              </div>

              {/* Tombol Simpan */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Menyimpan Data...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
