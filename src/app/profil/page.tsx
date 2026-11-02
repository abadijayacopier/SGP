'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, ROLE_PERMISSIONS, UserRole } from '@/lib/auth-context';
import {
  User,
  ShieldCheck,
  Lock,
  KeyRound,
  Camera,
  CheckCircle2,
  AlertCircle,
  FileText,
  MapPin,
  Building,
  Phone,
  Mail,
  UserCheck,
  Eye,
  EyeOff,
  Save,
  Check,
  ArrowRight,
  Sparkles,
  ExternalLink,
  CreditCard,
  Wheat,
  Warehouse,
} from 'lucide-react';
import Link from 'next/link';
import {
  showSuccess,
  showError,
  showWarning,
  showConfirm,
  showDeleteConfirm,
  showToast,
} from '@/lib/sweetalert';
import SignaturePadCard from '@/components/ui/SignaturePadCard';
import {
  getDefaultNipForRole,
  generateRecommendedUsernames,
  generateAutoSignatureSvg,
  generateOfficialStampSvg,
} from '@/lib/signature-utils';

// Pilihan avatar preset khas pertanian & kedinasan
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
];

export default function ProfilePage() {
  const { currentUser, permissions, updateCurrentUser } = useAuth();

  // Pengalihan untuk akun PETANI: Petani tidak memiliki wewenang mengedit data profil/password kedinasan
  useEffect(() => {
    if (currentUser.role === 'PETANI') {
      window.location.href = '/cek-kuota';
    }
  }, [currentUser.role]);
  const [activeTab, setActiveTab] = useState<'BIODATA' | 'KEAMANAN' | 'RBAC'>('BIODATA');

  // Matriks Wewenang RBAC State (Hanya Admin yang dapat mencentang/mengubah)
  const [matrixPermissions, setMatrixPermissions] = useState<Record<UserRole, any>>(ROLE_PERMISSIONS);
  const [matrixSavedAlert, setMatrixSavedAlert] = useState(false);

  // Profile data state
  const [loading, setLoading] = useState(true);
  const [roleDetail, setRoleDetail] = useState<any>(null);

  // Form Biodata
  const [usernameInput, setUsernameInput] = useState(currentUser.username || '');
  const [name, setName] = useState(currentUser.name || '');
  const [kiosName, setKiosName] = useState(currentUser.kiosName || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [wilayah, setWilayah] = useState(currentUser.wilayah || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser.avatarUrl || null);
  const [nip, setNip] = useState<string>(
    currentUser.nip || getDefaultNipForRole(currentUser.role, currentUser.username)
  );
  const [signatureUrl, setSignatureUrl] = useState<string | null>(
    currentUser.signatureUrl || generateAutoSignatureSvg(currentUser.name || 'Pejabat')
  );
  const [stampUrl, setStampUrl] = useState<string | null>(
    currentUser.stampUrl || generateOfficialStampSvg(currentUser.role, currentUser.wilayah)
  );
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [bioNotification, setBioNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Ganti Password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [passNotification, setPassNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sinkronisasi tab dari URL (?tab=BIODATA | KEAMANAN | RBAC) dan muat matriks RBAC
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'BIODATA' || tabParam === 'KEAMANAN' || tabParam === 'RBAC') {
        setActiveTab(tabParam);
      }
      try {
        const saved = localStorage.getItem('pertanian_custom_rbac_matrix');
        if (saved) setMatrixPermissions(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleTogglePermission = (roleKey: UserRole, permKey: string) => {
    if (currentUser.role !== 'ADMIN_DINAS') {
      showWarning('Akses Dibatasi', 'Hanya Administrator Kecamatan Lembeyan yang berwenang mencentang atau mengubah matriks hak akses!');
      return;
    }
    setMatrixPermissions((prev) => {
      const currentRoleObj = prev[roleKey] || ROLE_PERMISSIONS[roleKey];
      const updated = {
        ...prev,
        [roleKey]: {
          ...currentRoleObj,
          [permKey]: !currentRoleObj[permKey],
        },
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('pertanian_custom_rbac_matrix', JSON.stringify(updated));
      }
      return updated;
    });
    setMatrixSavedAlert(true);
    setTimeout(() => setMatrixSavedAlert(false), 3000);
  };

  // Fetch full profile info from API
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const res = await fetch(`/api/user/profile?username=${encodeURIComponent(currentUser.username)}`);
        const json = await res.json();
        if (json.success && json.data) {
          const u = json.data;
          setUsernameInput(u.username || currentUser.username);
          setName(u.name || currentUser.name);
          setKiosName(u.kiosName || currentUser.kiosName || '');
          setPhone(u.phone || '');
          setEmail(u.email || '');
          setWilayah(u.wilayah || currentUser.wilayah);
          setAvatarUrl(u.avatarUrl || null);
          setNip(u.nip || getDefaultNipForRole(u.role, u.username));
          setSignatureUrl(u.signatureUrl || generateAutoSignatureSvg(u.name || currentUser.name));
          setStampUrl(
            u.stampUrl !== undefined && u.stampUrl !== null
              ? u.stampUrl
              : generateOfficialStampSvg(u.role, u.kiosName || u.wilayah)
          );
          setRoleDetail(u.roleSpecificData || null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    if (currentUser.username) {
      loadProfile();
    }
  }, [currentUser.username]);

  // Handle Update Biodata & Foto Profil
  const handleSaveBio = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingBio(true);
      setBioNotification(null);

      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser.username,
          newUsername: usernameInput.trim() || currentUser.username,
          name,
          phone,
          email,
          wilayah,
          kiosName: currentUser.role === 'KIOS' ? (kiosName.trim() || null) : undefined,
          avatarUrl,
          nip,
          signatureUrl,
          stampUrl,
        }),
      });

      const json = await res.json();
      if (json.success) {
        const savedUsername = json.data?.username || usernameInput.trim() || currentUser.username;
        setUsernameInput(savedUsername);
        updateCurrentUser({
          username: savedUsername,
          name: json.data?.name ?? name,
          phone: json.data?.phone ?? phone,
          email: json.data?.email ?? email,
          wilayah: json.data?.wilayah ?? wilayah,
          kiosName: currentUser.role === 'KIOS' ? (kiosName.trim() || currentUser.kiosName) : currentUser.kiosName,
          avatarUrl: json.data?.avatarUrl !== undefined ? json.data.avatarUrl : avatarUrl,
          nip: json.data?.nip ?? nip,
          signatureUrl: json.data?.signatureUrl ?? signatureUrl,
          stampUrl: json.data?.stampUrl ?? stampUrl,
        });
        setBioNotification({
          type: 'success',
          message:
            json.message ||
            'Biodata dan tanda tangan dokumen resmi Anda berhasil disimpan & disinkronkan!',
        });
        await showSuccess(
          'Profil Berhasil Disimpan',
          'Biodata, NIP, tanda tangan & stempel resmi Anda berhasil diperbarui dan disinkronkan ke seluruh dokumen sistem!'
        );
      } else {
        setBioNotification({
          type: 'error',
          message: json.error || 'Gagal menyimpan profil',
        });
        await showError('Gagal Menyimpan Profil', json.error || 'Terjadi kesalahan sistem saat menyimpan data profil.');
      }
    } catch (err: any) {
      setBioNotification({
        type: 'error',
        message: err.message || 'Terjadi kesalahan jaringan',
      });
      await showError('Gangguan Jaringan', err.message || 'Terjadi gangguan jaringan saat menyimpan profil.');
    } finally {
      setSavingBio(false);
    }
  };

  // Handle Ganti Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassNotification(null);

    if (newPassword.length < 6) {
      setPassNotification({
        type: 'error',
        message: 'Kata sandi baru minimal harus 6 karakter!',
      });
      await showError('Kata Sandi Kurang Panjang', 'Kata sandi baru minimal harus 6 karakter!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassNotification({
        type: 'error',
        message: 'Konfirmasi kata sandi baru tidak cocok!',
      });
      await showError('Kata Sandi Tidak Cocok', 'Konfirmasi kata sandi baru tidak cocok dengan kata sandi yang Anda ketik.');
      return;
    }

    try {
      setSavingPass(true);
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser.username,
          oldPassword,
          newPassword,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setPassNotification({
          type: 'success',
          message: json.message || 'Kata sandi berhasil diubah!',
        });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        await showSuccess('Kata Sandi Berhasil Diperbarui', json.message || 'Kata sandi akun Anda berhasil diperbarui! Gunakan kata sandi ini untuk login berikutnya.');
      } else {
        setPassNotification({
          type: 'error',
          message: json.error || 'Gagal mengubah kata sandi',
        });
        await showError('Gagal Mengubah Sandi', json.error || 'Kata sandi lama salah atau tidak dapat diperbarui.');
      }
    } catch (err: any) {
      setPassNotification({
        type: 'error',
        message: err.message || 'Terjadi kesalahan sistem',
      });
      await showError('Gangguan Sistem', err.message || 'Terjadi gangguan sistem saat memperbarui kata sandi.');
    } finally {
      setSavingPass(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showWarning('File Terlalu Besar', 'Ukuran file foto maksimal adalah 2 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const currentRolePerm = ROLE_PERMISSIONS[currentUser.role] || ROLE_PERMISSIONS.ADMIN_DINAS;
  const isAdmin = currentUser.role === 'ADMIN_DINAS';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-16 space-y-8">
      {/* Header Halaman Profil */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full mb-2 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Portal Pengguna &bull; Pemerintah Kecamatan Lembeyan
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            Pengaturan Profil & Akun Pengguna
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Kelola foto identitas, biodata, kata sandi, serta pantau matriks hak akses wewenang Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-2xs"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>

      {/* TOP HERO PROFILE CARD */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* Avatar Container */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/20 p-1 backdrop-blur-md shadow-lg">
              <div className="w-full h-full rounded-full overflow-hidden bg-emerald-950 flex items-center justify-center text-3xl font-black text-amber-300 border-2 border-white/40">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span>{currentUser.avatarText || 'US'}</span>
                )}
              </div>
            </div>

            <label className="absolute bottom-1 right-1 bg-amber-400 hover:bg-amber-300 text-slate-950 p-2 rounded-full shadow-md cursor-pointer transition transform hover:scale-110">
              <Camera className="w-4 h-4" />
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          {/* User Identitas & Status */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-400 text-slate-950 shadow-2xs">
                {currentUser.role}
              </span>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/10 text-emerald-200 border border-white/15">
                {currentRolePerm.groupName}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Akun Aktif
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white">{name}</h2>

            <div className="text-xs sm:text-sm text-emerald-100 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1">
              <span>Username: <strong className="text-white font-mono">@{currentUser.username}</strong></span>
              <span>&bull;</span>
              <span>Wilayah: <strong className="text-white">{wilayah || 'Kecamatan Lembeyan'}</strong></span>
            </div>

            <p className="text-xs text-emerald-200/80 max-w-2xl leading-relaxed pt-1">
              {currentRolePerm.description}
            </p>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('BIODATA')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-xs sm:text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === 'BIODATA'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          Biodata & Informasi Jabatan
        </button>

        <button
          onClick={() => setActiveTab('KEAMANAN')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-xs sm:text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === 'KEAMANAN'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Keamanan & Ganti Password
        </button>

        <button
          onClick={() => setActiveTab('RBAC')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-xs sm:text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === 'RBAC'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          Wewenang Jabatan Saya (RBAC)
          {isAdmin && (
            <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black">
              ADMIN
            </span>
          )}
        </button>
      </div>

      {/* TAB CONTENT 1: BIODATA & DATA JABATAN */}
      {activeTab === 'BIODATA' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Form: Edit Profile */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-800">Ubah Biodata & Kontak</h3>
              <p className="text-xs text-slate-500">
                Informasi ini digunakan dalam administrasi penyaluran pupuk dan verifikasi lapangan Kecamatan Lembeyan.
              </p>
            </div>

            {bioNotification && (
              <div
                className={`p-4 rounded-2xl text-xs flex items-center gap-2 font-semibold ${
                  bioNotification.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {bioNotification.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{bioNotification.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveBio} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username Login Sistem *
                  </label>
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="Contoh: ppl_iissugiarti"
                    className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold outline-none transition"
                  />
                  {/* Rekomendasi Username Otomatis */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Rekomendasi:
                    </span>
                    {generateRecommendedUsernames(name || currentUser.name, currentUser.role).map(
                      (rec) => (
                        <button
                          key={rec}
                          type="button"
                          onClick={() => setUsernameInput(rec)}
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border transition ${
                            usernameInput === rec
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {rec}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Role / Wewenang Jabatan
                  </label>
                  <input
                    type="text"
                    value={currentRolePerm.label}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-3.5 py-2.5 text-xs font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Field Khusus KIOS: Nama Usaha Dagang (UD) / KPL */}
              {currentUser.role === 'KIOS' && (
                <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <Warehouse className="w-4 h-4 text-amber-600" />
                      Nama Usaha Dagang (UD) / Kios Resmi KPL *
                    </label>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-md border border-amber-300">
                      Sinkron Gudang & Dokumen
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={kiosName}
                    onChange={(e) => setKiosName(e.target.value)}
                    placeholder="Contoh: UD. Tani Subur Barokah"
                    className="w-full bg-white border border-amber-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-xl px-3.5 py-2.5 text-xs font-black text-slate-900 outline-none transition"
                  />
                  <p className="text-[11px] text-amber-900/80 leading-relaxed">
                    Perubahan nama UD / Kios otomatis disinkronkan ke Gudang Stok Pupuk, Nota Kasir Penebusan Petani, Berita Acara Penerimaan DO, dan Rekapitulasi Kecamatan.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {currentUser.role === 'KIOS'
                    ? 'Nama Lengkap Penanggung Jawab / Pengelola KPL *'
                    : 'Nama Lengkap & Gelar *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={currentUser.role === 'KIOS' ? 'Contoh: Hj. Siti Romlah / Bumi Subur' : 'Contoh: Sugeng Waluyo, S.P'}
                  className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 08123456789"
                      className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Email Resmi
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@pertanian.lembeyan.id"
                      className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Wilayah Tugas / Domisili Desa
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={wilayah}
                    onChange={(e) => setWilayah(e.target.value)}
                    placeholder="Contoh: Desa Kediren, Kec. Lembeyan"
                    className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 outline-none transition"
                  />
                </div>
              </div>

              {/* Preset Avatar Selection */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Atau Pilih Avatar Identitas:
                </label>
                <div className="flex flex-wrap gap-3">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-12 h-12 rounded-full overflow-hidden border-2 transition transform hover:scale-105 ${
                        avatarUrl === url ? 'border-emerald-600 ring-2 ring-emerald-400' : 'border-slate-200'
                      }`}
                    >
                      <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl(null)}
                      className="text-xs text-red-600 hover:underline font-semibold self-center ml-2"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>
              </div>

              {/* Digital Signature, NIP & Official Stamp Editor */}
              <SignaturePadCard
                name={name || currentUser.name}
                role={currentUser.role}
                wilayah={currentUser.role === 'KIOS' ? (kiosName || currentUser.kiosName || wilayah) : (wilayah || currentUser.wilayah)}
                nip={nip}
                onChangeNip={setNip}
                signatureUrl={signatureUrl}
                onChangeSignature={setSignatureUrl}
                stampUrl={stampUrl}
                onChangeStamp={setStampUrl}
              />

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                {bioNotification ? (
                  <div
                    className={`w-full sm:w-auto p-3 rounded-xl text-xs flex items-center gap-2 font-bold ${
                      bioNotification.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {bioNotification.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{bioNotification.message}</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                    Pastikan NIP dan stempel instansi telah sesuai sebelum menyimpan.
                  </span>
                )}

                <div className="ml-auto shrink-0 w-full sm:w-auto">
                  <button
                    type="submit"
                    disabled={savingBio}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black px-6 py-3 rounded-xl text-xs transition shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    <Save className={`w-4 h-4 ${savingBio ? 'animate-spin' : ''}`} />
                    {savingBio ? 'Menyimpan ke Database...' : 'Simpan Profil, NIP & Tanda Tangan Resmi'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Right Card: Role Specific Data Details */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" />
                Data Spesifik Jabatan ({currentUser.role})
              </h3>

              {/* Role: PETANI */}
              {currentUser.role === 'PETANI' && roleDetail && (
                <div className="space-y-3 text-xs">
                  <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/60 space-y-1.5">
                    <div className="text-slate-500 font-semibold">Nomor Induk Kependudukan (NIK):</div>
                    <div className="font-mono font-black text-slate-800 text-sm">{roleDetail.nik || currentUser.username}</div>
                    <div className="text-slate-500 font-semibold pt-1">Nomor Kartu Keluarga (KK):</div>
                    <div className="font-mono font-bold text-slate-800">{roleDetail.noKk || '-'}</div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Kelompok Tani:</span>
                      <strong className="text-slate-800">{roleDetail.poktanNama || 'Poktan Tani Makmur I'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Petak Sawah Terdaftar:</span>
                      <strong className="text-slate-800">{roleDetail.totalLahan || 0} Bidang</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Luas Garapan:</span>
                      <strong className="text-emerald-700">{roleDetail.totalLuasHa || 0} Hektar</strong>
                    </div>
                  </div>

                  {currentUser.petaniId && (
                    <Link
                      href={`/cetak-kartu-tani/${currentUser.petaniId}`}
                      target="_blank"
                      className="w-full inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-xs"
                    >
                      <CreditCard className="w-4 h-4 text-amber-300" />
                      Cetak Kartu Tani Digital
                    </Link>
                  )}
                </div>
              )}

              {/* Role: POKTAN */}
              {currentUser.role === 'POKTAN' && (
                <div className="space-y-3 text-xs">
                  <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 space-y-1.5">
                    <div className="text-slate-500 font-semibold">Kelembagaan Poktan:</div>
                    <div className="font-black text-emerald-900 text-sm">
                      {roleDetail?.namaPoktan || 'Poktan Tani Makmur I'}
                    </div>
                    <div className="text-slate-500">Wilayah: Desa Kediren, Kec. Lembeyan</div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Petani Anggota:</span>
                      <strong className="text-slate-800 font-bold">{roleDetail?.jumlahAnggota || 'Terdata'} Petani</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pengajuan e-RDKK:</span>
                      <strong className="text-slate-800 font-bold">{roleDetail?.jumlahPengajuan || 'Aktif'} Berkas</strong>
                    </div>
                  </div>

                  <Link
                    href="/petani"
                    className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition"
                  >
                    Buka Master Anggota Poktan
                  </Link>
                </div>
              )}

              {/* Role: KIOS */}
              {currentUser.role === 'KIOS' && (
                <div className="space-y-3 text-xs">
                  <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 space-y-1">
                    <div className="text-amber-800 font-semibold">Kios Pengecer Lengkap (KPL):</div>
                    <div className="font-black text-slate-900 text-sm">
                      {kiosName || currentUser.kiosName || roleDetail?.namaKios || 'UD. Tani Subur Barokah'}
                    </div>
                    <div className="text-slate-500">Kode Resmi: KPL-LMB-008 &bull; Lembeyan</div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Stok Pupuk Tersedia:</span>
                      <strong className="text-emerald-700 font-bold">{roleDetail?.totalStokSisaKg || '37.450'} Kg</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Komoditas Pupuk:</span>
                      <strong className="text-slate-800">Urea, NPK, Petroganik</strong>
                    </div>
                  </div>

                  <Link
                    href="/kios"
                    className="w-full inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-xs"
                  >
                    <Warehouse className="w-4 h-4" />
                    Buka Gudang Stok Kios
                  </Link>
                </div>
              )}

              {/* Role: PPL */}
              {currentUser.role === 'PPL' && (
                <div className="space-y-3 text-xs">
                  <div className="bg-blue-50 p-3.5 rounded-2xl border border-blue-200 space-y-1">
                    <div className="text-blue-800 font-semibold">Unit Balai Penyuluhan Pertanian:</div>
                    <div className="font-black text-slate-900 text-sm">BPP Kecamatan Lembeyan</div>
                    <div className="text-slate-500">Wilayah Binaan: Kediren, Tunggur, Tapen</div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">NIP Penyuluh:</span>
                      <strong className="text-slate-800 font-mono">19850412 201101 1 008</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Wewenang Spasial:</span>
                      <strong className="text-blue-700">Digitasi GIS & Verifikasi</strong>
                    </div>
                  </div>

                  <Link
                    href="/pengajuan"
                    className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-xs"
                  >
                    Antrean Verifikasi Lapangan BPP
                  </Link>
                </div>
              )}

              {/* Role: ADMIN_DINAS */}
              {currentUser.role === 'ADMIN_DINAS' && (
                <div className="space-y-3 text-xs">
                  <div className="bg-purple-50 p-3.5 rounded-2xl border border-purple-200 space-y-1">
                    <div className="text-purple-800 font-semibold">Instansi Penanggung Jawab:</div>
                    <div className="font-black text-slate-900 text-sm">Pemerintah Kecamatan Lembeyan</div>
                    <div className="text-slate-500">Otoritas Kuota e-RDKK & Manajemen RBAC</div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tingkat Akses:</span>
                      <strong className="text-purple-700 font-bold">Superadmin Kecamatan</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Hak Akses Modul:</span>
                      <strong className="text-slate-800">Semua Halaman (Penuh)</strong>
                    </div>
                  </div>

                  <Link
                    href="/users"
                    className="w-full inline-flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-xs"
                  >
                    Kelola Pengguna & Matriks RBAC
                  </Link>
                </div>
              )}
            </div>

            {/* Pratinjau Tanda Tangan Resmi Surat & Dokumen (Sinkron Otomatis) */}
            <div className="bg-white rounded-3xl border border-emerald-200 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Sinkronisasi Tanda Tangan Surat
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Perubahan nama pada profil ini otomatis disinkronkan ke kolom pengesahan / tanda tangan pada dokumen resmi berikut:
              </p>

              {/* Kotak Simulasi Tanda Tangan + Stempel + NIP */}
              <div className="border border-dashed border-slate-300 rounded-2xl p-4 bg-white text-center space-y-1 relative overflow-hidden">
                <p className="text-[11px] font-semibold text-slate-600">
                  {currentUser.role === 'PPL'
                    ? 'Petugas Penyuluh Lapangan (PPL),'
                    : currentUser.role === 'ADMIN_DINAS'
                    ? 'Mengetahui, Koordinator Wilayah Kecamatan Lembeyan,'
                    : currentUser.role === 'POKTAN'
                    ? 'Ketua Kelompok Tani (Poktan),'
                    : currentUser.role === 'KIOS'
                    ? 'Penanggung Jawab Kios Penyalur (KPL),'
                    : 'Petani Penerima Manfaat / Pemegang Kartu Tani,'}
                </p>
                <div className="h-24 flex items-center justify-center relative my-1">
                  {stampUrl && (
                    <img
                      src={stampUrl}
                      alt="Stempel Resmi"
                      className="h-20 w-20 object-contain absolute left-1/2 -translate-x-14 opacity-80 pointer-events-none"
                    />
                  )}
                  {signatureUrl ? (
                    <img
                      src={signatureUrl}
                      alt="Tanda Tangan"
                      className="h-16 object-contain relative z-10"
                    />
                  ) : (
                    <span className="text-[10px] text-emerald-700 font-semibold italic bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      [Tersinkronisasi Otomatis]
                    </span>
                  )}
                </div>
                <p className="text-xs font-black text-slate-900 underline uppercase relative z-10">
                  {name || currentUser.name}
                </p>
                <p className="text-[10px] font-mono text-slate-600 relative z-10">
                  {nip || getDefaultNipForRole(currentUser.role, currentUser.username)}
                </p>
                <p className="text-[10px] text-slate-400 relative z-10">
                  {wilayah || currentUser.wilayah || 'Kecamatan Lembeyan'}
                </p>
              </div>

              <div className="text-[11px] text-slate-600 space-y-1 pt-1">
                <div className="font-bold text-slate-800">Dokumen yang Terhubung:</div>
                {currentUser.role === 'PPL' && (
                  <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
                    <li>Surat Keterangan Petak Lahan GIS</li>
                    <li>Lembar Pengesahan Kartu Tani Digital</li>
                    <li>Laporan Rekapitulasi Kecamatan Lembeyan</li>
                    <li>Status Verifikator PPL pada Berkas e-RDKK</li>
                  </ul>
                )}
                {currentUser.role === 'ADMIN_DINAS' && (
                  <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
                    <li>Laporan Resmi Rekapitulasi Kecamatan Lembeyan</li>
                    <li>Pejabat Pengesah Kuota e-RDKK Kecamatan</li>
                  </ul>
                )}
                {currentUser.role === 'POKTAN' && (
                  <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
                    <li>Lembar Pengesahan Kartu Tani Digital Anggota</li>
                    <li>Surat Keterangan Petak Lahan GIS Anggota</li>
                    <li>Saksi Pengurus Poktan pada Nota Penebusan KPL</li>
                  </ul>
                )}
                {currentUser.role === 'KIOS' && (
                  <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
                    <li>Nota & Struk Kasir Penebusan Pupuk KPL</li>
                    <li>Berita Acara Serah Terima (BAST) Stok Gudang DO</li>
                  </ul>
                )}
                {currentUser.role === 'PETANI' && (
                  <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
                    <li>Kartu Tani Digital & Foto Identitas Kartu</li>
                    <li>Surat Keterangan Petak Lahan GIS</li>
                    <li>Nota Penebusan Pupuk Bersubsidi</li>
                  </ul>
                )}
              </div>
            </div>

            {/* Developer Credit Box */}
            <div className="bg-slate-900 text-slate-300 rounded-3xl p-5 text-xs space-y-2">
              <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                Pengembang Resmi Sistem
              </div>
              <div className="font-bold text-white text-sm">Supriyanto Abadi Jaya</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Sistem Informasi Pertanian Terpadu (GIS & e-RDKK) &bull; Pemerintah Kecamatan Lembeyan, Magetan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: KEAMANAN & GANTI PASSWORD */}
      {activeTab === 'KEAMANAN' && (
        <div className="max-w-2xl bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-emerald-600" />
              Ganti Kata Sandi Akun
            </h3>
            <p className="text-xs text-slate-500">
              Perbarui kata sandi secara berkala untuk menjaga kerahasiaan data e-RDKK dan transaksi penyaluran pupuk bersubsidi.
            </p>
          </div>

          {passNotification && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-center gap-2 font-semibold ${
                passNotification.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {passNotification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{passNotification.message}</span>
            </div>
          )}

          <form onSubmit={handleSavePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kata Sandi Saat Ini (Lama) *
              </label>
              <div className="relative">
                <input
                  type={showOldPass ? 'text' : 'password'}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Masukkan kata sandi lama (standar: 123456)"
                  className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kata Sandi Baru * (Minimal 6 karakter)
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru minimal 6 karakter"
                  className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Konfirmasi Kata Sandi Baru *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru Anda"
                className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none transition"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Ketentuan Keamanan Sandi:
              </div>
              <ul className="list-disc list-inside text-[11px] text-slate-500 space-y-0.5">
                <li>Gunakan minimal 6 karakter kombinasi huruf dan angka.</li>
                <li>Simpan kata sandi Anda dengan aman dan jangan dibagikan ke pihak lain.</li>
                <li>Bila Anda lupa kata sandi, hubungi Administrator Kecamatan Lembeyan untuk reset.</li>
              </ul>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingPass}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingPass ? 'Memproses...' : 'Ubah Kata Sandi Sekarang'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT 3: MATRIKS HAK AKSES & WEWENANG (RBAC) */}
      {activeTab === 'RBAC' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-600" />
                Matriks Hak Akses & Wewenang Jabatan (RBAC)
              </h3>
              <p className="text-xs text-slate-500">
                Wewenang operasional pengguna berdasarkan Surat Keputusan (SK) Dinas & BPP Kecamatan Lembeyan.
              </p>
            </div>

            {isAdmin ? (
              <Link
                href="/users"
                className="inline-flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition"
              >
                <UserCheck className="w-4 h-4" />
                Ubah & Centang Matriks di Manajemen User &rarr;
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Wewenang Anda: Tetap (Read-Only)
              </span>
            )}
          </div>

          {/* Alert Penjelasan Otoritas RBAC */}
          {isAdmin ? (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-3 text-xs text-purple-900">
              <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black text-sm">Hak Akses Superadmin Kecamatan Aktif</strong>
                <span>
                  Sebagai <strong>Admin Kecamatan Lembeyan</strong>, Anda memiliki otoritas tertinggi untuk
                  mengubah, mencentang, atau mencabut matriks wewenang seluruh role pada menu{' '}
                  <Link href="/users" className="underline font-bold text-purple-700">
                    Manajemen User & Matriks RBAC
                  </Link>.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
              <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black text-sm">Pemberitahuan Wewenang Jabatan Terkunci</strong>
                <span>
                  Sesuai kebijakan sistem, <strong>hanya Administrator Kecamatan Lembeyan</strong> yang berwenang
                  mengganti atau mencentang matriks wewenang jabatan. Jika ada penambahan tugas wewenang dinas,
                  silakan ajukan permohonan ke petugas BPP / Admin Kecamatan Lembeyan.
                </span>
              </div>
            </div>
          )}

          {/* Rincian Matriks Wewenang untuk Role yang Sedang Aktif */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Peran Aktif Akun Anda:</span>
                <span className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-md">
                  {currentUser.role}
                </span>
                <span className="text-xs font-semibold text-slate-700">({currentRolePerm.label})</span>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {currentRolePerm.menuItems.length} Halaman Diizinkan
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {/* Feature 1: Digitasi Peta GIS */}
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <div className="font-bold text-slate-800">Digitasi Pemetaan Poligon GIS Sawah</div>
                  <div className="text-[11px] text-slate-500">
                    Menggambar batas bidang sawah GPS, menghitung luas Hektar, dan validasi tumpang tindih.
                  </div>
                </div>
                <div className="shrink-0">
                  {currentRolePerm.canDigitasiGis ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-300">
                      <Check className="w-3.5 h-3.5" /> Diizinkan
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 font-semibold px-3 py-1 rounded-full border border-slate-200">
                      <Lock className="w-3.5 h-3.5" /> Mode Lihat Saja
                    </span>
                  )}
                </div>
              </div>

              {/* Feature 2: Input Usulan e-RDKK */}
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <div className="font-bold text-slate-800">Input Usulan Berkas e-RDKK</div>
                  <div className="text-[11px] text-slate-500">
                    Pengajuan kuota pupuk subsidi kolektif petani per masa tanam.
                  </div>
                </div>
                <div className="shrink-0">
                  {currentRolePerm.canSubmitPengajuan ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-300">
                      <Check className="w-3.5 h-3.5" /> Diizinkan (Poktan)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 font-semibold px-3 py-1 rounded-full border border-slate-200">
                      <Lock className="w-3.5 h-3.5" /> Terkunci
                    </span>
                  )}
                </div>
              </div>

              {/* Feature 3: Verifikasi Lapangan PPL */}
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <div className="font-bold text-slate-800">Verifikasi Lapangan Petugas BPP (PPL)</div>
                  <div className="text-[11px] text-slate-500">
                    Pemeriksaan keabsahan luas tanah, NIK petani, dan tanda tangan berita acara penyuluh.
                  </div>
                </div>
                <div className="shrink-0">
                  {currentRolePerm.canVerifyPpl ? (
                    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full border border-blue-300">
                      <Check className="w-3.5 h-3.5" /> Wewenang BPP
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 font-semibold px-3 py-1 rounded-full border border-slate-200">
                      <Lock className="w-3.5 h-3.5" /> Terkunci
                    </span>
                  )}
                </div>
              </div>

              {/* Feature 4: Otorisasi SK Kuota Dinas/Kecamatan */}
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <div className="font-bold text-slate-800">Otorisasi SK & Penerbitan Kuota e-RDKK</div>
                  <div className="text-[11px] text-slate-500">
                    Persetujuan final tingkat Kecamatan Lembeyan dan aktivasi kuota pupuk pada kartu tani.
                  </div>
                </div>
                <div className="shrink-0">
                  {currentRolePerm.canApproveDinas ? (
                    <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 font-bold px-3 py-1 rounded-full border border-purple-300">
                      <Check className="w-3.5 h-3.5" /> Otoritas Kecamatan
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 font-semibold px-3 py-1 rounded-full border border-slate-200">
                      <Lock className="w-3.5 h-3.5" /> Terkunci (Khusus Camat / Dinas)
                    </span>
                  )}
                </div>
              </div>

              {/* Feature 5: Kasir Penebusan & Kamera KPL */}
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <div className="font-bold text-slate-800">Kasir Penebusan Pupuk & Foto Kamera Penerima</div>
                  <div className="text-[11px] text-slate-500">
                    Scan QR Kartu Tani, pemotretan wajah petani saat serah terima, dan pencetakan nota resmi.
                  </div>
                </div>
                <div className="shrink-0">
                  {currentRolePerm.canDistributePupuk ? (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full border border-amber-300">
                      <Check className="w-3.5 h-3.5" /> Wewenang Kios KPL
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 font-semibold px-3 py-1 rounded-full border border-slate-200">
                      <Lock className="w-3.5 h-3.5" /> Terkunci
                    </span>
                  )}
                </div>
              </div>

              {/* Feature 6: Gudang Stok DO Kios */}
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <div className="font-bold text-slate-800">Gudang Stok DO & Audit Opname KPL</div>
                  <div className="text-[11px] text-slate-500">
                    Penerimaan pasokan pupuk dari distributor Lini III dan audit berkala fisik pupuk.
                  </div>
                </div>
                <div className="shrink-0">
                  {currentRolePerm.canManageKios ? (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full border border-amber-300">
                      <Check className="w-3.5 h-3.5" /> Wewenang Kios KPL
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 font-semibold px-3 py-1 rounded-full border border-slate-200">
                      <Lock className="w-3.5 h-3.5" /> Terkunci
                    </span>
                  )}
                </div>
              </div>

              {/* Feature 7: Manajemen User & RBAC */}
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <div className="font-bold text-slate-800">Manajemen Pengguna & Pengaturan Matriks RBAC</div>
                  <div className="text-[11px] text-slate-500">
                    Membuat akun petugas baru, reset kata sandi, dan mencentang wewenang berjenjang.
                  </div>
                </div>
                <div className="shrink-0">
                  {currentRolePerm.canManageUsers ? (
                    <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 font-bold px-3 py-1 rounded-full border border-purple-300">
                      <Check className="w-3.5 h-3.5" /> Superadmin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 font-semibold px-3 py-1 rounded-full border border-slate-200">
                      <Lock className="w-3.5 h-3.5" /> Terkunci (Hanya Admin)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabel Lengkap Matriks RBAC (Hanya Admin yang dapat mencentang) */}
          <div className="pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  Tabel Matriks Hak Akses Lintas Jabatan (RBAC)
                  {isAdmin ? (
                    <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded font-bold">
                      Admin: Dapat Mencentang / Memilih
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-bold">
                      Terkunci: Hanya Admin yang Boleh Mencentang
                    </span>
                  )}
                </h4>
              </div>
              {matrixSavedAlert && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                  ✅ Perubahan matriks tersimpan!
                </span>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Jabatan / Peran</th>
                    <th className="py-3 px-3 text-center">Digitasi GIS</th>
                    <th className="py-3 px-3 text-center">Usulan e-RDKK</th>
                    <th className="py-3 px-3 text-center">Verifikasi PPL</th>
                    <th className="py-3 px-3 text-center">Setujui Kuota</th>
                    <th className="py-3 px-3 text-center">Penebusan KPL</th>
                    <th className="py-3 px-3 text-center">Gudang Stok</th>
                    <th className="py-3 px-3 text-center">Kelola User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(Object.keys(ROLE_PERMISSIONS) as UserRole[]).map((rKey) => {
                    const p = matrixPermissions[rKey] || ROLE_PERMISSIONS[rKey];
                    const isMe = currentUser.role === rKey;
                    const permCols: { key: string; color: string }[] = [
                      { key: 'canDigitasiGis', color: 'text-emerald-600' },
                      { key: 'canSubmitPengajuan', color: 'text-emerald-600' },
                      { key: 'canVerifyPpl', color: 'text-blue-600' },
                      { key: 'canApproveDinas', color: 'text-purple-600' },
                      { key: 'canDistributePupuk', color: 'text-amber-600' },
                      { key: 'canManageKios', color: 'text-amber-600' },
                      { key: 'canManageUsers', color: 'text-purple-600' },
                    ];
                    return (
                      <tr key={rKey} className={isMe ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-800">{rKey}</span>
                            {isMe && (
                              <span className="text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                                Anda
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{p.label}</div>
                        </td>
                        {permCols.map((col) => (
                          <td key={col.key} className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={!isAdmin}
                              checked={!!p[col.key]}
                              onChange={() => handleTogglePermission(rKey, col.key)}
                              title={
                                isAdmin
                                  ? 'Klik untuk mencentang/mengubah wewenang'
                                  : 'Terkunci: Hanya Admin yang boleh mencentang'
                              }
                              className={`w-4 h-4 rounded border-slate-300 ${col.color} ${
                                isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                              }`}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
