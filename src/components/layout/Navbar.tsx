'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, ROLE_PERMISSIONS, DEMO_USERS, UserRole } from '@/lib/auth-context';
import {
  Map,
  Sprout,
  FileText,
  Users,
  ShoppingBag,
  BarChart3,
  Menu,
  X,
  ShieldCheck,
  ChevronDown,
  LogOut,
  KeyRound,
  UserCog,
  Code2,
  QrCode,
  Lock,
  UserCircle,
  Bell,
  History,
  CheckCircle2,
  AlertTriangle,
  ShoppingCart,
  Truck,
  Calculator,
  Sliders,
  Settings,
  Wallet,
  Building2,
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  dashboard: BarChart3,
  peta: Map,
  pengajuan: FileText,
  petani: Users,
  penyaluran: Sprout,
  kios: ShoppingBag,
  laporan: FileText,
  'cek-kuota': QrCode,
  users: UserCog,
  'kasir-poktan': ShoppingCart,
  distribusi: Truck,
  'alokasi-poktan': Calculator,
  'buku-kas': Wallet,
  'kepala-desa': Building2,
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, permissions, isMounted, setRole, logoutUser, availableRoles } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'alerts' | 'audit'>('alerts');
  const [notifData, setNotifData] = useState<{
    counts: { menungguPplCount: number; menungguDinasCount: number; disetujuiCount: number; totalUnread: number };
    alerts: any[];
    auditLogs: any[];
  }>({
    counts: { menungguPplCount: 0, menungguDinasCount: 0, disetujuiCount: 0, totalUnread: 0 },
    alerts: [],
    auditLogs: [],
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Ref untuk mendeteksi klik di luar dropdown profil & notifikasi
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownBtnRef = useRef<HTMLButtonElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifBtnRef = useRef<HTMLButtonElement>(null);

  // Otomatis sembunyikan dropdown saat klik di sembarang tempat atau tekan tombol ESC
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        (!dropdownBtnRef.current || !dropdownBtnRef.current.contains(event.target as Node))
      ) {
        setDropdownOpen(false);
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node) &&
        (!notifBtnRef.current || !notifBtnRef.current.contains(event.target as Node))
      ) {
        setNotifOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setNotifOpen(false);
      }
    }

    if (dropdownOpen || notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen, notifOpen]);

  // Otomatis tutup dropdown saat berpindah halaman
  useEffect(() => {
    setDropdownOpen(false);
    setNotifOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname === '/login') return;
    fetch('/api/notifikasi')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setNotifData({
            counts: json.counts,
            alerts: json.alerts || [],
            auditLogs: json.auditLogs || [],
          });
        }
      })
      .catch(() => {});
  }, [pathname]);

  // Sembunyikan Navbar pada halaman portal Login dan Mode Lapangan (Field Maps PWA)
  if (pathname === '/login' || pathname === '/field-maps' || pathname?.startsWith('/field-maps')) {
    return null;
  }

  // Gunakan currentUser langsung (diinisialisasi sinkron dari sesi/cache) agar bebas lag & bebas hydration flicker
  const activeUser = currentUser;
  const activePermissions = permissions;
  const visibleNavItems = activePermissions.menuItems;

  const handleLogout = () => {
    setDropdownOpen(false);
    logoutUser();
    router.push('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs no-print">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
          {/* Logo Brand */}
          <div className="flex items-center shrink-0 min-w-0">
            <Link href={activeUser.role === 'PETANI' ? '/cek-kuota' : '/dashboard'} className="flex items-center gap-2 sm:gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform shrink-0">
                <Sprout className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black tracking-tight text-slate-900 whitespace-nowrap">
                    SISTEM INFORMASI PERTANIAN
                  </span>
                  <span className="hidden 2xl:inline-block text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 whitespace-nowrap border border-emerald-200">
                    {activeUser.role === 'PPL'
                      ? 'MODUL BPP'
                      : activeUser.role === 'POKTAN'
                      ? 'MODUL POKTAN'
                      : activeUser.role === 'KIOS'
                      ? 'MODUL KPL'
                      : activeUser.role === 'PETANI'
                      ? 'PORTAL PETANI'
                      : 'ADMIN KECAMATAN'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap truncate">
                  Kecamatan Lembeyan Kabupaten Magetan
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links (Strictly Isolated per Role Group) */}
          <nav className="hidden lg:flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar bg-slate-100/80 p-1 rounded-2xl border border-slate-200/70">
            {visibleNavItems.map((item) => {
              const Icon = ICON_MAP[item.iconName] || FileText;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 hover:text-emerald-700 hover:bg-white'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-amber-300' : 'text-emerald-600'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Side: Notification Bell + User Profile Badge & Mobile Menu Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Lonceng Notifikasi Real-time & Audit Trail Inspektorat */}
            <div className="relative">
              <button
                ref={notifBtnRef}
                type="button"
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setDropdownOpen(false);
                }}
                title="Pusat Notifikasi & Log Audit Aktivitas"
                className="relative p-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition shadow-2xs cursor-pointer"
              >
                <Bell className="w-4 h-4 text-emerald-700" />
                {notifData.counts.totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center border border-white shadow-2xs">
                    {notifData.counts.totalUnread}
                  </span>
                )}
              </button>

              {notifOpen && isMounted && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center sm:items-start sm:justify-end sm:pt-20 sm:pr-8 p-3 pointer-events-auto no-print">
                  {/* Backdrop Overlay */}
                  <div
                    className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
                    onClick={() => setNotifOpen(false)}
                  />

                  {/* Notification Dropdown Container */}
                  <div
                    ref={notifRef}
                    className="relative z-10 w-full max-w-[360px] sm:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="p-3 bg-emerald-950 text-white flex items-center justify-between shrink-0">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-black flex items-center gap-1.5 truncate">
                          <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Notifikasi & Log Audit</span>
                        </p>
                        <p className="text-[10px] text-emerald-300 truncate">
                          e-RDKK, Gudang Kios & Jejak Aktivitas
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-900/50 transition cursor-pointer shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Tab Switcher Alerts vs Audit Log */}
                    <div className="grid grid-cols-2 bg-slate-100 p-1 border-b border-slate-200 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setNotifTab('alerts')}
                        className={`py-1.5 px-1 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 truncate ${
                          notifTab === 'alerts'
                            ? 'bg-white text-emerald-800 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">Notif ({notifData.alerts.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifTab('audit')}
                        className={`py-1.5 px-1 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 truncate ${
                          notifTab === 'audit'
                            ? 'bg-white text-emerald-800 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <History className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">Audit Trail ({notifData.auditLogs.length})</span>
                      </button>
                    </div>

                    <div className="flex-1 max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifTab === 'alerts' ? (
                        notifData.alerts.map((al) => (
                          <Link
                            key={al.id}
                            href={al.href}
                            onClick={() => setNotifOpen(false)}
                            className="block p-3 hover:bg-slate-50 transition"
                          >
                            <div className="flex items-start gap-2.5">
                              <span
                                className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                                  al.severity === 'warning'
                                    ? 'bg-amber-500'
                                    : al.severity === 'success'
                                    ? 'bg-emerald-500'
                                    : 'bg-blue-500'
                                }`}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-800 leading-snug">{al.title}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{al.message}</p>
                              </div>
                            </div>
                          </Link>
                        ))
                      ) : (
                        notifData.auditLogs.map((log) => (
                          <Link
                            key={log.id}
                            href={log.href}
                            onClick={() => setNotifOpen(false)}
                            className="block p-3 hover:bg-slate-50 transition"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                              <span className="font-bold text-emerald-700 uppercase">{log.category}</span>
                              <span>
                                {new Date(log.timestamp).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-800">{log.action}</p>
                            <p className="text-[11px] text-slate-600 truncate">{log.detail}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Oleh: <strong className="text-slate-700">{log.actor}</strong>
                            </p>
                          </Link>
                        ))
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] shrink-0">
                      <Link
                        href="/cetak-erdkk"
                        onClick={() => setNotifOpen(false)}
                        className="font-bold text-emerald-700 hover:underline truncate"
                      >
                        Cetak SK & Lampiran &rarr;
                      </Link>
                      <Link
                        href="/laporan"
                        onClick={() => setNotifOpen(false)}
                        className="font-bold text-slate-600 hover:text-slate-900 shrink-0"
                      >
                        Buka Laporan
                      </Link>
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>

            <div className="relative">
              <button
                ref={dropdownBtnRef}
                onClick={() => {
                  setDropdownOpen(!dropdownOpen);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 p-1 sm:p-1.5 sm:pr-2.5 rounded-full hover:bg-slate-100 transition border border-slate-200 shadow-2xs bg-white cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                  {activeUser.avatarUrl ? (
                    <img src={activeUser.avatarUrl} alt={activeUser.name} className="w-full h-full object-cover" />
                  ) : (
                    activeUser.avatarText
                  )}
                </div>
                <div className="text-left hidden md:block max-w-[130px] xl:max-w-[150px]">
                  <div className="text-xs font-bold text-slate-800 leading-tight truncate">
                    {activeUser.name}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-bold leading-tight truncate">
                    {activeUser.roleLabel}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
              </button>

              {dropdownOpen && isMounted && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 px-3 sm:px-6 pointer-events-auto no-print">
                  {/* Backdrop Overlay */}
                  <div
                    className="fixed inset-0 bg-slate-950/40 backdrop-blur-2xs transition-opacity"
                    onClick={() => setDropdownOpen(false)}
                  />

                  {/* Modal Container */}
                  <div
                    ref={dropdownRef}
                    className="relative z-10 w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2.5 overflow-hidden flex flex-col max-h-[calc(100vh-5.5rem)] animate-in fade-in zoom-in-95 duration-150 sm:mr-4 md:mr-10 lg:mr-16 sm:self-start sm:ml-auto"
                  >
                  <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-emerald-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs overflow-hidden border-2 border-emerald-100">
                      {activeUser.avatarUrl ? (
                        <img src={activeUser.avatarUrl} alt={activeUser.name} className="w-full h-full object-cover" />
                      ) : (
                        activeUser.avatarText
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-bold uppercase text-emerald-700 bg-emerald-50 inline-block px-2 py-0.5 rounded mb-0.5 border border-emerald-200">
                        {activePermissions.groupName}
                      </p>
                      <p className="text-sm font-black text-slate-800 truncate">{activeUser.name}</p>
                      <p className="text-xs text-emerald-600 font-bold truncate">{activeUser.roleLabel}</p>
                      <p className="text-[11px] text-slate-400 truncate">{activeUser.wilayah}</p>
                    </div>
                  </div>

                  {/* Menu Utama: Profil Saya, Foto Profil & Ganti Password */}
                  <div className="py-2 px-2 border-b border-slate-100 space-y-1">
                    <p className="px-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Pengaturan Profil & Akun Anda:
                    </p>
                    <Link
                      href="/profil?tab=BIODATA"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800 transition group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition">
                        <UserCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="leading-tight">Foto Profil & Biodata Jabatan</div>
                        <div className="text-[10px] text-slate-400 font-normal">Ubah foto identitas, nama, WA & email</div>
                      </div>
                    </Link>

                    <Link
                      href="/profil?tab=KEAMANAN"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-amber-50 hover:text-amber-800 transition group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="leading-tight">Ganti Kata Sandi (Password)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Perbarui keamanan sandi akun Anda</div>
                      </div>
                    </Link>

                    {activeUser.role !== 'PETANI' && (
                      <>
                        <Link
                          href="/profil?tab=RBAC"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-purple-50 hover:text-purple-800 transition group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition">
                            <Lock className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="leading-tight">Rincian Hak Akses Saya (RBAC)</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {activeUser.role === 'ADMIN_DINAS'
                                ? 'Akses Superadmin: Dapat mencentang RBAC'
                                : 'Lihat wewenang jabatan (Hanya Admin dapat ubah)'}
                            </div>
                          </div>
                        </Link>

                        <Link
                          href="/pengaturan"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800 transition group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition">
                            <Sliders className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="leading-tight">Pengaturan & Parameter Sistem</div>
                            <div className="text-[10px] text-slate-400 font-normal">HET pupuk, instansi BPP, GIS & backup</div>
                          </div>
                        </Link>

                        <Link
                          href="/field-maps"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-900 bg-emerald-50/60 hover:bg-emerald-100 transition group border border-emerald-200/60"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Map className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="leading-tight font-black">Mode Field Maps Smartphone (PWA)</div>
                            <div className="text-[10px] text-emerald-700 font-normal">Tampilan layar penuh khusus survei & GPS sawah</div>
                          </div>
                        </Link>
                      </>
                    )}

                    {activeUser.role === 'PETANI' && (
                      <Link
                        href="/cek-kuota"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 transition group border border-emerald-200/60"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <QrCode className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="leading-tight font-black">Kartu Tani Digital & Kuota Saya</div>
                          <div className="text-[10px] text-emerald-700 font-normal">Cek jatah pupuk subsidi & jadwal tanam</div>
                        </div>
                      </Link>
                    )}
                  </div>

                  {/* Daftar Menu Khusus Jabatan Ini */}
                  <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Hak Akses Modul Anda ({visibleNavItems.length} Halaman):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {visibleNavItems.map((m) => (
                        <Link
                          key={m.href}
                          href={m.href}
                          onClick={() => setDropdownOpen(false)}
                          className="text-[10px] font-bold bg-white hover:bg-emerald-600 text-emerald-800 hover:text-white px-2 py-0.5 rounded border border-slate-200 transition"
                        >
                          {m.label}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="pt-1.5 px-2 flex flex-col gap-1">
                    {permissions.canManageUsers && (
                      <Link
                        href="/users"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition"
                      >
                        <UserCog className="w-4 h-4 text-purple-600" />
                        Manajemen User & Centang Matriks RBAC
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Keluar / Ganti Akun di Portal Login
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
            {/* Mobile Menu Button */}
            <div className="flex lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-100 px-4 pt-3 pb-5 space-y-2 shadow-lg">
          <div className="pb-2 mb-2 border-b border-slate-100">
            <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {permissions.groupName} ({visibleNavItems.length} Menu)
            </span>
          </div>
          {visibleNavItems.map((item) => {
            const Icon = ICON_MAP[item.iconName] || FileText;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-slate-100">
            <Link
              href="/profil"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
            >
              <UserCircle className="w-4 h-4 text-emerald-600" />
              <span>Profil Saya & Ganti Password</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
