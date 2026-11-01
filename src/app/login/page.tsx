'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, DEMO_USERS, ROLE_PERMISSIONS, UserRole, UserSession } from '@/lib/auth-context';
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
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { loginUser } = useAuth();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quickUsers, setQuickUsers] = useState<Record<UserRole, UserSession>>(DEMO_USERS);

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setQuickUsers((prev) => {
            const next = { ...prev };
            for (const roleKey of Object.keys(next) as UserRole[]) {
              const found = json.data.find((u: any) => u.role === roleKey);
              if (found) {
                next[roleKey] = {
                  ...next[roleKey],
                  username: found.username,
                  name: found.name,
                };
              }
            }
            return next;
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg('Silakan masukkan Username Petugas atau NIK Petani!');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
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
        setErrorMsg(json.error || 'Gagal masuk ke sistem');
      }
    } catch (err: any) {
      setErrorMsg('Terjadi gangguan koneksi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (roleKey: UserRole) => {
    const demo = quickUsers[roleKey] || DEMO_USERS[roleKey];
    setUsername(demo.username);
    setPassword('123456');
    setErrorMsg(null);
    try {
      setLoading(true);
      // Login cepat tetap melalui server agar cakupan data (petani/poktan/kios) ikut terisi
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: demo.username, password: '123456' }),
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
        setErrorMsg(json.error || 'Gagal masuk ke sistem');
      }
    } catch (err: any) {
      setErrorMsg('Terjadi gangguan koneksi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-green-950 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-white/10">
        {/* Left Column: Branding & Keunggulan Sistem (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-emerald-400/10 pointer-events-none" />

          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-950/60 border border-emerald-400/30 px-3 py-1 rounded-full text-[11px] font-bold text-emerald-300 mb-6">
              <Sprout className="w-3.5 h-3.5 text-amber-400" />
              PORTAL RESMI PEMERINTAH KECAMATAN LEMBEYAN
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-white">
              Sistem Informasi Pertanian Kecamatan Lembeyan (GIS & e-RDKK)
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-3 leading-relaxed">
              Platform pemetaan spasial blok sawah, pengajuan kuota pupuk bersubsidi berjenjang, dan penebusan pupuk terverifikasi identitas biometrik wajah & Kartu Tani Digital Wilayah Kecamatan Lembeyan.
            </p>

            {/* Fitur Keamanan */}
            <div className="mt-8 space-y-3.5 text-xs">
              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                <Map className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Pemetaan Poligon GIS Anti-Tumpang Tindih</strong>
                  <span className="text-emerald-200 text-[11px]">
                    Validasi luas otomatis & deteksi irisan batas sawah antar petani.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                <Camera className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Verifikasi Kamera Live & Saksi Poktan</strong>
                  <span className="text-emerald-200 text-[11px]">
                    Dokumentasi foto KTP asli & wajah penerima langsung di Kios KPL.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                <QrCode className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Kartu Tani Digital & QR Code Dinas</strong>
                  <span className="text-emerald-200 text-[11px]">
                    Pemindaian QR cepat untuk memuat kuota e-RDKK & cetak nota resmi.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 mt-8 border-t border-emerald-700/60 space-y-1 text-[11px] text-emerald-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Pemerintah Kecamatan Lembeyan</span>
              <span className="font-mono font-bold text-amber-300">TA 2026 &bull; v2.5</span>
            </div>
            <div className="text-[11px] text-emerald-300">
              Developer Pengembang: <strong className="text-amber-300">Supriyanto Abadi Jaya</strong>
            </div>
          </div>
        </div>

        {/* Right Column: Form Login & Quick Role Selector (7 Cols) */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  Masuk ke Akun Petugas / Petani
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gunakan Username akun petugas atau 16 digit NIK Petani yang terdaftar.
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Username Petugas / NIK Petani *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: admin, ppl_iissugiarti, atau NIK 3509012304750001"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-700">Kata Sandi (Password) *</label>
                  <span className="text-[11px] text-emerald-700 font-mono">
                    Default: <strong>123456</strong>
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Masukkan kata sandi..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 text-sm active:scale-[0.99]"
              >
                <span>{loading ? 'Memverifikasi Akun...' : 'Masuk ke Sistem Pertanian'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => router.push('/cek-kuota')}
                className="w-full bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs border border-slate-800"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Portal Cek Kuota NIK Mandiri & Verifikasi QR (Publik)</span>
              </button>
            </form>

            {/* Quick Login Per Peran (Memudahkan Pengujian Hak Akses) */}
            <div className="mt-7 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  Akses Cepat Akun Per Jabatan (1-Klik Login):
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">6 Level Akses</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.values(quickUsers).map((u) => {
                  const perm = ROLE_PERMISSIONS[u.role];
                  return (
                    <button
                      key={u.role}
                      type="button"
                      onClick={() => handleQuickDemoLogin(u.role)}
                      className="text-left p-3 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition flex flex-col justify-between group gap-1.5"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white font-black text-xs flex items-center justify-center shrink-0 group-hover:bg-emerald-600">
                            {u.avatarText}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">{u.roleLabel}</div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {u.name} (<span className="font-mono">{u.username}</span>)
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 shrink-0 ml-2" />
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                        <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                          {perm.menuItems.length} Menu Khusus:
                        </span>
                        {perm.menuItems.map((m) => (
                          <span
                            key={m.href}
                            className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                          >
                            {m.label}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>
              Pengembang: <strong className="text-slate-800">Supriyanto Abadi Jaya</strong> &bull; Kec. Lembeyan
            </span>
            <Link href="/dashboard" className="text-emerald-700 font-bold hover:underline">
              Kembali ke Dashboard &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
