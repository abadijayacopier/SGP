'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, ROLE_PERMISSIONS, UserRole, UserSession } from '@/lib/auth-context';
import { generateRecommendedUsernames } from '@/lib/signature-utils';
import {
  showSuccess,
  showError,
  showWarning,
  showConfirm,
  showDeleteConfirm,
  showToast,
} from '@/lib/sweetalert';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit3,
  KeyRound,
  Eye,
  EyeOff,
  Building2,
  Phone,
  Mail,
  MapPin,
  X,
  Lock,
  LogIn,
} from 'lucide-react';

interface DbUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  nip?: string | null;
  phone?: string | null;
  email?: string | null;
  wilayah?: string | null;
  kiosName?: string | null;
  poktanId?: string | null;
  createdAt: string;
}

const ROLE_BADGE_MAP: Record<UserRole, { label: string; badge: string; avatar: string }> = {
  ADMIN_DINAS: {
    label: 'Admin Kecamatan Lembeyan',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    avatar: 'AD',
  },
  PPL: {
    label: 'Penyuluh Lapangan (BPP Lembeyan)',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    avatar: 'PL',
  },
  POKTAN: {
    label: 'Pengurus Kelompok Tani',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    avatar: 'PK',
  },
  KIOS: {
    label: 'Kios Pupuk Lengkap (KPL)',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    avatar: 'KP',
  },
  PETANI: {
    label: 'Petani Terdaftar',
    badge: 'bg-green-100 text-green-800 border-green-300',
    avatar: 'PT',
  },
  SURVEYOR: {
    label: 'Petugas Surveyor Lapangan',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    avatar: 'SV',
  },
};

export default function UsersManagementPage() {
  const { currentUser, loginUser } = useAuth();
  const [userList, setUserList] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Tambah / Edit User
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DbUser | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    role: 'PPL' as UserRole,
    nip: '',
    phone: '',
    email: '',
    wilayah: 'BPP Kec. Lembeyan',
    kiosName: '',
    password: '123456',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal Reset Password Khusus
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<DbUser | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('123456');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Matriks Wewenang RBAC State (Hanya Admin yang dapat mengubah)
  const [matrixPermissions, setMatrixPermissions] = useState<Record<UserRole, any>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pertanian_custom_rbac_matrix');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return ROLE_PERMISSIONS;
  });
  const [matrixSavedAlert, setMatrixSavedAlert] = useState(false);

  const isAdmin = currentUser.role === 'ADMIN_DINAS';

  const handleTogglePermission = (roleKey: UserRole, permKey: string) => {
    if (!isAdmin) {
      showWarning('Akses Dibatasi', 'Hanya Administrator Kecamatan Lembeyan yang memiliki wewenang untuk mencentang atau mengubah matriks wewenang!');
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

  const handleResetMatrix = async () => {
    if (!isAdmin) return;
    const ok = await showConfirm({
      title: 'Reset Matriks Hak Akses?',
      text: 'Kembalikan seluruh matriks hak akses ke standar resmi Kecamatan Lembeyan?',
      confirmButtonText: 'Ya, Reset Matriks',
    });
    if (ok) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pertanian_custom_rbac_matrix');
      }
      setMatrixPermissions(ROLE_PERMISSIONS);
      showSuccess('Matriks Direset', 'Seluruh hak akses telah dikembalikan ke standar resmi.');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const url = filterRole !== 'SEMUA' ? `/api/users?role=${filterRole}` : '/api/users';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setUserList(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filterRole]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      name: '',
      role: 'PPL',
      nip: '',
      phone: '',
      email: '',
      wilayah: 'BPP Kec. Lembeyan',
      kiosName: '',
      password: '123456',
    });
    setShowPassword(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (u: DbUser) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      name: u.name,
      role: u.role,
      nip: u.nip || '',
      phone: u.phone || '',
      email: u.email || '',
      wilayah: u.wilayah || '',
      kiosName: u.kiosName || '',
      password: '',
    });
    setShowPassword(false);
    setModalOpen(true);
  };

  const handleOpenResetPassword = (u: DbUser) => {
    setResetTargetUser(u);
    setNewPasswordInput('123456');
    setShowNewPassword(false);
    setResetModalOpen(true);
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    if (!newPasswordInput || newPasswordInput.trim().length < 4) {
      showWarning('Kata Sandi Lemah', 'Kata sandi minimal terdiri dari 4 karakter!');
      return;
    }

    try {
      setResetSubmitting(true);
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: resetTargetUser.id,
          password: newPasswordInput.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        showSuccess(
          'Kata Sandi Direset',
          `Kata sandi untuk akun "${resetTargetUser.name}" (@${resetTargetUser.username}) berhasil diperbarui menjadi "${newPasswordInput.trim()}"!`
        );
        setResetModalOpen(false);
        setResetTargetUser(null);
      } else {
        showError('Gagal Reset', json.error);
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.name) {
      showWarning('Form Belum Lengkap', 'Username dan Nama Lengkap wajib diisi!');
      return;
    }

    try {
      setSubmitting(true);
      const method = editingUser ? 'PATCH' : 'POST';
      const payload = editingUser ? { ...formData, id: editingUser.id } : formData;

      const res = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        showSuccess(
          editingUser ? 'Akun Diperbarui' : 'Akun Dibuat',
          editingUser
            ? `Data akun "${formData.name}" berhasil diperbarui!`
            : `Akun petugas baru "${formData.name}" (@${formData.username}) berhasil dibuat!`
        );
        setModalOpen(false);
        fetchUsers();
      } else {
        showError('Gagal Menyimpan', json.error);
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (u: DbUser) => {
    if (u.username === 'admin') {
      showError('Aksi Ditolak', 'Akun Administrator Utama tidak dapat dihapus!');
      return;
    }
    const ok = await showDeleteConfirm(
      u.name,
      `Hapus akun pengguna <strong>"${u.name}"</strong> (@${u.username})?`
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/users?id=${u.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showSuccess('Akun Dihapus', `Akun "${u.name}" berhasil dihapus.`);
        fetchUsers();
      } else {
        showError('Gagal Menghapus', json.error);
      }
    } catch (err: any) {
      showError('Error', err.message);
    }
  };

  const handleSwitchToUser = (u: DbUser) => {
    const meta = ROLE_BADGE_MAP[u.role] || ROLE_BADGE_MAP.PETANI;
    const session: UserSession = {
      id: u.id,
      username: u.username,
      name: u.kiosName ? `${u.name} (${u.kiosName})` : u.name,
      role: u.role,
      roleLabel: meta.label,
      wilayah: u.wilayah || 'Kecamatan Lembeyan',
      badgeColor: meta.badge,
      avatarText: meta.avatar,
    };
    loginUser(session);
    showSuccess('Beralih Akun', `Berhasil beralih akun aktif ke: ${u.name} (${meta.label})`);
  };

  const filteredUsers = userList.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.wilayah || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-300">
              Role-Based Access Control (RBAC)
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Manajemen Akun Petugas & Hak Akses Sistem
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Kelola akun Admin Kecamatan Lembeyan, Penyuluh Lapangan (BPP Lembeyan), Ketua Poktan, Kios Pupuk Lengkap (KPL), dan matriks otorisasi modul.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" />
          + Tambah Akun Petugas Baru
        </button>
      </div>

      {/* SECTION 1: MATRIKS OTORISASI HAK AKSES PER JABATAN (RBAC) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                Matriks Hak Akses & Wewenang Jabatan (RBAC)
              </h2>
              {isAdmin ? (
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded-md">
                  Mode Edit Admin
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md">
                  Terkunci (Read-Only)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? 'Sebagai Administrator Kecamatan, Anda dapat mencentang atau menghapus wewenang masing-masing jabatan.'
                : 'Hanya Admin Kecamatan Lembeyan yang memiliki hak untuk mencentang, memilih, atau mengganti matriks wewenang ini.'}
            </p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetMatrix}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition"
              >
                Reset ke Standar Resmi
              </button>
            </div>
          )}
        </div>

        {/* Notifikasi feedback saat Admin mencentang/mengubah */}
        {matrixSavedAlert && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-xs flex items-center gap-2 font-bold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            Perubahan matriks wewenang jabatan berhasil disimpan secara realtime!
          </div>
        )}

        {!isAdmin && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 font-medium">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Matriks Dikunci:</strong> Anda sedang login sebagai <strong>{currentUser.roleLabel}</strong>. Otoritas mencentang wewenang hanya dimiliki oleh Administrator Kecamatan Lembeyan.
            </span>
          </div>
        )}

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-3 px-4">Level Peran / Jabatan</th>
                <th className="py-3 px-3 text-center">Digitasi Peta GIS</th>
                <th className="py-3 px-3 text-center">Usulan e-RDKK</th>
                <th className="py-3 px-3 text-center">Verifikasi PPL</th>
                <th className="py-3 px-3 text-center">Setujui Kuota Dinas</th>
                <th className="py-3 px-3 text-center">Penebusan & Kamera</th>
                <th className="py-3 px-3 text-center">Gudang Stok KPL</th>
                <th className="py-3 px-3 text-center">Kelola User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(Object.keys(ROLE_PERMISSIONS) as UserRole[]).map((roleKey) => {
                const perm = matrixPermissions[roleKey] || ROLE_PERMISSIONS[roleKey];
                const meta = ROLE_BADGE_MAP[roleKey];
                const isCurrent = currentUser.role === roleKey;

                return (
                  <tr key={roleKey} className={isCurrent ? 'bg-emerald-50/40' : 'hover:bg-slate-50/80 transition'}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${meta.badge}`}>
                          {roleKey}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                            Akun Saya
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-800 mt-1">{perm.label}</div>
                      <div className="text-[11px] text-slate-500">{perm.description}</div>
                    </td>

                    {/* Checkbox 1: Digitasi GIS */}
                    <td className="py-3 px-3 text-center">
                      <label
                        className={`inline-flex flex-col items-center justify-center p-1.5 rounded-xl transition ${
                          isAdmin ? 'cursor-pointer hover:bg-slate-100' : 'cursor-not-allowed opacity-80'
                        }`}
                        title={isAdmin ? 'Klik untuk centang/ubah wewenang' : 'Hanya Admin yang dapat mencentang wewenang'}
                      >
                        <input
                          type="checkbox"
                          disabled={!isAdmin}
                          checked={!!perm.canDigitasiGis}
                          onChange={() => handleTogglePermission(roleKey, 'canDigitasiGis')}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:cursor-not-allowed"
                        />
                        <span className="text-[9px] text-slate-400 mt-0.5">
                          {perm.canDigitasiGis ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </label>
                    </td>

                    {/* Checkbox 2: Usulan e-RDKK */}
                    <td className="py-3 px-3 text-center">
                      <label
                        className={`inline-flex flex-col items-center justify-center p-1.5 rounded-xl transition ${
                          isAdmin ? 'cursor-pointer hover:bg-slate-100' : 'cursor-not-allowed opacity-80'
                        }`}
                        title={isAdmin ? 'Klik untuk centang/ubah wewenang' : 'Hanya Admin yang dapat mencentang wewenang'}
                      >
                        <input
                          type="checkbox"
                          disabled={!isAdmin}
                          checked={!!perm.canSubmitPengajuan}
                          onChange={() => handleTogglePermission(roleKey, 'canSubmitPengajuan')}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:cursor-not-allowed"
                        />
                        <span className="text-[9px] text-slate-400 mt-0.5">
                          {perm.canSubmitPengajuan ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </label>
                    </td>

                    {/* Checkbox 3: Verifikasi PPL */}
                    <td className="py-3 px-3 text-center">
                      <label
                        className={`inline-flex flex-col items-center justify-center p-1.5 rounded-xl transition ${
                          isAdmin ? 'cursor-pointer hover:bg-slate-100' : 'cursor-not-allowed opacity-80'
                        }`}
                        title={isAdmin ? 'Klik untuk centang/ubah wewenang' : 'Hanya Admin yang dapat mencentang wewenang'}
                      >
                        <input
                          type="checkbox"
                          disabled={!isAdmin}
                          checked={!!perm.canVerifyPpl}
                          onChange={() => handleTogglePermission(roleKey, 'canVerifyPpl')}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:cursor-not-allowed"
                        />
                        <span className="text-[9px] text-slate-400 mt-0.5">
                          {perm.canVerifyPpl ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </label>
                    </td>

                    {/* Checkbox 4: Setujui Kuota Dinas */}
                    <td className="py-3 px-3 text-center">
                      <label
                        className={`inline-flex flex-col items-center justify-center p-1.5 rounded-xl transition ${
                          isAdmin ? 'cursor-pointer hover:bg-slate-100' : 'cursor-not-allowed opacity-80'
                        }`}
                        title={isAdmin ? 'Klik untuk centang/ubah wewenang' : 'Hanya Admin yang dapat mencentang wewenang'}
                      >
                        <input
                          type="checkbox"
                          disabled={!isAdmin}
                          checked={!!perm.canApproveDinas}
                          onChange={() => handleTogglePermission(roleKey, 'canApproveDinas')}
                          className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 disabled:cursor-not-allowed"
                        />
                        <span className="text-[9px] text-slate-400 mt-0.5">
                          {perm.canApproveDinas ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </label>
                    </td>

                    {/* Checkbox 5: Penebusan & Kamera */}
                    <td className="py-3 px-3 text-center">
                      <label
                        className={`inline-flex flex-col items-center justify-center p-1.5 rounded-xl transition ${
                          isAdmin ? 'cursor-pointer hover:bg-slate-100' : 'cursor-not-allowed opacity-80'
                        }`}
                        title={isAdmin ? 'Klik untuk centang/ubah wewenang' : 'Hanya Admin yang dapat mencentang wewenang'}
                      >
                        <input
                          type="checkbox"
                          disabled={!isAdmin}
                          checked={!!perm.canDistributePupuk}
                          onChange={() => handleTogglePermission(roleKey, 'canDistributePupuk')}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:cursor-not-allowed"
                        />
                        <span className="text-[9px] text-slate-400 mt-0.5">
                          {perm.canDistributePupuk ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </label>
                    </td>

                    {/* Checkbox 6: Gudang Stok KPL */}
                    <td className="py-3 px-3 text-center">
                      <label
                        className={`inline-flex flex-col items-center justify-center p-1.5 rounded-xl transition ${
                          isAdmin ? 'cursor-pointer hover:bg-slate-100' : 'cursor-not-allowed opacity-80'
                        }`}
                        title={isAdmin ? 'Klik untuk centang/ubah wewenang' : 'Hanya Admin yang dapat mencentang wewenang'}
                      >
                        <input
                          type="checkbox"
                          disabled={!isAdmin}
                          checked={!!perm.canManageKios}
                          onChange={() => handleTogglePermission(roleKey, 'canManageKios')}
                          className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 disabled:cursor-not-allowed"
                        />
                        <span className="text-[9px] text-slate-400 mt-0.5">
                          {perm.canManageKios ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </label>
                    </td>

                    {/* Checkbox 7: Kelola User */}
                    <td className="py-3 px-3 text-center">
                      <label
                        className={`inline-flex flex-col items-center justify-center p-1.5 rounded-xl transition ${
                          isAdmin ? 'cursor-pointer hover:bg-slate-100' : 'cursor-not-allowed opacity-80'
                        }`}
                        title={isAdmin ? 'Klik untuk centang/ubah wewenang' : 'Hanya Admin yang dapat mencentang wewenang'}
                      >
                        <input
                          type="checkbox"
                          disabled={!isAdmin}
                          checked={!!perm.canManageUsers}
                          onChange={() => handleTogglePermission(roleKey, 'canManageUsers')}
                          className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 disabled:cursor-not-allowed"
                        />
                        <span className="text-[9px] text-slate-400 mt-0.5">
                          {perm.canManageUsers ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: DAFTAR AKUN PENGGUNA DATABASE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'SEMUA', label: 'Semua Jabatan' },
              { id: 'ADMIN_DINAS', label: 'Admin Kecamatan' },
              { id: 'PPL', label: 'Petugas PPL' },
              { id: 'POKTAN', label: 'Pengurus Poktan' },
              { id: 'KIOS', label: 'Kios KPL' },
              { id: 'PETANI', label: 'Akun Petani' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterRole(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  filterRole === tab.id
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama, username, wilayah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Mobile User Card View */}
        <div className="block lg:hidden divide-y divide-slate-100">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Tidak ada pengguna yang sesuai pencarian.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const meta = ROLE_BADGE_MAP[u.role] || ROLE_BADGE_MAP.PETANI;
              const isActive = currentUser.username === u.username;

              return (
                <div key={u.id} className="p-4 hover:bg-slate-50/80 transition space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {meta.avatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-sm leading-tight truncate">
                          {u.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                          @{u.username}
                        </div>
                      </div>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badge}`}>
                      {meta.label}
                    </span>
                  </div>

                  {u.nip && (
                    <div className="text-[11px] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-emerald-800 font-semibold font-mono">
                      {u.nip}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    {u.wilayah && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                        📍 {u.wilayah}
                      </span>
                    )}
                    {u.kiosName && (
                      <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200 font-semibold">
                        🏪 KPL: {u.kiosName}
                      </span>
                    )}
                    {u.phone && (
                      <span className="font-mono text-slate-600">
                        📞 {u.phone}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleSwitchToUser(u)}
                      className={`flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition shadow-xs ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                      }`}
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{isActive ? 'Sedang Digunakan' : 'Gunakan Akun'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(u)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95 transition"
                      title="Edit User"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {u.username !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        className="p-2 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-95 transition"
                        title="Hapus User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop User Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Lengkap & Username</th>
                <th className="py-3 px-4">Peran / Jabatan</th>
                <th className="py-3 px-4">Wilayah Kerja / Unit</th>
                <th className="py-3 px-4">Kontak & Email</th>
                <th className="py-3 px-4 text-right">Aksi & Simulasi Masuk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const meta = ROLE_BADGE_MAP[u.role] || ROLE_BADGE_MAP.PETANI;
                const isActive = currentUser.username === u.username;

                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                          {meta.avatar}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            {u.name}
                            {isActive && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                                Sedang Digunakan
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            Username: <strong>{u.username}</strong>
                            {u.nip && (
                              <span className="ml-2 text-emerald-800 font-bold">&bull; {u.nip}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{u.wilayah || '-'}</div>
                      {u.kiosName && (
                        <div className="text-[11px] text-amber-700 font-bold">KPL: {u.kiosName}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="font-mono">{u.phone || '-'}</div>
                      <div className="text-[11px] text-slate-400">{u.email || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSwitchToUser(u)}
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg shadow-2xs transition"
                          title="Gunakan akun ini sekarang"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          Gunakan Akun
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                          title="Edit User"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenResetPassword(u)}
                          className="p-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition"
                          title="Reset Kata Sandi Akun"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        {u.username !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                            title="Hapus User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Akun Petugas */}
      {modalOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                {editingUser ? 'Perbarui Data Akun Petugas' : 'Daftarkan Akun Petugas Baru'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 my-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username Login *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: ppl_iissugiarti"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        username: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  {/* Pilihan Rekomendasi Username */}
                  {formData.name && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400">Rekomendasi:</span>
                      {generateRecommendedUsernames(formData.name, formData.role).map((rec) => (
                        <button
                          key={rec}
                          type="button"
                          onClick={() => setFormData({ ...formData, username: rec })}
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border transition ${
                            formData.username === rec
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {rec}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jabatan / Peran (Role) *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ADMIN_DINAS">Admin Kecamatan Lembeyan</option>
                    <option value="PPL">Penyuluh Lapangan (PPL)</option>
                    <option value="POKTAN">Pengurus Kelompok Tani (Poktan)</option>
                    <option value="KIOS">Petugas Kios Resmi (KPL)</option>
                    <option value="PETANI">Petani Terdaftar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ir. Hendra Kusuma, S.P"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIP / Nomor Registrasi Jabatan</label>
                  <input
                    type="text"
                    placeholder="Contoh: NIP. 19850412 201101 2 008"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Wilayah Kerja / BPP / Desa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: BPP Kec. Lembeyan"
                    value={formData.wilayah}
                    onChange={(e) => setFormData({ ...formData, wilayah: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Kios KPL (Khusus Kios)</label>
                  <input
                    type="text"
                    placeholder="Contoh: UD. Tani Subur Barokah"
                    value={formData.kiosName}
                    onChange={(e) => setFormData({ ...formData, kiosName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kata Sandi (Password) {!editingUser && '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={
                        editingUser
                          ? 'Kosongkan jika sandi tetap'
                          : 'Kata sandi login (default: 123456)'
                      }
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 pr-9 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {!editingUser && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Default: <span className="font-mono font-bold text-slate-600">123456</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="08xxxxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alamat Email Dinas</label>
                <input
                  type="email"
                  placeholder="nama@pertanian.go.id"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition"
                >
                  {submitting ? 'Menyimpan...' : editingUser ? 'Simpan Perubahan' : 'Buat Akun Petugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Khusus Reset Kata Sandi Petugas */}
      {resetModalOpen && resetTargetUser && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                Reset Kata Sandi Petugas
              </h3>
              <button
                onClick={() => setResetModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="space-y-4 my-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80">
                <p className="font-bold text-amber-950 text-sm">{resetTargetUser.name}</p>
                <p className="text-amber-800 font-mono text-[11px] mt-0.5">
                  @{resetTargetUser.username} • {resetTargetUser.role}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Masukkan Kata Sandi Baru *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-slate-400">Pilihan Cepat:</span>
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput('123456')}
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    Default: 123456
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md transition"
                >
                  {resetSubmitting ? 'Memproses...' : 'Simpan Sandi Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
