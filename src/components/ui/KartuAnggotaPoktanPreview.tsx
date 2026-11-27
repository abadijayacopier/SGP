'use client';

import React from 'react';
import QrCodeView from '@/components/ui/QrCodeView';

export interface KartuAnggotaData {
  id?: string;
  nama: string;
  nomorAnggota: string;
  nik?: string;
  jabatan: string;
  kelompokTani: string;
  desaKecamatan: string;
  fotoUrl?: string;
  qrPayload?: string;
  poktanId?: string;
}

interface Props {
  data: KartuAnggotaData;
  scale?: number; // default scale jika di layar
  className?: string;
}

export function KartuAnggotaPoktanPreview({
  data,
  className = '',
}: Props) {
  // CR-80 ratio: 85.6mm x 54mm (~ 1.585 : 1)
  // Ukuran dasar render di layar: 540px x 340px
  return (
    <div
      className={`relative w-[540px] h-[340px] rounded-[16px] overflow-hidden shadow-xl select-none bg-[#FAF9F6] border border-slate-300 print:shadow-none print:border-none ${className}`}
      style={{
        boxSizing: 'border-box',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      }}
    >
      {/* 1. LAYER LATAR BELAKANG GAMBAR ASLI PERSIS REFERENSI USER */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/kartu-tani-template.jpg"
        alt="Template Kartu Tani"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      />

      {/* 2. OVERLAY HEADER DINAMIS (JIKA SUBJUDUL KELOMPOK TANI DIUBAH) */}
      <div className="absolute top-[28px] left-[155px] z-10 pointer-events-none">
        <div className="font-extrabold text-[22px] tracking-wider text-[#0B5D3B] uppercase font-sans leading-tight">
          KARTU TANI
        </div>
        <div className="font-bold text-[13px] tracking-wide text-[#137A4E] uppercase font-sans leading-none mt-0.5">
          {data.kelompokTani || 'KELOMPOK TANI'}
        </div>
      </div>

      {/* 3. BINGKAI FOTO PASFOTO (Ukuran & Posisi pas persis pada kotak abu-abu di template) */}
      {/* Kotak abu-abu di gambar terletak pada: left ~102px, top ~130px, lebar ~92px, tinggi ~115px (rasio 3:4) */}
      <div
        className="absolute left-[102px] top-[130px] w-[92px] h-[115px] rounded-[6px] overflow-hidden border-[2.5px] border-[#D4AF37] shadow-inner bg-[#E5E5E5] z-10 flex items-center justify-center"
      >
        {data.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.fotoUrl}
            alt={data.nama}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
            <svg className="w-8 h-8 opacity-60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span className="text-[9px] mt-1 font-semibold leading-tight">Pasfoto 3:4</span>
          </div>
        )}
      </div>

      {/* 4. AREA DATA ANGGOTA (Di sebelah kanan foto, di area putih bersih) */}
      <div className="absolute left-[208px] top-[130px] w-[205px] z-10 space-y-2 text-[#0B5D3B] font-sans">
        {/* Nama Anggota */}
        <div>
          <span className="block text-[9px] font-bold tracking-wider uppercase text-slate-500 leading-none">
            Nama Lengkap
          </span>
          <strong className="text-[14px] font-black tracking-tight text-[#0B5D3B] uppercase block leading-tight truncate">
            {data.nama || 'NAMA PETANI'}
          </strong>
        </div>

        {/* No. Anggota */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold tracking-wider uppercase text-slate-500 w-[72px] shrink-0 leading-none">
            No. Anggota:
          </span>
          <span className="text-[11px] font-mono font-black text-[#B8860B] leading-none truncate">
            {data.nomorAnggota || 'KT-3509-0001'}
          </span>
        </div>

        {/* Jabatan */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold tracking-wider uppercase text-slate-500 w-[72px] shrink-0 leading-none">
            Jabatan:
          </span>
          <span className="text-[10px] font-bold text-slate-800 leading-none truncate bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
            {data.jabatan || 'Anggota Aktif'}
          </span>
        </div>

        {/* Kelompok Tani */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold tracking-wider uppercase text-slate-500 w-[72px] shrink-0 leading-none">
            Poktan:
          </span>
          <span className="text-[10.5px] font-black text-[#137A4E] leading-none truncate">
            {data.kelompokTani || 'Sri Mulyo'}
          </span>
        </div>

        {/* Desa / Kecamatan */}
        <div className="flex items-start gap-1.5 pt-0.5">
          <span className="text-[9px] font-bold tracking-wider uppercase text-slate-500 w-[72px] shrink-0 leading-none">
            Wilayah:
          </span>
          <span className="text-[9.5px] font-semibold text-slate-700 leading-tight">
            {data.desaKecamatan || 'Kediren, Kec. Lembeyan'}
          </span>
        </div>
      </div>

      {/* 5. KODE QR VERIFIKASI DIGITAL KELOMPOK TANI (Sudut Kiri Bawah) */}
      <div className="absolute left-[20px] bottom-[20px] z-10 flex items-center gap-2 bg-white/90 backdrop-blur-xs p-1 rounded-lg border border-[#D4AF37]/50 shadow-xs">
        <QrCodeView
          value={
            data.qrPayload ||
            (typeof window !== 'undefined'
              ? `${window.location.origin}/verifikasi?q=KARTUTANI:${data.nik || data.nomorAnggota}`
              : `/verifikasi?q=KARTUTANI:${data.nik || data.nomorAnggota}`)
          }
          size={38}
        />
        <div className="text-[7.5px] font-mono leading-tight text-[#0B5D3B]">
          <span className="font-bold block">KTA SAH</span>
          <span className="text-slate-500 text-[6.5px]">e-VERIFIKASI</span>
        </div>
      </div>

      {/* Label Tanpa Elemen Bank di Kanan Bawah */}
      <div className="absolute right-[22px] bottom-[16px] z-10 text-right pointer-events-none">
        <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-100 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/40 backdrop-blur-xs">
          KTA KELOMPOK TANI RESMI
        </span>
      </div>
    </div>
  );
}
