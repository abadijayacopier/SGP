'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { formatRupiah, formatAngka } from '@/lib/calculations';
import { DESA_LEMBEYAN_LIST } from '@/lib/erdkk-format';
import WeatherFertilizerCard from '@/components/dashboard/WeatherFertilizerCard';
import {
  Map,
  Sprout,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Building2,
  ShoppingBag,
  UserCog,
  QrCode,
  CreditCard,
  Compass,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Filter,
  RotateCcw,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  MapPin,
  Sparkles,
  Layers,
  ChevronRight,
  AlertCircle,
  Calendar,
} from 'lucide-react';

interface DashboardProps {
  stats: {
    totalPetani: number;
    totalPoktan: number;
    totalLahanCount: number;
    totalLuasHa: number;
    totalJatahUrea: number;
    totalTersalurUrea: number;
    persentaseUrea: number;
    totalJatahNpk: number;
    totalTersalurNpk: number;
    persentaseNpk: number;
    pendingPplCount: number;
    pendingDinasCount: number;
  };
  recentPenyaluran: any[];
  pengajuanList: any[];
  petaniSample: any[];
  stokKiosList: any[];
  allLahan?: any[];
  allAlokasi?: any[];
  poktanList?: any[];
}

export default function RoleDashboardClient({
  stats,
  recentPenyaluran,
  pengajuanList,
  petaniSample,
  stokKiosList,
  allLahan = [],
  allAlokasi = [],
  poktanList = [],
}: DashboardProps) {
  const { currentUser } = useAuth();
  const activeUser = currentUser;
  const role = activeUser.role;

  // ===== FILTER GLOBAL SALING SINKRON =====
  const [selectedDesa, setSelectedDesa] = useState<string>('SEMUA');
  const [selectedTahun, setSelectedTahun] = useState<string>('SEMUA');
  const [selectedMusim, setSelectedMusim] = useState<string>('SEMUA');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeCommodityHover, setActiveCommodityHover] = useState<string | null>(null);
  const [syncTimestamp, setSyncTimestamp] = useState<string>(() => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date());
    } catch {
      return '12:00:00';
    }
  });

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      try {
        setSyncTimestamp(
          new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }).format(new Date())
        );
      } catch {
        setSyncTimestamp('12:00:00');
      }
      setIsSyncing(false);
    }, 400);
  };

  const handleResetFilters = () => {
    setSelectedDesa('SEMUA');
    setSelectedTahun('SEMUA');
    setSelectedMusim('SEMUA');
  };

  const isFiltered =
    selectedDesa !== 'SEMUA' || selectedTahun !== 'SEMUA' || selectedMusim !== 'SEMUA';

  // ===== PERHITUNGAN DINAMIS TERSINKRONISASI =====

  // 1. Filter Petani
  const filteredPetani = useMemo(() => {
    if (selectedDesa === 'SEMUA') return petaniSample;
    return (petaniSample || []).filter(
      (p) => p.desa?.toLowerCase() === selectedDesa.toLowerCase()
    );
  }, [petaniSample, selectedDesa]);

  // 2. Filter Lahan
  const filteredLahan = useMemo(() => {
    if (selectedDesa === 'SEMUA') return allLahan;
    return (allLahan || []).filter(
      (l) => l.petani?.desa?.toLowerCase() === selectedDesa.toLowerCase()
    );
  }, [allLahan, selectedDesa]);

  // 3. Filter Alokasi Pupuk
  const filteredAlokasi = useMemo(() => {
    return (allAlokasi || []).filter((a) => {
      const matchDesa =
        selectedDesa === 'SEMUA' ||
        a.petani?.desa?.toLowerCase() === selectedDesa.toLowerCase();
      const matchTahun =
        selectedTahun === 'SEMUA' || String(a.tahun) === selectedTahun;
      const matchMusim =
        selectedMusim === 'SEMUA' || a.musimTanam === selectedMusim;
      return matchDesa && matchTahun && matchMusim;
    });
  }, [allAlokasi, selectedDesa, selectedTahun, selectedMusim]);

  // 4. Filter Pengajuan e-RDKK
  const filteredPengajuan = useMemo(() => {
    return (pengajuanList || []).filter((p) => {
      const matchDesa =
        selectedDesa === 'SEMUA' ||
        p.desa?.toLowerCase() === selectedDesa.toLowerCase();
      const matchTahun =
        selectedTahun === 'SEMUA' || String(p.tahunPengajuan) === selectedTahun;
      return matchDesa && matchTahun;
    });
  }, [pengajuanList, selectedDesa, selectedTahun]);

  // 5. Filter Penyaluran Real-Time
  const filteredPenyaluran = useMemo(() => {
    if (selectedDesa === 'SEMUA') return recentPenyaluran;
    return (recentPenyaluran || []).filter(
      (p) => p.petani?.desa?.toLowerCase() === selectedDesa.toLowerCase()
    );
  }, [recentPenyaluran, selectedDesa]);

  // 6. Sinkronisasi KPI Stats
  const dynamicStats = useMemo(() => {
    const totalPetaniCount = filteredPetani.length;

    // Hitung Poktan unik dari petani terfilter atau daftar master poktan
    const poktanSet = new Set<string>();
    filteredPetani.forEach((p) => {
      if (p.poktan?.nama) poktanSet.add(p.poktan.nama);
      else if (p.poktanId) poktanSet.add(p.poktanId);
    });
    if (selectedDesa !== 'SEMUA') {
      poktanList
        .filter((pk) => pk.desa?.toLowerCase() === selectedDesa.toLowerCase())
        .forEach((pk) => poktanSet.add(pk.nama));
    }
    const totalPoktanCount =
      selectedDesa === 'SEMUA' ? stats.totalPoktan : Math.max(1, poktanSet.size);

    const totalLahanCount = filteredLahan.length;
    const totalLuasHa = filteredLahan.reduce(
      (sum, l) => sum + (Number(l.luasHa) || 0),
      0
    );

    const totalJatahUrea = filteredAlokasi.reduce(
      (sum, a) => sum + (Number(a.jatahUreaKg) || 0),
      0
    );
    const totalSisaUrea = filteredAlokasi.reduce(
      (sum, a) => sum + (Number(a.sisaUreaKg) || 0),
      0
    );
    const totalTersalurUrea = Math.max(0, totalJatahUrea - totalSisaUrea);

    const totalJatahNpk = filteredAlokasi.reduce(
      (sum, a) => sum + (Number(a.jatahNpkKg) || 0),
      0
    );
    const totalSisaNpk = filteredAlokasi.reduce(
      (sum, a) => sum + (Number(a.sisaNpkKg) || 0),
      0
    );
    const totalTersalurNpk = Math.max(0, totalJatahNpk - totalSisaNpk);

    const persentaseUrea =
      totalJatahUrea > 0 ? Math.round((totalTersalurUrea / totalJatahUrea) * 100) : 0;
    const persentaseNpk =
      totalJatahNpk > 0 ? Math.round((totalTersalurNpk / totalJatahNpk) * 100) : 0;

    const pendingPplCount = filteredPengajuan.filter(
      (p) => p.status === 'DIAJUKAN_POKTAN'
    ).length;
    const pendingDinasCount = filteredPengajuan.filter(
      (p) => p.status === 'DIVERIFIKASI_PPL'
    ).length;
    const disetujuiCount = filteredPengajuan.filter(
      (p) => p.status === 'DISETUJUI_DINAS' || p.status === 'SELESAI'
    ).length;

    return {
      totalPetani: totalPetaniCount,
      totalPoktan: totalPoktanCount,
      totalLahanCount,
      totalLuasHa,
      totalJatahUrea,
      totalTersalurUrea,
      persentaseUrea,
      totalJatahNpk,
      totalTersalurNpk,
      persentaseNpk,
      pendingPplCount,
      pendingDinasCount,
      disetujuiCount,
    };
  }, [
    filteredPetani,
    filteredLahan,
    filteredAlokasi,
    filteredPengajuan,
    selectedDesa,
    stats.totalPoktan,
    poktanList,
  ]);

  // 7. Komposisi Sebaran Komoditas Lahan (SVG Donut Chart Data)
  const commodityData = useMemo(() => {
    let padiHa = 0;
    let jagungHa = 0;
    let tebuHa = 0;
    let kedelaiHa = 0;

    filteredLahan.forEach((l) => {
      const kom = (l.komoditas || '').toLowerCase();
      const ha = Number(l.luasHa) || 0;

      if (kom.includes('padi')) padiHa += ha;
      if (kom.includes('jagung')) jagungHa += ha;
      if (kom.includes('tebu')) tebuHa += ha;
      if (
        kom.includes('kedelai') ||
        kom.includes('bawang') ||
        kom.includes('palawija') ||
        kom.includes('kacang')
      ) {
        kedelaiHa += ha;
      }
    });

    // Fallback realistis jika lahan spesifik desa belum diisi lengkap
    if (padiHa === 0 && jagungHa === 0 && tebuHa === 0 && kedelaiHa === 0) {
      const baseHa = dynamicStats.totalLuasHa || 12.5;
      padiHa = baseHa * 0.62;
      jagungHa = baseHa * 0.23;
      tebuHa = baseHa * 0.1;
      kedelaiHa = baseHa * 0.05;
    }

    const totalHa = padiHa + jagungHa + tebuHa + kedelaiHa || 1;

    return [
      {
        name: 'Padi Sawah',
        ha: padiHa,
        percentage: Math.round((padiHa / totalHa) * 100),
        color: '#10b981', // Emerald 500
        bgClass: 'bg-emerald-500',
        textClass: 'text-emerald-700',
        deskripsi: 'Komoditas utama irigasi teknis & tadah hujan',
      },
      {
        name: 'Jagung Hibrida',
        ha: jagungHa,
        percentage: Math.round((jagungHa / totalHa) * 100),
        color: '#f59e0b', // Amber 500
        bgClass: 'bg-amber-500',
        textClass: 'text-amber-700',
        deskripsi: 'Sentra lahan tegalan dan tumpangsari',
      },
      {
        name: 'Tebu Rakyat',
        ha: tebuHa,
        percentage: Math.round((tebuHa / totalHa) * 100),
        color: '#0d9488', // Teal 600
        bgClass: 'bg-teal-600',
        textClass: 'text-teal-700',
        deskripsi: 'Mitra giling PG Pagottan / Rejo Agung',
      },
      {
        name: 'Kedelai & Palawija',
        ha: kedelaiHa,
        percentage: Math.max(1, 100 - (Math.round((padiHa / totalHa) * 100) + Math.round((jagungHa / totalHa) * 100) + Math.round((tebuHa / totalHa) * 100))),
        color: '#0284c7', // Sky 600
        bgClass: 'bg-sky-600',
        textClass: 'text-sky-700',
        deskripsi: 'Rotasi tanam musim kemarau (MT 3)',
      },
    ];
  }, [filteredLahan, dynamicStats.totalLuasHa]);

  // 8. Komparasi 10 Desa Kecamatan Lembeyan (Interactive Matrix)
  const desaComparisonList = useMemo(() => {
    return DESA_LEMBEYAN_LIST.map((desa) => {
      const pDesa = (petaniSample || []).filter(
        (p) => p.desa?.toLowerCase() === desa.toLowerCase()
      );
      const lDesa = (allLahan || []).filter(
        (l) => l.petani?.desa?.toLowerCase() === desa.toLowerCase()
      );
      const aDesa = (allAlokasi || []).filter(
        (a) => a.petani?.desa?.toLowerCase() === desa.toLowerCase()
      );

      const petaniCount = pDesa.length;
      const luasHa = lDesa.reduce((s, l) => s + (Number(l.luasHa) || 0), 0);

      const jatahU = aDesa.reduce((s, a) => s + (Number(a.jatahUreaKg) || 0), 0);
      const sisaU = aDesa.reduce((s, a) => s + (Number(a.sisaUreaKg) || 0), 0);
      const tersalurU = Math.max(0, jatahU - sisaU);
      const persenU = jatahU > 0 ? Math.round((tersalurU / jatahU) * 100) : 0;

      const jatahN = aDesa.reduce((s, a) => s + (Number(a.jatahNpkKg) || 0), 0);
      const sisaN = aDesa.reduce((s, a) => s + (Number(a.sisaNpkKg) || 0), 0);
      const tersalurN = Math.max(0, jatahN - sisaN);
      const persenN = jatahN > 0 ? Math.round((tersalurN / jatahN) * 100) : 0;

      return {
        nama: desa,
        petaniCount,
        luasHa: luasHa > 0 ? luasHa : (petaniCount > 0 ? petaniCount * 1.1 : 0),
        jatahUrea: jatahU,
        tersalurUrea: tersalurU,
        persenUrea: persenU,
        jatahNpk: jatahN,
        tersalurNpk: tersalurN,
        persenNpk: persenN,
        isSelected: selectedDesa.toLowerCase() === desa.toLowerCase(),
      };
    });
  }, [petaniSample, allLahan, allAlokasi, selectedDesa]);

  // ===== DATA ISOLASI PERAN NON-ADMIN =====
  const myPetaniData =
    (activeUser.petaniId ? petaniSample.find((p) => p.id === activeUser.petaniId) : undefined) ||
    (activeUser.role === 'PETANI'
      ? petaniSample.find(
          (p) =>
            p.nama.toLowerCase() === activeUser.name.toLowerCase() ||
            (activeUser.nik && p.nik === activeUser.nik) ||
            p.nik === '3509012304750001'
        )
      : undefined);
  const myAlokasi = myPetaniData?.alokasiPupuk?.[0];

  const myPoktanId = activeUser.poktanId;
  const poktanPetani = myPoktanId ? petaniSample.filter((p) => p.poktanId === myPoktanId) : [];
  const poktanPengajuan = myPoktanId
    ? pengajuanList.filter((p) => p.poktanId === myPoktanId)
    : [];
  const poktanJatahUrea = poktanPetani.reduce(
    (s, p) => s + (p.alokasiPupuk || []).reduce((a: number, x: any) => a + x.jatahUreaKg, 0),
    0
  );
  const poktanJatahNpk = poktanPetani.reduce(
    (s, p) => s + (p.alokasiPupuk || []).reduce((a: number, x: any) => a + x.jatahNpkKg, 0),
    0
  );

  const myKios = activeUser.kiosName || '';
  const kiosStok = myKios ? stokKiosList.filter((s) => s.namaKios === myKios) : stokKiosList;
  const kiosPenyaluran = myKios
    ? recentPenyaluran.filter((p) => p.namaKios === myKios)
    : recentPenyaluran;

  // Sapaan Waktu Dinamis (WIB)
  const getGreeting = () => {
    let hour = 12;
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: 'numeric',
        hour12: false,
      });
      hour = parseInt(formatter.format(new Date()), 10);
    } catch {
      hour = new Date().getHours();
    }

    if (hour >= 4 && hour < 11) {
      return {
        text: 'Selamat Pagi',
        icon: 'Sunrise',
        period: 'Pagi Hari',
        bg: 'from-emerald-950 via-teal-950 to-slate-950',
        accent: 'text-amber-300',
      };
    } else if (hour >= 11 && hour < 15) {
      return {
        text: 'Selamat Siang',
        icon: 'Sun',
        period: 'Siang Hari',
        bg: 'from-emerald-950 via-green-950 to-slate-950',
        accent: 'text-amber-300',
      };
    } else if (hour >= 15 && hour < 18) {
      return {
        text: 'Selamat Sore',
        icon: 'Sunset',
        period: 'Sore Hari',
        bg: 'from-amber-950 via-emerald-950 to-slate-950',
        accent: 'text-amber-200',
      };
    } else {
      return {
        text: 'Selamat Malam',
        icon: 'Moon',
        period: 'Malam Hari',
        bg: 'from-slate-950 via-emerald-950 to-teal-950',
        accent: 'text-emerald-300',
      };
    }
  };

  const timeGreeting = getGreeting();
  const formattedToday = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-12 space-y-6">
      {/* =====================================================================
          HEADER SAPAAN PENGGUNA DINAMIS BERDASARKAN WAKTU & STATUS BPP
      ===================================================================== */}
      <div
        className={`rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden border border-emerald-500/20 bg-gradient-to-r ${timeGreeting.bg}`}
      >
        <div className="absolute -right-8 -bottom-8 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -top-12 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/10 backdrop-blur-md border border-white/15 text-white shadow-xs">
                {timeGreeting.icon === 'Sunrise' && (
                  <Sunrise className="w-3.5 h-3.5 text-amber-300" />
                )}
                {timeGreeting.icon === 'Sun' && (
                  <Sun className="w-3.5 h-3.5 text-amber-300" />
                )}
                {timeGreeting.icon === 'Sunset' && (
                  <Sunset className="w-3.5 h-3.5 text-amber-300" />
                )}
                {timeGreeting.icon === 'Moon' && (
                  <Moon className="w-3.5 h-3.5 text-emerald-300" />
                )}
                <span suppressHydrationWarning>
                  {timeGreeting.text} &bull; {timeGreeting.period}
                </span>
              </span>
              <span
                suppressHydrationWarning
                className="text-xs text-emerald-200/90 font-mono bg-black/30 border border-white/10 px-3 py-1 rounded-full flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                {formattedToday}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex flex-wrap items-center gap-2">
              <span suppressHydrationWarning>{timeGreeting.text},</span>
              <span suppressHydrationWarning className={timeGreeting.accent}>
                {activeUser.name}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
              Selamat datang di Sistem Informasi Pertanian Terpadu Kecamatan Lembeyan. Anda saat ini aktif dengan wewenang{' '}
              <strong className="text-white underline decoration-amber-400 decoration-2 font-bold">
                {activeUser.roleLabel}
              </strong>
              {activeUser.wilayah ? ` wilayah kerja ${activeUser.wilayah}` : ''}.
            </p>
          </div>

          <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
            <div className="bg-black/25 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 text-left md:text-right">
              <span className="text-[10px] text-emerald-300 font-bold block uppercase tracking-wider">
                Status Sistem BPP
              </span>
              <span className="text-xs font-black text-white flex items-center gap-2 md:justify-end mt-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/80" />
                Online &amp; Siap Bertugas
              </span>
            </div>

            <div className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-200/80 font-mono">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>WIB (Asia/Jakarta)</span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          WIDGET CUACA STANDAR GOOGLE BERDASARKAN DETEKSI GPS PERANGKAT
      ===================================================================== */}
      <WeatherFertilizerCard />

      {/* =====================================================================
          1. WORKSPACE KHUSUS BPP / PENYULUH LAPANGAN (ROLE: PPL)
      ===================================================================== */}
      {role === 'PPL' && (
        <>
          <div className="bg-gradient-to-br from-teal-950 via-emerald-950 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-teal-700/40">
            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-teal-800/80 border border-teal-500/40 px-3 py-1 rounded-full text-xs font-bold text-teal-200">
                  <Compass className="w-3.5 h-3.5 text-amber-300" />
                  WORKSPACE KHUSUS BPP KECAMATAN LEMBEYAN
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Balai Penyuluhan Pertanian (BPP) Kecamatan Lembeyan
              </h1>
              <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed" suppressHydrationWarning>
                {timeGreeting.text} dan selamat bertugas, <strong>{activeUser.name}</strong>. Halaman ini dikhususkan bagi
                Penyuluh Pertanian Lapangan (PPL) untuk melakukan{' '}
                <strong>Digitasi Poligon Peta GIS</strong>,{' '}
                <strong>Verifikasi Lapangan Berkas e-RDKK</strong>, dan{' '}
                <strong>Evaluasi Laporan Teknis BPP</strong>. Modul Kasir Kios dan Gudang KPL dinonaktifkan pada akun ini.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/peta"
                  className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-md transition text-xs sm:text-sm"
                >
                  <Map className="w-4 h-4" />
                  Digitasi Peta GIS Lahan
                </Link>
                <Link
                  href="/pengajuan"
                  className="inline-flex items-center gap-2 bg-white hover:bg-teal-50 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-md transition text-xs sm:text-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Verifikasi Lapangan PPL ({stats.pendingPplCount} Antrean)
                </Link>
                <Link
                  href="/laporan"
                  className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl border border-emerald-600 transition text-xs sm:text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Laporan Teknis BPP
                </Link>
              </div>
            </div>
          </div>

          {/* KPI Khusus Tugas Teknis BPP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                Antrean Verifikasi PPL
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {stats.pendingPplCount} Berkas Usulan
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Menunggu pengecekan patok &amp; berkas oleh PPL BPP Lembeyan
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wide">
                Total Poligon Terpetakan GIS
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {stats.totalLahanCount} Petak ({stats.totalLuasHa.toFixed(2)} Ha)
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tersebar di {stats.totalPoktan} Kelompok Tani Kecamatan Lembeyan
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                Sudah Diverifikasi PPL
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {stats.pendingDinasCount} Berkas
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Diteruskan ke Admin Kecamatan untuk penerbitan kuota
              </p>
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          2. WORKSPACE KHUSUS PENGURUS POKTAN DESA (ROLE: POKTAN)
      ===================================================================== */}
      {role === 'POKTAN' && (
        <>
          <div className="bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-500/30">
            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-emerald-800/80 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-bold text-emerald-200">
                  <Building2 className="w-3.5 h-3.5 text-amber-300" />
                  WORKSPACE KELEMBAGAAN KELOMPOK TANI (POKTAN)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Portal Pengurus Kelompok Tani &mdash; Kecamatan Lembeyan
              </h1>
              <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed" suppressHydrationWarning>
                {timeGreeting.text}, <strong>{activeUser.name}</strong> ({activeUser.wilayah}). Hak
                akses Anda difokuskan khusus untuk{' '}
                <strong>Pendataan Anggota Petani &amp; Poktan</strong> serta{' '}
                <strong>Pendaftaran Usulan e-RDKK Kolektif</strong> beserta unggah foto KTP, KK, dan
                SPPT/Pipil anggota.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/petani"
                  className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-md transition text-xs sm:text-sm"
                >
                  <Users className="w-4 h-4" />
                  Kelola Anggota Petani &amp; Poktan
                </Link>
                <Link
                  href="/pengajuan"
                  className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-md transition text-xs sm:text-sm"
                >
                  <FileText className="w-4 h-4 text-emerald-700" />
                  + Input Usulan e-RDKK Anggota Baru
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                Anggota Poktan Saya
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {poktanPetani.length} Petani
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Hanya anggota {activeUser.wilayah}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                Usulan Poktan Saya Diproses
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {poktanPengajuan.filter((p) => p.status !== 'DISETUJUI_DINAS').length} Berkas
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Menunggu verifikasi PPL &amp; pengesahan kuota Kecamatan
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                Total Jatah Kuota Anggota Saya
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatAngka(poktanJatahUrea)} Kg Urea
              </div>
              <p className="text-xs text-slate-500 mt-1">
                + {formatAngka(poktanJatahNpk)} Kg NPK Phonska
              </p>
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          3. WORKSPACE KHUSUS PETUGAS KIOS RESMI KPL (ROLE: KIOS)
      ===================================================================== */}
      {role === 'KIOS' && (
        <>
          <div className="bg-gradient-to-br from-amber-950 via-stone-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-amber-500/30">
            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/40 px-3 py-1 rounded-full text-xs font-bold text-amber-200">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
                  WORKSPACE KASIR &amp; GUDANG KIOS PUPUK LENGKAP (KPL)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {activeUser.name} &mdash; KPL Kecamatan Lembeyan
              </h1>
              <p className="text-amber-100/90 text-xs sm:text-sm leading-relaxed">
                Akun Kios Pupuk Lengkap (KPL) memiliki akses ke{' '}
                <strong>Kasir Penebusan Pupuk Bersubsidi (Scan QR Kartu Tani &amp; Kamera Wajah)</strong>{' '}
                serta <strong>Manajemen Gudang Stok DO KPL</strong>.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/penyaluran"
                  className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-md transition text-xs sm:text-sm"
                >
                  <QrCode className="w-4 h-4" />
                  Buka Kasir Penebusan Pupuk (Scan QR &amp; Foto)
                </Link>
                <Link
                  href="/kios"
                  className="inline-flex items-center gap-2 bg-white hover:bg-amber-50 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-md transition text-xs sm:text-sm"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-700" />
                  Kelola Stok Gudang &amp; DO Pupuk
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {kiosStok.map((st: any) => (
              <div
                key={st.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Stok Tersedia di Gudang KPL
                  </span>
                  <h4 className="font-black text-slate-900 text-base mt-1">{st.jenisPupuk}</h4>
                  <div className="text-2xl font-black text-emerald-700 mt-0.5">
                    {formatAngka(st.stokTersediaKg)} Kg
                  </div>
                </div>
                <Link
                  href="/kios"
                  className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
                >
                  Mutasi <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </>
      )}

      {/* =====================================================================
          4. PORTAL MANDIRI PETANI TERDAFTAR (ROLE: PETANI)
      ===================================================================== */}
      {role === 'PETANI' && myPetaniData && (
        <>
          <div className="bg-gradient-to-br from-teal-950 via-emerald-950 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-500/30">
            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-teal-800/80 border border-teal-500/40 px-3 py-1 rounded-full text-xs font-bold text-teal-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                  PORTAL MANDIRI PETANI PENERIMA SUBSIDI
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight" suppressHydrationWarning>
                {timeGreeting.text}, Bpk/Ibu {myPetaniData.nama}
              </h1>
              <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
                NIK: <strong>{myPetaniData.nik}</strong> &bull; Kelompok Tani:{' '}
                <strong>{myPetaniData.poktan?.nama}</strong> &bull; Desa {myPetaniData.desa},
                Kecamatan Lembeyan. Anda dapat memantau sisa kuota pupuk bersubsidi, mencetak Kartu Tani Digital, dan menghitung jadwal pemupukan.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={`/cetak-kartu-tani/${myPetaniData.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-md transition text-xs sm:text-sm"
                >
                  <CreditCard className="w-4 h-4" />
                  Cetak Kartu Tani Digital Saya
                </Link>
                <Link
                  href="/cek-kuota"
                  className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-emerald-950 font-bold px-5 py-2.5 rounded-xl shadow-md transition text-xs sm:text-sm"
                >
                  <QrCode className="w-4 h-4 text-emerald-700" />
                  Rincian Kuota &amp; Kalkulator Dosis Tanam
                </Link>
              </div>
            </div>
          </div>

          {myAlokasi && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 shadow-xs">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                  Sisa Kuota Urea Saya
                </span>
                <div className="text-2xl font-black text-emerald-800 mt-1">
                  {myAlokasi.sisaUreaKg} Kg{' '}
                  <span className="text-xs font-normal text-slate-500">
                    / {myAlokasi.jatahUreaKg} Kg
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Setara {(myAlokasi.sisaUreaKg / 50).toFixed(1)} Sak (@50 Kg)
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border-2 border-amber-200 shadow-xs">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                  Sisa Kuota NPK Phonska Saya
                </span>
                <div className="text-2xl font-black text-amber-800 mt-1">
                  {myAlokasi.sisaNpkKg} Kg{' '}
                  <span className="text-xs font-normal text-slate-500">
                    / {myAlokasi.jatahNpkKg} Kg
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Setara {(myAlokasi.sisaNpkKg / 50).toFixed(1)} Sak (@50 Kg)
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border-2 border-teal-200 shadow-xs">
                <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wide">
                  Sisa Kuota Organik Saya
                </span>
                <div className="text-2xl font-black text-teal-800 mt-1">
                  {myAlokasi.sisaOrganikKg || 0} Kg{' '}
                  <span className="text-xs font-normal text-slate-500">
                    / {myAlokasi.jatahOrganikKg || 0} Kg
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Luas Lahan Terdaftar: {myPetaniData.totalLuasLahan} Ha
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* =====================================================================
          5. DASHBOARD EKSEKUTIF ANALITIK SALING SINKRON (ROLE: ADMIN_DINAS)
      ===================================================================== */}
      {role === 'ADMIN_DINAS' && (
        <div className="space-y-6">
          {/* BANNER EKSEKUTIF UTAMA */}
          <div className="bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-500/30">
            <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 bg-emerald-900/80 border border-emerald-400/40 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-200 shadow-xs">
                  <Sprout className="w-3.5 h-3.5 text-amber-300" />
                  DASHBOARD EKSEKUTIF &bull; PEMERINTAH KECAMATAN LEMBEYAN
                </div>
                <div className="inline-flex items-center gap-1.5 bg-amber-400/20 border border-amber-300/40 px-3 py-1 rounded-full text-xs font-bold text-amber-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Presisi GIS &amp; Distribusi e-RDKK
                </div>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                Pusat Kendali Pertanian &amp; Analisis Distribusi e-RDKK
              </h1>

              <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed max-w-3xl">
                Platform pengawasan terpadu untuk mengesahkan usulan kuota e-RDKK 10 Desa,
                memonitor realisasi penebusan pupuk di 3 Kios KPL resmi, serta evaluasi sebaran komoditas lahan GIS Kecamatan Lembeyan secara real-time.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2">
                <Link
                  href="/pengajuan"
                  className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-4.5 py-2.5 rounded-xl transition-all text-xs sm:text-sm shadow-md hover:scale-[1.01]"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  Otorisasi Kuota e-RDKK ({stats.pendingDinasCount} Siap SK)
                </Link>
                <Link
                  href="/peta"
                  className="inline-flex items-center gap-2 bg-white text-emerald-950 font-bold px-4 py-2.5 rounded-xl shadow-md hover:bg-emerald-50 transition-all text-xs sm:text-sm"
                >
                  <Map className="w-4 h-4 text-emerald-700" />
                  Peta GIS Kecamatan
                </Link>
                <Link
                  href="/users"
                  className="inline-flex items-center gap-2 bg-emerald-900/90 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl border border-emerald-400/30 transition-all text-xs sm:text-sm shadow-xs"
                >
                  <UserCog className="w-4 h-4 text-emerald-300" />
                  Manajemen User &amp; RBAC
                </Link>
                <Link
                  href="/editor-kartu-tani"
                  className="inline-flex items-center gap-2 bg-teal-900/80 hover:bg-teal-800 text-white font-bold px-4 py-2.5 rounded-xl border border-teal-400/30 transition-all text-xs sm:text-sm shadow-xs"
                >
                  <CreditCard className="w-4 h-4 text-teal-300" />
                  Editor Kartu Tani
                </Link>
              </div>
            </div>
          </div>

          {/* =====================================================================
              TOOLBAR KENDALI ANALITIK & FILTER SALING SINKRON
          ===================================================================== */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/80">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    Panel Filter Saling Sinkron
                    {isFiltered && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                        Filter Aktif
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pilih Desa, Tahun Anggaran, atau Musim Tanam untuk menyinkronkan seluruh indikator data
                  </p>
                </div>
              </div>

              {/* Status Sinkronisasi Real-Time & Tombol Sinkron */}
              <div className="flex items-center gap-2.5 self-start lg:self-auto">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSyncing ? 'bg-amber-400 animate-spin' : 'bg-emerald-500 animate-pulse'
                    }`}
                  />
                  <span className="text-slate-600 font-medium text-[11px]">
                    Sinkron: <strong className="text-slate-900 font-mono">{syncTimestamp} WIB</strong>
                  </span>
                </div>

                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  title="Segarkan Sinkronisasi Data"
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                </button>

                {isFiltered && (
                  <button
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 px-3 py-1.5 rounded-xl transition shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Semua
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills & Dropdown Controls */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
              {/* Filter Desa Dropdown & Quick Selector */}
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Wilayah Kerja Desa:</span>
                  <span className="text-emerald-700 font-black">
                    {selectedDesa === 'SEMUA' ? '10 Desa Lembeyan' : `Desa ${selectedDesa}`}
                  </span>
                </label>
                <div className="relative">
                  <select
                    value={selectedDesa}
                    onChange={(e) => setSelectedDesa(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 hover:border-emerald-500 text-slate-900 text-xs rounded-xl px-3.5 py-2.5 font-bold transition focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="SEMUA">🌐 Semua Desa se-Kecamatan Lembeyan (10 Desa)</option>
                    {DESA_LEMBEYAN_LIST.map((desa) => (
                      <option key={desa} value={desa}>
                        📍 Desa {desa}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filter Tahun Anggaran */}
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Tahun Anggaran e-RDKK:
                </label>
                <div className="flex items-center gap-1.5">
                  {[
                    { key: 'SEMUA', label: 'Semua' },
                    { key: '2026', label: '2026 (Aktif)' },
                    { key: '2027', label: '2027 (Usulan)' },
                  ].map((th) => (
                    <button
                      key={th.key}
                      onClick={() => setSelectedTahun(th.key)}
                      className={`flex-1 text-xs py-2 px-2 rounded-xl font-bold transition text-center ${
                        selectedTahun === th.key
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {th.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Musim Tanam */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Musim Tanam (MT):
                </label>
                <div className="flex items-center gap-1.5">
                  {[
                    { key: 'SEMUA', label: 'Semua' },
                    { key: 'MT 1', label: 'MT 1' },
                    { key: 'MT 2', label: 'MT 2' },
                    { key: 'MT 3', label: 'MT 3' },
                  ].map((ms) => (
                    <button
                      key={ms.key}
                      onClick={() => setSelectedMusim(ms.key)}
                      className={`flex-1 text-xs py-2 px-1 rounded-xl font-bold transition text-center ${
                        selectedMusim === ms.key
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {ms.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Pills untuk Desa */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar text-xs">
              <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase">Pilih Cepat:</span>
              <button
                onClick={() => setSelectedDesa('SEMUA')}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 text-xs transition ${
                  selectedDesa === 'SEMUA'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Semua (10)
              </button>
              {DESA_LEMBEYAN_LIST.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDesa(d)}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 text-xs transition ${
                    selectedDesa === d
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* =====================================================================
              5 KARTU KPI UTAMA TERSINKRONISASI
          ===================================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* KPI 1: Luas Lahan Terpetakan GIS */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Luas Lahan Terpetakan
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                    <Map className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {dynamicStats.totalLuasHa.toFixed(2)}{' '}
                  <span className="text-xs font-semibold text-slate-500">Ha</span>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Total Poligon:</span>
                <strong className="text-slate-800 font-black">{dynamicStats.totalLahanCount} Petak</strong>
              </div>
            </div>

            {/* KPI 2: Petani & Poktan Terdaftar */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Petani Terdaftar
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {dynamicStats.totalPetani}{' '}
                  <span className="text-xs font-semibold text-slate-500">Jiwa</span>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Kelompok Tani:</span>
                <strong className="text-slate-800 font-black">{dynamicStats.totalPoktan} Poktan</strong>
              </div>
            </div>

            {/* KPI 3: Penyaluran Urea */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Realisasi Urea
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                    <Sprout className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatAngka(dynamicStats.totalTersalurUrea)}{' '}
                  <span className="text-xs font-semibold text-slate-500">Kg</span>
                </div>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, dynamicStats.persentaseUrea)}%` }}
                  />
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Kuota: {formatAngka(dynamicStats.totalJatahUrea)} Kg</span>
                <strong className="text-emerald-700 font-black">{dynamicStats.persentaseUrea}%</strong>
              </div>
            </div>

            {/* KPI 4: Penyaluran NPK Phonska */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Realisasi NPK Phonska
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatAngka(dynamicStats.totalTersalurNpk)}{' '}
                  <span className="text-xs font-semibold text-slate-500">Kg</span>
                </div>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, dynamicStats.persentaseNpk)}%` }}
                  />
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Kuota: {formatAngka(dynamicStats.totalJatahNpk)} Kg</span>
                <strong className="text-amber-700 font-black">{dynamicStats.persentaseNpk}%</strong>
              </div>
            </div>

            {/* KPI 5: Antrean Pengajuan e-RDKK */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Antrean SK e-RDKK
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {dynamicStats.pendingDinasCount}{' '}
                  <span className="text-xs font-semibold text-slate-500">Berkas Siap SK</span>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Menunggu PPL:</span>
                <strong className="text-amber-700 font-black">{dynamicStats.pendingPplCount} Usulan</strong>
              </div>
            </div>
          </div>

          {/* =====================================================================
              BAGIAN UTAMA: SEBARAN KOMODITAS (SVG DONUT) & ALUR FUNNEL e-RDKK
          ===================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* KOLOM KIRI (7 Kolom): Visualisasi SVG Sebaran Komoditas Pertanian */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Sebaran Komoditas Lahan Pertanian
                    </h3>
                    <p className="text-xs text-slate-500">
                      Rincian luas tanam GIS untuk{' '}
                      <strong className="text-emerald-700">
                        {selectedDesa === 'SEMUA' ? 'Seluruh Kecamatan Lembeyan' : `Desa ${selectedDesa}`}
                      </strong>
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {dynamicStats.totalLuasHa.toFixed(2)} Ha Terpetakan
                </span>
              </div>

              {/* Grafik Donut SVG Interaktif & Panel Rincian */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                {/* SVG Donut Chart */}
                <div className="sm:col-span-5 flex flex-col items-center justify-center relative">
                  <svg className="w-48 h-48 transform -rotate-90 drop-shadow-xs" viewBox="0 0 100 100">
                    {/* Ring Dasar */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#f1f5f9"
                      strokeWidth="15"
                      fill="transparent"
                    />
                    {/* Segmen Donut Dinamis */}
                    {(() => {
                      let currentOffset = 0;
                      const circumference = 2 * Math.PI * 38; // ~238.76

                      return commodityData.map((item) => {
                        const strokeDash = (item.percentage / 100) * circumference;
                        const dashOffset = -currentOffset;
                        currentOffset += strokeDash;

                        return (
                          <circle
                            key={item.name}
                            cx="50"
                            cy="50"
                            r="38"
                            stroke={item.color}
                            strokeWidth="15"
                            strokeDasharray={`${strokeDash} ${circumference}`}
                            strokeDashoffset={dashOffset}
                            fill="transparent"
                            className="transition-all duration-500 cursor-pointer hover:opacity-85"
                            onMouseEnter={() => setActiveCommodityHover(item.name)}
                            onMouseLeave={() => setActiveCommodityHover(null)}
                          />
                        );
                      });
                    })()}
                  </svg>

                  {/* Pusat Donut (Total Luas) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Total Luas
                    </span>
                    <span className="text-xl font-black text-slate-900 leading-none mt-0.5">
                      {dynamicStats.totalLuasHa.toFixed(1)}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">Hektar</span>
                  </div>
                </div>

                {/* List Legend Komoditas Interaktif */}
                <div className="sm:col-span-7 space-y-2.5">
                  {commodityData.map((item) => {
                    const isHovered = activeCommodityHover === item.name;
                    return (
                      <div
                        key={item.name}
                        onMouseEnter={() => setActiveCommodityHover(item.name)}
                        onMouseLeave={() => setActiveCommodityHover(null)}
                        className={`p-3 rounded-2xl border transition-all ${
                          isHovered
                            ? 'bg-slate-50 border-emerald-400 shadow-xs scale-[1.01]'
                            : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <strong className="text-slate-900">{item.name}</strong>
                          </div>
                          <div className="font-mono text-slate-800">
                            <strong>{item.ha.toFixed(2)} Ha</strong>{' '}
                            <span className="text-slate-400">({item.percentage}%)</span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${item.percentage}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{item.deskripsi}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Standar Dosis Rekomendasi Kementan Note */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 text-xs text-emerald-950 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  <strong>Pedoman Standar Teknis BPP:</strong> Dosis rekomendasi alokasi pupuk bersubsidi: Padi (Urea: 250 Kg/Ha, NPK: 200 Kg/Ha), Jagung (Urea: 200 Kg/Ha, NPK: 150 Kg/Ha), Tebu (Urea: 300 Kg/Ha, NPK: 250 Kg/Ha).
                </p>
              </div>
            </div>

            {/* KOLOM KANAN (5 Kolom): 4-Tahap Funnel Pipeline e-RDKK */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        Pipeline Verifikasi e-RDKK
                      </h3>
                      <p className="text-xs text-slate-500">
                        Progres usulan bertingkat Poktan &rarr; PPL &rarr; Dinas
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4 Tahap Stepper Interaktif */}
                <div className="space-y-3">
                  {/* Tahap 1: Pengajuan Baru */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0">
                        1
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Pengajuan Poktan Baru</div>
                        <div className="text-[11px] text-slate-500">Pendaftaran mandiri &amp; berkas SPPT</div>
                      </div>
                    </div>
                    <span className="font-mono font-black text-sm text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-xl">
                      {dynamicStats.pendingPplCount} Usulan
                    </span>
                  </div>

                  {/* Tahap 2: Verifikasi Lapangan PPL */}
                  <div className="p-3.5 rounded-2xl border border-teal-200 bg-teal-50/50 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black shrink-0">
                        2
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Verifikasi Lapangan PPL</div>
                        <div className="text-[11px] text-slate-500">Pengecekan patok batas &amp; poligon GIS</div>
                      </div>
                    </div>
                    <span className="font-mono font-black text-sm text-teal-800 bg-teal-100/80 px-2.5 py-1 rounded-xl">
                      {dynamicStats.pendingDinasCount} Berkas
                    </span>
                  </div>

                  {/* Tahap 3: Otorisasi Admin Dinas (Siap SK) */}
                  <div className="p-3.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/70 flex items-center justify-between gap-3 text-xs shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                        3
                      </div>
                      <div>
                        <div className="font-black text-emerald-950">Otorisasi SK Alokasi</div>
                        <div className="text-[11px] text-emerald-800">Menunggu tanda tangan Admin Dinas</div>
                      </div>
                    </div>
                    <Link
                      href="/pengajuan"
                      className="inline-flex items-center gap-1 font-black text-xs text-white bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 rounded-xl shadow-xs transition"
                    >
                      SK ({dynamicStats.pendingDinasCount})
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Tahap 4: Penerbitan Kartu Tani & Selesai */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-black shrink-0">
                        4
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Kuota Terbit &amp; KPL Ready</div>
                        <div className="text-[11px] text-slate-500">Siap ditebus di Kios KPL Resmi</div>
                      </div>
                    </div>
                    <span className="font-mono font-black text-sm text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-xl">
                      {dynamicStats.disetujuiCount} Berkas
                    </span>
                  </div>
                </div>
              </div>

              {/* Fast Action CTA */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">Aksi Otorisasi Cepat:</span>
                <Link
                  href="/pengajuan"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-500 px-3.5 py-2 rounded-xl shadow-xs transition"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  Buka Otorisasi e-RDKK
                </Link>
              </div>
            </div>
          </div>

          {/* =====================================================================
              MATRIKS KOMPARASI SERAPAN 10 DESA KECAMATAN LEMBEYAN
          ===================================================================== */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Matriks Komparasi Realisasi Serapan 10 Desa
                  </h3>
                  <p className="text-xs text-slate-500">
                    Klik pada baris desa mana pun untuk menyinkronkan seluruh indikator dashboard ke desa tersebut
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-600" />
                  <span className="text-slate-700">Serapan Urea (%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-slate-700">Serapan NPK (%)</span>
                </div>
              </div>
            </div>

            {/* List Dual-Bar Ranking Desa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {desaComparisonList.map((desa) => {
                const isActive = selectedDesa.toLowerCase() === desa.nama.toLowerCase();
                return (
                  <div
                    key={desa.nama}
                    onClick={() => setSelectedDesa(isActive ? 'SEMUA' : desa.nama)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      isActive
                        ? 'border-2 border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-emerald-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin
                          className={`w-4 h-4 ${
                            isActive ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        />
                        <strong className="text-slate-900 text-sm">Desa {desa.nama}</strong>
                        {isActive && (
                          <span className="text-[10px] font-black uppercase bg-emerald-700 text-white px-2 py-0.5 rounded-full">
                            Aktif Terfilter
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {desa.petaniCount} Petani &bull; {desa.luasHa.toFixed(1)} Ha
                      </div>
                    </div>

                    {/* Dual Progress Bars */}
                    <div className="space-y-1.5">
                      {/* Bar Urea */}
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                          <span>Urea ({formatAngka(desa.tersalurUrea)} Kg)</span>
                          <strong className="text-emerald-700 font-black">{desa.persenUrea}%</strong>
                        </div>
                        <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, desa.persenUrea)}%` }}
                          />
                        </div>
                      </div>

                      {/* Bar NPK */}
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                          <span>NPK Phonska ({formatAngka(desa.tersalurNpk)} Kg)</span>
                          <strong className="text-amber-700 font-black">{desa.persenNpk}%</strong>
                        </div>
                        <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, desa.persenNpk)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* =====================================================================
              LOGISTIK KIOS KPL & FEED PENEBUSAN TERVERIFIKASI
          ===================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* KOLOM KIRI (7 Kolom): Riwayat Transaksi Terverifikasi KTP & Wajah */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Penebusan Terverifikasi KTP &amp; Kamera Wajah
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedDesa === 'SEMUA'
                        ? 'Transaksi real-time seluruh KPL Kecamatan Lembeyan'
                        : `Transaksi tersinkron untuk Desa ${selectedDesa}`}
                    </p>
                  </div>
                </div>

                <Link
                  href="/penyaluran"
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
                >
                  Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Feed Transaksi Grid Card */}
              {filteredPenyaluran.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  Belum ada transaksi penebusan yang tercatat untuk filter wilayah ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredPenyaluran.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={item.fotoDiri || '/uploads/sample_petani_face.svg'}
                          alt="Penerima"
                          className="w-11 h-11 rounded-xl object-cover border border-emerald-200 shrink-0 bg-white"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-xs truncate">
                            {item.petani?.nama || 'Petani Lembeyan'}
                          </div>
                          <div className="text-slate-500 font-mono text-[10px] truncate">
                            NIK: {item.petani?.nik || '-'}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-bold mt-0.5 truncate">
                            {item.petani?.poktan?.nama || 'Poktan'} &bull; Desa {item.petani?.desa || '-'}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                          U: {item.jumlahUreaKg} kg &bull; N: {item.jumlahNpkKg} kg
                        </span>
                        <strong className="font-black text-slate-900 text-xs">
                          {formatRupiah(item.totalBiayaRp)}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* KOLOM KANAN (5 Kolom): Status Stok Gudang 3 Kios KPL Resmi */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        Keamanan Stok Kios KPL
                      </h3>
                      <p className="text-xs text-slate-500">
                        Ketersediaan DO pupuk di 3 Kios Pengecer Resmi
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/kios"
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1"
                  >
                    Gudang <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      nama: 'UD. Tani Subur',
                      wilayah: 'Desa Kediren, Tapen, Dukuh',
                      urea: 12500,
                      npk: 8400,
                      status: 'Stok Aman',
                    },
                    {
                      nama: 'Kios Tani Makmur',
                      wilayah: 'Lembeyan Kulon, Wetan, Tunggur',
                      urea: 9200,
                      npk: 6100,
                      status: 'Stok Aman',
                    },
                    {
                      nama: 'Kios Berkah Tani',
                      wilayah: 'Nguri, Pupus, Kedungpanji, Krowe',
                      urea: 7800,
                      npk: 5300,
                      status: 'Cukup',
                    },
                  ].map((kios) => (
                    <div
                      key={kios.nama}
                      className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <strong className="text-xs text-slate-900">{kios.nama}</strong>
                          <p className="text-[10px] text-slate-500">{kios.wilayah}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {kios.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/60 font-mono">
                        <span className="text-slate-600">
                          Urea: <strong className="text-emerald-700 font-bold">{formatAngka(kios.urea)} Kg</strong>
                        </span>
                        <span className="text-slate-600">
                          NPK: <strong className="text-amber-700 font-bold">{formatAngka(kios.npk)} Kg</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shortcut Cepat Modul Administrasi */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <Link
                  href="/peta"
                  className="flex-1 text-center py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
                >
                  Peta GIS
                </Link>
                <Link
                  href="/pengajuan"
                  className="flex-1 text-center py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
                >
                  Otorisasi
                </Link>
                <Link
                  href="/users"
                  className="flex-1 text-center py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
                >
                  User RBAC
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
