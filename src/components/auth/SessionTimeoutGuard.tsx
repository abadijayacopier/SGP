'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Clock, ShieldAlert, ArrowRight, RotateCcw } from 'lucide-react';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 Menit Tidak Aktif
const WARNING_MS = 60 * 1000;      // Peringatan 60 Detik Terakhir (Muncul di Menit ke-14)

export default function SessionTimeoutGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isMounted, logoutUser } = useAuth();

  const [showWarningModal, setShowWarningModal] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(60);

  const lastActivityRef = useRef<number>(Date.now());
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Jangan aktifkan auto-logout pada halaman publik / login / cetak
  const isPublicPage =
    !pathname ||
    pathname === '/login' ||
    pathname.startsWith('/cetak-') ||
    pathname === '/cek-kuota' ||
    pathname === '/verifikasi';

  // Cek apakah user sedang memiliki sesi login aktif di browser
  const hasActiveSession = typeof window !== 'undefined' && Boolean(localStorage.getItem('pertanian_user_session'));

  const handleResetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarningModal) {
      setShowWarningModal(false);
      setCountdownSeconds(60);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }
  }, [showWarningModal]);

  const performAutoLogout = useCallback(() => {
    setShowWarningModal(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    logoutUser();
    if (typeof window !== 'undefined') {
      window.location.href = '/login?timeout=1';
    }
  }, [logoutUser]);

  useEffect(() => {
    if (!isMounted || isPublicPage || !hasActiveSession) {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      return;
    }

    // Event listener pendeteksi interaksi pengguna
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    let lastThrottled = 0;

    const handleUserInteraction = () => {
      const now = Date.now();
      // Throttle agar tidak membebani performa browser
      if (now - lastThrottled > 2000) {
        lastThrottled = now;
        if (!showWarningModal) {
          lastActivityRef.current = now;
        }
      }
    };

    events.forEach((evt) => window.addEventListener(evt, handleUserInteraction, { passive: true }));

    // Loop timer pengecek ketidakaktifan (setiap 5 detik)
    const intervalChecker = setInterval(() => {
      const inactiveTime = Date.now() - lastActivityRef.current;

      if (inactiveTime >= TIMEOUT_MS) {
        performAutoLogout();
      } else if (inactiveTime >= TIMEOUT_MS - WARNING_MS && !showWarningModal) {
        setShowWarningModal(true);
        const remaining = Math.max(1, Math.ceil((TIMEOUT_MS - inactiveTime) / 1000));
        setCountdownSeconds(remaining);
      }
    }, 5000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserInteraction));
      clearInterval(intervalChecker);
    };
  }, [isMounted, isPublicPage, hasActiveSession, showWarningModal, performAutoLogout]);

  // Efek hitung mundur saat modal peringatan terbuka
  useEffect(() => {
    if (showWarningModal) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            performAutoLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [showWarningModal, performAutoLogout]);

  return (
    <>
      {children}

      {/* Modal Dialog Peringatan Auto-Logout */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-amber-300 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-8 h-8 animate-pulse text-amber-600" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300">
                Peringatan Keamanan &bull; Waktu Habis
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-2">
                Sesi Anda Akan Segera Berakhir
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Tidak ada aktivitas terdeteksi selama 14 menit. Untuk melindungi data resmi e-RDKK &amp; pemetaan Kecamatan Lembeyan, sesi akan keluar otomatis dalam:
              </p>
            </div>

            {/* Countdown Badge */}
            <div className="py-2.5 px-4 bg-slate-900 text-amber-300 rounded-2xl font-mono text-3xl font-black shadow-inner flex items-center justify-center gap-2">
              <Clock className="w-6 h-6 text-amber-400" />
              <span>{countdownSeconds} detik</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={handleResetActivity}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Tetap Masuk</span>
              </button>

              <button
                type="button"
                onClick={performAutoLogout}
                className="bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-300 font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Keluar Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
