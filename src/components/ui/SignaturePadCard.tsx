'use client';

import React, { useRef, useState } from 'react';
import {
  PenTool,
  Stamp,
  RotateCcw,
  Sparkles,
  Upload,
  Check,
  Trash2,
} from 'lucide-react';
import {
  generateAutoSignatureSvg,
  generateOfficialStampSvg,
} from '@/lib/signature-utils';

interface SignaturePadCardProps {
  name: string;
  role: string;
  wilayah: string;
  nip: string;
  onChangeNip: (val: string) => void;
  signatureUrl: string | null;
  onChangeSignature: (url: string | null) => void;
  stampUrl: string | null;
  onChangeStamp: (url: string | null) => void;
}

export default function SignaturePadCard({
  name,
  role,
  wilayah,
  nip,
  onChangeNip,
  signatureUrl,
  onChangeSignature,
  stampUrl,
  onChangeStamp,
}: SignaturePadCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#0f172a');
  const [showCanvasPad, setShowCanvasPad] = useState(false);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChangeSignature(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleUploadFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'signature' | 'stamp'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        if (target === 'signature') {
          onChangeSignature(reader.result);
        } else {
          onChangeStamp(reader.result);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="pt-4 border-t border-slate-200/80 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <PenTool className="w-4 h-4 text-emerald-600" />
            Pengaturan NIP, Tanda Tangan Digital & Stempel Surat Resmi
          </h4>
          <p className="text-xs text-slate-500">
            Tanda tangan, stempel, dan NIP di bawah ini otomatis dicetak pada Surat Keterangan Lahan GIS, Kartu Tani Digital, Nota KPL, dan Laporan Kecamatan.
          </p>
        </div>
      </div>

      {/* 1. Input NIP / Nomor Registrasi Jabatan */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          NIP Pejabat / Nomor Registrasi Penyuluh / Nomor SK Poktan / Izin KPL
        </label>
        <input
          type="text"
          value={nip}
          onChange={(e) => onChangeNip(e.target.value)}
          placeholder="Contoh: NIP. 19850412 201101 2 008 atau Reg. Poktan: 521/014/LMB/2026"
          className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 outline-none transition"
        />
      </div>

      {/* 2. Panel Kontrol Tanda Tangan & Stempel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kolom Kiri: Tanda Tangan Digital */}
        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-emerald-600" />
              1. Tanda Tangan Digital (TTD)
            </span>
            <div className="flex items-center gap-1">
              {[
                { label: 'Hitam', color: '#0f172a' },
                { label: 'Biru', color: '#1d4ed8' },
                { label: 'Hijau', color: '#047857' },
              ].map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setPenColor(c.color)}
                  title={`Tinta ${c.label}`}
                  className={`w-4 h-4 rounded-full border ${
                    penColor === c.color ? 'ring-2 ring-offset-1 ring-emerald-500 border-white' : 'border-slate-300'
                  }`}
                  style={{ backgroundColor: c.color }}
                />
              ))}
            </div>
          </div>

          {!showCanvasPad ? (
            <div className="h-28 bg-white rounded-xl border border-dashed border-slate-300 flex items-center justify-center p-2 relative overflow-hidden">
              {signatureUrl ? (
                <img
                  src={signatureUrl}
                  alt="Tanda Tangan Digital"
                  className="max-h-24 object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400 italic">Belum ada tanda tangan</span>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="bg-white rounded-xl border-2 border-emerald-500 overflow-hidden relative">
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={110}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-28 cursor-crosshair touch-none"
                />
                <span className="absolute top-1.5 left-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded pointer-events-none">
                  Goreskan TTD di sini (Mouse / Layar Sentuh)
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg"
                >
                  <RotateCcw className="w-3 h-3" /> Bersihkan
                </button>
                <button
                  type="button"
                  onClick={() => setShowCanvasPad(false)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-lg"
                >
                  <Check className="w-3 h-3" /> Selesai Menggambar
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setShowCanvasPad(!showCanvasPad)}
              className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition"
            >
              <PenTool className="w-3 h-3 text-amber-300" />
              {showCanvasPad ? 'Tutup Canvas' : 'Gambar TTD Sendiri'}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowCanvasPad(false);
                onChangeSignature(generateAutoSignatureSvg(name, penColor));
              }}
              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              Buat TTD Kaligrafi Otomatis
            </button>

            <label className="cursor-pointer inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition">
              <Upload className="w-3 h-3 text-emerald-600" />
              Upload PNG
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadFile(e, 'signature')}
              />
            </label>
          </div>
        </div>

        {/* Kolom Kanan: Stempel Instansi Resmi */}
        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Stamp className="w-3.5 h-3.5 text-blue-600" />
              2. Stempel Resmi Instansi / Poktan / KPL
            </span>
          </div>

          <div className="h-28 bg-white rounded-xl border border-dashed border-slate-300 flex items-center justify-center p-2 relative overflow-hidden">
            {stampUrl ? (
              <img
                src={stampUrl}
                alt="Stempel Resmi"
                className="max-h-24 object-contain"
              />
            ) : (
              <span className="text-xs text-slate-400 italic">Tanpa stempel</span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onChangeStamp(generateOfficialStampSvg(role, wilayah))}
              className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              Generate Stempel Resmi
            </button>

            <label className="cursor-pointer inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition">
              <Upload className="w-3 h-3 text-blue-600" />
              Upload Stempel
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadFile(e, 'stamp')}
              />
            </label>

            {stampUrl && (
              <button
                type="button"
                onClick={() => onChangeStamp('')}
                className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition"
              >
                <Trash2 className="w-3 h-3" />
                Hapus
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
