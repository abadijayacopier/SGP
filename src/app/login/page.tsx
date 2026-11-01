'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, ROLE_PERMISSIONS, UserRole } from '@/lib/auth-context';
import {
  Sprout,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Map,
  QrCode,
  Camera,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { showSuccess, showToast } from '@/lib/sweetalert';

export default function LoginPage() {
  const router = useRouter();
  const { loginUser } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cacheCleared, setCacheCleared] = useState(false);

  // Otomatis bersihkan stale cache login saat pertama kali membuka halaman login
  useEffect(() => {
    try {
      localStorage.removeItem('pertanian_user_session');
      localStorage.removeItem('pertanian_role');
      localStorage.removeItem('pertanian_custom_rbac_matrix');
      sessionStorage.clear();
      setCacheCleared(true);
    } catch (e) {
      // Abaikan jika storage dinonaktifkan di browser
    }
  }, []);

  const handleManualClearCache = async () => {
    try {
      localStorage.removeItem('pertanian_user_session');
      localStorage.removeItem('pertanian_role');
      localStorage.removeItem('pertanian_custom_rbac_matrix');
      localStorage.removeItem('pertanian_settings_cache');
      sessionStorage.clear();

      // Bersihkan cache Service Worker jika ada
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      showToast('Cache & Sesi Browser Berhasil Dibersihkan!', 'success');
      setUsername('');
      setPassword('');
      setErrorMsg(null);
      setCacheCleared(true);
    } catch (err: any) {
      showToast('Gagal membersihkan cache: ' + err.message, 'error');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg('Silakan masukkan Username Petugas atau NIK Petani!');
      return;
    }

    try {
      setLoading(true);

      // Bersihkan sesi lama sebelum otentikasi baru
      try {
        localStorage.removeItem('pertanian_user_session');
        localStorage.removeItem('pertanian_role');
        sessionStorage.clear();
      } catch {}

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        loginUser(json.data);
        if (json.data.role === 'SURVEYOR') {
          window.location.href = '/field-maps';
        } else {
          window.location.href = ROLE_PERMISSIONS[json.data.role as UserRole]?.defaultPath || '/dashboard';
        }
      } else {
        setErrorMsg(json.error || 'Gagal masuk ke sistem. Periksa kembali username dan kata sandi.');
      }
    } catch (err: any) {
      setErrorMsg('Terjadi gangguan koneksi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-green-950 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-white/10">
        {/* Left Column: Branding Resmi Pemerintah Kecamatan (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-900 text-white p-8 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-emerald-400/10 pointer-events-none" />

          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-950/70 border border-emerald-400/40 px-3.5 py-1 rounded-full text-[11px] font-bold text-emerald-300 mb-6 shadow-xs">
              <Sprout className="w-3.5 h-3.5 text-amber-400" />
              PORTAL RESMI PEMERINTAH KECAMATAN LEMBEYAN
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-white">
              Sistem Informasi Pertanian &amp; Pemetaan GIS
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-3 leading-relaxed">
              Layanan terintegrasi pemetaan spasial petak sawah, pengajuan usulan alokasi e-RDKK, data kepala desa, serta penebusan pupuk bersubsidi terverifikasi KPL Wilayah Kecamatan Lembeyan.
            </p>

            {/* Fitur Keunggulan Sistem */}
            <div className="mt-8 space-y-3.5 text-xs">
              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                <Map className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-bold">Pemetaan Poligon GIS Anti-Tumpang Tindih</strong>
                  <span className="text-emerald-200 text-[11px]">
                    Validasi luas otomatis &amp; deteksi irisan batas sawah antar petani.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                <Camera className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-bold">Verifikasi Live Kamera &amp; Saksi Poktan</strong>
                  <span className="text-emerald-200 text-[11px]">
                    Dokumentasi foto KTP asli &amp; wajah penerima langsung di Kios KPL.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                <QrCode className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-bold">Kartu Tani Digital &amp; QR Code Dinas</strong>
                  <span className="text-emerald-200 text-[11px]">
                    Pemindaian QR cepat untuk memuat kuota e-RDKK &amp; cetak nota resmi.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Form Login Bersih & Profesional (7 Cols) */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-white">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Masuk ke Portal Resmi
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Masukkan identitas kredensial akun petugas atau 16 digit NIK Petani terdaftar.
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-6 h-6 text-emerald-700" />
              </div>
            </div>

            {/* Status Auto-Clear Cache Notice */}
            {cacheCleared && (
              <div className="mb-4 py-1.5 px-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-800 text-[11px] font-semibold flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Cache sesi login otomatis dibersihkan (Aman &amp; Siap Digunakan).</span>
                </div>
                <button
                  type="button"
                  onClick={handleManualClearCache}
                  title="Klik untuk membersihkan ulang cache browser & PWA"
                  className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 text-[10px] underline ml-2 cursor-pointer"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  Reset Ulang
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Username Petugas / NIK Petani Terdaftar *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Masukkan username petugas atau NIK..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Kata Sandi (Password) *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Masukkan kata sandi..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 space-y-2.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? 'Memverifikasi Kredensial...' : 'Masuk ke Sistem Pertanian'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => router.push('/cek-kuota')}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 text-xs border border-slate-800 cursor-pointer shadow-xs"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Cek Kuota NIK Mandiri</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleManualClearCache}
                    className="w-full bg-white hover:bg-slate-100 text-slate-700 font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 text-xs border border-slate-300 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Bersihkan Cache Sesi</span>
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Sistem Terenkripsi &bull; Standar Keamanan BPP
              </span>
              <span className="font-mono">Kec. Lembeyan</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
