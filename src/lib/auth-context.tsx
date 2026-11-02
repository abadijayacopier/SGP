'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'ADMIN_DINAS' | 'PPL' | 'POKTAN' | 'KIOS' | 'PETANI' | 'SURVEYOR';

export interface UserSession {
  id?: string;
  username: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  wilayah: string;
  badgeColor: string;
  avatarText: string;
  avatarUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  nip?: string | null;
  nik?: string | null;
  signatureUrl?: string | null;
  stampUrl?: string | null;
  /** Cakupan data: ID petani milik akun (khusus PETANI) */
  petaniId?: string | null;
  /** Cakupan data: ID Poktan milik akun (POKTAN & PETANI) */
  poktanId?: string | null;
  /** Cakupan data: Nama kios milik akun (khusus KIOS) */
  kiosName?: string | null;
}

export interface RoleMenuItem {
  label: string;
  href: string;
  iconName:
    | 'dashboard'
    | 'peta'
    | 'pengajuan'
    | 'petani'
    | 'penyaluran'
    | 'kios'
    | 'laporan'
    | 'cek-kuota'
    | 'users'
    | 'kasir-poktan'
    | 'distribusi'
    | 'alokasi-poktan'
    | 'buku-kas'
    | 'kepala-desa';
}

export const ROLE_PERMISSIONS: Record<
  UserRole,
  {
    label: string;
    groupName: string;
    themeColor: string;
    description: string;
    defaultPath: string;
    allowedPaths: string[];
    menuItems: RoleMenuItem[];
    canApproveDinas: boolean;
    canVerifyPpl: boolean;
    canSubmitPengajuan: boolean;
    canManageUsers: boolean;
    canManageKios: boolean;
    canDigitasiGis: boolean;
    canDistributePupuk: boolean;
  }
> = {
  ADMIN_DINAS: {
    label: 'Admin Kecamatan Lembeyan',
    groupName: 'Eksekutif & Superadmin Kecamatan',
    themeColor: 'purple',
    description:
      'Otoritas tertinggi tingkat Kecamatan Lembeyan: pengesahan SK kuota e-RDKK, pengawasan lintas modul, dan manajemen akun petugas.',
    defaultPath: '/dashboard',
    allowedPaths: [
      '/dashboard',
      '/pengajuan',
      '/petani',
      '/peta',
      '/penyaluran',
      '/kios',
      '/laporan',
      '/cek-kuota',
      '/users',
      '/profil',
      '/cetak-erdkk',
      '/cetak-kalender-tanam',
      '/kasir-poktan',
      '/distribusi',
      '/alokasi-poktan',
      '/pengaturan',
      '/field-maps',
      '/buku-kas-poktan',
      '/cetak-f6',
      '/verifikasi',
      '/kepala-desa',
    ],
    menuItems: [
      { label: 'Dashboard', href: '/dashboard', iconName: 'dashboard' },
      { label: 'Kuota e-RDKK', href: '/pengajuan', iconName: 'pengajuan' },
      { label: 'Kasir Poktan', href: '/kasir-poktan', iconName: 'kasir-poktan' },
      { label: 'Distribusi Kios', href: '/distribusi', iconName: 'distribusi' },
      { label: 'Alokasi e-RDKK', href: '/alokasi-poktan', iconName: 'alokasi-poktan' },
      { label: 'Petani & Poktan', href: '/petani', iconName: 'petani' },
      { label: 'Peta GIS', href: '/peta', iconName: 'peta' },
      { label: 'Laporan', href: '/laporan', iconName: 'laporan' },
      { label: 'User & RBAC', href: '/users', iconName: 'users' },
    ],
    canApproveDinas: true,
    canVerifyPpl: true,
    canSubmitPengajuan: true,
    canManageUsers: true,
    canManageKios: true,
    canDigitasiGis: true,
    canDistributePupuk: false,
  },
  PPL: {
    label: 'Penyuluh Lapangan (BPP Lembeyan)',
    groupName: 'Tim Verifikasi & Spasial BPP',
    themeColor: 'blue',
    description:
      'Khusus petugas BPP Kecamatan Lembeyan: hanya mengakses pemetaan poligon GIS, verifikasi berkas lapangan PPL, dan laporan teknis BPP.',
    defaultPath: '/dashboard',
    allowedPaths: [
      '/dashboard',
      '/peta',
      '/pengajuan',
      '/laporan',
      '/profil',
      '/cetak-erdkk',
      '/cetak-kalender-tanam',
      '/alokasi-poktan',
      '/distribusi',
      '/pengaturan',
      '/field-maps',
      '/buku-kas-poktan',
      '/cetak-f6',
      '/verifikasi',
      '/kepala-desa',
    ],
    menuItems: [
      { label: 'Workspace BPP', href: '/dashboard', iconName: 'dashboard' },
      { label: 'Digitasi Peta GIS', href: '/peta', iconName: 'peta' },
      { label: 'Verifikasi Lapangan PPL', href: '/pengajuan', iconName: 'pengajuan' },
      { label: 'Alokasi e-RDKK', href: '/alokasi-poktan', iconName: 'alokasi-poktan' },
      { label: 'Distribusi Kios', href: '/distribusi', iconName: 'distribusi' },
      { label: 'Laporan Teknis BPP', href: '/laporan', iconName: 'laporan' },
    ],
    canApproveDinas: false,
    canVerifyPpl: true,
    canSubmitPengajuan: true,
    canManageUsers: false,
    canManageKios: false,
    canDigitasiGis: true,
    canDistributePupuk: false,
  },
  POKTAN: {
    label: 'Ketua / Pengurus Poktan',
    groupName: 'Kelembagaan Kelompok Tani Desa',
    themeColor: 'emerald',
    description:
      'Khusus pengurus Poktan Desa: kasir penebusan pupuk petani, penerimaan distribusi dari kios, pengaturan alokasi e-RDKK, dan pendataan anggota.',
    defaultPath: '/dashboard',
    allowedPaths: [
      '/dashboard',
      '/kasir-poktan',
      '/distribusi',
      '/alokasi-poktan',
      '/petani',
      '/pengajuan',
      '/profil',
      '/cetak-erdkk',
      '/cetak-kalender-tanam',
      '/buku-kas-poktan',
      '/kepala-desa',
    ],
    menuItems: [
      { label: 'Workspace Poktan', href: '/dashboard', iconName: 'dashboard' },
      { label: 'Kasir Poktan', href: '/kasir-poktan', iconName: 'kasir-poktan' },
      { label: 'Buku Kas Poktan', href: '/buku-kas-poktan', iconName: 'buku-kas' },
      { label: 'Distribusi Kios', href: '/distribusi', iconName: 'distribusi' },
      { label: 'Alokasi e-RDKK', href: '/alokasi-poktan', iconName: 'alokasi-poktan' },
      { label: 'Anggota & Poktan', href: '/petani', iconName: 'petani' },
      { label: 'Input Usulan e-RDKK', href: '/pengajuan', iconName: 'pengajuan' },
    ],
    canApproveDinas: false,
    canVerifyPpl: false,
    canSubmitPengajuan: true,
    canManageUsers: false,
    canManageKios: false,
    canDigitasiGis: false,
    canDistributePupuk: false,
  },
  KIOS: {
    label: 'Petugas Kios Resmi (KPL)',
    groupName: 'Kasir & Gudang Kios Pupuk (KPL)',
    themeColor: 'amber',
    description:
      'Khusus petugas Kios KPL Kecamatan Lembeyan: hanya mengakses kasir penebusan pupuk, pengiriman distribusi ke Poktan (Surat Jalan DO), dan gudang stok Kios.',
    defaultPath: '/dashboard',
    allowedPaths: [
      '/dashboard',
      '/penyaluran',
      '/distribusi',
      '/kios',
      '/profil',
      '/cetak-erdkk',
      '/cetak-kalender-tanam',
      '/cetak-f6',
      '/verifikasi',
    ],
    menuItems: [
      { label: 'Workspace Kios KPL', href: '/dashboard', iconName: 'dashboard' },
      { label: 'Kasir Penebusan Pupuk', href: '/penyaluran', iconName: 'penyaluran' },
      { label: 'Distribusi ke Poktan', href: '/distribusi', iconName: 'distribusi' },
      { label: 'Gudang Stok DO KPL', href: '/kios', iconName: 'kios' },
    ],
    canApproveDinas: false,
    canVerifyPpl: false,
    canSubmitPengajuan: false,
    canManageUsers: false,
    canManageKios: true,
    canDigitasiGis: false,
    canDistributePupuk: true,
  },
  PETANI: {
    label: 'Petani Terdaftar e-RDKK',
    groupName: 'Portal Mandiri Petani',
    themeColor: 'teal',
    description:
      'Khusus petani terdaftar: hanya melihat kuota pupuk milik sendiri, jadwal dosis pemupukan, peta sawah sendiri, dan mencetak Kartu Tani Digital / Kartu Lahan.',
    defaultPath: '/cek-kuota',
    allowedPaths: ['/cek-kuota', '/peta', '/cetak-erdkk', '/cetak-kalender-tanam'],
    menuItems: [
      { label: 'Cek Kuota & Kartu Tani', href: '/cek-kuota', iconName: 'cek-kuota' },
      { label: 'Peta Lahan Saya', href: '/peta', iconName: 'peta' },
    ],
    canApproveDinas: false,
    canVerifyPpl: false,
    canSubmitPengajuan: false,
    canManageUsers: false,
    canManageKios: false,
    canDigitasiGis: false,
    canDistributePupuk: false,
  },
  SURVEYOR: {
    label: 'Petugas Surveyor Lapangan (Field Maps)',
    groupName: 'Tim Geodesi & Pemetaan Spasial BPP',
    themeColor: 'emerald',
    description:
      'Khusus Petugas Pemetaan / Surveyor: antarmuka layar penuh smartphone (ArcGIS Field Maps style), rekam patok sawah via GPS, dan sinkronisasi antrean offline.',
    defaultPath: '/field-maps',
    allowedPaths: ['/field-maps', '/peta', '/profil'],
    menuItems: [
      { label: 'Field Maps GPS Sawah', href: '/field-maps', iconName: 'peta' },
      { label: 'Peta GIS Desktop', href: '/peta', iconName: 'peta' },
    ],
    canApproveDinas: false,
    canVerifyPpl: false,
    canSubmitPengajuan: false,
    canManageUsers: false,
    canManageKios: false,
    canDigitasiGis: true,
    canDistributePupuk: false,
  },
};

export const DEMO_USERS: Record<UserRole, UserSession> = {
  ADMIN_DINAS: {
    username: 'admin',
    name: 'MANTRI TANI',
    role: 'ADMIN_DINAS',
    roleLabel: 'Admin Kecamatan Lembeyan',
    wilayah: 'Pemerintah Kecamatan Lembeyan',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    avatarText: 'AD',
  },
  PPL: {
    username: 'ppl_iissugiarti',
    name: 'Iis Sugiarti, S.P',
    role: 'PPL',
    roleLabel: 'Penyuluh Lapangan (BPP Lembeyan)',
    wilayah: 'BPP Kecamatan Lembeyan',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    avatarText: 'PL',
  },
  SURVEYOR: {
    username: 'surveyor_bpp',
    name: 'Budi Santoso (Surveyor BPP)',
    role: 'SURVEYOR',
    roleLabel: 'Petugas Surveyor Lapangan',
    wilayah: 'Unit Pemetaan BPP Lembeyan',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    avatarText: 'SV',
  },
  POKTAN: {
    username: 'poktan_suparman',
    name: 'H. Suparman',
    role: 'POKTAN',
    roleLabel: 'Ketua Poktan Tani Makmur I',
    wilayah: 'Desa Kediren, Kec. Lembeyan',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    avatarText: 'PK',
  },
  KIOS: {
    username: 'kios_subur',
    name: 'Hj. Siti Romlah',
    role: 'KIOS',
    roleLabel: 'Petugas Kios Resmi (KPL)',
    wilayah: 'Kios Resmi Kec. Lembeyan',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    avatarText: 'KP',
    kiosName: 'UD. Tani Subur Barokah',
  },
  PETANI: {
    username: 'petani_sukirno',
    name: 'Sukirno',
    role: 'PETANI',
    roleLabel: 'Petani Terdaftar e-RDKK',
    wilayah: 'Poktan Tani Makmur I - Kediren, Lembeyan',
    badgeColor: 'bg-green-100 text-green-800 border-green-300',
    avatarText: 'PT',
    nik: '3509012304750001',
    nip: 'NIK: 3509012304750001',
    petaniId: 'cmvxfxr000009t0nc7z587tuy',
  },
};

interface AuthContextType {
  currentUser: UserSession;
  isMounted: boolean;
  isAuthenticated: boolean;
  setRole: (role: UserRole) => Promise<void> | void;
  loginUser: (session: UserSession) => void;
  updateCurrentUser: (updates: Partial<UserSession>) => void;
  logoutUser: () => void;
  availableRoles: UserSession[];
  permissions: (typeof ROLE_PERMISSIONS)[UserRole];
}

/** Ambil sesi lengkap (termasuk cakupan data petaniId/poktanId/kiosName) dari server */
async function fetchSession(username: string): Promise<UserSession | null> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: '123456', skip2FA: true }),
    });
    const json = await res.json();
    return json.success ? (json.data as UserSession) : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextType>({
  currentUser: DEMO_USERS.ADMIN_DINAS,
  isMounted: false,
  isAuthenticated: false,
  setRole: () => {},
  loginUser: () => {},
  updateCurrentUser: () => {},
  logoutUser: () => {},
  availableRoles: Object.values(DEMO_USERS),
  permissions: ROLE_PERMISSIONS.ADMIN_DINAS,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserSession>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedSession = localStorage.getItem('pertanian_user_session');
        if (savedSession) {
          const parsed = JSON.parse(savedSession) as UserSession;
          if (parsed && parsed.role && ROLE_PERMISSIONS[parsed.role]) {
            if (parsed.roleLabel === 'Admin Dinas Pertanian') {
              parsed.roleLabel = 'Admin Kecamatan Lembeyan';
            }
            if (parsed.username === 'ppl_sugeng' || parsed.username === 'ppl_lembeyan') {
              parsed.username = 'ppl_iissugiarti';
            }
            if (parsed.username === 'kios_subur') {
              parsed.username = 'kios_bumisubur';
            }
            return parsed;
          }
        }
      } catch {}
    }
    return DEMO_USERS.ADMIN_DINAS;
  });
  const [customMatrix, setCustomMatrix] = useState<Record<UserRole, any> | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedMatrix = localStorage.getItem('pertanian_custom_rbac_matrix');
      if (savedMatrix) {
        setCustomMatrix(JSON.parse(savedMatrix));
      }

      const savedSession = localStorage.getItem('pertanian_user_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession) as UserSession;
        if (parsed && parsed.role && ROLE_PERMISSIONS[parsed.role]) {
          // Segarkan label lama "Admin Dinas Pertanian" atau username PPL lama jika masih tersimpan di cache browser
          if (parsed.roleLabel === 'Admin Dinas Pertanian') {
            parsed.roleLabel = 'Admin Kecamatan Lembeyan';
          }
          if (parsed.username === 'ppl_sugeng' || parsed.username === 'ppl_lembeyan') {
            parsed.username = 'ppl_iissugiarti';
          }
          if (parsed.username === 'kios_subur') {
            parsed.username = 'kios_bumisubur';
          }
          setCurrentUser(parsed);
          setIsAuthenticated(true);
          // Selalu segarkan sesi dari database agar nama, foto profil, dan scope selalu mutakhir (kecuali PETANI yang diautentikasi via NIK)
          if (parsed.username && parsed.role !== 'PETANI') {
            fetchSession(parsed.username).then((s) => s && persist(s));
          }
          return;
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.error(e);
      setIsAuthenticated(false);
    }
  }, []);

  const persist = (session: UserSession) => {
    setCurrentUser(session);
    setIsAuthenticated(true);
    localStorage.setItem('pertanian_role', session.role);
    localStorage.setItem('pertanian_user_session', JSON.stringify(session));
  };

  const handleSetRole = async (role: UserRole) => {
    // Ambil sesi lengkap (beserta petaniId/poktanId) dari server agar data terisolasi
    const fallback = DEMO_USERS[role];
    persist(fallback);
    const session = await fetchSession(fallback.username);
    if (session) persist(session);
  };

  const handleLoginUser = (session: UserSession) => {
    persist(session);
  };

  const handleUpdateCurrentUser = (updates: Partial<UserSession>) => {
    setCurrentUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('pertanian_user_session', JSON.stringify(updated));
      return updated;
    });
  };

  const handleLogoutUser = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('pertanian_user_session');
    localStorage.removeItem('pertanian_role');
    setCurrentUser(DEMO_USERS.ADMIN_DINAS);
  };

  const basePerm = ROLE_PERMISSIONS[currentUser.role] || ROLE_PERMISSIONS.ADMIN_DINAS;
  const overridePerm = customMatrix?.[currentUser.role] || {};
  const currentPermissions = {
    ...basePerm,
    ...overridePerm,
    menuItems: basePerm.menuItems,
    allowedPaths: basePerm.allowedPaths,
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isMounted,
        isAuthenticated,
        setRole: handleSetRole,
        loginUser: handleLoginUser,
        updateCurrentUser: handleUpdateCurrentUser,
        logoutUser: handleLogoutUser,
        availableRoles: Object.values(DEMO_USERS),
        permissions: currentPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
