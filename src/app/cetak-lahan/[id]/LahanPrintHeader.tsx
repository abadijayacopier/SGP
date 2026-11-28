'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layers, Printer, Calendar, ArrowLeft, ChevronDown } from 'lucide-react';

interface LahanPrintHeaderProps {
  currentLahanId: string;
  allLahanList: Array<{
    id: string;
    kodeLahan: string;
    namaLahan: string;
    komoditas?: string;
    luasHa: number;
    petani?: {
      id: string;
      nama: string;
      desa?: string;
    } | null;
  }>;
  lahanPetaniList?: Array<{
    id: string;
    kodeLahan: string;
    namaLahan: string;
    komoditas?: string;
    luasHa: number;
    petani?: {
      id: string;
      nama: string;
      desa?: string;
    } | null;
  }>;
  namaPetani?: string;
}

export default function LahanPrintHeader({
  currentLahanId,
  allLahanList,
  lahanPetaniList = [],
  namaPetani = '',
}: LahanPrintHeaderProps) {
  const router = useRouter();

  // Pisahkan lahan milik petani saat ini dengan lahan milik petani lain
  const currentPetaniLahan = React.useMemo(() => {
    if (lahanPetaniList && lahanPetaniList.length > 0) {
      return lahanPetaniList;
    }
    const current = allLahanList.find((l) => l.id === currentLahanId);
    if (!current?.petani?.id) return [];
    return allLahanList.filter((l) => l.petani?.id === current.petani?.id);
  }, [lahanPetaniList, allLahanList, currentLahanId]);

  const otherLahanList = React.useMemo(() => {
    const currentIds = new Set(currentPetaniLahan.map((l) => l.id));
    return allLahanList.filter((l) => !currentIds.has(l.id));
  }, [allLahanList, currentPetaniLahan]);

  return (
    <div className="max-w-4xl mx-auto px-4 mb-6 space-y-2.5 no-print">
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navigasi Kembali */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/peta"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Peta GIS</span>
          </Link>
          <Link
            href="/petani"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 transition"
          >
            <span>Daftar Petani</span>
          </Link>
        </div>

        {/* Dropdown Ganti Lahan */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <label className="text-[11px] font-bold text-slate-600 shrink-0 hidden sm:flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pilih Blok Lahan:</span>
          </label>
          <div className="relative w-full">
            <select
              value={currentLahanId}
              onChange={(e) => {
                if (e.target.value) {
                  router.push(`/cetak-lahan/${e.target.value}`);
                }
              }}
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-300 text-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition cursor-pointer appearance-none truncate"
            >
              {/* Grup 1: Seluruh Blok Petak Milik Petani Ini (Prioritas Utama) */}
              {currentPetaniLahan.length > 0 ? (
                <optgroup
                  label={`📍 Blok Lahan Milik ${namaPetani || 'Petani Ini'} (${currentPetaniLahan.length} Petak Terdaftar)`}
                >
                  {currentPetaniLahan.map((item, idx) => (
                    <option key={item.id} value={item.id}>
                      {currentPetaniLahan.length > 1 ? `Blok ${idx + 1}: ` : ''}
                      {item.kodeLahan} • {item.namaLahan} ({item.komoditas || 'Padi'} - {item.luasHa} Ha)
                    </option>
                  ))}
                </optgroup>
              ) : (
                allLahanList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.kodeLahan} • {item.petani?.nama || '-'} ({item.komoditas || 'Padi'} - {item.luasHa} Ha)
                  </option>
                ))
              )}

              {/* Grup 2: Opsi beralih ke Lahan Petani Lainnya se-Kecamatan */}
              {otherLahanList.length > 0 && (
                <optgroup label="── Ganti ke Petani Lainnya (Se-Kecamatan) ──">
                  {otherLahanList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.petani?.nama || '-'} • {item.kodeLahan} - {item.namaLahan} ({item.luasHa} Ha)
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/cetak-kalender-tanam/${currentLahanId}`}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl border border-slate-300 transition"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Kalender Tanam</span>
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Shortcut Lahan Lain Milik Petani yang Sama */}
      {currentPetaniLahan.length > 1 && (
        <div className="flex items-center gap-2 px-1 text-xs">
          <span className="text-[11px] font-bold text-slate-500">
            Blok lain milik {namaPetani} ({currentPetaniLahan.length} Blok):
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {currentPetaniLahan.map((p, idx) => {
              const isCurrent = p.id === currentLahanId;
              return (
                <Link
                  key={p.id}
                  href={`/cetak-lahan/${p.id}`}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                    isCurrent
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-300'
                  }`}
                >
                  Blok {idx + 1}: {p.namaLahan} ({p.luasHa} Ha)
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
