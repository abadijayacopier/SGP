'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import type { LahanItem } from './LeafletMap';

export interface FlyToTarget {
  lat: number;
  lng: number;
  zoom?: number;
  label?: string;
  keterangan?: string;
  timestamp?: number;
}

interface MapWrapperProps {
  lahanList: LahanItem[];
  isDrawingMode: boolean;
  onPolygonCreated?: (
    coords: [number, number][],
    luasHa: number,
    luasM2: number,
    perimeterM?: number,
    overlapInfo?: any
  ) => void;
  selectedLahanId?: string | null;
  flyToTarget?: FlyToTarget | null;
  onSelectDesaFromMap?: (desaKey: string) => void;
  onToggleDrawingMode?: () => void;
  canDigitasiGis?: boolean;
}

const DynamicLeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] rounded-2xl bg-slate-100 flex flex-col items-center justify-center border border-slate-200">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm font-semibold text-slate-600">Memuat Peta GIS & Citra Satelit Lahan Pertanian...</p>
    </div>
  ),
});

export default function MapWrapper(props: MapWrapperProps) {
  return <DynamicLeafletMap {...props} />;
}
