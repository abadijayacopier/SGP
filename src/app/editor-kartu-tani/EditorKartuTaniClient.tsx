'use client';

import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import {
  KartuAnggotaPoktanPreview,
  KartuAnggotaData,
} from '@/components/ui/KartuAnggotaPoktanPreview';

interface Props {
  initialData?: Partial<KartuAnggotaData>;
  poktanOptions?: { id: string; nama: string; desa: string }[];
}

export default function EditorKartuTaniClient({
  initialData,
  poktanOptions = [],
}: Props) {
  const [data, setData] = useState<KartuAnggotaData>({
    nama: initialData?.nama || 'KASDI MULYONO',
    nomorAnggota: initialData?.nomorAnggota || 'KT-3509-0024',
    nik: initialData?.nik || '3520031208720002',
    jabatan: initialData?.jabatan || 'Anggota Utama',
    kelompokTani: initialData?.kelompokTani || 'SRI MULYO',
    desaKecamatan: initialData?.desaKecamatan || 'Desa Kediren, Kec. Lembeyan',
    fotoUrl:
      initialData?.fotoUrl ||
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300',
    qrPayload: initialData?.qrPayload || '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setData((prev) => ({
            ...prev,
            fotoUrl: event.target?.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
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
                <ArrowLeft className="w-4 h-4" /> Kembali
              </Link>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                Editor KTA Kelompok Tani
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-emerald-600" />
              Desain & Cetak Kartu Anggota Kelompok Tani (CR-80)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Standar ID Card 85.6mm &times; 54mm tanpa elemen bank. Sesuai desain gelombang emas, sawah terasering, dan petani caping.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition transform hover:-translate-y-0.5"
            >
              <Printer className="w-4 h-4" />
              Cetak Kartu (Print ID Card)
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

          {/* Upload Pasfoto */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Pasfoto Anggota (Rasio 3:4):
            </label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-20 rounded-lg border-2 border-dashed border-amber-400 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
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
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 py-2 px-3 rounded-xl transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Pilih / Ganti Pasfoto
                </button>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Disarankan foto formal rasio 3:4 berlatar belakang polos.
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
              onChange={(e) => setData({ ...data, nama: e.target.value })}
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
                onChange={(e) => setData({ ...data, nomorAnggota: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="KT-3509-0001"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Jabatan di Poktan:
              </label>
              <input
                type="text"
                value={data.jabatan}
                onChange={(e) => setData({ ...data, jabatan: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Contoh: Anggota / Ketua"
              />
            </div>
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
                      desaKecamatan: sel ? `Desa ${sel.desa}, Kec. Lembeyan` : data.desaKecamatan,
                    });
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
                  onChange={(e) => setData({ ...data, kelompokTani: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Ketik nama Poktan custom..."
                />
              </div>
            ) : (
              <input
                type="text"
                value={data.kelompokTani}
                onChange={(e) => setData({ ...data, kelompokTani: e.target.value })}
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
              onChange={(e) => setData({ ...data, desaKecamatan: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Contoh: Desa Kediren, Kec. Lembeyan"
            />
          </div>
        </div>

        {/* PRATINJAU KARTU (KANAN) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="no-print w-full flex items-center justify-between pb-3 text-xs text-slate-500">
            <span className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Tampilan Pratinjau ID Card CR-80 (540 &times; 340 px)
            </span>
            <span className="text-slate-400">Rasio 85.6mm &times; 54mm</span>
          </div>

          {/* CARD CONTAINER (DITAMPILKAN JUGA DI PRINT SESUAI UKURAN FISIK) */}
          <div className="card-print-target flex justify-center items-center">
            <KartuAnggotaPoktanPreview data={data} />
          </div>

          {/* PETUNJUK CETAK */}
          <div className="no-print mt-6 bg-white p-4 rounded-2xl border border-slate-200 text-xs text-slate-500 max-w-[540px] w-full space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              Petunjuk Cetak Fisik Mesin Plong / PVC:
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
              <li>Pilih ukuran kertas <strong>A4</strong> atau kartu PVC pada dialog printer.</li>
              <li>Atur <strong>Scale: 100% (Actual Size)</strong> dan aktifkan <strong>Background Graphics</strong>.</li>
              <li>Ukuran kartu otomatis mengikuti standar kartu ATM/KTP (CR80: 85.6 &times; 54 mm).</li>
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
