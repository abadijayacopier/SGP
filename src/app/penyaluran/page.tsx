'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  formatRupiah,
} from '@/lib/calculations';
import {
  showSuccess,
  showError,
  showWarning,
  showConfirm,
  showDeleteConfirm,
  showToast,
} from '@/lib/sweetalert';
import CameraCaptureModal from '@/components/ui/CameraCaptureModal';
import QrCodeView from '@/components/ui/QrCodeView';
import QrScannerModal from '@/components/ui/QrScannerModal';
import PetaniSignaturePad from '@/components/ui/PetaniSignaturePad';
import { generateAutoSignatureSvg, generateOfficialStampSvg } from '@/lib/signature-utils';
import {
  Sprout,
  ShieldCheck,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Printer,
  Search,
  FileText,
  UserCheck,
  Building,
  Clock,
  X,
  Scan,
  ExternalLink,
  QrCode,
  CreditCard,
  Trash2,
  Eye,
} from 'lucide-react';

interface PenyaluranItem {
  id: string;
  nomorNota: string;
  namaKios: string;
  petugasKios: string;
  namaPengurusPoktan: string;
  tanggalPenyaluran: string;
  jumlahUreaKg: number;
  jumlahNpkKg: number;
  jumlahOrganikKg: number;
  totalBiayaRp: number;
  fotoKtp: string;
  fotoDiri: string;
  catatan?: string | null;
  status: string;
  petani: {
    nama: string;
    nik: string;
    desa: string;
    kecamatan: string;
    poktan: {
      nama: string;
    };
  };
}

export default function PenyaluranPage() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'transaksi' | 'riwayat'>('transaksi');
  const [penyaluranList, setPenyaluranList] = useState<PenyaluranItem[]>([]);
  const [petaniList, setPetaniList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Petani State & Quotas
  const [selectedPetani, setSelectedPetani] = useState<any | null>(null);
  const [alokasiAktif, setAlokasiAktif] = useState<any | null>(null);
  const [stokKios, setStokKios] = useState<{
    stokUreaKg: number;
    stokNpkKg: number;
    stokOrganikKg: number;
  }>({ stokUreaKg: 2500, stokNpkKg: 2500, stokOrganikKg: 3000 });

  // Form State
  const [inputUrea, setInputUrea] = useState<number>(0);
  const [inputNpk, setInputNpk] = useState<number>(0);
  const [inputOrganik, setInputOrganik] = useState<number>(0);
  const [namaPengurusPoktan, setNamaPengurusPoktan] = useState(
    currentUser.role === 'POKTAN'
      ? `${currentUser.name} (Ketua ${currentUser.wilayah || 'Poktan'})`
      : 'H. Suparman (Ketua Poktan Tani Makmur I)'
  );
  const [namaKios, setNamaKios] = useState(currentUser.kiosName || 'UD. Tani Subur Barokah');
  const [petugasKios, setPetugasKios] = useState(currentUser.name);
  const [fotoKtp, setFotoKtp] = useState('/uploads/sample_ktp.svg');
  const [fotoDiri, setFotoDiri] = useState('/uploads/sample_petani_face.svg');
  const [catatan, setCatatan] = useState('Penebusan pupuk bersubsidi resmi dengan verifikasi fisik KTP & foto diri.');
  const [tandaTanganPetani, setTandaTanganPetani] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Sync state saat currentUser berganti
  useEffect(() => {
    if (currentUser.kiosName) {
      setNamaKios(currentUser.kiosName);
    }
    if (currentUser.name) {
      setPetugasKios(currentUser.name);
    }
    if (currentUser.role === 'POKTAN') {
      setNamaPengurusPoktan(`${currentUser.name} (Ketua ${currentUser.wilayah || 'Poktan'})`);
    }
  }, [currentUser]);

  // Kamera Live Modal State
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'ktp' | 'diri'>('ktp');

  // QR Scanner Kartu Tani Modal State
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [scanVerificationBadge, setScanVerificationBadge] = useState<string | null>(null);

  // Modal Nota Cetak Digital
  const [notaModalOpen, setNotaModalOpen] = useState(false);
  const [activeNota, setActiveNota] = useState<PenyaluranItem | null>(null);

  // Harga Eceran Tertinggi (HET) Subsidi per Kg
  const HET_UREA = 2250;
  const HET_NPK = 2300;
  const HET_ORGANIK = 800;

  const totalBiaya =
    inputUrea * HET_UREA + inputNpk * HET_NPK + inputOrganik * HET_ORGANIK;

  const fetchPenyaluran = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pupuk/penyaluran');
      const json = await res.json();
      if (json.success) {
        let list: PenyaluranItem[] = json.data;
        if (currentUser.role === 'KIOS' && currentUser.kiosName) {
          list = list.filter((item) => item.namaKios === currentUser.kiosName);
        } else if (currentUser.role === 'POKTAN' && currentUser.poktanId) {
          list = list.filter((item) => (item.petani as any)?.poktanId === currentUser.poktanId);
        } else if (currentUser.role === 'PETANI') {
          list = list.filter((item) => item.petani?.nik === currentUser.username || (item.petani as any)?.id === currentUser.petaniId);
        }
        setPenyaluranList(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPetani = async () => {
    try {
      let url = '/api/petani';
      if (currentUser.role === 'PETANI' && currentUser.petaniId) {
        url = `/api/petani?petaniId=${currentUser.petaniId}`;
      } else if (currentUser.role === 'POKTAN' && currentUser.poktanId) {
        url = `/api/petani?poktanId=${currentUser.poktanId}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setPetaniList(json.data);
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const targetPetaniId = urlParams?.get('petaniId');
        const matched = targetPetaniId ? json.data.find((p: any) => p.id === targetPetaniId) : null;
        if (matched) {
          handleSelectPetani(matched);
          setScanVerificationBadge('Kartu Tani Digital');
        } else {
          handleSelectPetani(json.data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStokKios = async () => {
    try {
      const res = await fetch('/api/kios/stok');
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const ureaRow = json.data.find((r: any) => String(r.jenisPupuk).toLowerCase().includes('urea'));
        const npkRow = json.data.find((r: any) => String(r.jenisPupuk).toLowerCase().includes('npk'));
        const orgRow = json.data.find((r: any) => String(r.jenisPupuk).toLowerCase().includes('organik'));
        setStokKios({
          stokUreaKg: Number(ureaRow?.stokSisaKg ?? 2500),
          stokNpkKg: Number(npkRow?.stokSisaKg ?? 2500),
          stokOrganikKg: Number(orgRow?.stokSisaKg ?? 3000),
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPenyaluran();
    fetchPetani();
    fetchStokKios();
  }, [currentUser.role, currentUser.kiosName, currentUser.poktanId, currentUser.petaniId]);

  const handleSelectPetani = (petani: any) => {
    setSelectedPetani(petani);
    setTandaTanganPetani(generateAutoSignatureSvg(petani.nama));
    if (petani.alokasiPupuk && petani.alokasiPupuk.length > 0) {
      const active = petani.alokasiPupuk[0];
      setAlokasiAktif(active);
      setInputUrea(Math.min(50, active.sisaUreaKg));
      setInputNpk(Math.min(50, active.sisaNpkKg));
      setInputOrganik(0);
    } else {
      setAlokasiAktif(null);
      setInputUrea(0);
      setInputNpk(0);
      setInputOrganik(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'ktp' | 'diri') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'ktp') setFotoKtp(reader.result as string);
        else setFotoDiri(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenLiveCamera = (target: 'ktp' | 'diri') => {
    setCameraTarget(target);
    setCameraModalOpen(true);
  };

  const handleCameraCaptureSuccess = (dataUrl: string) => {
    if (cameraTarget === 'ktp') {
      setFotoKtp(dataUrl);
    } else {
      setFotoDiri(dataUrl);
    }
  };

  const handleSubmitPenyaluran = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPetani || !alokasiAktif) {
      showWarning('Pilih Petani', 'Pilih petani yang memiliki alokasi pupuk aktif terlebih dahulu!');
      return;
    }

    if (inputUrea === 0 && inputNpk === 0 && inputOrganik === 0) {
      showWarning('Jumlah Pupuk Kosong', 'Pilih minimal satu jenis pupuk yang ingin ditebus!');
      return;
    }

    if (inputUrea > alokasiAktif.sisaUreaKg) {
      showWarning('Melebihi Kuota', `Jumlah Urea (${inputUrea} Kg) melebihi sisa kuota e-RDKK (${alokasiAktif.sisaUreaKg} Kg)!`);
      return;
    }
    if (inputNpk > alokasiAktif.sisaNpkKg) {
      showWarning('Melebihi Kuota', `Jumlah NPK (${inputNpk} Kg) melebihi sisa kuota e-RDKK (${alokasiAktif.sisaNpkKg} Kg)!`);
      return;
    }
    if (inputOrganik > alokasiAktif.sisaOrganikKg) {
      showWarning('Melebihi Kuota', `Jumlah Organik (${inputOrganik} Kg) melebihi sisa kuota e-RDKK (${alokasiAktif.sisaOrganikKg} Kg)!`);
      return;
    }

    try {
      setSubmitting(true);
      const finalTtd = tandaTanganPetani || (selectedPetani ? generateAutoSignatureSvg(selectedPetani.nama) : null);
      const res = await fetch('/api/pupuk/penyaluran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petaniId: selectedPetani.id,
          namaKios,
          petugasKios,
          namaPengurusPoktan,
          jumlahUreaKg: inputUrea,
          jumlahNpkKg: inputNpk,
          jumlahOrganikKg: inputOrganik,
          totalBiayaRp: totalBiaya,
          fotoKtp,
          fotoDiri,
          tandaTanganPetani: finalTtd,
          catatan,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showSuccess('Penyaluran Berhasil', 'Penyaluran pupuk bersubsidi berhasil diproses dan kuota telah dikurangi.');
        setActiveNota(json.data);
        setNotaModalOpen(true);
        fetchPenyaluran();
        fetchPetani();
      } else {
        showError('Gagal Penyaluran', json.error || 'Terjadi kesalahan saat memproses penyaluran');
      }
    } catch (err: any) {
      showError('Gagal Koneksi', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Batalkan Transaksi Penyaluran (Rollback Kuota Petani & Stok Kios)
  const handleBatalPenyaluran = async (item: PenyaluranItem) => {
    const confirmDelete = await showDeleteConfirm(
      item.nomorNota,
      `Batalkan transaksi penyaluran nomor <strong>${item.nomorNota}</strong> atas nama <strong>${item.petani.nama}</strong>?<br/><br/><span class="text-xs text-slate-600 block text-left bg-slate-50 p-2.5 rounded-xl border border-slate-200">Pembatalan ini otomatis:<br/>&bull; Mengembalikan kuota e-RDKK petani (Urea: ${item.jumlahUreaKg} Kg, NPK: ${item.jumlahNpkKg} Kg, Organik: ${item.jumlahOrganikKg} Kg)<br/>&bull; Mengembalikan stok fisik pupuk di Kios<br/>&bull; Menghapus rekam transaksi ini</span>`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/pupuk/penyaluran?id=${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showSuccess('Penyaluran Dibatalkan', json.message || 'Transaksi penyaluran berhasil dibatalkan!');
        fetchPenyaluran();
        fetchPetani();
        fetchStokKios();
      } else {
        showError('Gagal Membatalkan', json.error || 'Gagal membatalkan penyaluran');
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Sprout className="w-6 h-6 text-emerald-600" />
            Penyaluran Pupuk Bersubsidi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Penebusan pupuk di Kios resmi dengan verifikasi live camera foto KTP & foto diri petani yang divalidasi pengurus Poktan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('transaksi')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'transaksi'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            + Transaksi Penebusan Baru
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'riwayat'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Riwayat Penyaluran ({penyaluranList.length})
          </button>
        </div>
      </div>

      {/* TAB 1: FORM TRANSAKSI PENEBUSAN PUPUK */}
      {activeTab === 'transaksi' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Penebusan */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <form onSubmit={handleSubmitPenyaluran} className="space-y-6 text-xs">
              {/* Step 1: Pilih Petani / Scan QR Kartu Tani */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 text-emerald-700">
                    <UserCheck className="w-4 h-4" />
                    1. Pilih Petani Penerima / Scan QR Kartu Tani
                  </h3>
                  <button
                    type="button"
                    onClick={() => setQrScannerOpen(true)}
                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-700 to-green-800 hover:from-emerald-600 hover:to-green-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-sm transition active:scale-95"
                  >
                    <QrCode className="w-3.5 h-3.5 text-amber-300" />
                    Scan QR Kartu Tani
                  </button>
                </div>

                {scanVerificationBadge && selectedPetani && (
                  <div className="mb-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2 text-emerald-900">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Kartu Tani Terverifikasi Otomatis (<strong>{scanVerificationBadge}</strong>) &mdash;{' '}
                        <span className="font-mono font-bold">KT-3509-2026-{selectedPetani.nik.slice(-6)}</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScanVerificationBadge(null)}
                      className="text-emerald-600 hover:text-emerald-900"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <label className="block font-bold text-slate-700 mb-1">Cari NIK / Nama Petani *</label>
                <select
                  value={selectedPetani?.id || ''}
                  onChange={(e) => {
                    const p = petaniList.find((item) => item.id === e.target.value);
                    if (p) {
                      setScanVerificationBadge(null);
                      handleSelectPetani(p);
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white font-medium text-xs"
                >
                  {petaniList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} &bull; NIK: {p.nik} &bull; {p.poktan?.nama} ({p.desa}) &bull; {p.lahan?.length || 0} Blok Lahan
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Rincian Kuota & Jumlah Penebusan */}
              {alokasiAktif ? (
                <div className="pt-4 border-t border-slate-100">
                   <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 text-emerald-700">
                      <Sprout className="w-4 h-4" />
                      2. Input Jumlah Penebusan & Kontrol Kuota
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl text-slate-700">
                      <Building className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Stok Gudang Kios KPL:</span>
                      <strong className="text-green-800">Urea {stokKios.stokUreaKg} Kg</strong> &bull;
                      <strong className="text-amber-800">NPK {stokKios.stokNpkKg} Kg</strong> &bull;
                      <strong className="text-slate-800">Org {stokKios.stokOrganikKg} Kg</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    {/* Urea */}
                    <div className="border border-green-200 bg-green-50/50 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-green-900">Urea Bersubsidi</span>
                        <span className="text-[10px] font-bold bg-green-200 text-green-800 px-1.5 py-0.5 rounded">
                          HET Rp2.250/Kg
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mb-2">
                        Sisa Kuota: <strong className="text-green-800">{alokasiAktif.sisaUreaKg} Kg</strong> / {alokasiAktif.jatahUreaKg} Kg
                      </div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jumlah Diambil (Kg):</label>
                      <input
                        type="number"
                        min="0"
                        max={alokasiAktif.sisaUreaKg}
                        value={inputUrea}
                        onChange={(e) => setInputUrea(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 border border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 bg-white font-bold text-slate-800"
                      />
                    </div>

                    {/* NPK Phonska */}
                    <div className="border border-amber-200 bg-amber-50/50 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-amber-900">NPK Phonska</span>
                        <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                          HET Rp2.300/Kg
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mb-2">
                        Sisa Kuota: <strong className="text-amber-800">{alokasiAktif.sisaNpkKg} Kg</strong> / {alokasiAktif.jatahNpkKg} Kg
                      </div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jumlah Diambil (Kg):</label>
                      <input
                        type="number"
                        min="0"
                        max={alokasiAktif.sisaNpkKg}
                        value={inputNpk}
                        onChange={(e) => setInputNpk(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 bg-white font-bold text-slate-800"
                      />
                    </div>

                    {/* Pupuk Organik */}
                    <div className="border border-slate-200 bg-slate-50 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">Organik Petroganik</span>
                        <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                          HET Rp800/Kg
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mb-2">
                        Sisa Kuota: <strong className="text-slate-800">{alokasiAktif.sisaOrganikKg} Kg</strong> / {alokasiAktif.jatahOrganikKg} Kg
                      </div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jumlah Diambil (Kg):</label>
                      <input
                        type="number"
                        min="0"
                        max={alokasiAktif.sisaOrganikKg}
                        value={inputOrganik}
                        onChange={(e) => setInputOrganik(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 bg-white font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-emerald-800">Total Biaya Penebusan Resmi (HET):</span>
                      <div className="text-xl font-black text-emerald-950">{formatRupiah(totalBiaya)}</div>
                    </div>
                    <div className="text-right text-[11px] text-emerald-700">
                      Total Pupuk: <strong className="text-sm font-black">{inputUrea + inputNpk + inputOrganik} Kg</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs">
                  Petani ini belum memiliki data alokasi e-RDKK aktif. Silakan ajukan di Modul Pengajuan e-RDKK terlebih dahulu.
                </div>
              )}

              {/* Step 3: Verifikasi Foto KTP & Foto Diri dengan KAMERA LANGSUNG */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 text-emerald-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    3. Verifikasi Foto Identitas (Kamera Live / Unggah) & Validasi Poktan
                  </h3>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    Live Webcam Ready
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Gunakan tombol <strong>Kamera Live</strong> untuk menjepret langsung foto KTP dan wajah petani di tempat, atau unggah dari file.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {/* Foto KTP */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block mb-1">1. Foto KTP Asli Petani</span>
                      <p className="text-[11px] text-slate-500 mb-2">Pemeriksaan fisik NIK di tempat penebusan</p>
                      <div className="h-32 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-1 mb-2">
                        <img src={fotoKtp} alt="KTP Petani" className="max-h-full object-contain rounded" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenLiveCamera('ktp')}
                        className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-xl text-xs transition shadow-2xs"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Kamera Live
                      </button>
                      <label className="cursor-pointer inline-flex items-center justify-center gap-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold px-2.5 py-1.5 rounded-xl text-xs transition">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        Pilih Berkas
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'ktp')}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Foto Diri Petani */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block mb-1">2. Foto Diri Petani Penerima</span>
                      <p className="text-[11px] text-slate-500 mb-2">Dokumentasi wajah penerima saat serah terima</p>
                      <div className="h-32 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-1 mb-2">
                        <img src={fotoDiri} alt="Foto Petani" className="max-h-full object-contain rounded" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenLiveCamera('diri')}
                        className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-xl text-xs transition shadow-2xs"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Kamera Live
                      </button>
                      <label className="cursor-pointer inline-flex items-center justify-center gap-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold px-2.5 py-1.5 rounded-xl text-xs transition">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        Pilih Berkas
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'diri')}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nama Pengurus Poktan (Saksi Validasi) *
                    </label>
                    <input
                      type="text"
                      required
                      value={namaPengurusPoktan}
                      onChange={(e) => setNamaPengurusPoktan(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Petugas Kios Penyalur *
                    </label>
                    <input
                      type="text"
                      required
                      value={petugasKios}
                      onChange={(e) => setPetugasKios(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Step 4: Tanda Tangan Digital Petani Penerima Pupuk */}
                {selectedPetani && (
                  <div className="pt-2">
                    <PetaniSignaturePad
                      namaPetani={selectedPetani.nama}
                      signature={tandaTanganPetani}
                      onChange={setTandaTanganPetani}
                      disabled={submitting}
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={submitting || !alokasiAktif || (inputUrea === 0 && inputNpk === 0 && inputOrganik === 0)}
                  className={`px-8 py-3 rounded-2xl font-black text-sm text-white shadow-lg transition flex items-center gap-2 ${
                    submitting || !alokasiAktif || (inputUrea === 0 && inputNpk === 0 && inputOrganik === 0)
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-95'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {submitting ? 'Memproses Penyaluran...' : 'Proses Penebusan & Cetak Nota'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Kartu Tani Digital Preview & Panduan */}
          <div className="space-y-6">
            {selectedPetani && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-xs space-y-4">
                {/* Mini Kartu Tani Visual */}
                <div className="rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-950 text-white p-4 shadow-md border border-emerald-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-700/70 pb-2">
                    <span className="text-[10px] font-black tracking-wider uppercase text-amber-300 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" /> KARTU TANI DIGITAL
                    </span>
                    <span className="font-mono text-[10px] text-emerald-200">
                      KT-3509-{selectedPetani.nik.slice(-6)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase">{selectedPetani.nama}</h3>
                      <p className="font-mono text-[11px] text-amber-300">NIK: {selectedPetani.nik}</p>
                      <p className="text-[10px] text-emerald-200 mt-0.5">{selectedPetani.poktan?.nama}</p>
                    </div>
                    <QrCodeView
                      value={`KARTUTANI:${selectedPetani.nik}:${selectedPetani.id}`}
                      size={54}
                    />
                  </div>
                </div>

                <div className="space-y-2 text-slate-600">
                  <p>
                    <span className="text-slate-400">Kelompok Tani:</span>{' '}
                    <strong className="text-slate-800">{selectedPetani.poktan?.nama}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Tempat, Tgl Lahir:</span>{' '}
                    <strong className="text-slate-800">
                      {selectedPetani.tempatLahir || 'Magetan'}
                      {selectedPetani.tanggalLahir ? `, ${selectedPetani.tanggalLahir}` : ''}
                    </strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Nama Ibu Kandung:</span>{' '}
                    <strong className="text-slate-800">{selectedPetani.namaIbuKandung || '-'}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Alamat:</span>{' '}
                    {selectedPetani.alamat}, Desa {selectedPetani.desa}, Kec. {selectedPetani.kecamatan}, Kab.{' '}
                    {selectedPetani.kabupaten || 'Magetan'}
                  </p>
                  <p>
                    <span className="text-slate-400">Jumlah Blok Lahan:</span>{' '}
                    <strong className="text-emerald-700">{selectedPetani.lahan?.length || 0} Petak</strong> ({Number(selectedPetani.totalLuasLahan || 0).toFixed(2)} Ha)
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href={`/cetak-kartu-tani/${selectedPetani.id}`}
                    target="_blank"
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-300" />
                    Cetak Kartu Tani Digital (ID Card)
                  </Link>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <h4 className="font-bold text-slate-700 mb-1 text-[11px]">Kios Penyalur Resmi:</h4>
                  <p className="font-bold text-slate-800">{namaKios}</p>
                  <p className="text-[10px] text-slate-500">Kecamatan Lembeyan</p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 text-xs text-blue-900 space-y-2">
              <h4 className="font-bold text-sm text-blue-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                Ketentuan Penyaluran Pupuk
              </h4>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Petani wajib terdaftar dalam e-RDKK tahun berjalan.</li>
                <li>Penebusan tidak boleh melebihi sisa kuota yang tercatat pada sistem.</li>
                <li>Pengurus Poktan wajib memverifikasi kesesuaian fisik penerima dengan KTP asli.</li>
                <li>Nota Serah Terima dilengkapi QR Code resmi dan otomatis mengurangi kuota secara real-time.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RIWAYAT PENYALURAN PUPUK DENGAN DOKUMENTASI FOTO */}
      {activeTab === 'riwayat' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Riwayat Transaksi Penyaluran Pupuk Terverifikasi
              </h3>
              <p className="text-xs text-slate-500">
                Setiap transaksi dilengkapi bukti dokumentasi foto KTP asli dan foto diri penerima.
              </p>
            </div>
          </div>

          {/* Mobile Card View (Smartphone Friendly - Tanpa Perlu Geser Layar) */}
          <div className="block lg:hidden divide-y divide-slate-100">
            {penyaluranList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Belum ada riwayat penyaluran pupuk resmi.
              </div>
            ) : (
              penyaluranList.map((item) => (
                <div key={item.id} className="p-4 hover:bg-slate-50 transition space-y-3">
                  {/* Header: Nota & Tanggal */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                      {item.nomorNota}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(item.tanggalPenyaluran).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Petani Info & Foto Verifikasi */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-slate-900 text-sm leading-tight truncate">
                        {item.petani.nama}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        NIK: {item.petani.nik}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                        🌾 {item.petani.poktan?.nama} &bull; Kios: {item.namaKios}
                      </p>
                    </div>

                    {/* Foto Thumbnails */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.fotoKtp && (
                        <img
                          src={item.fotoKtp}
                          alt="KTP"
                          title="Foto KTP Asli"
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-2xs"
                        />
                      )}
                      {item.fotoDiri && (
                        <img
                          src={item.fotoDiri}
                          alt="Wajah"
                          title="Foto Wajah Penerima"
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-2xs"
                        />
                      )}
                    </div>
                  </div>

                  {/* Rincian Pupuk & Total Biaya */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <div className="text-xs font-bold text-emerald-800 space-x-1.5 flex flex-wrap gap-1">
                      {item.jumlahUreaKg > 0 && (
                        <span className="bg-emerald-100/70 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          Urea: {item.jumlahUreaKg} Kg
                        </span>
                      )}
                      {item.jumlahNpkKg > 0 && (
                        <span className="bg-blue-100/70 text-blue-900 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                          NPK: {item.jumlahNpkKg} Kg
                        </span>
                      )}
                      {item.jumlahOrganikKg > 0 && (
                        <span className="bg-amber-100/70 text-amber-900 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                          Org: {item.jumlahOrganikKg} Kg
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-slate-900 text-sm block leading-tight font-mono">
                        {formatRupiah(item.totalBiayaRp)}
                      </span>
                      <span className="text-[9px] text-emerald-700 font-bold">LUNAS HET</span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveNota(item);
                        setNotaModalOpen(true);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 font-bold text-xs bg-emerald-50 text-emerald-800 hover:bg-emerald-100 active:scale-95 border border-emerald-200 py-2 px-3 rounded-xl transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detail</span>
                    </button>

                    <Link
                      href={`/cetak-nota/${item.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1 font-bold text-xs bg-slate-900 text-white hover:bg-emerald-700 active:scale-95 py-2 px-3 rounded-xl shadow-xs transition"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Cetak Nota</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleBatalPenyaluran(item)}
                      className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 border border-red-200 transition"
                      title="Batalkan Penebusan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">No. Nota & Waktu</th>
                  <th className="py-3 px-4">Petani & Poktan</th>
                  <th className="py-3 px-4">Dokumentasi Foto</th>
                  <th className="py-3 px-4">Rincian Pupuk (Kg)</th>
                  <th className="py-3 px-4">Total Biaya</th>
                  <th className="py-3 px-4">Verifikator Poktan</th>
                  <th className="py-3 px-4 text-right">Nota Digital</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {penyaluranList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                        {item.nomorNota}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {new Date(item.tanggalPenyaluran).toLocaleString('id-ID')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.petani.nama}</div>
                      <div className="text-[11px] text-slate-500 font-mono">NIK: {item.petani.nik}</div>
                      <div className="text-[10px] text-slate-400">{item.petani.poktan.nama}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.fotoKtp}
                          alt="KTP"
                          title="Foto KTP"
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-2xs"
                        />
                        <img
                          src={item.fotoDiri}
                          alt="Foto Diri"
                          title="Foto Wajah Penerima"
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-2xs"
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-emerald-800">
                        {item.jumlahUreaKg > 0 && <span>Urea: {item.jumlahUreaKg} Kg </span>}
                        {item.jumlahNpkKg > 0 && <span>NPK: {item.jumlahNpkKg} Kg </span>}
                        {item.jumlahOrganikKg > 0 && <span>Org: {item.jumlahOrganikKg} Kg</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {formatRupiah(item.totalBiayaRp)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-700">{item.namaPengurusPoktan}</div>
                      <div className="text-[10px] text-slate-400">Kios: {item.namaKios}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveNota(item);
                            setNotaModalOpen(true);
                          }}
                          title="Lihat Detail & Foto Verifikasi"
                          className="inline-flex items-center gap-1 font-bold text-xs bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Detail
                        </button>
                        <Link
                          href={`/cetak-nota/${item.id}`}
                          title="Buka Lembar Cetak Nota"
                          className="inline-flex items-center gap-1 font-bold text-xs bg-slate-900 text-white hover:bg-emerald-700 px-2.5 py-1.5 rounded-lg shadow-2xs transition"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-300" />
                          Nota
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleBatalPenyaluran(item)}
                          title="Batalkan Penebusan & Kembalikan Kuota/Stok"
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition"
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
      )}

      {/* Modal Live Kamera Jepret Foto */}
      <CameraCaptureModal
        isOpen={cameraModalOpen}
        title={cameraTarget === 'ktp' ? 'Jepret Foto KTP Petani Asli' : 'Jepret Foto Diri Petani Penerima'}
        defaultFacingMode={cameraTarget === 'ktp' ? 'environment' : 'user'}
        onCapture={handleCameraCaptureSuccess}
        onClose={() => setCameraModalOpen(false)}
      />

      {/* Modal Pemindai QR Kartu Tani Digital */}
      <QrScannerModal
        isOpen={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        petaniList={petaniList}
        onSelectPetani={(petaniId, method) => {
          const found = petaniList.find((p) => p.id === petaniId);
          if (found) {
            handleSelectPetani(found);
            setScanVerificationBadge(method);
          }
        }}
      />

      {/* Modal Cetak Nota Digital Bukti Penebusan Lengkap dengan QR Code */}
      {notaModalOpen && activeNota && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-base">
                Bukti Serah Terima Pupuk Bersubsidi
              </h3>
              <button
                onClick={() => setNotaModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Konten Nota Cetak */}
            <div className="py-4 space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="text-left">
                  <h4 className="font-black text-sm uppercase text-slate-800">
                    {activeNota.namaKios}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Kios Pupuk Lengkap (KPL) Resmi Subsidi Pemerintah
                  </p>
                  <p className="text-xs font-mono font-bold text-emerald-800 mt-1">
                    NO: {activeNota.nomorNota}
                  </p>
                </div>
                {/* QR Code Verifikasi Nota */}
                <QrCodeView
                  value={`https://pertanian.lembeyan.go.id/verifikasi/nota/${activeNota.nomorNota}`}
                  size={70}
                  caption="SCAN NOTA"
                />
              </div>

              <table className="w-full text-xs">
                <tbody>
                  <tr>
                    <td className="py-1 text-slate-500 w-32">Nama Petani</td>
                    <td className="py-1 font-bold text-slate-800">: {activeNota.petani.nama}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-500">NIK Petani</td>
                    <td className="py-1 font-mono text-slate-800">: {activeNota.petani.nik}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-500">Kelompok Tani</td>
                    <td className="py-1 text-slate-800">: {activeNota.petani.poktan.nama}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-500">Waktu Penyaluran</td>
                    <td className="py-1 text-slate-800">
                      : {new Date(activeNota.tanggalPenyaluran).toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                <div className="font-bold text-slate-700 mb-2 border-b pb-1">
                  Rincian Pupuk yang Ditebus:
                </div>
                <div className="space-y-1.5">
                  {activeNota.jumlahUreaKg > 0 && (
                    <div className="flex justify-between">
                      <span>Urea Bersubsidi</span>
                      <span className="font-bold">{activeNota.jumlahUreaKg} Kg</span>
                    </div>
                  )}
                  {activeNota.jumlahNpkKg > 0 && (
                    <div className="flex justify-between">
                      <span>NPK Phonska Bersubsidi</span>
                      <span className="font-bold">{activeNota.jumlahNpkKg} Kg</span>
                    </div>
                  )}
                  {activeNota.jumlahOrganikKg > 0 && (
                    <div className="flex justify-between">
                      <span>Pupuk Organik</span>
                      <span className="font-bold">{activeNota.jumlahOrganikKg} Kg</span>
                    </div>
                  )}
                  <div className="pt-2 border-t flex justify-between font-bold text-sm text-emerald-900">
                    <span>Total Pembayaran (HET)</span>
                    <span>{formatRupiah(activeNota.totalBiayaRp)}</span>
                  </div>
                </div>
              </div>

              {/* Lampiran Foto Verifikasi */}
              <div>
                <span className="font-bold text-slate-700 block mb-1.5">
                  Lampiran Verifikasi Fisik di Kios:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="border rounded-lg p-1 text-center bg-slate-50">
                    <img src={activeNota.fotoKtp} alt="KTP" className="h-20 mx-auto object-contain" />
                    <span className="text-[10px] text-slate-500">Foto KTP Petani</span>
                  </div>
                  <div className="border rounded-lg p-1 text-center bg-slate-50">
                    <img src={activeNota.fotoDiri} alt="Wajah" className="h-20 mx-auto object-contain" />
                    <span className="text-[10px] text-slate-500">Foto Diri Penerima</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t grid grid-cols-3 text-center text-[10px] gap-2">
                <div className="border border-slate-200/80 bg-slate-50/50 p-2 rounded-xl">
                  <p className="text-slate-500 font-semibold">Petani Penerima,</p>
                  <div className="h-10 flex items-center justify-center my-1 bg-white rounded border border-slate-200/60 p-0.5">
                    <img
                      src={(activeNota as any).tandaTanganPetani || generateAutoSignatureSvg(activeNota.petani.nama)}
                      alt="TTD Petani"
                      className="max-h-9 max-w-full object-contain"
                    />
                  </div>
                  <p className="font-bold text-slate-800 underline uppercase">{activeNota.petani.nama}</p>
                </div>
                <div className="border border-slate-200/80 bg-slate-50/50 p-2 rounded-xl">
                  <p className="text-slate-500 font-semibold">Saksi Poktan,</p>
                  <div className="h-10 flex items-center justify-center my-1 bg-white rounded border border-slate-200/60 p-0.5">
                    <img
                      src={generateAutoSignatureSvg(activeNota.namaPengurusPoktan)}
                      alt="TTD Poktan"
                      className="max-h-9 max-w-full object-contain"
                    />
                  </div>
                  <p className="font-bold text-slate-800 underline uppercase">{activeNota.namaPengurusPoktan}</p>
                </div>
                <div className="border border-slate-200/80 bg-slate-50/50 p-2 rounded-xl">
                  <p className="text-slate-500 font-semibold">Petugas Kios,</p>
                  <div className="h-10 flex items-center justify-center my-1 bg-white rounded border border-slate-200/60 p-0.5">
                    <img
                      src={generateAutoSignatureSvg(activeNota.petugasKios)}
                      alt="TTD Kios"
                      className="max-h-9 max-w-full object-contain"
                    />
                  </div>
                  <p className="font-bold text-slate-800 underline uppercase">{activeNota.petugasKios}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/cetak-nota/${activeNota.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl border border-emerald-200 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka Halaman Cetak Lengkap (A4 / Thermal)
              </Link>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNotaModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Tutup
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Cepat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
