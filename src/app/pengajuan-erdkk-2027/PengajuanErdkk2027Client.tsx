'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Camera,
  Upload,
  User,
  Building,
  Sprout,
  ShieldCheck,
  Printer,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Calendar,
  Layers,
  Phone,
  Check,
  RefreshCw,
} from 'lucide-react';
import Swal from 'sweetalert2';
import QrCodeView from '@/components/ui/QrCodeView';
import CameraCaptureModal from '@/components/ui/CameraCaptureModal';
import { DESA_LEMBEYAN_LIST } from '@/lib/erdkk-format';
import { STANDAR_PUPUK } from '@/lib/calculations';
import { useAuth } from '@/lib/auth-context';

interface PoktanOption {
  id: string;
  nama: string;
  desa: string;
  kecamatan: string;
  ketua: string;
}

interface Props {
  poktanList: PoktanOption[];
}

export default function PengajuanErdkk2027Client({ poktanList }: Props) {
  const { currentUser } = useAuth();

  // Step state
  const [nikInput, setNikInput] = useState('');
  const [nikLoading, setNikLoading] = useState(false);
  const [nikChecked, setNikChecked] = useState(false);
  const [isRegisteredFarmer, setIsRegisteredFarmer] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<any | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
    petaniId: '',
    namaPemilik: '',
    nikPemilik: '',
    noKk: '',
    tempatLahir: 'Magetan',
    tanggalLahir: '',
    namaIbuKandung: '',
    telepon: '',
    desa: 'Kediren',
    kecamatan: 'Lembeyan',
    kabupaten: 'Magetan',
    poktanId: '',
    nomorPipil: '',
    catatan: '',
    // 3 Musim Tanam 2027
    rencanaMt1Komoditas: 'Padi',
    rencanaMt1LuasHa: 0.5,
    rencanaMt2Komoditas: 'Jagung',
    rencanaMt2LuasHa: 0.5,
    rencanaMt3Komoditas: 'Padi',
    rencanaMt3LuasHa: 0.5,
    // Berkas
    fileKtp: '',
    fileKk: '',
    filePipil: '',
  });

  const [agreementChecked, setAgreementChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal Camera
  const [cameraTarget, setCameraTarget] = useState<'KTP' | 'KK' | 'PIPIL' | null>(null);

  // Modal Tanda Terima
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const fileKtpRef = useRef<HTMLInputElement>(null);
  const fileKkRef = useRef<HTMLInputElement>(null);
  const filePipilRef = useRef<HTMLInputElement>(null);

  // Filter Poktan berdasarkan Desa yang dipilih
  const filteredPoktan = useMemo(() => {
    return poktanList.filter((p) => p.desa === formData.desa);
  }, [poktanList, formData.desa]);

  // Kalkulasi estimasi pupuk subsidi MT1, MT2, MT3 Tahun 2027
  const estimasiPupuk = useMemo(() => {
    const mt1Ref = STANDAR_PUPUK[formData.rencanaMt1Komoditas] || STANDAR_PUPUK['Padi'];
    const mt2Ref = STANDAR_PUPUK[formData.rencanaMt2Komoditas] || STANDAR_PUPUK['Jagung'];
    const mt3Ref = STANDAR_PUPUK[formData.rencanaMt3Komoditas] || STANDAR_PUPUK['Padi'];

    const mt1Luas = Number(formData.rencanaMt1LuasHa) || 0;
    const mt2Luas = Number(formData.rencanaMt2LuasHa) || 0;
    const mt3Luas = Number(formData.rencanaMt3LuasHa) || 0;

    const urea = Math.round(
      mt1Luas * mt1Ref.urea + mt2Luas * mt2Ref.urea + mt3Luas * mt3Ref.urea
    );
    const npk = Math.round(
      mt1Luas * mt1Ref.npk + mt2Luas * mt2Ref.npk + mt3Luas * mt3Ref.npk
    );
    const organik = Math.round(
      mt1Luas * mt1Ref.organik + mt2Luas * mt2Ref.organik + mt3Luas * mt3Ref.organik
    );

    const totalLuasKumulatif = Math.round((mt1Luas + mt2Luas + mt3Luas) * 100) / 100;

    return {
      ureaKg: urea,
      npkKg: npk,
      organikKg: organik,
      totalLuasKumulatif,
    };
  }, [
    formData.rencanaMt1Komoditas,
    formData.rencanaMt1LuasHa,
    formData.rencanaMt2Komoditas,
    formData.rencanaMt2LuasHa,
    formData.rencanaMt3Komoditas,
    formData.rencanaMt3LuasHa,
  ]);

  // Fungsi Cek NIK
  const handleCekNik = async (nikToCheck?: string) => {
    const targetNik = (nikToCheck || nikInput).trim().replace(/\D/g, '');
    if (!targetNik || targetNik.length < 10) {
      Swal.fire({
        icon: 'warning',
        title: 'NIK Tidak Lengkap',
        text: 'Ketikkan minimal 10 digit NIK Anda sesuai KTP.',
      });
      return;
    }

    try {
      setNikLoading(true);
      setDuplicateInfo(null);
      const res = await fetch(`/api/pengajuan/cek-nik?nik=${encodeURIComponent(targetNik)}&tahun=2027`);
      const json = await res.json();

      if (json.success) {
        setNikChecked(true);

        // KASUS 1: DUPLIKASI PENGAJUAN DI TAHUN 2027 (Edge Case 1: Blokir Duplikasi)
        if (json.alreadySubmitted && json.pengajuan) {
          setDuplicateInfo(json.pengajuan);
          setReceiptData(json.pengajuan);
          return;
        }

        // KASUS 2: PETANI MASTER TERDAFTAR (Auto-fill)
        if (json.isRegisteredFarmer && json.petani) {
          const p = json.petani;
          setIsRegisteredFarmer(true);
          const luasDefault = p.totalLuasLahan > 0 ? p.totalLuasLahan : 0.5;

          setFormData((prev) => ({
            ...prev,
            petaniId: p.id,
            nikPemilik: p.nik,
            namaPemilik: p.nama,
            noKk: p.noKk || p.nik,
            tempatLahir: p.tempatLahir || 'Magetan',
            tanggalLahir: p.tanggalLahir || '',
            namaIbuKandung: p.namaIbuKandung || '',
            telepon: p.telepon || '',
            desa: p.desa || 'Kediren',
            kecamatan: p.kecamatan || 'Lembeyan',
            kabupaten: p.kabupaten || 'Magetan',
            poktanId: p.poktanId || '',
            rencanaMt1LuasHa: luasDefault,
            rencanaMt2LuasHa: luasDefault,
            rencanaMt3LuasHa: luasDefault,
          }));
        } else {
          // KASUS 3: PETANI BARU (Input Mandiri)
          setIsRegisteredFarmer(false);
          setFormData((prev) => ({
            ...prev,
            petaniId: '__NEW__',
            nikPemilik: targetNik,
          }));
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Memeriksa NIK',
          text: json.error || 'Terjadi gangguan saat memvalidasi NIK.',
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Koneksi Terganggu',
        text: 'Pastikan koneksi internet Anda aktif: ' + err.message,
      });
    } finally {
      setNikLoading(false);
    }
  };

  // Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'KTP' | 'KK' | 'PIPIL') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        Swal.fire({
          icon: 'warning',
          title: 'File Terlalu Besar',
          text: 'Ukuran foto maksimal adalah 3 MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData((prev) => ({
            ...prev,
            [type === 'KTP' ? 'fileKtp' : type === 'KK' ? 'fileKk' : 'filePipil']: event.target?.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nikChecked) {
      Swal.fire({
        icon: 'warning',
        title: 'Verifikasi NIK Terlebih Dahulu',
        text: 'Silakan klik tombol "Cek Data NIK" terlebih dahulu.',
      });
      return;
    }

    if (!formData.namaPemilik.trim() || !formData.nikPemilik.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Belum Lengkap',
        text: 'Nama Lengkap dan NIK Pemilik wajib diisi.',
      });
      return;
    }

    if (!formData.poktanId) {
      Swal.fire({
        icon: 'warning',
        title: 'Kelompok Tani Belum Dipilih',
        text: 'Pilih Kelompok Tani (Poktan) tempat Anda bergabung di desa Anda.',
      });
      return;
    }

    if (!agreementChecked) {
      Swal.fire({
        icon: 'warning',
        title: 'Persetujuan Diperlukan',
        text: 'Centang pernyataan kebenaran data sebelum mengirimkan formulir.',
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        ...formData,
        tahunPengajuan: 2027,
        luasHa: Number(formData.rencanaMt1LuasHa) || 0.5,
        estimasiUreaKg: estimasiPupuk.ureaKg,
        estimasiNpkKg: estimasiPupuk.npkKg,
        estimasiOrganikKg: estimasiPupuk.organikKg,
      };

      const res = await fetch('/api/pengajuan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.status === 409 || json.isDuplicate) {
        // Blokir duplikasi jika NIK sudah ada untuk 2027
        setDuplicateInfo(json.data);
        setReceiptData(json.data);
        setShowReceiptModal(true);
        Swal.fire({
          icon: 'info',
          title: 'Pengajuan 2027 Sudah Ada',
          text: json.error || 'Anda sudah terdaftar dalam antrean e-RDKK 2027.',
        });
      } else if (json.success && json.data) {
        setReceiptData(json.data);
        setShowReceiptModal(true);
        Swal.fire({
          icon: 'success',
          title: 'Pengajuan e-RDKK 2027 Berhasil!',
          html: `<p class="text-sm">Nomor Registrasi Anda: <b class="font-mono text-emerald-800">${json.data.nomorPengajuan}</b>. Simpan tanda terima ini untuk pelacakan kuota.</p>`,
          confirmButtonColor: '#059669',
        });
      } else {
        throw new Error(json.error || 'Gagal mengirimkan formulir pengajuan.');
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengirim',
        text: err.message || 'Terjadi kendala saat mengirimkan pengajuan.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-10 text-slate-800">
      {/* HEADER UTAMA LEMBAGA RESMI */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -z-0 pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-white px-2.5 py-0.5 rounded-full">
                  Pemerintah Kecamatan Lembeyan
                </span>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  BPP Lembeyan - Kab. Magetan
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Formulir Pengajuan e-RDKK Petani Tahun 2027
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Layanan Mandiri Alokasi Pupuk Bersubsidi (Urea, NPK, Organik) & Pemetaan Lahan. Cukup verifikasi NIK tanpa perlu login akun.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Link
                href="/cek-kuota"
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl transition"
              >
                <Search className="w-4 h-4 text-emerald-600" />
                Cek Kuota Petani
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3.5 py-2 rounded-xl border border-emerald-200 transition"
              >
                Beranda SGP
              </Link>
            </div>
          </div>

          {/* STATUS INFORMASI LOGIN ATAU PUBLIK */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Akses Terbuka Warga: <strong>Tahun Anggaran 2027</strong>
              </span>
            </div>
            {currentUser ? (
              <span className="text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                👤 Terhubung sebagai: {currentUser.name} ({currentUser.role})
              </span>
            ) : (
              <span className="text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                🌐 Akses Publik (Tanpa Login)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* FORMULIR UTAMA */}
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* LANGKAH 1: VERIFIKASI NIK (KARTU PERTAMA) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
              1
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">
                Verifikasi Nomor Induk Kependudukan (NIK)
              </h2>
              <p className="text-xs text-slate-500">
                Masukkan 16 digit NIK pemilik lahan untuk memeriksa master data atau pengajuan tahun 2027.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                maxLength={16}
                value={nikInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setNikInput(val);
                  if (val.length !== 16) {
                    setNikChecked(false);
                    setDuplicateInfo(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCekNik();
                  }
                }}
                placeholder="Masukkan 16 digit NIK KTP Anda..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => handleCekNik()}
              disabled={nikLoading || nikInput.length < 10}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition"
            >
              {nikLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Memeriksa...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Cek Data NIK
                </>
              )}
            </button>
          </div>

          {/* NOTIFIKASI DUPLIKASI PENGAJUAN (BLOKIR DUPLIKASI - OPSI 2) */}
          {duplicateInfo && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-black text-amber-900">
                    Pengajuan e-RDKK 2027 Sudah Terdaftar!
                  </h3>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    NIK <b>{duplicateInfo.nikPemilik}</b> atas nama{' '}
                    <b>{duplicateInfo.namaPemilik}</b> telah terdata dalam antrean e-RDKK Tahun 2027 pada Kelompok Tani{' '}
                    <b>{duplicateInfo.poktan?.nama || 'Kelompok Tani Desa'}</b>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white/70 p-3 rounded-xl border border-amber-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">No. Registrasi:</span>
                  <span className="font-mono font-bold text-slate-900">{duplicateInfo.nomorPengajuan}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Status:</span>
                  <span className="font-bold text-emerald-800">{duplicateInfo.status}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Luas:</span>
                  <span className="font-bold text-slate-900">{duplicateInfo.luasHa} Ha</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Tahun Anggaran:</span>
                  <span className="font-bold text-slate-900">{duplicateInfo.tahunPengajuan || 2027}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-amber-800">
                  Sesuai aturan kedinasan, pengajuan baru untuk NIK yang sama dikunci agar tidak terjadi kuota ganda.
                </span>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Buka Tanda Terima 2027
                </button>
              </div>
            </div>
          )}

          {/* NOTIFIKASI STATUS NIK CHECK */}
          {nikChecked && !duplicateInfo && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center justify-between border ${
                isRegisteredFarmer
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={`w-4 h-4 ${
                    isRegisteredFarmer ? 'text-emerald-600' : 'text-blue-600'
                  }`}
                />
                <span>
                  {isRegisteredFarmer ? (
                    <>
                      Petani Terdaftar di Master: <b>{formData.namaPemilik}</b> ({formData.desa}) &bull; Data identitas otomatis dimuat.
                    </>
                  ) : (
                    <>
                      NIK Baru (Belum Terdaftar): Silakan lengkapi identitas dan pilih Kelompok Tani tujuan Anda.
                    </>
                  )}
                </span>
              </div>
              <span className="font-mono text-[11px] font-bold">
                {isRegisteredFarmer ? 'AUTO-FILL AKTIF' : 'PENDAFTARAN BARU'}
              </span>
            </div>
          )}
        </div>

        {/* JIKA BELUM ADA DUPLIKASI, TAMPILKAN FORM LENGKAP */}
        {!duplicateInfo && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* LANGKAH 2: IDENTITAS PETANI */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                  2
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 leading-tight">
                    Identitas Petani & Domisili Kelompok Tani
                  </h2>
                  <p className="text-xs text-slate-500">
                    Data kependudukan sesuai KTP untuk pendaftaran resmi e-RDKK Simluhtan.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Pemilik */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nama Lengkap Pemilik (KTP): <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.namaPemilik}
                    onChange={(e) => setFormData({ ...formData, namaPemilik: e.target.value })}
                    placeholder="Contoh: KASDI MULYONO"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Nomor KK */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nomor Kartu Keluarga (KK): <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    required
                    value={formData.noKk}
                    onChange={(e) =>
                      setFormData({ ...formData, noKk: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="16 digit No. KK..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Tempat & Tanggal Lahir */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Tempat Lahir:
                    </label>
                    <input
                      type="text"
                      value={formData.tempatLahir}
                      onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Tgl Lahir:
                    </label>
                    <input
                      type="date"
                      value={formData.tanggalLahir}
                      onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Nama Gadis Ibu Kandung */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nama Gadis Ibu Kandung: <span className="text-slate-400 font-normal">(Baku Kementan)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.namaIbuKandung}
                    onChange={(e) => setFormData({ ...formData, namaIbuKandung: e.target.value })}
                    placeholder="Nama Ibu Kandung..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Nomor HP / WhatsApp */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    No. Handphone / WhatsApp:
                  </label>
                  <input
                    type="tel"
                    value={formData.telepon}
                    onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                    placeholder="Contoh: 08123456789"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Pilihan Desa */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Desa Domisili Lahan: <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.desa}
                    onChange={(e) => {
                      const newDesa = e.target.value;
                      const poktanInDesa = poktanList.filter((p) => p.desa === newDesa);
                      setFormData({
                        ...formData,
                        desa: newDesa,
                        poktanId: poktanInDesa[0]?.id || '',
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {DESA_LEMBEYAN_LIST.map((desa) => (
                      <option key={desa} value={desa}>
                        Desa {desa}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pilihan Kelompok Tani (Edge Case 2: Opsi 1 Pilih Poktan Langsung) */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kelompok Tani (Poktan) Tujuan: <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.poktanId}
                    onChange={(e) => setFormData({ ...formData, poktanId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-emerald-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Pilih Kelompok Tani di Desa {formData.desa} --</option>
                    {filteredPoktan.map((pok) => (
                      <option key={pok.id} value={pok.id}>
                        {pok.nama} (Ketua: {pok.ketua || '-'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Pengajuan e-RDKK ini akan langsung diteruskan ke Ketua Poktan terpilih untuk diverifikasi.
                  </p>
                </div>
              </div>
            </div>

            {/* LANGKAH 3: RENCANA TANAM 3 MUSIM 2027 & KALKULATOR PUPUK */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                    3
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 leading-tight">
                      Rencana Tanam 3 Musim e-RDKK Tahun 2027
                    </h2>
                    <p className="text-xs text-slate-500">
                      Rencana komoditas & luasan tanam untuk Musim Tanam 1, 2, dan 3.
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full border border-amber-300">
                  T.A 2027
                </span>
              </div>

              {/* GRID 3 MUSIM TANAM */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* MT 1: Walikan */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-900">
                      MT 1 (Walikan)
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-white px-2 py-0.5 rounded-full font-bold">
                      Musim Hujan
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Komoditas:
                    </label>
                    <select
                      value={formData.rencanaMt1Komoditas}
                      onChange={(e) =>
                        setFormData({ ...formData, rencanaMt1Komoditas: e.target.value })
                      }
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
                    >
                      {Object.keys(STANDAR_PUPUK).map((k) => (
                        <option key={`mt1-${k}`} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Luas Tanam (Ha):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.05"
                      max="10"
                      value={formData.rencanaMt1LuasHa}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rencanaMt1LuasHa: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-900"
                    />
                  </div>
                </div>

                {/* MT 2: Gadu / Kemarau 1 */}
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-900">
                      MT 2 (Gadu)
                    </span>
                    <span className="text-[10px] text-amber-800 bg-white px-2 py-0.5 rounded-full font-bold">
                      Kemarau I
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Komoditas:
                    </label>
                    <select
                      value={formData.rencanaMt2Komoditas}
                      onChange={(e) =>
                        setFormData({ ...formData, rencanaMt2Komoditas: e.target.value })
                      }
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
                    >
                      {Object.keys(STANDAR_PUPUK).map((k) => (
                        <option key={`mt2-${k}`} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Luas Tanam (Ha):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={formData.rencanaMt2LuasHa}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rencanaMt2LuasHa: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-amber-900"
                    />
                  </div>
                </div>

                {/* MT 3: Rendeng / Kemarau 2 */}
                <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-teal-900">
                      MT 3 (Rendeng)
                    </span>
                    <span className="text-[10px] text-teal-800 bg-white px-2 py-0.5 rounded-full font-bold">
                      Kemarau II
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Komoditas:
                    </label>
                    <select
                      value={formData.rencanaMt3Komoditas}
                      onChange={(e) =>
                        setFormData({ ...formData, rencanaMt3Komoditas: e.target.value })
                      }
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
                    >
                      {Object.keys(STANDAR_PUPUK).map((k) => (
                        <option key={`mt3-${k}`} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Luas Tanam (Ha):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={formData.rencanaMt3LuasHa}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rencanaMt3LuasHa: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-teal-900"
                    />
                  </div>
                </div>
              </div>

              {/* WIDGET KALKULATOR ESTIMASI KUOTA PUPUK 2027 */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white space-y-3 shadow-md">
                <div className="flex items-center justify-between border-b border-emerald-800/60 pb-2">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Kalkulator Rekomendasi Jatah Kuota Pupuk Subsidi 2027:
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Total Kumulatif: {estimasiPupuk.totalLuasKumulatif} Ha
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-emerald-300 block">
                      Pupuk Urea
                    </span>
                    <strong className="text-lg font-black font-mono text-white block mt-0.5">
                      {estimasiPupuk.ureaKg} Kg
                    </strong>
                    <span className="text-[9px] text-slate-400">
                      &plusmn; {Math.ceil(estimasiPupuk.ureaKg / 50)} Sak (50kg)
                    </span>
                  </div>

                  <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-amber-300 block">
                      NPK Phonska
                    </span>
                    <strong className="text-lg font-black font-mono text-white block mt-0.5">
                      {estimasiPupuk.npkKg} Kg
                    </strong>
                    <span className="text-[9px] text-slate-400">
                      &plusmn; {Math.ceil(estimasiPupuk.npkKg / 50)} Sak (50kg)
                    </span>
                  </div>

                  <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-teal-300 block">
                      Petroganik
                    </span>
                    <strong className="text-lg font-black font-mono text-white block mt-0.5">
                      {estimasiPupuk.organikKg} Kg
                    </strong>
                    <span className="text-[9px] text-slate-400">
                      &plusmn; {Math.ceil(estimasiPupuk.organikKg / 40)} Sak (40kg)
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-300 italic text-center">
                  *Perhitungan otomatis berdasarkan standar dosis rekomendasi teknis Kementan RI untuk komoditas padi & palawija.
                </p>
              </div>
            </div>

            {/* LANGKAH 4: BERKAS DOKUMEN (OPSIONAL / KAMERA HANDPHONE) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                  4
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 leading-tight">
                    Lampiran Berkas Pendukung (Opsional / Fleksibel)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Unggah foto KTP, KK, atau SPPT/Bukti lahan via kamera HP. Bagi petani yang sudah terdaftar, dokumen lama tetap berlaku.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Upload Foto KTP */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Foto Fisik KTP Pemilik:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileKtpRef}
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'KTP')}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileKtpRef.current?.click()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                    >
                      <Upload className="w-3.5 h-3.5" /> Galeri
                    </button>
                    <button
                      type="button"
                      onClick={() => setCameraTarget('KTP')}
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                    >
                      <Camera className="w-3.5 h-3.5" /> Kamera
                    </button>
                  </div>
                  {formData.fileKtp && (
                    <div className="mt-2 h-24 rounded-lg overflow-hidden border border-emerald-300 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.fileKtp}
                        alt="Preview KTP"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Upload Foto Kartu Keluarga (KK) */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Foto Kartu Keluarga (KK):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileKkRef}
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'KK')}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileKkRef.current?.click()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                    >
                      <Upload className="w-3.5 h-3.5" /> Galeri
                    </button>
                    <button
                      type="button"
                      onClick={() => setCameraTarget('KK')}
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                    >
                      <Camera className="w-3.5 h-3.5" /> Kamera
                    </button>
                  </div>
                  {formData.fileKk && (
                    <div className="mt-2 h-24 rounded-lg overflow-hidden border border-emerald-300 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.fileKk}
                        alt="Preview Kartu Keluarga"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Upload Bukti Lahan / SPPT / Pipil */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Foto SPPT PBB / Bukti Lahan:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={filePipilRef}
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'PIPIL')}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => filePipilRef.current?.click()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                    >
                      <Upload className="w-3.5 h-3.5" /> Galeri
                    </button>
                    <button
                      type="button"
                      onClick={() => setCameraTarget('PIPIL')}
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                    >
                      <Camera className="w-3.5 h-3.5" /> Kamera
                    </button>
                  </div>
                  {formData.filePipil && (
                    <div className="mt-2 h-24 rounded-lg overflow-hidden border border-emerald-300 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.filePipil}
                        alt="Preview SPPT Lahan"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Catatan / Keterangan Tambahan */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catatan Tambahan / Lokasi Petak Sawah:
                </label>
                <textarea
                  rows={2}
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  placeholder="Contoh: Petak sawah blok barat saluran irigasi primer Krajan..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* LANGKAH 5: PERNYATAAN & SUBMIT BUTTON */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={agreementChecked}
                  onChange={(e) => setAgreementChecked(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  Saya menyatakan bahwa data identitas dan rencana tanam yang diajukan adalah benar untuk{' '}
                  <strong>Tahun Anggaran 2027</strong> dan siap diverifikasi oleh Pengurus Kelompok Tani serta Penyuluh Pertanian Lapangan (PPL) BPP Kecamatan Lembeyan.
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting || !agreementChecked || !nikChecked}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm sm:text-base shadow-lg transition flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" /> Mengirimkan Formulir Pengajuan...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" /> Kirim Pengajuan e-RDKK 2027
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* MODAL KAMERA FOTO */}
      {cameraTarget && (
        <CameraCaptureModal
          isOpen={!!cameraTarget}
          title={`Ambil Foto ${
            cameraTarget === 'KTP'
              ? 'KTP Pemilik'
              : cameraTarget === 'KK'
              ? 'Kartu Keluarga (KK)'
              : 'Bukti SPPT Lahan'
          }`}
          onCapture={(dataUrl) => {
            setFormData((prev) => ({
              ...prev,
              [cameraTarget === 'KTP'
                ? 'fileKtp'
                : cameraTarget === 'KK'
                ? 'fileKk'
                : 'filePipil']: dataUrl,
            }));
            setCameraTarget(null);
          }}
          onClose={() => setCameraTarget(null)}
        />
      )}

      {/* MODAL TANDA TERIMA DIGITAL (PRINTABLE RECEIPT DIALOG) */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0">
            {/* Header Tanda Terima */}
            <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Tanda Terima Pendaftaran e-RDKK 2027
                </span>
                <h3 className="text-lg font-black text-slate-900 uppercase mt-1">
                  Bukti Pengajuan Pupuk Bersubsidi
                </h3>
                <p className="text-[11px] text-slate-500">
                  BPP Kecamatan Lembeyan &bull; Pemerintah Kabupaten Magetan
                </p>
              </div>

              <div className="no-print">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body Tanda Terima */}
            <div className="py-4 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">Nomor Registrasi:</span>
                  <span className="font-mono font-black text-sm text-emerald-900">
                    {receiptData.nomorPengajuan}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Status Verifikasi:</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {receiptData.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block">Nama Pemilik:</span>
                  <strong className="text-slate-900 text-xs block">{receiptData.namaPemilik}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">NIK Pemilik:</span>
                  <span className="font-mono text-slate-800">{receiptData.nikPemilik}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Kelompok Tani:</span>
                  <span className="text-slate-800 font-bold">
                    {receiptData.poktan?.nama || 'Kelompok Tani Desa'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Wilayah Desa:</span>
                  <span className="text-slate-800 font-medium">
                    Desa {receiptData.desa}, Kec. {receiptData.kecamatan || 'Lembeyan'}
                  </span>
                </div>
              </div>

              {/* Rincian Rencana 3 Musim */}
              <div className="border border-emerald-200 rounded-2xl p-3 bg-emerald-50/50 space-y-1.5">
                <span className="text-[11px] font-black text-emerald-950 uppercase block">
                  Rencana Tanam 3 Musim & Estimasi Alokasi 2027:
                </span>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="text-slate-500 text-[10px] block">MT 1 (Walikan)</span>
                    <strong className="text-emerald-900 block font-bold">
                      {receiptData.rencanaMt1Komoditas || 'Padi'} ({receiptData.rencanaMt1LuasHa || receiptData.luasHa} Ha)
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="text-slate-500 text-[10px] block">MT 2 (Gadu)</span>
                    <strong className="text-amber-900 block font-bold">
                      {receiptData.rencanaMt2Komoditas || 'Jagung'} ({receiptData.rencanaMt2LuasHa || 0} Ha)
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="text-slate-500 text-[10px] block">MT 3 (Rendeng)</span>
                    <strong className="text-teal-900 block font-bold">
                      {receiptData.rencanaMt3Komoditas || 'Padi'} ({receiptData.rencanaMt3LuasHa || 0} Ha)
                    </strong>
                  </div>
                </div>
              </div>

              {/* QR Code Verifikasi */}
              <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-2xl">
                <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-2xs">
                  <QrCodeView
                    value={
                      typeof window !== 'undefined'
                        ? `${window.location.origin}/verifikasi?q=PENGAJUAN:${receiptData.nomorPengajuan}`
                        : `/verifikasi?q=PENGAJUAN:${receiptData.nomorPengajuan}`
                    }
                    size={56}
                  />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase text-emerald-800 block">
                    e-Verifikasi Pendaftaran
                  </span>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Pindai QR Code di atas menggunakan kamera smartphone untuk memeriksa status persetujuan dari BPP Lembeyan.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between no-print">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Tanda Terima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAYA PRINT KHUSUS TANDA TERIMA */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  );
}
