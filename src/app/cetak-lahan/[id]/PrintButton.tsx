'use client';

import React from 'react';
import { Printer } from 'lucide-react';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-md transition"
    >
      <Printer className="w-4 h-4" />
      Cetak / Simpan PDF
    </button>
  );
}
