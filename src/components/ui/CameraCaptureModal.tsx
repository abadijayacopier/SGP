'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, AlertCircle, FlipHorizontal } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  title: string;
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  defaultFacingMode?: 'user' | 'environment';
}

export default function CameraCaptureModal({
  isOpen,
  title,
  onCapture,
  onClose,
  defaultFacingMode = 'environment',
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(defaultFacingMode);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Mulai stream kamera saat modal dibuka
  const startCamera = async (mode: 'user' | 'environment') => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Hentikan stream sebelumnya jika ada
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg('Peramban Anda tidak mendukung akses kamera langsung. Silakan gunakan opsi unggah file.');
        setLoading(false);
        return;
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.error('Error kamera:', err);
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Izin kamera ditolak. Silakan izinkan akses kamera di peramban Anda atau gunakan unggah file.');
      } else if (err.name === 'NotFoundError') {
        setErrorMsg('Perangkat kamera (webcam) tidak terdeteksi pada sistem ini.');
      } else {
        setErrorMsg(`Gagal mengakses kamera: ${err.message || 'Perangkat tidak tersedia'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera(facingMode);
    }

    return () => {
      // Cleanup stream saat modal ditutup
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Jika kamera depan (user), cerminkan gambar agar natural
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);

      // Hentikan stream sementara gambar sedang ditinjau
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      handleClose();
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCapturedImage(null);
    setErrorMsg(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 text-white shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{title}</h3>
              <p className="text-[11px] text-slate-400">Jepret langsung menggunakan kamera perangkat</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Snapshot Viewport */}
        <div className="relative my-4 w-full bg-black rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center border border-slate-800 shrink-0">
          {/* Error Message */}
          {errorMsg ? (
            <div className="p-6 text-center text-xs space-y-3 max-w-sm">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-slate-300 font-medium leading-relaxed">{errorMsg}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
              </button>
            </div>
          ) : capturedImage ? (
            /* Preview Foto yang Dijepret */
            <div className="relative w-full h-full">
              <img
                src={capturedImage}
                alt="Captured Snapshot"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-md">
                Hasil Jepretan Siap Digunakan
              </div>
            </div>
          ) : (
            /* Live Stream Video */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Garis Bantu Pembidik (Grid Overlay) */}
              <div className="absolute inset-4 border border-dashed border-white/30 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                <div className="text-[10px] text-white/60 font-mono tracking-wider">
                  BINGKAI DOKUMEN / WAJAH
                </div>
                <div className="self-end text-[10px] text-emerald-400 font-bold bg-black/60 px-2 py-0.5 rounded">
                  LIVE
                </div>
              </div>

              {/* Tombol Balik Kamera (Depan / Belakang) */}
              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full border border-white/20 transition shadow-md"
                title="Ganti Kamera Depan/Belakang"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Hidden Canvas untuk snapshot */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Ambil Ulang
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition active:scale-95"
              >
                <Check className="w-4 h-4" />
                Gunakan Foto Ini
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loading || !!errorMsg}
                onClick={handleCaptureSnapshot}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition shadow-lg ${
                  loading || !!errorMsg
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-95'
                }`}
              >
                <Camera className="w-4 h-4" />
                Jepret Foto Sekarang
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
