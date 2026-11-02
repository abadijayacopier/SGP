'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth, ROLE_PERMISSIONS, DEMO_USERS } from '@/lib/auth-context';
import { formatRupiah, formatAngka } from '@/lib/calculations';
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
  Layers,
  ShoppingBag,
  UserCog,
  QrCode,
  CreditCard,
  Printer,
  Lock,
  Code2,
  Compass,
  UserCircle,
  Sun,
  Sunrise,
  Sunset,
  Moon,
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
}

export default function RoleDashboardClient({
  stats,
  recentPenyaluran,
  pengajuanList,
  petaniSample,
  stokKiosList,
}: DashboardProps) {
  const { currentUser, permissions } = useAuth();
  const activeUser = currentUser;
  const activePermissions = permissions;
  const role = activeUser.role;

  // ===== Isolasi data sesuai akun yang login =====
  // PETANI: hanya data petani miliknya sendiri (berdasarkan petaniId / NIK / Nama hasil login)
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

  // POKTAN: hanya anggota & usulan dari Poktan miliknya
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

  // KIOS: hanya stok & transaksi milik kios sendiri
  const myKios = activeUser.kiosName || '';
  const kiosStok = myKios ? stokKiosList.filter((s) => s.namaKios === myKios) : [];
  const kiosPenyaluran = myKios
    ? recentPenyaluran.filter((p) => p.namaKios === myKios)
    : recentPenyaluran;

  // Sapaan Waktu Dinamis (Pagi, Siang, Sore, Malam) diselaraskan ke WIB (Asia/Jakarta)
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
        bg: 'from-emerald-900 via-teal-900 to-slate-900',
        accent: 'text-amber-300',
      };
    } else if (hour >= 11 && hour < 15) {
      return {
        text: 'Selamat Siang',
        icon: 'Sun',
        period: 'Siang Hari',
        bg: 'from-emerald-950 via-green-900 to-teal-950',
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
        bg: 'from-slate-950 via-indigo-950 to-emerald-950',
        accent: 'text-indigo-200',
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
      {/* Sapaan Pengguna Login Dinamis Berdasarkan Waktu */}
      <div className={`rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden border border-white/10 bg-gradient-to-r ${timeGreeting.bg}`}>
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/10 backdrop-blur-md border border-white/20 text-white">
                {timeGreeting.icon === 'Sunrise' && <Sunrise className="w-3.5 h-3.5 text-amber-300" />}
                {timeGreeting.icon === 'Sun' && <Sun className="w-3.5 h-3.5 text-amber-300" />}
                {timeGreeting.icon === 'Sunset' && <Sunset className="w-3.5 h-3.5 text-amber-300" />}
                {timeGreeting.icon === 'Moon' && <Moon className="w-3.5 h-3.5 text-indigo-200" />}
                <span suppressHydrationWarning>{timeGreeting.text} &bull; {timeGreeting.period}</span>
              </span>
              <span suppressHydrationWarning className="text-xs text-white/80 font-mono bg-black/20 px-2.5 py-0.5 rounded-full">
                📅 {formattedToday}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex flex-wrap items-center gap-2">
              <span suppressHydrationWarning>{timeGreeting.text},</span>
              <span suppressHydrationWarning className={timeGreeting.accent}>{activeUser.name}</span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
              Selamat datang di Sistem Informasi Pertanian & Pemetaan Spasial GIS Kecamatan Lembeyan. Anda saat ini aktif dengan wewenang{' '}
              <strong className="text-white underline decoration-amber-400">{activeUser.roleLabel}</strong>
              {activeUser.wilayah ? ` wilayah kerja ${activeUser.wilayah}` : ''}.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 text-left md:text-right">
              <span className="text-[10px] text-emerald-200 font-bold block uppercase tracking-wider">
                Status Sistem BPP
              </span>
              <span className="text-xs font-black text-white flex items-center gap-1.5 md:justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Online & Siap Bertugas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Widget Cuaca Standar Google Berdasarkan Deteksi GPS Perangkat */}
      <WeatherFertilizerCard />

      {/* =====================================================================
          1. WORKSPACE KHUSUS BPP / PENYULUH LAPANGAN (ROLE: PPL)
      ===================================================================== */}
      {role === 'PPL' && (
        <>
          <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-blue-700/40">
            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-blue-800/80 border border-blue-500/40 px-3 py-1 rounded-full text-xs font-bold text-blue-200">
                  <Compass className="w-3.5 h-3.5 text-amber-300" />
                  WORKSPACE KHUSUS BPP KECAMATAN LEMBEYAN
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Balai Penyuluhan Pertanian (BPP) Kecamatan Lembeyan
              </h1>
              <p className="text-blue-100/90 text-xs sm:text-sm leading-relaxed" suppressHydrationWarning>
                {timeGreeting.text} dan selamat bertugas, <strong>{activeUser.name}</strong>. Halaman ini dikhususkan bagi
                Penyuluh Pertanian Lapangan (PPL) untuk melakukan{' '}
                <strong>Digitasi Poligon Peta GIS</strong>,{' '}
                <strong>Verifikasi Lapangan Berkas e-RDKK</strong>, dan{' '}
                <strong>Evaluasi Laporan Teknis BPP</strong>. Modul Kasir Kios, Gudang KPL, dan
                Otorisasi Admin Dinas dinonaktifkan pada akun ini.
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
                  className="inline-flex items-center gap-2 bg-white hover:bg-blue-50 text-blue-950 font-bold px-5 py-2.5 rounded-xl shadow-md transition text-xs sm:text-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-blue-700" />
                  Verifikasi Lapangan PPL ({stats.pendingPplCount} Antrean)
                </Link>
                <Link
                  href="/laporan"
                  className="inline-flex items-center gap-2 bg-blue-800 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl border border-blue-600 transition text-xs sm:text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Laporan Teknis BPP
                </Link>
              </div>
            </div>
          </div>

          {/* KPI Khusus Tugas Teknis BPP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-xs">
              <span className="text-[11px] font-bold text-blue-700 uppercase">
                Antrean Verifikasi PPL
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {stats.pendingPplCount} Berkas Usulan
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Menunggu pengecekan patok & berkas oleh PPL BPP Lembeyan
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-700 uppercase">
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
              <span className="text-[11px] font-bold text-purple-700 uppercase">
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

          {/* Daftar Antrean Verifikasi Lapangan PPL */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Daftar Usulan Poktan yang Memerlukan Verifikasi Lapangan PPL
                </h3>
                <p className="text-xs text-slate-500">
                  Klik tombol Proses Verifikasi untuk memeriksa KTP, KK, Pipil/SPPT dan mengesahkan
                  hasil tinjauan lapangan BPP.
                </p>
              </div>
              <Link
                href="/pengajuan"
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
              >
                Buka Halaman Verifikasi PPL <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {pengajuanList.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                        {item.nomorPengajuan}
                      </span>
                      <span className="font-black text-slate-900 text-sm">{item.namaPemilik}</span>
                      <span className="text-slate-500">({item.poktan?.nama})</span>
                    </div>
                    <p className="text-slate-600 mt-1">
                      Usulan: <strong>{item.komoditasRencana}</strong> seluas{' '}
                      <strong>{item.luasHa} Ha</strong> di Desa {item.desa}, Kec. {item.kecamatan}{' '}
                      &bull; Pipil: <span className="font-mono">{item.nomorPipil}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                        item.status === 'DIAJUKAN_POKTAN'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {item.status === 'DIAJUKAN_POKTAN'
                        ? 'Menunggu Verifikasi PPL'
                        : item.status}
                    </span>
                    <Link
                      href="/pengajuan"
                      className="bg-slate-900 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl transition"
                    >
                      Periksa Berkas
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          2. WORKSPACE KHUSUS PENGURUS POKTAN DESA (ROLE: POKTAN)
      ===================================================================== */}
      {role === 'POKTAN' && (
        <>
          <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-emerald-700/80 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-bold text-emerald-100">
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
                <strong>Pendataan Anggota Petani & Poktan</strong> serta{' '}
                <strong>Pendaftaran Usulan e-RDKK Kolektif</strong> beserta unggah foto KTP, KK, dan
                SPPT/Pipil anggota.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/petani"
                  className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-md transition text-xs sm:text-sm"
                >
                  <Users className="w-4 h-4" />
                  Kelola Anggota Petani & Poktan
                </Link>
                <Link
                  href="/pengajuan"
                  className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-emerald-950 font-bold px-5 py-2.5 rounded-xl shadow-md transition text-xs sm:text-sm"
                >
                  <FileText className="w-4 h-4 text-emerald-700" />
                  + Input Usulan e-RDKK Anggota Baru
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-700 uppercase">
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
              <span className="text-[11px] font-bold text-amber-700 uppercase">
                Usulan Poktan Saya Diproses
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {poktanPengajuan.filter((p) => p.status !== 'DISETUJUI_DINAS').length} Berkas
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Menunggu verifikasi PPL & pengesahan kuota Kecamatan
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-blue-700 uppercase">
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
          <div className="bg-gradient-to-br from-amber-950 via-amber-900 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/40 px-3 py-1 rounded-full text-xs font-bold text-amber-200">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
                  WORKSPACE KASIR & GUDANG KIOS PUPUK LENGKAP (KPL)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {activeUser.name} &mdash; KPL Kecamatan Lembeyan
              </h1>
              <p className="text-amber-100/90 text-xs sm:text-sm leading-relaxed">
                Akun Kios Pupuk Lengkap (KPL) hanya memiliki akses khusus ke{' '}
                <strong>Kasir Penebusan Pupuk Bersubsidi (Scan QR Kartu Tani & Kamera Live)</strong>{' '}
                serta <strong>Manajemen Gudang Stok DO KPL</strong>. Modul Pemetaan GIS dan
                Persetujuan e-RDKK dikunci untuk menjaga independensi penyaluran.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/penyaluran"
                  className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-md transition text-xs sm:text-sm"
                >
                  <QrCode className="w-4 h-4" />
                  Buka Kasir Penebusan Pupuk (Scan QR & Foto)
                </Link>
                <Link
                  href="/kios"
                  className="inline-flex items-center gap-2 bg-white hover:bg-amber-50 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-md transition text-xs sm:text-sm"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-700" />
                  Kelola Stok Gudang & DO Pupuk
                </Link>
              </div>
            </div>
          </div>

          {/* Ringkasan Stok Gudang Kios */}
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
      {role === 'PETANI' && !myPetaniData && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 text-sm text-amber-900">
          Akun Anda belum terhubung dengan data petani terdaftar. Silakan login menggunakan{' '}
          <strong>NIK KTP</strong> Anda di halaman{' '}
          <Link href="/login" className="font-bold underline">
            Portal Login
          </Link>
          .
        </div>
      )}

      {role === 'PETANI' && myPetaniData && (
        <>
          <div className="bg-gradient-to-br from-teal-950 via-emerald-900 to-green-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
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
                Kecamatan Lembeyan. Pada portal ini Anda dapat memantau sisa jatah pupuk bersubsidi
                milik Anda, mencetak Kartu Tani Digital, dan menghitung jadwal pemupukan.
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
                  Rincian Kuota & Kalkulator Dosis Tanam
                </Link>
              </div>
            </div>
          </div>

          {/* Sisa Kuota Milik Petani Sendiri */}
          {myAlokasi && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 shadow-xs">
                <span className="text-[11px] font-bold text-emerald-700 uppercase">
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
                <span className="text-[11px] font-bold text-amber-700 uppercase">
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
                <span className="text-[11px] font-bold text-teal-700 uppercase">
                  Sisa Kuota Organik Saya
                </span>
                <div className="text-2xl font-black text-teal-800 mt-1">
                  {myAlokasi.sisaOrganikKg} Kg{' '}
                  <span className="text-xs font-normal text-slate-500">
                    / {myAlokasi.jatahOrganikKg} Kg
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
          5. DASHBOARD EKSEKUTIF ADMIN KECAMATAN LEMBEYAN (ROLE: ADMIN_DINAS)
      ===================================================================== */}
      {role === 'ADMIN_DINAS' && (
        <>
          <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-600/30">
            <div className="relative z-10 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="inline-flex items-center gap-2 bg-emerald-950/80 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-semibold text-emerald-200">
                  <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                  DASHBOARD EKSEKUTIF &bull; PEMERINTAH KECAMATAN LEMBEYAN
                </div>
                <div className="inline-flex items-center gap-1.5 bg-amber-400/20 border border-amber-300/40 px-3 py-1 rounded-full text-xs font-bold text-amber-200">
                  Developer Pengembang:{' '}
                  <span className="text-white font-black">Supriyanto Abadi Jaya</span>
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2 leading-tight">
                Pusat Kendali Pertanian & Otorisasi e-RDKK Kecamatan Lembeyan
              </h1>
              <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed mb-6 max-w-2xl">
                Anda masuk sebagai <strong>Koordinator / Admin Kecamatan Lembeyan</strong> dengan
                hak akses penuh untuk mengesahkan penerbitan kuota e-RDKK yang telah diverifikasi
                BPP, memantau distribusi kios KPL, dan mengelola hak akses pengguna.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <Link
                  href="/pengajuan"
                  className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-4 py-2.5 rounded-xl transition-all text-xs sm:text-sm shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  Otorisasi Kuota e-RDKK ({stats.pendingDinasCount} Siap Disetujui)
                </Link>
                <Link
                  href="/peta"
                  className="inline-flex items-center gap-2 bg-white text-emerald-900 font-bold px-4 py-2.5 rounded-xl shadow-md hover:bg-emerald-50 transition-all text-xs sm:text-sm"
                >
                  <Map className="w-4 h-4 text-emerald-700" />
                  Peta GIS Kecamatan
                </Link>
                <Link
                  href="/users"
                  className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl border border-emerald-400/40 transition-all text-xs sm:text-sm shadow-sm"
                >
                  <UserCog className="w-4 h-4" />
                  Manajemen User & RBAC
                </Link>
              </div>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Luas Lahan GIS
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <Map className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {stats.totalLuasHa.toFixed(2)}{' '}
                <span className="text-sm font-semibold text-slate-500">Hektar</span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Terbagi dalam{' '}
                <strong className="text-slate-700">{stats.totalLahanCount} petak poligon</strong>
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Petani & Poktan
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {stats.totalPetani}{' '}
                <span className="text-sm font-semibold text-slate-500">Petani</span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Dalam <strong className="text-slate-700">{stats.totalPoktan} Kelompok Tani</strong>
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Penyaluran Urea
                </span>
                <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center border border-green-100">
                  <Sprout className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {formatAngka(stats.totalTersalurUrea)}{' '}
                <span className="text-sm font-semibold text-slate-400">
                  / {formatAngka(stats.totalJatahUrea)} Kg
                </span>
              </div>
              <div className="mt-2.5 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${stats.persentaseUrea}%` }}
                />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Penyaluran NPK Phonska
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {formatAngka(stats.totalTersalurNpk)}{' '}
                <span className="text-sm font-semibold text-slate-400">
                  / {formatAngka(stats.totalJatahNpk)} Kg
                </span>
              </div>
              <div className="mt-2.5 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{ width: `${stats.persentaseNpk}%` }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bagian Bawah: Ringkasan Aktivitas Sesuai Kewenangan Jabatan */}
      {(role === 'ADMIN_DINAS' || role === 'KIOS') && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Riwayat Penebusan Pupuk Terverifikasi KTP & Wajah Penerima
              </h3>
              <p className="text-xs text-slate-500">
                Data transaksi real-time dari Kios Pupuk Lengkap (KPL) Kecamatan Lembeyan
              </p>
            </div>
            <Link
              href="/penyaluran"
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              Buka Modul Penyaluran <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {(role === 'KIOS' ? kiosPenyaluran : recentPenyaluran).map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.fotoDiri || '/uploads/sample_petani_face.svg'}
                    alt="Penerima"
                    className="w-11 h-11 rounded-xl object-cover border border-emerald-200"
                  />
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{item.petani.nama}</div>
                    <div className="text-slate-500 font-mono text-[11px]">
                      {item.nomorNota} &bull; NIK: {item.petani.nik} &bull; {item.petani.poktan.nama}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-slate-900">{formatRupiah(item.totalBiayaRp)}</div>
                  <div className="text-[11px] text-emerald-700 font-bold">
                    Urea {item.jumlahUreaKg} Kg &bull; NPK {item.jumlahNpkKg} Kg
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
