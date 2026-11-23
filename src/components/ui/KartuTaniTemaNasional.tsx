import React from 'react';
import { Sprout, ShieldCheck, CheckCircle2 } from 'lucide-react';
import QrCodeView from '@/components/ui/QrCodeView';
import { SmartChipSim } from '@/components/ui/CardEmblems';

interface Props {
  petani: {
    nama: string;
    nik: string;
    desa: string;
    kecamatan?: string;
    kabupaten?: string;
    totalLuasLahan: number;
    lahanCount: number;
    poktanNama: string;
    fotoPetani: string;
    nomorKartu: string;
    qrPayload: string;
  };
  compact?: boolean;
}

export function KartuTaniTemaNasional({ petani, compact = false }: Props) {
  if (compact) {
    // Ukuran persis untuk lembar A4 massal (86 x 54 mm)
    return (
      <div className="w-full h-full bg-gradient-to-b from-white via-emerald-50/40 to-green-100/90 text-slate-800 flex flex-col justify-between relative overflow-hidden select-none border border-slate-300">
        {/* PITA MERAH PUTIH BERKIBAR DI ATAS */}
        <div className="absolute top-0 inset-x-0 h-4.5 flex flex-col shadow-2xs z-10 pointer-events-none">
          <div className="h-1/2 w-full bg-gradient-to-r from-red-600 via-red-500 to-red-700" />
          <div className="h-1/2 w-full bg-white border-b border-amber-400/80" />
        </div>

        {/* HEADER KARTU (Logo Kementan + Poktan + Judul) */}
        <div className="relative z-20 pt-5 px-2 flex items-start justify-between">
          <div className="flex items-center gap-1">
            {/* Logo Kementan Style */}
            <div className="w-5 h-5 rounded-full bg-amber-400 border border-amber-600 flex items-center justify-center shadow-xs shrink-0">
              <Sprout className="w-3.5 h-3.5 text-slate-900" />
            </div>
            <div>
              <div className="text-[6.5px] font-black uppercase text-red-700 tracking-wider leading-none">
                KEMENTERIAN PERTANIAN RI
              </div>
              <div className="text-[5.5px] font-bold text-slate-600 tracking-tight leading-none mt-0.5">
                KABUPATEN MAGETAN
              </div>
            </div>
          </div>

          {/* Logo & Nama Poktan di Pojok Kanan Atas */}
          <div className="text-right">
            <div className="text-[7.5px] font-black uppercase tracking-tight text-emerald-800 leading-none">
              {petani.poktanNama}
            </div>
            <div className="text-[5.5px] font-mono font-bold text-slate-500 leading-none mt-0.5">
              KTA ANGGOTA RESMI
            </div>
          </div>
        </div>

        {/* WATERMARK LATAR SAWAH / GUILLOCHE */}
        <div className="absolute inset-0 z-0 opacity-15 pointer-events-none flex items-center justify-center">
          <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
            <path d="M0,90 Q50,70 100,90 T200,85 L200,120 L0,120 Z" fill="#15803d" />
            <path d="M0,75 Q60,50 120,70 T200,60 L200,120 L0,120 Z" fill="#22c55e" opacity="0.6" />
            <circle cx="165" cy="40" r="18" fill="#eab308" opacity="0.4" />
          </svg>
        </div>

        {/* BODY TENGAH: Foto, Data Berkolom, Chip & QR */}
        <div className="relative z-10 px-2 my-auto flex items-center justify-between gap-1.5">
          {/* Sisi Kiri: Foto Petani + Chip Emas */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-10 h-13 rounded bg-red-600 p-0.5 shadow-xs overflow-hidden border border-amber-300">
              <img
                src={petani.fotoPetani}
                alt={petani.nama}
                className="w-full h-full object-cover bg-slate-100"
              />
            </div>
            <SmartChipSim className="w-5 h-3" />
          </div>

          {/* Sisi Tengah: Teks Identitas Berkolom Rapi */}
          <div className="flex-1 min-w-0 text-[7px] space-y-0.5 leading-tight">
            <div className="flex items-center">
              <span className="w-13 text-slate-500 font-semibold uppercase shrink-0 text-[6px]">NO. KTA</span>
              <span className="font-mono font-black text-slate-900">: {petani.nomorKartu}</span>
            </div>
            <div className="flex items-center">
              <span className="w-13 text-slate-500 font-semibold uppercase shrink-0 text-[6px]">NAMA</span>
              <span className="font-black text-slate-900 uppercase truncate">: {petani.nama}</span>
            </div>
            <div className="flex items-center">
              <span className="w-13 text-slate-500 font-semibold uppercase shrink-0 text-[6px]">NIK</span>
              <span className="font-mono font-bold text-slate-800">: {petani.nik}</span>
            </div>
            <div className="flex items-center">
              <span className="w-13 text-slate-500 font-semibold uppercase shrink-0 text-[6px]">ALAMAT</span>
              <span className="text-slate-800 font-medium truncate">: Ds. {petani.desa}, Kec. {petani.kecamatan || 'Lembeyan'}</span>
            </div>
            <div className="flex items-center">
              <span className="w-13 text-slate-500 font-semibold uppercase shrink-0 text-[6px]">POKTAN</span>
              <span className="font-bold text-emerald-800 truncate">: {petani.poktanNama}</span>
            </div>
          </div>

          {/* Sisi Kanan: QR Code e-RDKK */}
          <div className="shrink-0 flex flex-col items-center bg-white p-0.5 rounded border border-slate-200 shadow-2xs">
            <QrCodeView value={petani.qrPayload} size={42} />
            <span className="text-[5.5px] font-mono font-bold text-emerald-800 mt-0.5">e-RDKK</span>
          </div>
        </div>

        {/* FOOTER BAWAH: Luas Lahan & Status Keanggotaan */}
        <div className="relative z-10 px-2 py-0.5 border-t border-emerald-300/80 bg-white/70 flex items-center justify-between text-[6.5px]">
          <div>
            <span className="text-slate-500">Total Luas: </span>
            <strong className="text-emerald-900 font-black">
              {petani.totalLuasLahan.toFixed(2)} Ha ({petani.lahanCount} Petak)
            </strong>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-300">
              <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> ANGGOTA SAH
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Versi Full (Pratinjau Satuan pada Halaman Cetak Petani)
  return (
    <div className="rounded-2xl bg-gradient-to-b from-white via-emerald-50/40 to-green-100/90 text-slate-800 p-4 sm:p-5 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[235px] border-2 border-slate-300 print:min-h-[220px] print:p-4 select-none">
      {/* PITA MERAH PUTIH BERKIBAR DI ATAS */}
      <div className="absolute top-0 inset-x-0 h-6 sm:h-7 flex flex-col shadow-xs z-10 pointer-events-none">
        <div className="h-1/2 w-full bg-gradient-to-r from-red-600 via-red-500 to-red-700" />
        <div className="h-1/2 w-full bg-white border-b-2 border-amber-400" />
      </div>

      {/* HEADER KARTU */}
      <div className="relative z-20 pt-4 sm:pt-5 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Logo Lambang Tani / Kementan Style */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-400 border-2 border-amber-600 flex items-center justify-center shadow-xs shrink-0">
            <Sprout className="w-4 h-4 sm:w-5 sm:h-5 text-slate-900" />
          </div>
          <div>
            <div className="text-[9px] sm:text-[10.5px] font-black uppercase text-red-700 tracking-wider leading-none">
              KEMENTERIAN PERTANIAN RI
            </div>
            <div className="text-[7.5px] sm:text-[8.5px] font-bold text-slate-600 tracking-tight leading-none mt-1">
              BPP WILAYAH KECAMATAN LEMBEYAN &bull; MAGETAN
            </div>
          </div>
        </div>

        {/* Sisi Kanan: Nama Kelompok Tani */}
        <div className="text-right">
          <div className="text-xs sm:text-sm font-black uppercase tracking-tight text-emerald-900 leading-none">
            {petani.poktanNama}
          </div>
          <div className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-500 mt-1">
            KARTU TANDA ANGGOTA (KTA)
          </div>
        </div>
      </div>

      {/* WATERMARK LATAR SAWAH / GUILLOCHE */}
      <div className="absolute inset-0 z-0 opacity-15 pointer-events-none flex items-center justify-center">
        <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
          <path d="M0,90 Q50,70 100,90 T200,85 L200,120 L0,120 Z" fill="#15803d" />
          <path d="M0,75 Q60,50 120,70 T200,60 L200,120 L0,120 Z" fill="#22c55e" opacity="0.6" />
          <circle cx="165" cy="40" r="18" fill="#eab308" opacity="0.4" />
        </svg>
      </div>

      {/* BODY KARTU: Foto, Identitas Berkolom, Chip & QR */}
      <div className="relative z-10 my-2 sm:my-3 flex items-center justify-between gap-3">
        {/* Foto Petani + Smart Chip */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="w-14 h-18 sm:w-16 sm:h-20 rounded-lg bg-red-600 p-1 shadow-sm overflow-hidden border border-amber-300">
            <img
              src={petani.fotoPetani}
              alt={petani.nama}
              className="w-full h-full object-cover rounded bg-slate-100"
            />
          </div>
          <SmartChipSim className="w-7 h-4 sm:w-8 sm:h-5" />
        </div>

        {/* Data Identitas Berkolom Rapi */}
        <div className="flex-1 min-w-0 text-[9px] sm:text-[10px] space-y-1">
          <div className="flex items-center">
            <span className="w-22 text-slate-500 font-semibold uppercase shrink-0 text-[8.5px]">NOMOR KTA</span>
            <span className="font-mono font-black text-slate-900">: {petani.nomorKartu}</span>
          </div>
          <div className="flex items-center">
            <span className="w-22 text-slate-500 font-semibold uppercase shrink-0 text-[8.5px]">NAMA PETANI</span>
            <span className="font-black text-slate-900 uppercase truncate">: {petani.nama}</span>
          </div>
          <div className="flex items-center">
            <span className="w-22 text-slate-500 font-semibold uppercase shrink-0 text-[8.5px]">NIK</span>
            <span className="font-mono font-bold text-slate-800">: {petani.nik}</span>
          </div>
          <div className="flex items-center">
            <span className="w-22 text-slate-500 font-semibold uppercase shrink-0 text-[8.5px]">ALAMAT</span>
            <span className="text-slate-800 font-medium truncate">: Ds. {petani.desa}, Kec. {petani.kecamatan || 'Lembeyan'}</span>
          </div>
          <div className="flex items-center">
            <span className="w-22 text-slate-500 font-semibold uppercase shrink-0 text-[8.5px]">KELOMPOK TANI</span>
            <span className="font-bold text-emerald-800 truncate">: {petani.poktanNama}</span>
          </div>
        </div>

        {/* QR Code e-RDKK */}
        <div className="shrink-0 flex flex-col items-center bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
          <QrCodeView value={petani.qrPayload} size={58} />
          <span className="text-[8px] font-mono font-bold text-emerald-800 mt-0.5">VALID e-RDKK</span>
        </div>
      </div>

      {/* FOOTER KARTU */}
      <div className="relative z-10 pt-1.5 border-t border-emerald-300/80 bg-white/60 flex items-center justify-between text-[8px] sm:text-[9.5px]">
        <div>
          <span className="text-slate-500">Luas Hamparan Lahan: </span>
          <strong className="text-emerald-900 font-black">
            {petani.totalLuasLahan.toFixed(2)} Ha ({petani.lahanCount} Blok Terdaftar)
          </strong>
        </div>
        <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
          <ShieldCheck className="w-3 h-3 text-emerald-600" /> KTA RESMI KELOMPOK TANI
        </span>
      </div>
    </div>
  );
}
