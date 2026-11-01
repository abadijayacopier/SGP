'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, ROLE_PERMISSIONS, UserRole } from '@/lib/auth-context';
import { ShieldAlert, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';

const PUBLIC_OR_PRINT_PREFIXES = [
  '/login',
  '/cek-kuota',
  '/verifikasi',
  '/cetak-',
  '/cetak-lahan',
  '/cetak-nota',
  '/cetak-kartu-tani',
  '/cetak-kalender-tanam',
  '/cetak-erdkk',
];

const PATH_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard Utama',
  '/peta': 'Peta GIS Lahan',
  '/pengajuan': 'Pengajuan e-RDKK',
  '/petani': 'Data Petani & Poktan',
  '/penyaluran': 'Penyaluran Pupuk',
  '/kios': 'Gudang Stok Kios (KPL)',
  '/laporan': 'Laporan & Rekapitulasi',
  '/cek-kuota': 'Cek Kuota & Verifikasi QR',
  '/users': 'Manajemen User & RBAC',
  '/profil': 'Profil & Sandi Saya',
  '/cetak-erdkk': 'Cetak Surat Pengesahan e-RDKK',
  '/cetak-kalender-tanam': 'Cetak Jadwal Kalender Tanam & Dosis',
  '/kasir-poktan': 'Kasir Penebusan Poktan',
  '/distribusi': 'Distribusi Kios ke Poktan',
  '/alokasi-poktan': 'Alokasi Pupuk e-RDKK',
  '/field-maps': 'Mode Lapangan (Field Maps Android)',
  '/buku-kas-poktan': 'Buku Kas & Jasa Poktan',
  '/kepala-desa': 'Data Kepala Desa & Perangkat',
};

export default function RoleAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser, permissions, isMounted } = useAuth();

  // Selama initial hydration belum mount, render children agar identik dengan SSR
  if (!isMounted) {
    return <>{children}</>;
  }

  // Halaman cetak dan login selalu diizinkan
  const isExempt = PUBLIC_OR_PRINT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isExempt || pathname === '/') {
    return <>{children}</>;
  }

  const isAllowed = permissions.allowedPaths.some(
    (allowed) => pathname === allowed || pathname.startsWith(allowed + '/')
  );

  if (!isAllowed) {
    // Cari peran apa saja yang diizinkan membuka halaman ini
    const authorizedRoles = (Object.keys(ROLE_PERMISSIONS) as UserRole[]).filter((r) =>
      ROLE_PERMISSIONS[r].allowedPaths.some((p) => pathname.startsWith(p))
    );

    return (
      <div className="max-w-3xl mx-auto px-4 pt-12">
        <div className="bg-white rounded-3xl border-2 border-amber-200 shadow-xl p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
              Proteksi Pengelompokan Hak Akses (RBAC)
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              Halaman Ini Tidak Termasuk dalam Kelompok Akses Jabatan Anda
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl mx-auto leading-relaxed">
              Anda sedang masuk sebagai <strong className="text-slate-800">{currentUser.name}</strong> dengan kelompok jabatan{' '}
              <strong className="text-emerald-700">{permissions.label}</strong> ({permissions.groupName}).
            </p>
          </div>

          {/* Daftar Halaman yang Diizinkan untuk Peran Saat Ini */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs space-y-2">
            <div className="font-bold text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Kelompok Halaman yang Diizinkan untuk {permissions.label}:
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {permissions.allowedPaths.map((p) => (
                <Link
                  key={p}
                  href={p}
                  className="bg-white hover:bg-emerald-50 text-emerald-800 font-bold px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs transition"
                >
                  {PATH_LABELS[p] || p} &rarr;
                </Link>
              ))}
            </div>
          </div>

          {/* Informasi Wewenang yang Memiliki Izin Akses (Static Info - Tidak Dapat Diklik) */}
          <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200/90 text-xs space-y-2.5">
            <div className="font-bold text-amber-950 flex items-center justify-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-700" />
              Halaman &ldquo;{PATH_LABELS[pathname] || pathname}&rdquo; hanya dapat diakses oleh:
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {authorizedRoles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1.5 bg-white text-slate-800 font-bold px-3.5 py-1.5 rounded-xl text-xs border border-amber-300 shadow-2xs select-none"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  {ROLE_PERMISSIONS[r].label}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-amber-800/80 text-center max-w-md mx-auto">
              Silakan hubungi Administrator Kecamatan apabila Anda membutuhkan penyesuaian hak akses untuk akun Anda.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Dashboard Utama
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
