'use client';

import React, { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Printer,
  ArrowLeft,
  Upload,
  User,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Check,
  Download,
  CreditCard,
  Save,
  Search,
  ExternalLink,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  KartuAnggotaPoktanPreview,
  KartuAnggotaData,
} from '@/components/ui/KartuAnggotaPoktanPreview';

export interface PetaniOption {
  id: string;
  nik: string;
  nama: string;
  nomorKta: string;
  jabatan: string;
  kelompokTani: string;
  poktanId?: string;
  desaKecamatan: string;
  fotoUrl: string;
}

interface Props {
  initialData?: Partial<KartuAnggotaData> | null;
  petaniOptions?: PetaniOption[];
  poktanOptions?: { id: string; nama: string; desa: string }[];
}

export default function EditorKartuTaniClient({
  initialData,
  petaniOptions = [],
  poktanOptions = [],
}: Props) {
  const [data, setData] = useState<KartuAnggotaData>({
    id: initialData?.id || '',
    nama: initialData?.nama || 'KASDI MULYONO',
    nomorAnggota: initialData?.nomorAnggota || 'KT-3509-0024',
    nik: initialData?.nik || '3520031208720002',
    jabatan: initialData?.jabatan || 'Anggota Utama',
    kelompokTani: initialData?.kelompokTani || 'SRI MULYO',
    poktanId: initialData?.poktanId || '',
    desaKecamatan: initialData?.desaKecamatan || 'Desa Kediren, Kec. Lembeyan',
    fotoUrl:
      initialData?.fotoUrl ||
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300',
    qrPayload: initialData?.qrPayload || '',
  });

  const [searchPetani, setSearchPetani] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter daftar petani
  const filteredPetaniOptions = useMemo(() => {
    if (!searchPetani.trim()) return petaniOptions;
    const q = searchPetani.toLowerCase();
    return petaniOptions.filter(
      (p) =>
        p.nama.toLowerCase().includes(q) ||
        p.nik.includes(q) ||
        p.nomorKta.toLowerCase().includes(q) ||
        p.kelompokTani.toLowerCase().includes(q)
    );
  }, [petaniOptions, searchPetani]);

  const handleSelectPetani = (petaniId: string) => {
    const sel = petaniOptions.find((p) => p.id === petaniId);
    if (sel) {
      setData({
        id: sel.id,
        nama: sel.nama,
        nomorAnggota: sel.nomorKta || `KT-3509-${sel.nik.slice(-4)}`,
        nik: sel.nik,
        jabatan: sel.jabatan || 'Anggota Aktif',
        kelompokTani: sel.kelompokTani || 'POKTAN',
        poktanId: sel.poktanId || '',
        desaKecamatan: sel.desaKecamatan,
        fotoUrl: sel.fotoUrl,
        qrPayload: `/verifikasi?q=KARTUTANI:${sel.nik}`,
      });
      setSaveSuccess(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire({
          icon: 'warning',
          title: 'Ukuran Foto Terlalu Besar',
          text: 'Maksimal ukuran foto adalah 2 MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setData((prev) => ({
            ...prev,
            fotoUrl: event.target?.result as string,
          }));
          setSaveSuccess(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetToDefaultPhoto = () => {
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
      data.nama
    )}`;
    setData((prev) => ({
      ...prev,
      fotoUrl: defaultAvatar,
    }));
    setSaveSuccess(false);
  };

  const handleSaveToDatabase = async () => {
    if (!data.nik) {
      Swal.fire({
        icon: 'error',
        title: 'NIK Wajib Diisi',
        text: 'NIK petani wajib terisi agar dapat disimpan ke database master.',
      });
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch('/api/petani', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.id || undefined,
          nik: data.nik,
          nama: data.nama,
          nomorKta: data.nomorAnggota,
          jabatan: data.jabatan,
          fotoUrl: data.fotoUrl,
          poktanId: data.poktanId || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        Swal.fire({
          icon: 'success',
          title: 'KTA Tersimpan Permanen!',
          html: `<p class="text-sm">Data Kartu Anggota <b>${data.nama}</b> (No. KTA: <b>${data.nomorAnggota}</b>) berhasil disimpan ke database master Petani.</p>`,
          confirmButtonColor: '#059669',
          timer: 2500,
        });
      } else {
        throw new Error(json.error || 'Gagal menyimpan data petani');
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan sistem saat menyimpan ke database.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:py-0 print:bg-white text-slate-800">
      {/* TOOLBAR ATAS (SCREEN ONLY) */}
      <div className="max-w-6xl mx-auto px-4 mb-6 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/laporan"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali ke Laporan
              </Link>
              <Link
                href="/cetak-kartu-tani/massal"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-xl transition"
              >
                <Layers className="w-4 h-4" /> Cetak Massal 10 Kartu / A4
              </Link>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                Editor KTA Poktan
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-emerald-600" />
              Editor Kartu Anggota Poktan & Cetak Standar CR-80
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Standar ID Card 85.6mm &times; 54mm tanpa elemen bank. Dilengkapi QR Code verifikasi resmi & tersinkronisasi master database.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSaveToDatabase}
              disabled={isSaving}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition transform hover:-translate-y-0.5 ${
                saveSuccess
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Menyimpan...
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" /> Tersimpan di Database
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Simpan ke Database
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs sm:text-sm shadow-md transition transform hover:-translate-y-0.5"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              Cetak Kartu (Print)
            </button>
          </div>
        </div>
      </div>

      {/* WORKSPACE DUA KOLOM: FORM EDITOR (KIRI) & PRATINJAU KARTU (KANAN) */}
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* PANEL FORM INPUT EDITOR (KIRI) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 no-print">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Form Edit Data Anggota
            </h2>
            <span className="text-[11px] text-slate-400">Live Preview</span>
          </div>

          {/* 1. Pemilih Petani dari Master Database */}
          {petaniOptions.length > 0 && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-emerald-900 flex items-center justify-between">
                <span>Pilih Petani dari Master Database:</span>
                <span className="text-[10px] text-emerald-700 font-normal">
                  ({petaniOptions.length} Petani Terdaftar)
                </span>
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama, NIK, atau poktan..."
                  value={searchPetani}
                  onChange={(e) => setSearchPetani(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none mb-1.5"
                />
              </div>
              <select
                value={data.id || ''}
                onChange={(e) => handleSelectPetani(e.target.value)}
                className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
              >
                <option value="">-- Pilih Petani --</option>
                {filteredPetaniOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} ({p.nik}) - {p.kelompokTani}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Upload Pasfoto */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Pasfoto Anggota (Rasio 3:4):
            </label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-20 rounded-lg border-2 border-dashed border-amber-400 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 shadow-inner">
                {data.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.fotoUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-slate-300" />
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 py-2 px-3 rounded-xl transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Pilih Pasfoto
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToDefaultPhoto}
                    title="Gunakan Avatar Default"
                    className="px-2.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
                  >
                    Reset
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Format JPG, PNG atau SVG. Disarankan foto formal rasio 3:4 latar belakang polos.
                </p>
              </div>
            </div>
          </div>

          {/* Nama Lengkap */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nama Lengkap Anggota:
            </label>
            <input
              type="text"
              value={data.nama}
              onChange={(e) => {
                setData({ ...data, nama: e.target.value });
                setSaveSuccess(false);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Contoh: KASDI MULYONO"
            />
          </div>

          {/* Nomor Anggota & NIK */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                No. Anggota (KTA):
              </label>
              <input
                type="text"
                value={data.nomorAnggota}
                onChange={(e) => {
                  setData({ ...data, nomorAnggota: e.target.value });
                  setSaveSuccess(false);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="KT-3509-0001"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                NIK Petani:
              </label>
              <input
                type="text"
                value={data.nik || ''}
                onChange={(e) => {
                  setData({ ...data, nik: e.target.value });
                  setSaveSuccess(false);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="352003..."
              />
            </div>
          </div>

          {/* Jabatan di Poktan */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Jabatan di Poktan:
            </label>
            <div className="grid grid-cols-3 gap-2 mb-1.5">
              {['Ketua Poktan', 'Sekretaris', 'Bendahara', 'Anggota Utama', 'Anggota Aktif'].map(
                (role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setData({ ...data, jabatan: role });
                      setSaveSuccess(false);
                    }}
                    className={`py-1 px-2 rounded-lg text-[10px] font-bold border transition truncate ${
                      data.jabatan === role
                        ? 'bg-amber-100 border-amber-400 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {role}
                  </button>
                )
              )}
            </div>
            <input
              type="text"
              value={data.jabatan}
              onChange={(e) => {
                setData({ ...data, jabatan: e.target.value });
                setSaveSuccess(false);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Ketik jabatan kustom..."
            />
          </div>

          {/* Nama Kelompok Tani (Subjudul) */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nama Kelompok Tani (Subjudul Kartu):
            </label>
            {poktanOptions.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={data.kelompokTani}
                  onChange={(e) => {
                    const sel = poktanOptions.find((p) => p.nama === e.target.value);
                    setData({
                      ...data,
                      kelompokTani: e.target.value,
                      poktanId: sel ? sel.id : data.poktanId,
                      desaKecamatan: sel ? `Desa ${sel.desa}, Kec. Lembeyan` : data.desaKecamatan,
                    });
                    setSaveSuccess(false);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {poktanOptions.map((pok) => (
                    <option key={pok.id} value={pok.nama}>
                      {pok.nama} (Desa {pok.desa})
                    </option>
                  ))}
                  <option value="CUSTOM">-- Input Manual --</option>
                </select>
                <input
                  type="text"
                  value={data.kelompokTani}
                  onChange={(e) => {
                    setData({ ...data, kelompokTani: e.target.value });
                    setSaveSuccess(false);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Ketik nama Poktan custom..."
                />
              </div>
            ) : (
              <input
                type="text"
                value={data.kelompokTani}
                onChange={(e) => {
                  setData({ ...data, kelompokTani: e.target.value });
                  setSaveSuccess(false);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Contoh: POKTAN SRI MULYO"
              />
            )}
          </div>

          {/* Wilayah / Desa */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Wilayah Desa / Kecamatan:
            </label>
            <input
              type="text"
              value={data.desaKecamatan}
              onChange={(e) => {
                setData({ ...data, desaKecamatan: e.target.value });
                setSaveSuccess(false);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Contoh: Desa Kediren, Kec. Lembeyan"
            />
          </div>

          {/* Tombol Simpan Bawah Form */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSaveToDatabase}
              disabled={isSaving}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Menyimpan Perubahan ke Database...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Simpan Perubahan ke Database Master
                </>
              )}
            </button>
          </div>
        </div>

        {/* PRATINJAU KARTU (KANAN) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="no-print w-full flex items-center justify-between pb-3 text-xs text-slate-500">
            <span className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Tampilan Pratinjau ID Card CR-80 (540 &times; 340 px)
            </span>
            <div className="flex items-center gap-2">
              {data.nik && (
                <Link
                  href={`/verifikasi?q=KARTUTANI:${data.nik}`}
                  target="_blank"
                  className="text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1 text-[11px] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200"
                >
                  <ExternalLink className="w-3 h-3" />
                  Cek Hasil Scan QR
                </Link>
              )}
              <span className="text-slate-400">Rasio 85.6mm &times; 54mm</span>
            </div>
          </div>

          {/* CARD CONTAINER (DITAMPILKAN JUGA DI PRINT SESUAI UKURAN FISIK) */}
          <div className="card-print-target flex justify-center items-center">
            <KartuAnggotaPoktanPreview data={data} />
          </div>

          {/* PETUNJUK CETAK */}
          <div className="no-print mt-6 bg-white p-5 rounded-2xl border border-slate-200 text-xs text-slate-500 max-w-[540px] w-full space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Check className="w-4 h-4 text-emerald-600" />
              Petunjuk Cetak Fisik Mesin Plong / PVC:
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
              <li>
                Pilih ukuran kertas <strong>A4</strong> atau kartu PVC pada dialog printer browser.
              </li>
              <li>
                Atur <strong>Scale: 100% (Actual Size)</strong> dan pastikan opsi <strong>Background Graphics (Grafis Latar Belakang)</strong> dicentang.
              </li>
              <li>
                QR Code di kartu fisik otomatis membuka halaman verifikasi resmi saat dipindai oleh kamera HP/Google Lens.
              </li>
              <li>
                Untuk mencetak 10 kartu sekaligus dalam 1 lembar A4, gunakan modul{' '}
                <Link
                  href="/cetak-kartu-tani/massal"
                  className="text-emerald-700 font-bold underline"
                >
                  Cetak Massal
                </Link>
                .
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* GAYA CSS KHUSUS PRINT CETAK ID CARD */}
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
          .card-print-target {
            margin: 0 auto !important;
            padding: 0 !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
