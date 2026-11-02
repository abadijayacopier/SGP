'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sun,
  CloudSun,
  CloudRain,
  CloudLightning,
  Cloud,
  Wind,
  Droplets,
  Sparkles,
  CalendarCheck,
  Compass,
  CheckCircle2,
  AlertTriangle,
  LocateFixed,
  RefreshCw,
  Navigation,
  ShieldAlert,
} from 'lucide-react';
import { CuacaLembeyanData } from '@/lib/weather-bmkg';

export default function WeatherFertilizerCard() {
  const [data, setData] = useState<CuacaLembeyanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsDetected, setGpsDetected] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  const fetchWeatherData = useCallback(async (lat: number, lon: number, isGps: boolean) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cuaca?lat=${lat}&lon=${lon}&isGps=${isGps ? 'true' : 'false'}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setGpsDetected(json.data.isGpsDevice);
      }
    } catch (err) {
      console.error('Error fetching live weather:', err);
    } finally {
      setLoading(false);
      setGpsLoading(false);
    }
  }, []);

  const requestGpsAndFetch = useCallback(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setGpsLoading(true);
      setGpsMessage('Mencari sinyal GPS perangkat...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setGpsMessage(null);
          fetchWeatherData(lat, lon, true);
        },
        (error) => {
          console.warn('GPS permission denied or unavailable:', error.message);
          setGpsMessage('Izin GPS ditolak / tidak aktif, menggunakan koordinat BPP Kec. Lembeyan');
          fetchWeatherData(-7.737, 111.416, false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      fetchWeatherData(-7.737, 111.416, false);
    }
  }, [fetchWeatherData]);

  useEffect(() => {
    requestGpsAndFetch();
  }, [requestGpsAndFetch]);

  // Icon Helper Sesuai Standar Google Weather
  const renderWeatherIcon = (iconName: string, className = 'w-8 h-8') => {
    switch (iconName) {
      case 'cerah':
        return <Sun className={`${className} text-amber-400`} />;
      case 'cerah_berawan':
        return <CloudSun className={`${className} text-amber-300`} />;
      case 'berawan':
        return <Cloud className={`${className} text-slate-300`} />;
      case 'hujan_ringan':
        return <CloudRain className={`${className} text-sky-400`} />;
      case 'hujan_lebat':
        return <CloudLightning className={`${className} text-blue-400`} />;
      default:
        return <CloudSun className={`${className} text-amber-300`} />;
    }
  };

  if (loading && !data) {
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
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-800/40 space-y-5 relative overflow-hidden">
      {/* Header Widget */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Standar Cuaca Google &bull; Real-Time Live
            </span>

            {/* GPS Detection Status Pill */}
            {gpsDetected ? (
              <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <LocateFixed className="w-3 h-3 text-cyan-300 animate-pulse" />
                GPS Perangkat Aktif ({data.latitude.toFixed(4)}, {data.longitude.toFixed(4)})
              </span>
            ) : (
              <span className="text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <Navigation className="w-3 h-3 text-amber-400" />
                Default Koordinat BPP Lembeyan
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-base sm:text-lg font-black text-white">
              Prakiraan Cuaca & Rekomendasi Pemupukan Sawah
            </h3>
            <span className="text-xs text-emerald-400 font-bold">
              &bull; 📍 {data.wilayah}
            </span>
          </div>

          {gpsMessage && (
            <p className="text-[11px] text-amber-300/80 mt-1 italic">
              {gpsMessage}
            </p>
          )}
        </div>

        {/* Action Controls & Recommendation Badge */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={requestGpsAndFetch}
            disabled={gpsLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs border border-white/15 transition cursor-pointer disabled:opacity-50"
            title="Deteksi ulang lokasi GPS perangkat"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin text-amber-300' : 'text-emerald-400'}`} />
            <span>{gpsLoading ? 'Mendeteksi...' : 'Deteksi GPS Saya'}</span>
          </button>

          <span
            className={`text-xs font-black px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 ${
              rekomendasiPemupukan.status === 'AMAN_OPTIMAL'
                ? 'bg-emerald-500 text-slate-950'
                : rekomendasiPemupukan.status === 'WASPADA'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-rose-500 text-white animate-pulse'
            }`}
          >
            {rekomendasiPemupukan.status === 'AMAN_OPTIMAL' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            {rekomendasiPemupukan.badgeLabel}
          </span>
        </div>
      </div>

      {/* Baris Utama: Cuaca Real-time + Rekomendasi Pintar Pemupukan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Kolom Kiri: Suhu & Kondisi Saat Ini */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center shrink-0">
                {renderWeatherIcon(kondisiSaatIni.icon, 'w-8 h-8')}
              </div>
              <div>
                <div className="text-3xl font-black text-white leading-tight">
                  {kondisiSaatIni.suhuC}&deg;<span className="text-lg font-semibold text-slate-400">C</span>
                </div>
                <div className="text-xs font-bold text-amber-300">{kondisiSaatIni.cuaca}</div>
                <div className="text-[10px] text-slate-400">
                  Terasa seperti {kondisiSaatIni.feelsLikeC}&deg;C
                </div>
              </div>
            </div>

            <div className="text-right space-y-1 text-[11px] text-slate-300 border-l border-white/10 pl-3">
              <div className="flex items-center gap-1 justify-end">
                <Droplets className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-semibold">{kondisiSaatIni.kelembabanPersen}%</span>
              </div>
              <div className="flex items-center gap-1 justify-end">
                <Wind className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold">{kondisiSaatIni.kecepatanAnginKmH} km/h</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {kondisiSaatIni.arahAngin}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
            <span className="flex items-center gap-1">
              <CloudRain className="w-3.5 h-3.5 text-sky-300" />
              Peluang Hujan: <strong className="text-white">{kondisiSaatIni.peluangHujan}%</strong>
            </span>
            <span className="text-slate-400">
              UV: <strong className="text-amber-300">{kondisiSaatIni.indeksUv}</strong>
            </span>
          </div>
        </div>

        {/* Kolom Tengah & Kanan: Rekomendasi Cerdas Pemupukan Sawah */}
        <div className="lg:col-span-2 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <CalendarCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <h4 className="text-xs sm:text-sm font-black text-emerald-300">
                {rekomendasiPemupukan.headline}
              </h4>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-normal">
              {rekomendasiPemupukan.detail}
            </p>
          </div>

          <div className="pt-2 border-t border-emerald-800/40 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="bg-emerald-900/60 px-3 py-1 rounded-xl border border-emerald-700/60 text-emerald-200 font-bold inline-flex items-center gap-1">
              <span>⏰ Waktu Optimal:</span>
              <strong className="text-white">{rekomendasiPemupukan.waktuIdeal}</strong>
            </span>
            <span className="text-[10px] text-slate-400 italic">
              Update: {new Date(data.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
            </span>
          </div>
        </div>
      </div>

      {/* Baris Prakiraan 3 Hari ke Depan (Live Google Meteorological) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/10">
        {prakiraan3Hari.map((p, idx) => (
          <div
            key={idx}
            className="bg-white/5 hover:bg-white/10 transition border border-white/10 rounded-2xl p-3 text-center space-y-1.5"
          >
            <div className="flex items-center justify-between text-xs font-black text-slate-300 px-1">
              <span>{p.hari}</span>
              <span className="text-[10px] font-normal text-slate-400">{p.tanggal}</span>
            </div>

            <div className="flex items-center justify-center gap-2 py-1">
              {renderWeatherIcon(p.icon, 'w-6 h-6')}
              <span className="text-xs font-bold text-white">{p.cuaca}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] px-1 font-mono">
              <span className="text-slate-400">
                {p.suhuMin}&deg; - {p.suhuMax}&deg;C
              </span>
              <span className="text-sky-300 font-bold">
                🌧️ {p.peluangHujan}%
              </span>
            </div>

            <div className="pt-1">
              <span
                className={`text-[9.5px] font-black px-2.5 py-0.5 rounded-full uppercase inline-block border ${
                  p.kelayakanPupuk === 'OPTIMAL'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : p.kelayakanPupuk === 'WASPADA'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {p.kelayakanPupuk === 'OPTIMAL'
                  ? 'Pupuk: Aman'
                  : p.kelayakanPupuk === 'WASPADA'
                  ? 'Waspada Cuaca'
                  : 'Tunda Pemupukan'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
