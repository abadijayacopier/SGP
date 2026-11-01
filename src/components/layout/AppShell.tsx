'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import RoleAccessGuard from '@/components/layout/RoleAccessGuard';
import MobileBottomNav from '@/components/layout/MobileBottomNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFieldMaps = pathname === '/field-maps' || pathname?.startsWith('/field-maps');
  const isLoginPage = pathname === '/login';

  if (isFieldMaps) {
    return (
      <main className="w-full h-screen h-[100dvh] overflow-hidden p-0 m-0 flex flex-col">
        <RoleAccessGuard>{children}</RoleAccessGuard>
      </main>
    );
  }

  if (isLoginPage) {
    return (
      <main className="w-full min-h-screen p-0 m-0 flex flex-col">
        <RoleAccessGuard>{children}</RoleAccessGuard>
      </main>
    );
  }

  return (
    <>
      <main className="flex-1 w-full pb-24 md:pb-12">
        <RoleAccessGuard>{children}</RoleAccessGuard>
      </main>
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 no-print mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 space-y-1.5">
          <p className="font-bold text-slate-800">
            Sistem Informasi Pertanian Terpadu &mdash; Pemerintah Kecamatan Lembeyan &copy; 2026
          </p>
          <p className="text-slate-500">
            Layanan Pemetaan Lahan (GIS), Pendaftaran e-RDKK, dan Distribusi Pupuk Bersubsidi Terverifikasi Wilayah BPP Kecamatan Lembeyan
          </p>
          <p className="pt-1 text-[11px] font-semibold text-emerald-700">
            Developer / Pengembang Sistem: <span className="font-black text-slate-900">Supriyanto Abadi Jaya</span>
          </p>
        </div>
      </footer>
      <MobileBottomNav />
    </>
  );
}
