'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  BarChart3,
  Users,
  Map,
  FileText,
  Building2,
  QrCode,
  ShoppingBag,
  Sprout,
  Calculator,
  UserCircle,
  Truck,
  Wallet,
} from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { currentUser, isMounted } = useAuth();

  // Jangan render pada SSR awal sebelum mounted
  if (!isMounted) return null;

  // Sembunyikan pada halaman login, field maps layar penuh, dan pencetakan dokumen
  if (
    pathname === '/login' ||
    pathname === '/field-maps' ||
    pathname?.startsWith('/field-maps') ||
    pathname?.startsWith('/cetak-')
  ) {
    return null;
  }

  const role = currentUser.role;

  // Konfigurasi dinamis menu pinggir berdasarkan hak akses peran pengguna
  let leftItem2 = {
    href: '/petani',
    label: 'Petani',
    icon: Users,
  };

  let rightItem1 = {
    href: '/pengajuan',
    label: 'e-RDKK',
    icon: FileText,
  };

  let rightItem2 = {
    href: '/laporan',
    label: 'Laporan',
    icon: BarChart3,
  };

  if (role === 'PETANI') {
    leftItem2 = {
      href: '/cek-kuota',
      label: 'Cek Kuota',
      icon: QrCode,
    };
    rightItem1 = {
      href: '/cetak-erdkk',
      label: 'e-RDKK',
      icon: FileText,
    };
    rightItem2 = {
      href: '/profil',
      label: 'Profil',
      icon: UserCircle,
    };
  } else if (role === 'KIOS') {
    leftItem2 = {
      href: '/kios',
      label: 'Stok DO',
      icon: ShoppingBag,
    };
    rightItem1 = {
      href: '/penyaluran',
      label: 'Penyaluran',
      icon: Sprout,
    };
    rightItem2 = {
      href: '/distribusi',
      label: 'Distribusi',
      icon: Truck,
    };
  } else if (role === 'POKTAN') {
    leftItem2 = {
      href: '/petani',
      label: 'Petani',
      icon: Users,
    };
    rightItem1 = {
      href: '/alokasi-poktan',
      label: 'Alokasi',
      icon: Calculator,
    };
    rightItem2 = {
      href: '/kasir-poktan',
      label: 'Kasir',
      icon: ShoppingBag,
    };
  } else if (role === 'SURVEYOR') {
    leftItem2 = {
      href: '/profil',
      label: 'Profil',
      icon: UserCircle,
    };
    rightItem1 = {
      href: '/peta',
      label: 'Web GIS',
      icon: Map,
    };
    rightItem2 = {
      href: '/field-maps',
      label: 'GPS PWA',
      icon: Map,
    };
  }

  const isCenterActive = pathname === '/peta' || pathname === '/field-maps';

  return (
    <aside
      aria-label="Navigasi Bawah Seluler"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-6px_25px_rgba(0,0,0,0.08)] px-1 py-1 no-print pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-center">
        {/* 1. Kiri 1: Dashboard Utama */}
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center py-1 transition group ${
            pathname === '/dashboard'
              ? 'text-emerald-700 font-black'
              : 'text-slate-400 hover:text-slate-700 font-semibold'
          }`}
        >
          <div className="relative">
            <BarChart3
              className={`w-5 h-5 transition-transform group-active:scale-90 ${
                pathname === '/dashboard' ? 'text-emerald-600' : 'text-slate-400'
              }`}
            />
            {pathname === '/dashboard' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-600 rounded-full" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[60px]">
            Dashboard
          </span>
        </Link>

        {/* 2. Kiri 2: Petani / Cek Kuota / Stok Kios */}
        <Link
          href={leftItem2.href}
          className={`flex flex-col items-center justify-center py-1 transition group ${
            pathname === leftItem2.href
              ? 'text-emerald-700 font-black'
              : 'text-slate-400 hover:text-slate-700 font-semibold'
          }`}
        >
          <div className="relative">
            <leftItem2.icon
              className={`w-5 h-5 transition-transform group-active:scale-90 ${
                pathname === leftItem2.href ? 'text-emerald-600' : 'text-slate-400'
              }`}
            />
            {pathname === leftItem2.href && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-600 rounded-full" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[60px]">
            {leftItem2.label}
          </span>
        </Link>

        {/* 3. TENGAH: Tombol Terapung PETA GIS */}
        <Link
          href={role === 'SURVEYOR' ? '/field-maps' : '/peta'}
          className="flex flex-col items-center justify-center -mt-5 group cursor-pointer"
          title="Buka Peta Spasial GIS Lembeyan"
        >
          <div
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all border-2 border-white ${
              isCenterActive
                ? 'bg-emerald-700 text-amber-300 shadow-emerald-800/40 ring-2 ring-emerald-600/30'
                : 'bg-emerald-600 text-amber-300 shadow-emerald-600/30 hover:bg-emerald-500'
            }`}
          >
            <Map className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <span
            className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[60px] ${
              isCenterActive ? 'text-emerald-700 font-black' : 'text-slate-600 font-semibold'
            }`}
          >
            Peta GIS
          </span>
        </Link>

        {/* 4. Kanan 1: e-RDKK / Penyaluran / Alokasi */}
        <Link
          href={rightItem1.href}
          className={`flex flex-col items-center justify-center py-1 transition group ${
            pathname === rightItem1.href
              ? 'text-emerald-700 font-black'
              : 'text-slate-400 hover:text-slate-700 font-semibold'
          }`}
        >
          <div className="relative">
            <rightItem1.icon
              className={`w-5 h-5 transition-transform group-active:scale-90 ${
                pathname === rightItem1.href ? 'text-emerald-600' : 'text-slate-400'
              }`}
            />
            {pathname === rightItem1.href && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-600 rounded-full" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[60px]">
            {rightItem1.label}
          </span>
        </Link>

        {/* 5. Kanan 2: Kepala Desa / Profil */}
        <Link
          href={rightItem2.href}
          className={`flex flex-col items-center justify-center py-1 transition group ${
            pathname === rightItem2.href
              ? 'text-emerald-700 font-black'
              : 'text-slate-400 hover:text-slate-700 font-semibold'
          }`}
        >
          <div className="relative">
            <rightItem2.icon
              className={`w-5 h-5 transition-transform group-active:scale-90 ${
                pathname === rightItem2.href ? 'text-emerald-600' : 'text-slate-400'
              }`}
            />
            {pathname === rightItem2.href && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-600 rounded-full" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[60px]">
            {rightItem2.label}
          </span>
        </Link>
      </div>
    </aside>
  );
}
