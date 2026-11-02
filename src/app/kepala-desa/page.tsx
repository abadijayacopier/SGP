'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KepalaDesaPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/petani?tab=kades');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-xs font-semibold">Mengarahkan ke Menu Kepala Desa di Halaman Petani...</p>
    </div>
  );
}
