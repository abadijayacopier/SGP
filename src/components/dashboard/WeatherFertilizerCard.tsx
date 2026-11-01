'use client';

import React, { useState, useEffect } from 'react';
import {
  Sun,
  CloudSun,
  CloudRain,
  Wind,
  Droplets,
  Sparkles,
  CalendarCheck,
  Compass,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { CuacaLembeyanData } from '@/lib/weather-bmkg';

export default function WeatherFertilizerCard() {
  const [data, setData] = useState<CuacaLembeyanData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cuaca')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setData(json.data);
        }
      })
      .catch((err) => console.error('Error load cuaca:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-800/40 space-y-5 animate-pulse min-h-[220px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-5 bg-white/20 rounded-full w-48" />
            <div className="h-4 bg-white/10 rounded w-24" />
          </div>
          <div className="h-6 bg-white/10 rounded-full w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 bg-white/5 rounded-2xl border border-white/5" />
          <div className="md:col-span-2 h-28 bg-white/5 rounded-2xl border border-white/5" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kondisiSaatIni, rekomendasiPemupukan, prakiraan3Hari } = data;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-800/40 space-y-5">
      {/* Header Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Prakiraan Cuaca BMKG Lembeyan
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Magetan, Jatim</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white">
            Prakiraan Cuaca & Rekomendasi Pemupukan Sawah
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500 text-slate-950 shadow-sm flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {rekomendasiPemupukan.badgeLabel}
          </span>
        </div>
      </div>

      {/* Baris Utama: Cuaca Real-time + Rekomendasi Pintar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Kolom Kiri: Suhu & Kondisi Saat Ini */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <CloudSun className="w-8 h-8" />
            </div>
            <div>
              <div className="text-3xl font-black text-white leading-tight">
                {kondisiSaatIni.suhuC}&deg;<span className="text-lg font-semibold text-slate-400">C</span>
              </div>
              <div className="text-xs font-bold text-amber-300">{kondisiSaatIni.cuaca}</div>
            </div>
          </div>

          <div className="text-right space-y-1 text-[11px] text-slate-300 border-l border-white/10 pl-3">
            <div className="flex items-center gap-1 justify-end">
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              <span>{kondisiSaatIni.kelembabanPersen}%</span>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <Wind className="w-3.5 h-3.5 text-emerald-400" />
              <span>{kondisiSaatIni.kecepatanAnginKmH} km/h</span>
            </div>
            <div className="text-[10px] text-slate-400">{kondisiSaatIni.arahAngin}</div>
          </div>
        </div>

        {/* Kolom Tengah & Kanan: Rekomendasi Pemupukan Cerdas */}
        <div className="md:col-span-2 bg-emerald-900/30 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs sm:text-sm font-black text-emerald-300">
              {rekomendasiPemupukan.headline}
            </h4>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-normal">
            {rekomendasiPemupukan.detail}
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-emerald-200 font-semibold">
            <span className="bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/60">
              ⏰ Waktu Optimal: {rekomendasiPemupukan.waktuIdeal}
            </span>
          </div>
        </div>
      </div>

      {/* Baris 3 Hari ke Depan */}
      <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/10">
        {prakiraan3Hari.map((p, idx) => (
          <div
            key={idx}
            className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center space-y-1"
          >
            <div className="text-[11px] font-black text-slate-300">{p.hari}</div>
            <div className="text-[10px] text-slate-400">{p.tanggal}</div>
            <div className="text-xs font-bold text-white pt-1">{p.cuaca}</div>
            <div className="text-[10px] font-mono text-emerald-300 font-bold">
              {p.suhuMin}&deg; - {p.suhuMax}&deg;C
            </div>
            <div className="pt-1">
              <span
                className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                  p.kelayakanPupuk === 'OPTIMAL'
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                }`}
              >
                {p.kelayakanPupuk === 'OPTIMAL' ? 'Pupuk: Aman' : 'Waspada Hujan'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
