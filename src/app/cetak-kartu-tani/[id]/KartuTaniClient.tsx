'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Printer, ArrowLeft, Check, Copy, Sprout, CreditCard } from 'lucide-react';

interface KartuTaniClientProps {
  petaniId: string;
  namaPetani: string;
  nik: string;
  qrPayload: string;
}

export default function KartuTaniClient({
  petaniId,
  namaPetani,
  nik,
  qrPayload,
}: KartuTaniClientProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
      <div className="flex items-center gap-2">
        <Link
          href="/petani"
          className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl shadow-2xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Data Petani
        </Link>
        <Link
          href={`/penyaluran?petaniId=${petaniId}`}
          className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-xs transition"
        >
          <Sprout className="w-4 h-4" />
          Gunakan Tebus Pupuk di Kios
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl shadow-2xs transition"
          title="Salin kode payload QR untuk diuji pada pemindai"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
          {copied ? 'Kode QR Tersalin!' : 'Salin Kode QR'}
        </button>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition"
        >
          <Printer className="w-4 h-4" />
          Cetak Kartu Tani (ID Card / PDF)
        </button>
      </div>
    </div>
  );
}
