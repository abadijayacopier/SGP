'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const DynamicFieldMaps = dynamic(() => import('@/components/map/FieldMapsMobile'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[100dvh] bg-slate-900 flex flex-col items-center justify-center text-white p-4">
      <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
      <h2 className="text-base sm:text-lg font-black text-emerald-400">
        Memuat Field Maps GPS Lembeyan...
      </h2>
      <p className="text-xs text-slate-400 mt-1 text-center max-w-xs">
        Menyiapkan citra satelit resolusi tinggi & modul penentuan posisi GPS smartphone.
      </p>
    </div>
  ),
});

export default function FieldMapsPage() {
  return <DynamicFieldMaps />;
}
