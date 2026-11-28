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
  scale?: number;
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
      {/* 1. LAYER LATAR BELAKANG GAMBAR ASLI TEMPLATE */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/kartu-tani-template.jpg"
        alt="Template Kartu Tani"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      />

      {/* 2. OVERLAY HEADER BERSIH (MENUTUP TEXT BAWAAN AGAR TIDAK DOUBLE/TABRAKAN) */}
      <div className="absolute top-[74px] left-[96px] z-10 bg-[#FAF9F6] w-[220px] h-[42px] flex flex-col justify-center pointer-events-none">
        <div className="font-extrabold text-[19px] tracking-wider text-[#0B5D3B] uppercase font-sans leading-none">
          KARTU TANI
        </div>
        <div className="font-bold text-[11px] tracking-wider text-[#137A4E] uppercase font-sans leading-none mt-1 truncate">
          POKTAN {data.kelompokTani ? data.kelompokTani.replace(/^POKTAN\s+/i, '') : 'SRI MULYO'}
        </div>
      </div>

      {/* 3. BINGKAI FOTO PASFOTO (Posisi pas pada kotak di template) */}
      <div
        className="absolute left-[102px] top-[128px] w-[92px] h-[115px] rounded-[6px] overflow-hidden border-[2.5px] border-[#D4AF37] shadow-inner bg-[#E5E5E5] z-10 flex items-center justify-center"
      >
        {data.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.fotoUrl}
            alt={data.nama}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center bg-slate-100 w-full h-full">
            <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span className="text-[9px] mt-1 font-semibold text-slate-500 leading-tight">Pasfoto 3:4</span>
          </div>
        )}
      </div>

      {/* 4. AREA DATA ANGGOTA (Dengan latar putih bersih agar tidak bertabrakan dengan gambar bukit hijau) */}
      <div className="absolute left-[204px] top-[126px] w-[190px] z-10 p-2.5 rounded-xl bg-white/95 backdrop-blur-xs shadow-xs border border-amber-200/60 space-y-1.5 text-[#0B5D3B] font-sans">
        {/* Nama Lengkap */}
        <div className="border-b border-slate-100 pb-1">
          <span className="block text-[8px] font-bold tracking-wider uppercase text-slate-500 leading-none">
            Nama Lengkap
          </span>
          <strong className="text-[13px] font-black tracking-tight text-[#0B5D3B] uppercase block leading-tight truncate">
            {data.nama || 'NAMA PETANI'}
          </strong>
        </div>

        {/* No. Anggota */}
        <div className="flex items-center justify-between gap-1 text-[9px]">
          <span className="font-bold uppercase text-slate-500 shrink-0">
            No. Anggota:
          </span>
          <span className="font-mono font-black text-[#B8860B] truncate">
            {data.nomorAnggota || 'KT-3509-0001'}
          </span>
        </div>

        {/* Jabatan */}
        <div className="flex items-center justify-between gap-1 text-[9px]">
          <span className="font-bold uppercase text-slate-500 shrink-0">
            Jabatan:
          </span>
          <span className="font-bold text-slate-800 truncate bg-amber-100/80 px-1.5 py-0.5 rounded text-[8.5px]">
            {data.jabatan || 'Anggota Aktif'}
          </span>
        </div>

        {/* Kelompok Tani */}
        <div className="flex items-center justify-between gap-1 text-[9px]">
          <span className="font-bold uppercase text-slate-500 shrink-0">
            Poktan:
          </span>
          <span className="font-black text-[#137A4E] truncate">
            {data.kelompokTani || 'Sri Mulyo'}
          </span>
        </div>

        {/* Wilayah / Desa */}
        <div className="flex items-start justify-between gap-1 text-[9px]">
          <span className="font-bold uppercase text-slate-500 shrink-0">
            Wilayah:
          </span>
          <span className="font-semibold text-slate-700 text-right text-[8.5px] truncate">
            {data.desaKecamatan || 'Kediren, Lembeyan'}
          </span>
        </div>
      </div>

      {/* 5. KODE QR VERIFIKASI DIGITAL KELOMPOK TANI (Di dalam batas kartu) */}
      <div className="absolute left-[102px] top-[249px] w-[92px] h-[40px] z-10 flex items-center justify-center gap-1.5 bg-white/95 backdrop-blur-xs px-1.5 py-1 rounded-lg border border-[#D4AF37]/60 shadow-xs">
        <QrCodeView
          value={
            data.qrPayload ||
            (typeof window !== 'undefined'
              ? `${window.location.origin}/verifikasi?q=KARTUTANI:${data.nik || data.nomorAnggota}`
              : `/verifikasi?q=KARTUTANI:${data.nik || data.nomorAnggota}`)
          }
          size={30}
        />
        <div className="text-[7px] font-mono leading-tight text-[#0B5D3B]">
          <span className="font-bold block">KTA SAH</span>
          <span className="text-slate-500 text-[6px]">e-VERIFIKASI</span>
        </div>
      </div>

      {/* 6. LABEL KTA RESMI DI KANAN BAWAH KARTU */}
      <div className="absolute right-[92px] bottom-[48px] z-10 text-right pointer-events-none">
        <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-100 bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-500/40 backdrop-blur-xs">
          KTA KELOMPOK TANI RESMI
        </span>
      </div>
    </div>
  );
}
