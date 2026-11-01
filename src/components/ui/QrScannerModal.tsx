'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  QrCode,
  Camera,
  X,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  Search,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Layers,
} from 'lucide-react';
import { showWarning } from '@/lib/sweetalert';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  petaniList: any[];
  onSelectPetani: (petaniId: string, scanMethod: string) => void;
}

export default function QrScannerModal({
  isOpen,
  onClose,
  petaniList,
  onSelectPetani,
}: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scanningAnim, setScanningAnim] = useState(false);
  const [scannedResult, setScannedResult] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualCode, setManualCode] = useState('');

  // Start camera when modal opens
  const startCamera = async (mode: 'environment' | 'user') => {
    try {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Kamera tidak tersedia pada perangkat ini. Gunakan fitur Tap Simulasi Kartu Tani di bawah.');
        setCameraActive(false);
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      setCameraActive(false);
      setCameraError(
        'Izin kamera belum aktif atau perangkat tidak memiliki kamera. Anda tetap dapat melakukan pemindaian melalui daftar Kartu Tani Digital di samping.'
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      setScannedResult(null);
      setScanningAnim(false);
      startCamera(facingMode);
    } else {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
      setCameraActive(false);
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  // Native BarcodeDetector loop if supported by browser
  useEffect(() => {
    if (!isOpen || !cameraActive || scannedResult) return;

    let intervalId: any;
    const Win = window as any;
    if ('BarcodeDetector' in Win) {
      try {
        const detector = new Win.BarcodeDetector({ formats: ['qr_code'] });
        intervalId = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const rawValue: string = barcodes[0].rawValue || '';
                handleDecodeString(rawValue, 'Kamera QR Live');
              }
            } catch (e) {
              // ignore frame errors
            }
          }
        }, 400);
      } catch (e) {
        // BarcodeDetector init fallback
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, cameraActive, scannedResult, petaniList]);

  const handleDecodeString = (raw: string, method: string) => {
    const clean = raw.trim();
    // Format payload: KARTUTANI:<nik>:<id> atau URL /cetak-kartu-tani/<id> atau NIK langsung
    const found = petaniList.find(
      (p) =>
        clean.includes(p.nik) ||
        clean.includes(p.id) ||
        p.nama.toLowerCase() === clean.toLowerCase()
    );

    if (found) {
      triggerSuccessScan(found, method);
    } else {
      showWarning('Kode Tidak Cocok', `QR / Kode "${clean}" tidak cocok dengan data petani terdaftar.`);
    }
  };

  const triggerSuccessScan = (petani: any, method: string) => {
    setScanningAnim(true);
    setTimeout(() => {
      setScanningAnim(false);
      setScannedResult({ petani, method });
      setTimeout(() => {
        onSelectPetani(petani.id, method);
        onClose();
      }, 900);
    }, 500);
  };

  if (!isOpen) return null;

  const filteredPetani = petaniList.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.nama.toLowerCase().includes(q) ||
      p.nik.includes(q) ||
      p.poktan?.nama?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight">
                  Pemindai QR Kartu Tani Digital (KPL Scanner)
                </h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Verifikasi Otomatis
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                Arahkan QR Code Kartu Tani ke kamera atau pilih simulasi Kartu Tani Digital untuk memuat kuota e-RDKK otomatis.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          {/* Left Column: Live Camera QR Viewport (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-video border-2 border-slate-800 flex items-center justify-center shadow-inner">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Laser Target Frame Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-52 h-52 border-2 border-emerald-400/80 rounded-3xl relative shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]">
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                      {/* Scanning laser line */}
                      <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-xl border border-white/10">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Sensor Kamera QR Aktif
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = facingMode === 'environment' ? 'user' : 'environment';
                        setFacingMode(next);
                        startCamera(next);
                      }}
                      className="inline-flex items-center gap-1 text-emerald-300 hover:underline font-bold"
                    >
                      <RefreshCw className="w-3 h-3" /> Balik Kamera
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-slate-300 max-w-sm space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center mx-auto border border-slate-700">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-white text-sm">Mode Simulasi Pemindaian Siap</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {cameraError ||
                      'Klik tombol Aktifkan Kamera untuk memindai cetakan fisik QR Kartu Tani, atau klik salah satu Kartu Tani di sebelah kanan.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition"
                  >
                    <Camera className="w-3.5 h-3.5" /> Coba Aktifkan Kamera
                  </button>
                </div>
              )}

              {/* Overlay Sukses Terpindai */}
              {(scanningAnim || scannedResult) && (
                <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-150">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">
                    QR Kartu Tani Terverifikasi!
                  </span>
                  {scannedResult && (
                    <>
                      <h4 className="text-lg font-black mt-1">{scannedResult.petani.nama}</h4>
                      <p className="text-xs font-mono text-emerald-200 mt-0.5">
                        NIK: {scannedResult.petani.nik} &bull; {scannedResult.petani.poktan?.nama}
                      </p>
                      <span className="mt-3 inline-block bg-white/10 px-3 py-1 rounded-full text-[11px] text-emerald-200">
                        Memuat kuota e-RDKK & blok sawah...
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Input Kode Kartu / NIK Manual */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <label className="block font-bold text-slate-700 mb-1.5">
                Atau Masukkan Nomor Kartu Tani / NIK Secara Cepat:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ketik NIK atau Nomor Kartu Tani (misal: 3509012304750001)..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleDecodeString(manualCode, 'Input Kode Kartu Tani')}
                  className="bg-slate-900 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shrink-0"
                >
                  Verifikasi Kode
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Instant Tap Simulation of Registered Kartu Tani (5 cols) */}
          <div className="lg:col-span-5 flex flex-col border border-slate-200 rounded-2xl bg-slate-50/60 p-4">
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Tap Kartu Tani Digital (Simulasi Cepat)
                </h4>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  {petaniList.length} Kartu Aktif
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Klik salah satu kartu di bawah untuk mensimulasikan pemindaian QR Kartu Tani milik petani di meja Kios KPL:
              </p>
            </div>

            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama petani atau NIK..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[300px] pr-1">
              {filteredPetani.map((p) => {
                const alokasi = p.alokasiPupuk?.[0];
                const noKartu = `KT-3509-${p.nik.slice(-6)}`;
                return (
                  <div
                    key={p.id}
                    onClick={() => triggerSuccessScan(p, 'Scan QR Kartu Tani Digital')}
                    className="group cursor-pointer rounded-2xl p-3.5 bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-900 text-white shadow-sm hover:shadow-md hover:scale-[1.01] transition border border-emerald-600/40 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-300 block">
                          KARTU TANI DIGITAL &bull; {noKartu}
                        </span>
                        <h5 className="font-black text-sm text-white group-hover:text-amber-300 transition mt-0.5">
                          {p.nama}
                        </h5>
                        <p className="text-[11px] font-mono text-emerald-100/90">NIK: {p.nik}</p>
                      </div>
                      <div className="bg-white/15 backdrop-blur-xs px-2 py-1 rounded-lg text-right shrink-0 border border-white/15">
                        <span className="text-[9px] text-emerald-200 block">Luas Lahan</span>
                        <strong className="text-xs font-black text-amber-300">
                          {Number(p.totalLuasLahan || 0).toFixed(2)} Ha
                        </strong>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-emerald-700/60 flex items-center justify-between text-[10px]">
                      <span className="text-emerald-200 truncate max-w-[160px]">
                        {p.poktan?.nama} ({p.lahan?.length || 0} Blok)
                      </span>
                      {alokasi ? (
                        <span className="font-bold text-amber-300">
                          Sisa: Urea {alokasi.sisaUreaKg}Kg &bull; NPK {alokasi.sisaNpkKg}Kg
                        </span>
                      ) : (
                        <span className="text-slate-300">Tanpa Alokasi</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
