'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import CameraCaptureModal from '@/components/ui/CameraCaptureModal';
import QrCodeView from '@/components/ui/QrCodeView';
import {
  mapPengajuanToErdkkRows,
  generateErdkkCsvContent,
  generateErdkkImportTemplateCsv,
  parseErdkkImportCsv,
} from '@/lib/erdkk-format';
import {
  FileText,
  Upload,
  Camera,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Eye,
  ShieldCheck,
  ChevronRight,
  UserCheck,
  Building2,
  X,
  Printer,
  Download,
  FileSpreadsheet,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  showSuccess,
  showError,
  showWarning,
  showConfirm,
  showDeleteConfirm,
  showPrompt,
  showToast,
} from '@/lib/sweetalert';

interface PengajuanItem {
  id: string;
  nomorPengajuan: string;
  namaPemilik: string;
  nikPemilik: string;
  noKk: string;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  namaIbuKandung?: string | null;
  komoditasRencana: string;
  luasHa: number;
  desa: string;
  kecamatan: string;
  kabupaten?: string | null;
  nomorPipil: string;
  fileKtp: string;
  fileKk: string;
  filePipil: string;
  catatan?: string | null;
  status: string;
  diverifikasiOleh?: string | null;
  disetujuiOleh?: string | null;
  tanggalVerifikasi?: string | null;
  tanggalPersetujuan?: string | null;
  createdAt: string;
  petani?: {
    nama: string;
    nik: string;
  };
  poktan?: {
    nama: string;
  };
}

export default function PengajuanPage() {
  const { currentUser, permissions } = useAuth();
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('list');
  const [pengajuanList, setPengajuanList] = useState<PengajuanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [petaniList, setPetaniList] = useState<any[]>([]);
  const [poktanList, setPoktanList] = useState<any[]>([]);

  // Dokumen Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedPengajuan, setSelectedPengajuan] = useState<PengajuanItem | null>(null);

  // Live Camera Modal State for KTP / KK / Pipil
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraTargetField, setCameraTargetField] = useState<'fileKtp' | 'fileKk' | 'filePipil'>('fileKtp');
  const [cameraTitle, setCameraTitle] = useState('Ambil Foto Berkas');

  // Import Massal CSV e-RDKK Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<Array<Record<string, string>>>([]);
  const [importing, setImporting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    petaniId: '',
    poktanId: '',
    namaPemilik: '',
    nikPemilik: '',
    noKk: '',
    tempatLahir: 'Magetan',
    tanggalLahir: '1975-04-23',
    namaIbuKandung: 'Hj. Sumirah',
    komoditasRencana: 'Padi',
    luasHa: '1.0',
    desa: 'Kediren',
    kecamatan: 'Lembeyan',
    kabupaten: 'Magetan',
    nomorPipil: '',
    fileKtp: '/uploads/sample_ktp.svg',
    fileKk: '/uploads/sample_kk.svg',
    filePipil: '/uploads/sample_pipil.svg',
    catatan: '',
  });

  const [submitting, setSubmitting] = useState(false);

  // Akun POKTAN hanya boleh melihat & mengajukan untuk anggota Poktan miliknya
  const scopePoktanId =
    currentUser.role === 'POKTAN' && currentUser.poktanId ? currentUser.poktanId : null;

  const fetchPengajuan = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pengajuan');
      const json = await res.json();
      if (json.success) {
        setPengajuanList(
          scopePoktanId ? json.data.filter((p: any) => p.poktanId === scopePoktanId) : json.data
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaster = async () => {
    try {
      const [resPetani, resPoktan] = await Promise.all([
        fetch(scopePoktanId ? `/api/petani?poktanId=${scopePoktanId}` : '/api/petani'),
        fetch('/api/poktan'),
      ]);
      const jsonPetani = await resPetani.json();
      const jsonPoktan = await resPoktan.json();
      if (jsonPetani.success && jsonPetani.data.length > 0) {
        setPetaniList(jsonPetani.data);
        const p0 = jsonPetani.data[0];
        setFormData((prev) => ({
          ...prev,
          petaniId: p0.id,
          poktanId: p0.poktanId,
          namaPemilik: p0.nama,
          nikPemilik: p0.nik,
          noKk: p0.noKk,
          tempatLahir: p0.tempatLahir || 'Magetan',
          tanggalLahir: p0.tanggalLahir || '1975-04-23',
          namaIbuKandung: p0.namaIbuKandung || 'Hj. Sumirah',
          desa: p0.desa || prev.desa,
          kecamatan: p0.kecamatan || prev.kecamatan,
          kabupaten: p0.kabupaten || 'Magetan',
        }));
      }
      if (jsonPoktan.success) {
        setPoktanList(
          scopePoktanId
            ? jsonPoktan.data.filter((p: any) => p.id === scopePoktanId)
            : jsonPoktan.data
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPengajuan();
    fetchMaster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopePoktanId]);

  const handleSelectPetani = (petaniId: string) => {
    if (petaniId === '__NEW__') {
      setFormData((prev) => ({
        ...prev,
        petaniId: '__NEW__',
        poktanId: prev.poktanId || poktanList[0]?.id || '',
        namaPemilik: '',
        nikPemilik: '',
        noKk: '',
        tempatLahir: 'Magetan',
        tanggalLahir: '1980-05-15',
        namaIbuKandung: '',
        desa: prev.desa || 'Kediren',
        kecamatan: 'Lembeyan',
        kabupaten: 'Magetan',
      }));
      return;
    }
    const selected = petaniList.find((p) => p.id === petaniId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        petaniId: selected.id,
        poktanId: selected.poktanId,
        namaPemilik: selected.nama,
        nikPemilik: selected.nik,
        noKk: selected.noKk,
        tempatLahir: selected.tempatLahir || 'Magetan',
        tanggalLahir: selected.tanggalLahir || '1975-04-23',
        namaIbuKandung: selected.namaIbuKandung || 'Hj. Sumirah',
        desa: selected.desa || prev.desa,
        kecamatan: selected.kecamatan || prev.kecamatan,
        kabupaten: selected.kabupaten || 'Magetan',
      }));
    }
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: 'fileKtp' | 'fileKk' | 'filePipil'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, [fieldName]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const openCameraFor = (field: 'fileKtp' | 'fileKk' | 'filePipil', title: string) => {
    setCameraTargetField(field);
    setCameraTitle(title);
    setCameraModalOpen(true);
  };

  const handleCameraCapture = (dataUrl: string) => {
    setFormData((prev) => ({ ...prev, [cameraTargetField]: dataUrl }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaPemilik || !formData.nikPemilik || !formData.nomorPipil) {
      showWarning('Form Belum Lengkap', 'Nama pemilik, NIK, dan Nomor Pipil/SPPT tanah wajib diisi!');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/pengajuan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        showSuccess('Pengajuan Terkirim', 'Pengajuan lahan baru & usulan kuota e-RDKK berhasil dikirim!');
        setActiveTab('list');
        fetchPengajuan();
      } else {
        showError('Gagal Mengirim', json.error || 'Gagal mengirim pengajuan.');
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveStatus = async (id: string, newStatus: string) => {
    const isDinas = newStatus === 'DISETUJUI_DINAS';
    const note = await showPrompt({
      title: isDinas ? 'Persetujuan Kuota Dinas' : 'Verifikasi Lapangan PPL',
      text: isDinas
        ? 'Setujui berkas dan otomatis terbitkan alokasi e-RDKK & petak GIS? Masukkan catatan (opsional):'
        : 'Masukkan catatan verifikasi lapangan PPL (opsional):',
      inputPlaceholder: 'Catatan hasil verifikasi berkas...',
      confirmButtonText: isDinas ? 'Setujui & Terbitkan' : 'Verifikasi Berkas',
    });

    // Jika pengguna mengklik tombol "Batal", showPrompt mengembalikan null -> Batalkan proses & jangan ubah status
    if (note === null) {
      return;
    }

    try {
      const res = await fetch('/api/pengajuan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: newStatus,
          verifierName: currentUser.name,
          approverName: currentUser.name,
          notes: note.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showSuccess('Status Diperbarui', `Status pengajuan berhasil diubah menjadi: ${isDinas ? 'Disetujui Dinas (Aktif)' : 'Diverifikasi PPL'}`);
        fetchPengajuan();
        if (selectedPengajuan && selectedPengajuan.id === id) {
          setSelectedPengajuan(json.data);
        }
      } else {
        showError('Gagal Memperbarui', json.error);
      }
    } catch (err: any) {
      showError('Gagal Koneksi', err.message);
    }
  };

  const handleResetStatus = async (item: PengajuanItem) => {
    const confirm = await showConfirm({
      title: 'Batalkan Persetujuan Kuota?',
      text: `Batalkan status persetujuan berkas nomor ${item.nomorPengajuan} (${item.namaPemilik}) dan kembalikan ke status Verifikasi PPL?`,
      confirmButtonText: 'Ya, Batalkan Kuota',
      cancelButtonText: 'Kembali',
    });
    if (!confirm) return;

    try {
      const res = await fetch('/api/pengajuan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          status: 'DIVERIFIKASI_PPL',
          notes: `Persetujuan dibatalkan oleh ${currentUser?.name || 'Admin Dinas'}`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showSuccess('Persetujuan Dibatalkan', 'Status pengajuan dikembalikan ke Verifikasi PPL.');
        fetchPengajuan();
        if (selectedPengajuan && selectedPengajuan.id === item.id) {
          setSelectedPengajuan(json.data);
        }
      } else {
        showError('Gagal Membatalkan', json.error);
      }
    } catch (err: any) {
      showError('Gagal Koneksi', err.message);
    }
  };

  const handleTolakStatus = async (item: PengajuanItem) => {
    const alasan = await showPrompt({
      title: 'Tolak Pengajuan Lahan',
      text: `Masukkan alasan penolakan pengajuan nomor ${item.nomorPengajuan} (${item.namaPemilik}):`,
      inputPlaceholder: 'Contoh: Berkas SPPT PBB tidak valid / Batas lahan tumpang tindih...',
      confirmButtonText: 'Tolak Pengajuan',
    });
    if (alasan === null) return;
    if (!alasan.trim()) {
      showWarning('Alasan Diperlukan', 'Harap isi alasan penolakan berkas pengajuan.');
      return;
    }

    try {
      const res = await fetch('/api/pengajuan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          status: 'DITOLAK',
          notes: `DITOLAK: ${alasan.trim()} (Oleh: ${currentUser.name})`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showSuccess('Pengajuan Ditolak', 'Pengajuan telah ditolak dan alasan tercatat.');
        fetchPengajuan();
      } else {
        showError('Gagal Menolak', json.error);
      }
    } catch (err: any) {
      showError('Gagal Koneksi', err.message);
    }
  };

  const handleDeletePengajuan = async (item: PengajuanItem) => {
    const confirmDelete = await showDeleteConfirm(
      item.nomorPengajuan,
      `Hapus berkas pengajuan nomor <strong>${item.nomorPengajuan}</strong> atas nama <strong>${item.namaPemilik}</strong>?`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/pengajuan?id=${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showSuccess('Pengajuan Dihapus', json.message || 'Pengajuan berhasil dihapus!');
        fetchPengajuan();
      } else {
        showError('Gagal Menghapus', json.error);
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
      {/* Header Sesuai Kewenangan Jabatan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
              WEWENANG: {permissions.groupName}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            {currentUser.role === 'PPL'
              ? 'Verifikasi Lapangan Berkas e-RDKK (BPP Kecamatan Lembeyan)'
              : currentUser.role === 'ADMIN_DINAS'
              ? 'Otorisasi & Pengesahan Kuota e-RDKK (Admin Kecamatan Lembeyan)'
              : 'Input Pengajuan Lahan & Usulan e-RDKK (Pengurus Poktan)'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {currentUser.role === 'PPL'
              ? 'Khusus Petugas BPP: Periksa kelengkapan KTP, KK, Pipil/SPPT dan sahkan hasil verifikasi lapangan PPL.'
              : currentUser.role === 'ADMIN_DINAS'
              ? 'Khusus Admin Kecamatan: Setujui berkas yang telah lolos verifikasi PPL untuk menerbitkan kuota pupuk bersubsidi.'
              : 'Khusus Pengurus Poktan: Daftarkan usulan lahan anggota beserta foto KTP, KK, dan Pipil/SPPT untuk diajukan ke BPP.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/cetak-erdkk"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak SK & Lampiran e-RDKK
          </Link>

          <button
            type="button"
            onClick={() => {
              const rows = mapPengajuanToErdkkRows(
                pengajuanList.map((item) => ({
                  ...item,
                  nik: item.nikPemilik,
                  namaPetani: item.namaPemilik,
                  komoditas: item.komoditasRencana,
                }))
              );
              const csv = generateErdkkCsvContent(rows);
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Data-Usulan-eRDKK-Kec-Lembeyan-${new Date().getFullYear()}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Export Excel/CSV Kementan
          </button>

          {(permissions.canSubmitPengajuan || currentUser.role === 'ADMIN_DINAS') && (
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-600" />
              Import Kolektif CSV
            </button>
          )}

          {permissions.canSubmitPengajuan ? (
            <>
              <button
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  activeTab === 'list'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Status Usulan Poktan ({pengajuanList.length})
              </button>
              <button
                onClick={() => setActiveTab('form')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  activeTab === 'form'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                + Input Usulan e-RDKK Baru
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              {currentUser.role === 'PPL'
                ? 'Mode Verifikator Lapangan BPP (Input Usulan Hanya oleh Poktan)'
                : 'Mode Otorisasi Kuota Kecamatan (Verifikasi Lapangan oleh BPP)'}
            </span>
          )}
        </div>
      </div>

      {/* TAB 1: FORMULIR PENGAJUAN BARU (KHUSUS POKTAN) */}
      {activeTab === 'form' && permissions.canSubmitPengajuan && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-4xl mx-auto">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-lg font-black text-slate-800">
              Formulir Pendaftaran Lahan & Usulan e-RDKK
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Isi data kepemilikan dan ambil foto langsung (atau unggah berkas) dokumen pendukung untuk diverifikasi oleh Poktan, PPL, dan Dinas Pertanian.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 text-xs">
            {/* Section A: Identitas Pemilik */}
            <div>
              <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-1.5 text-emerald-700">
                <UserCheck className="w-4 h-4" />
                1. Data Petani Pemilik / Penggarap
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Pilih Petani / Penggarap *</label>
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectPetani(
                          formData.petaniId === '__NEW__' ? petaniList[0]?.id || '' : '__NEW__'
                        )
                      }
                      className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      {formData.petaniId === '__NEW__'
                        ? '← Pilih dari Petani Terdaftar'
                        : '+ Input Petani / Penggarap Baru'}
                    </button>
                  </div>
                  <select
                    value={formData.petaniId}
                    onChange={(e) => handleSelectPetani(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                  >
                    {petaniList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} (NIK: {p.nik})
                      </option>
                    ))}
                    <option value="__NEW__" className="font-bold text-emerald-700 bg-emerald-50">
                      + Petani Belum Ada? Input Petani / Penggarap Baru...
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Sesuai KTP *</label>
                  <input
                    type="text"
                    required
                    value={formData.namaPemilik}
                    onChange={(e) => setFormData({ ...formData, namaPemilik: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Induk Kependudukan (NIK) *</label>
                  <input
                    type="text"
                    required
                    value={formData.nikPemilik}
                    onChange={(e) => setFormData({ ...formData, nikPemilik: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Kartu Keluarga (KK) *</label>
                  <input
                    type="text"
                    required
                    value={formData.noKk}
                    onChange={(e) => setFormData({ ...formData, noKk: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Baris Tambahan Sesuai Standar e-RDKK: Tempat/Tanggal Lahir & Nama Ibu Kandung */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tempat Lahir (Sesuai KTP) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Magetan"
                    value={formData.tempatLahir}
                    onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Lahir *</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggalLahir}
                    onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Gadis Ibu Kandung *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Hj. Sumirah"
                    value={formData.namaIbuKandung}
                    onChange={(e) => setFormData({ ...formData, namaIbuKandung: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Section B: Data Lahan & Komoditas */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-1.5 text-emerald-700">
                <Building2 className="w-4 h-4" />
                2. Data Lahan & Komoditas Tanam
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Komoditas yang Diusulkan *</label>
                  <select
                    value={formData.komoditasRencana}
                    onChange={(e) => setFormData({ ...formData, komoditasRencana: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="Padi">Padi</option>
                    <option value="Jagung">Jagung</option>
                    <option value="Kedelai">Kedelai</option>
                    <option value="Tebu">Tebu</option>
                    <option value="Hortikultura">Hortikultura</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Luas Usulan (Hektar) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    value={formData.luasHa}
                    onChange={(e) => setFormData({ ...formData, luasHa: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Pipil / SPPT PBB *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PBB-3520-00991"
                    value={formData.nomorPipil}
                    onChange={(e) => setFormData({ ...formData, nomorPipil: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Desa / Kelurahan *</label>
                  <input
                    type="text"
                    required
                    value={formData.desa}
                    onChange={(e) => setFormData({ ...formData, desa: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kecamatan *</label>
                  <input
                    type="text"
                    required
                    value={formData.kecamatan}
                    onChange={(e) => setFormData({ ...formData, kecamatan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kabupaten / Kota *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Magetan"
                    value={formData.kabupaten}
                    onChange={(e) => setFormData({ ...formData, kabupaten: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Section C: Upload Berkas Wajib (KTP, KK, Pipil) */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 mb-1.5 flex items-center gap-1.5 text-emerald-700">
                <FileCheck className="w-4 h-4" />
                3. Lampiran Berkas Dokumen Wajib (Kamera Langsung / Unggah File)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Ambil foto langsung via kamera HP/Laptop atau unggah scan dokumen KTP, KK, dan Surat Pajak Tanah/Pipil.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Upload KTP */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block mb-1">1. Foto KTP Pemilik/Penggarap</span>
                    <p className="text-[11px] text-slate-500 mb-3">Identitas kependudukan asli & jelas</p>
                    <div className="h-28 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-1 mb-3">
                      <img
                        src={formData.fileKtp}
                        alt="Preview KTP"
                        className="max-h-full object-contain rounded"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => openCameraFor('fileKtp', 'Jepret Foto KTP Asli Pemilik')}
                      className="inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition shadow-2xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Kamera Live
                    </button>
                    <label className="cursor-pointer inline-flex items-center justify-center gap-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      Pilih File
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'fileKtp')}
                      />
                    </label>
                  </div>
                </div>

                {/* Upload KK */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block mb-1">2. Foto Kartu Keluarga (KK)</span>
                    <p className="text-[11px] text-slate-500 mb-3">Lampiran KK anggota keluarga petani</p>
                    <div className="h-28 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-1 mb-3">
                      <img
                        src={formData.fileKk}
                        alt="Preview KK"
                        className="max-h-full object-contain rounded"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => openCameraFor('fileKk', 'Jepret Foto Kartu Keluarga (KK)')}
                      className="inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition shadow-2xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Kamera Live
                    </button>
                    <label className="cursor-pointer inline-flex items-center justify-center gap-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      Pilih File
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'fileKk')}
                      />
                    </label>
                  </div>
                </div>

                {/* Upload Pipil / SPPT */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block mb-1">3. Surat Pajak Tanah / Pipil</span>
                    <p className="text-[11px] text-slate-500 mb-3">SPPT PBB / Bukti hak milik/sewa</p>
                    <div className="h-28 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-1 mb-3">
                      <img
                        src={formData.filePipil}
                        alt="Preview Pipil"
                        className="max-h-full object-contain rounded"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => openCameraFor('filePipil', 'Jepret Foto Surat Pajak Tanah / SPPT PBB')}
                      className="inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition shadow-2xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Kamera Live
                    </button>
                    <label className="cursor-pointer inline-flex items-center justify-center gap-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      Pilih File
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'filePipil')}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Section D: Catatan */}
            <div className="pt-2">
              <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan Pengajuan</label>
              <textarea
                rows={2}
                placeholder="Misal: Pengajuan lahan perluasan untuk musim tanam MT 1 2026..."
                value={formData.catatan}
                onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-5 py-2.5 rounded-xl text-slate-600 font-semibold hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition"
              >
                {submitting ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan Lahan & e-RDKK'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: DAFTAR STATUS PENGAJUAN & WORKFLOW APPROVAL */}
      {(activeTab === 'list' || !permissions.canSubmitPengajuan) && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Daftar Pengajuan Lahan & Usulan e-RDKK
              </h3>
              <p className="text-xs text-slate-500">
                Alur verifikasi: Diajukan Poktan &rarr; Verifikasi Lapangan PPL &rarr; Persetujuan Kuota Dinas.
              </p>
            </div>
          </div>

          {/* Mobile Card View (Smartphone Friendly) */}
          <div className="block lg:hidden divide-y divide-slate-100">
            {pengajuanList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                Belum ada pengajuan lahan yang terdaftar.
              </div>
            ) : (
              pengajuanList.map((item) => {
                let badge = {
                  bg: 'bg-amber-50 text-amber-800 border-amber-200',
                  label: 'Diajukan ke Poktan',
                };
                if (item.status === 'DIVERIFIKASI_PPL') {
                  badge = {
                    bg: 'bg-blue-50 text-blue-800 border-blue-200',
                    label: 'Diverifikasi PPL',
                  };
                } else if (item.status === 'DISETUJUI_DINAS') {
                  badge = {
                    bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    label: 'Disetujui Dinas (Aktif)',
                  };
                } else if (item.status === 'DITOLAK') {
                  badge = {
                    bg: 'bg-rose-50 text-rose-800 border-rose-200',
                    label: 'Ditolak',
                  };
                }

                return (
                  <div key={item.id} className="p-4 hover:bg-slate-50/80 transition space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.nomorPengajuan}
                        </span>
                        <h4 className="font-black text-slate-900 text-sm mt-1 leading-tight truncate">
                          {item.namaPemilik}
                        </h4>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                          NIK: {item.nikPemilik} &bull; {item.poktan?.nama}
                        </p>
                      </div>
                      <span className={`shrink-0 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="font-bold text-emerald-800">
                        🌾 {item.komoditasRencana} ({item.luasHa} Ha)
                      </span>
                      <span>&bull;</span>
                      <span className="text-slate-600">
                        📜 Pipil: {item.nomorPipil || '-'}
                      </span>
                      <span>&bull;</span>
                      <span className="text-slate-500">
                        📍 Ds. {item.desa}
                      </span>
                    </div>

                    {/* Tombol Aksi Lengkap & Responsif */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPengajuan(item);
                          setPreviewModalOpen(true);
                        }}
                        className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs active:scale-95 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Berkas</span>
                      </button>

                      {item.status === 'DIAJUKAN_POKTAN' && permissions.canVerifyPpl && (
                        <button
                          type="button"
                          onClick={() => handleApproveStatus(item.id, 'DIVERIFIKASI_PPL')}
                          className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs active:scale-95 transition shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verifikasi PPL</span>
                        </button>
                      )}

                      {item.status === 'DIVERIFIKASI_PPL' && permissions.canApproveDinas && (
                        <button
                          type="button"
                          onClick={() => handleApproveStatus(item.id, 'DISETUJUI_DINAS')}
                          className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs active:scale-95 transition shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Setujui Dinas</span>
                        </button>
                      )}

                      {item.status === 'DISETUJUI_DINAS' && (
                        <div className="flex-1 min-w-[120px] inline-flex items-center justify-between gap-1 py-1.5 px-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                          <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Kuota Terbit
                          </span>
                          {permissions.canApproveDinas && (
                            <button
                              type="button"
                              onClick={() => handleResetStatus(item)}
                              title="Batalkan Persetujuan Kuota Terbit & Kembalikan ke Verifikasi PPL"
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 transition cursor-pointer"
                            >
                              Batal Terbit
                            </button>
                          )}
                        </div>
                      )}

                      {item.status !== 'DISETUJUI_DINAS' && item.status !== 'DITOLAK' && (
                        <button
                          type="button"
                          onClick={() => handleTolakStatus(item)}
                          className="p-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs active:scale-95 transition"
                          title="Tolak Pengajuan"
                        >
                          Tolak
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">No. Pengajuan</th>
                  <th className="py-3 px-4">Nama Petani & NIK</th>
                  <th className="py-3 px-4">Komoditas & Luas</th>
                  <th className="py-3 px-4">No. Pipil / SPPT</th>
                  <th className="py-3 px-4">Dokumen Berkas</th>
                  <th className="py-3 px-4">Status & Alur</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pengajuanList.map((item) => {
                  let badge = {
                    bg: 'bg-amber-50 text-amber-800 border-amber-200',
                    label: 'Diajukan ke Poktan',
                  };
                  if (item.status === 'DIVERIFIKASI_PPL') {
                    badge = {
                      bg: 'bg-blue-50 text-blue-800 border-blue-200',
                      label: 'Diverifikasi PPL',
                    };
                  } else if (item.status === 'DISETUJUI_DINAS') {
                    badge = {
                      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      label: 'Disetujui Dinas (Aktif)',
                    };
                  } else if (item.status === 'DITOLAK') {
                    badge = {
                      bg: 'bg-rose-50 text-rose-800 border-rose-200',
                      label: 'Ditolak',
                    };
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {item.nomorPengajuan}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.namaPemilik}</div>
                        <div className="text-[11px] font-mono text-slate-500">NIK: {item.nikPemilik}</div>
                        <div className="text-[10px] text-slate-500">
                          TTL: <span className="font-semibold text-slate-700">{item.tempatLahir || 'Magetan'}, {item.tanggalLahir || '1975-04-23'}</span> &bull; Ibu: <span className="font-semibold text-slate-700">{item.namaIbuKandung || 'Hj. Sumirah'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{item.poktan?.nama}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-emerald-700">{item.komoditasRencana}</span>
                        <div className="text-slate-600">{item.luasHa} Ha</div>
                        <div className="text-[10px] text-slate-400">
                          Ds. {item.desa}, Kec. {item.kecamatan}, Kab. {item.kabupaten || 'Magetan'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                        {item.nomorPipil}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => {
                            setSelectedPengajuan(item);
                            setPreviewModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 font-bold text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Lihat KTP, KK, Pipil
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                        {item.diverifikasiOleh && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            PPL: {item.diverifikasiOleh}
                          </div>
                        )}
                        {item.disetujuiOleh && (
                          <div className="text-[10px] text-emerald-600 font-medium">
                            Dinas: {item.disetujuiOleh}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {item.status === 'DIAJUKAN_POKTAN' && (
                            permissions.canVerifyPpl ? (
                              <button
                                onClick={() => handleApproveStatus(item.id, 'DIVERIFIKASI_PPL')}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs shadow-2xs transition"
                              >
                                Verifikasi PPL
                              </button>
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                                Menunggu Akun PPL
                              </span>
                            )
                          )}
                          {item.status === 'DIVERIFIKASI_PPL' && (
                            permissions.canApproveDinas ? (
                              <button
                                onClick={() => handleApproveStatus(item.id, 'DISETUJUI_DINAS')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs shadow-2xs transition"
                              >
                                Setujui & Terbitkan Kuota
                              </button>
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                                Menunggu Admin Dinas
                              </span>
                            )
                          )}
                          {item.status === 'DISETUJUI_DINAS' && (
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Kuota Terbit
                              </span>
                              {permissions.canApproveDinas && (
                                <button
                                  type="button"
                                  onClick={() => handleResetStatus(item)}
                                  title="Batalkan Persetujuan Kuota Terbit & Kembalikan ke Verifikasi PPL"
                                  className="px-1.5 py-0.5 rounded-md text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer shadow-2xs"
                                >
                                  Batal Terbit
                                </button>
                              )}
                            </div>
                          )}

                          {/* Tombol Tolak Pengajuan */}
                          {item.status !== 'DISETUJUI_DINAS' && item.status !== 'DITOLAK' && (
                            <button
                              type="button"
                              onClick={() => handleTolakStatus(item)}
                              title="Tolak Pengajuan & Catat Alasan"
                              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition"
                            >
                              Tolak
                            </button>
                          )}

                          {/* Tombol Hapus Pengajuan */}
                          <button
                            type="button"
                            onClick={() => handleDeletePengajuan(item)}
                            title="Hapus Berkas Pengajuan"
                            className="p-1 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Preview Berkas Dokumen KTP, KK, Pipil + QR Verifikasi */}
      {previewModalOpen && selectedPengajuan && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-800 text-base">
                  Berkas Dokumen Lampiran: {selectedPengajuan.namaPemilik}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedPengajuan.nomorPengajuan} &bull; No Pipil: {selectedPengajuan.nomorPipil}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <QrCodeView
                  value={`https://pertanian.lembeyan.go.id/verifikasi/erdkk/${selectedPengajuan.nomorPengajuan}`}
                  size={56}
                />
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="py-4 space-y-5 text-xs">
              {/* Ringkasan Biodata e-RDKK & Lokasi Lahan */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Tempat & Tanggal Lahir</span>
                  <strong className="text-slate-800">
                    {selectedPengajuan.tempatLahir || 'Magetan'}, {selectedPengajuan.tanggalLahir || '1975-04-23'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Nama Gadis Ibu Kandung</span>
                  <strong className="text-slate-800">{selectedPengajuan.namaIbuKandung || 'Hj. Sumirah'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Lokasi Petak Lahan</span>
                  <strong className="text-slate-800">
                    Desa {selectedPengajuan.desa}, Kec. {selectedPengajuan.kecamatan}, Kab. {selectedPengajuan.kabupaten || 'Magetan'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Komoditas & Luas Usulan</span>
                  <strong className="text-emerald-700">
                    {selectedPengajuan.komoditasRencana} ({selectedPengajuan.luasHa} Hektar)
                  </strong>
                </div>
              </div>

              {/* Berkas 1: KTP */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  1. Kartu Tanda Penduduk (KTP)
                </h4>
                <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex items-center justify-center">
                  <img
                    src={selectedPengajuan.fileKtp}
                    alt="KTP"
                    className="max-h-60 rounded shadow-xs"
                  />
                </div>
              </div>

              {/* Berkas 2: KK */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  2. Kartu Keluarga (KK)
                </h4>
                <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex items-center justify-center">
                  <img
                    src={selectedPengajuan.fileKk}
                    alt="KK"
                    className="max-h-60 rounded shadow-xs"
                  />
                </div>
              </div>

              {/* Berkas 3: Pipil / SPPT */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  3. Surat Pajak Tanah / Pipil SPPT PBB
                </h4>
                <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex items-center justify-center">
                  <img
                    src={selectedPengajuan.filePipil}
                    alt="Pipil SPPT PBB"
                    className="max-h-60 rounded shadow-xs"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 italic">
                Status saat ini: <strong className="text-slate-800">{selectedPengajuan.status}</strong>
              </span>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-700"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Massal CSV e-RDKK */}
      {importModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Import Kolektif Standar Kementan
                </span>
                <h3 className="font-black text-slate-900 text-lg mt-1">
                  Import Massal Usulan e-RDKK via CSV / Excel
                </h3>
                <p className="text-xs text-slate-500">
                  Unggah file CSV berisi daftar petani, Tempat/Tgl Lahir, Nama Ibu Kandung, dan Luas Lahan (Ha) untuk didaftarkan sekaligus.
                </p>
              </div>
              <button
                onClick={() => {
                  setImportModalOpen(false);
                  setImportRows([]);
                }}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-slate-800">1. Unduh Template Resmi CSV e-RDKK Kecamatan Lembeyan</p>
                <p className="text-slate-500 text-[11px]">
                  Berisi contoh 2 baris petani lengkap dengan kolom NIK, Tempat/Tgl Lahir, Ibu Kandung, Desa, Kabupaten, dan Luas Lahan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const csv = generateErdkkImportTemplateCsv();
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'Template-Import-eRDKK-Kec-Lembeyan.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                Unduh Template .CSV
              </button>
            </div>

            <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/40 rounded-2xl p-5 text-center">
              <p className="text-xs font-bold text-slate-800 mb-2">
                2. Pilih File CSV Hasil Pengisian Kelompok Tani (.csv)
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const text = String(ev.target?.result || '');
                    const parsed = parseErdkkImportCsv(text);
                    setImportRows(parsed);
                  };
                  reader.readAsText(file);
                }}
                className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
              />
            </div>

            {importRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-emerald-800">
                  Pratinjau Data Terbaca: {importRows.length} Baris Usulan Petani Siap Diimpor
                </p>
                <div className="max-h-52 overflow-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="px-2.5 py-1.5">NIK</th>
                        <th className="px-2.5 py-1.5">Nama Petani</th>
                        <th className="px-2.5 py-1.5">TTL</th>
                        <th className="px-2.5 py-1.5">Ibu Kandung</th>
                        <th className="px-2.5 py-1.5">Desa / Kab</th>
                        <th className="px-2.5 py-1.5">Luas (Ha)</th>
                        <th className="px-2.5 py-1.5">Komoditas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importRows.map((r, i) => (
                        <tr key={i}>
                          <td className="px-2.5 py-1.5 font-mono">{r.nik || r.nik_petani}</td>
                          <td className="px-2.5 py-1.5 font-bold">{r.nama_petani || r.nama}</td>
                          <td className="px-2.5 py-1.5">{r.tempat_lahir || 'Magetan'}, {r.tanggal_lahir || '-'}</td>
                          <td className="px-2.5 py-1.5">{r.nama_ibu_kandung || '-'}</td>
                          <td className="px-2.5 py-1.5">{r.desa || 'Kediren'}, {r.kabupaten || 'Magetan'}</td>
                          <td className="px-2.5 py-1.5 font-bold text-emerald-700">{r.luas_ha || '0.5'} Ha</td>
                          <td className="px-2.5 py-1.5">{r.komoditas || 'Padi'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setImportModalOpen(false);
                  setImportRows([]);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={importRows.length === 0 || importing}
                onClick={async () => {
                  try {
                    setImporting(true);
                    const res = await fetch('/api/pengajuan/import', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        rows: importRows,
                        defaultPoktanId: scopePoktanId || poktanList[0]?.id,
                      }),
                    });
                    const json = await res.json();
                    if (json.success) {
                      showSuccess('Import Berhasil', `Berhasil mengimpor ${json.importedCount} usulan pengajuan e-RDKK baru!`);
                      setImportModalOpen(false);
                      setImportRows([]);
                      fetchPengajuan();
                    } else {
                      showError('Gagal Mengimpor', json.error || 'Terjadi kesalahan saat memproses data');
                    }
                  } catch (err: any) {
                    showError('Kesalahan Jaringan', err.message);
                  } finally {
                    setImporting(false);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                {importing ? 'Memproses Import...' : `Proses Import (${importRows.length} Baris)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kamera Langsung untuk KTP / KK / Pipil */}
      <CameraCaptureModal
        isOpen={cameraModalOpen}
        title={cameraTitle}
        defaultFacingMode="environment"
        onCapture={handleCameraCapture}
        onClose={() => setCameraModalOpen(false)}
      />
    </div>
  );
}
