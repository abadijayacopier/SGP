'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Settings,
  Building,
  Wheat,
  MapPin,
  FileText,
  Cloud,
  Database,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Layers,
  Printer,
  Calendar,
  Lock,
  Download,
  Upload,
  Info,
  DollarSign,
  HelpCircle,
  ShieldCheck,
  Send,
  Sparkles,
} from 'lucide-react';
import { showSuccess, showError, showConfirm } from '@/lib/sweetalert';
import { formatRupiah } from '@/lib/calculations';

type SettingsTab = 'INSTANSI' | 'PUPUK' | 'GIS' | 'DOKUMEN' | 'INTEGRASI' | 'BACKUP';

export default function PengaturanPage() {
  const { currentUser, permissions } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('INSTANSI');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State Pengaturan Sistem
  const [settings, setSettings] = useState<any>({
    instansi: {
      namaInstansi: 'Pemerintah Kecamatan Lembeyan - BPP Kecamatan Lembeyan',
      kabupaten: 'Magetan',
      provinsi: 'Jawa Timur',
      alamatKantor: 'Jl. Raya Lembeyan No. 45, Kecamatan Lembeyan, Kabupaten Magetan',
      telepon: '(0351) 891234',
      whatsappLayanan: '0812-3456-7890',
      emailResmi: 'bpp.lembeyan@magetan.go.id',
      websiteResmi: 'https://pertanian.magetan.go.id',
      tahunAnggaran: 2026,
      musimTanamAktif: 'MT 1',
      pengembang: 'Supriyanto Abadi Jaya',
    },
    pupuk: {
      hetUreaPerKg: 2250,
      hetNpkPerKg: 2300,
      hetOrganikPerKg: 800,
      kgPerSakUrea: 50,
      kgPerSakNpk: 50,
      kgPerSakOrganik: 40,
      rasioMaksUreaPerHa: 250,
      rasioMaksNpkPerHa: 200,
      rasioMaksOrganikPerHa: 500,
    },
    gis: {
      defaultCenterLat: -7.7685,
      defaultCenterLng: 111.4225,
      defaultZoom: 14,
      defaultTileLayer: 'GOOGLE_HYBRID',
      gpsWalkThresholdMeters: 3,
      overlapWarningStrict: true,
    },
    dokumen: {
      prefixNotaKasir: 'NOTA-POKTAN/{TAHUN}/{NO}',
      prefixSuratJalan: 'SJ-DIST/{TAHUN}/{NO}',
      prefixKartuTani: 'KT-3509-{TAHUN}-{NIK}',
      prefixSuratLahan: 'LHN-{TAHUN}-{NO}',
      namaKoordinatorBpp: 'Iis Sugiarti, S.P',
      nipKoordinatorBpp: '19850412 201101 2 008',
      namaMantriTani: 'Supriyanto (Admin Kecamatan)',
      nipMantriTani: '19760814 200212 1 002',
    },
    integrasi: {
      googleSheetWebhookUrl: 'https://script.google.com/macros/s/AKfycbx_example/exec',
      autoSyncOnTransaction: true,
      autoSyncTime: '18:00',
      kementanApiKey: '',
    },
    notifikasi: {
      alertStokMenipisPersen: 20,
      peringatanBatasTebusHari: 7,
      notifikasiPengajuanBaru: true,
    },
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pengaturan');
      const json = await res.json();
      if (json.success && json.data) {
        setSettings(json.data);
      }
    } catch (e: any) {
      console.error('Gagal memuat pengaturan:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/pengaturan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        showSuccess('Pengaturan Disimpan', 'Parameter sistem berhasil diperbarui secara permanen!');
        setSettings(json.data);
      } else {
        showError('Gagal Menyimpan', json.error || 'Terjadi kesalahan saat menyimpan pengaturan.');
      }
    } catch (err: any) {
      showError('Kesalahan Jaringan', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Kalkulasi HET per sak berdasarkan input
  const hargaSakUrea = (settings.pupuk?.hetUreaPerKg || 0) * (settings.pupuk?.kgPerSakUrea || 50);
  const hargaSakNpk = (settings.pupuk?.hetNpkPerKg || 0) * (settings.pupuk?.kgPerSakNpk || 50);
  const hargaSakOrganik = (settings.pupuk?.hetOrganikPerKg || 0) * (settings.pupuk?.kgPerSakOrganik || 40);

  const currentYear = settings.instansi?.tahunAnggaran || 2026;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header Halaman */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 text-white flex items-center justify-center shadow-md shrink-0">
            <Settings className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                Pusat Kendali Konfigurasi
              </span>
              <span className="text-[10px] font-mono text-slate-400">Versi 2.0.0</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Pengaturan & Parameter Sistem
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Kelola identitas instansi BPP, HET pupuk bersubsidi, GIS spasial, format dokumen, dan cadangan data.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchSettings}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || loading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </div>

      {/* Tab Navigasi Pengaturan */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-200/70 rounded-2xl border border-slate-300/80 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('INSTANSI')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer shrink-0 ${
            activeTab === 'INSTANSI'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Building className="w-4 h-4 text-emerald-600" />
          <span>Instansi & Periode</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PUPUK')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer shrink-0 ${
            activeTab === 'PUPUK'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Wheat className="w-4 h-4 text-amber-600" />
          <span>HET & Bobot Pupuk</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GIS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer shrink-0 ${
            activeTab === 'GIS'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <MapPin className="w-4 h-4 text-emerald-600" />
          <span>Peta GIS & GPS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DOKUMEN')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer shrink-0 ${
            activeTab === 'DOKUMEN'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-600" />
          <span>Format Dokumen & SK</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INTEGRASI')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer shrink-0 ${
            activeTab === 'INTEGRASI'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Cloud className="w-4 h-4 text-blue-600" />
          <span>Cloud & Webhook</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BACKUP')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer shrink-0 ${
            activeTab === 'BACKUP'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Database className="w-4 h-4 text-rose-600" />
          <span>Cadangan (Backup)</span>
        </button>
      </div>

      {/* Konten Tab Pengaturan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri / Form Pengaturan (2 Kolom) */}
        <div className="lg:col-span-2 space-y-6">
          {/* TAB 1: IDENTITAS INSTANSI */}
          {activeTab === 'INSTANSI' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Building className="w-5 h-5 text-emerald-600" />
                  Identitas Instansi, Wilayah & Periode Anggaran
                </h2>
                <p className="text-xs text-slate-500">
                  Data ini digunakan sebagai nama kop surat resmi, kartu tani, nota, dan laporan dinas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Instansi / Balai Penyuluhan Pertanian
                  </label>
                  <input
                    type="text"
                    value={settings.instansi.namaInstansi}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        instansi: { ...settings.instansi, namaInstansi: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kabupaten</label>
                  <input
                    type="text"
                    value={settings.instansi.kabupaten}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        instansi: { ...settings.instansi, kabupaten: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Provinsi</label>
                  <input
                    type="text"
                    value={settings.instansi.provinsi}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        instansi: { ...settings.instansi, provinsi: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Kantor BPP</label>
                  <textarea
                    rows={2}
                    value={settings.instansi.alamatKantor}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        instansi: { ...settings.instansi, alamatKantor: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. Telepon Kantor</label>
                  <input
                    type="text"
                    value={settings.instansi.telepon}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        instansi: { ...settings.instansi, telepon: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Layanan Petani</label>
                  <input
                    type="text"
                    value={settings.instansi.whatsappLayanan}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        instansi: { ...settings.instansi, whatsappLayanan: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Resmi</label>
                  <input
                    type="email"
                    value={settings.instansi.emailResmi}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        instansi: { ...settings.instansi, emailResmi: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Website Resmi</label>
                  <input
                    type="text"
                    value={settings.instansi.websiteResmi}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        instansi: { ...settings.instansi, websiteResmi: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <label className="block text-xs font-black text-emerald-900 mb-1">Tahun Anggaran Aktif</label>
                  <input
                    type="number"
                    value={settings.instansi.tahunAnggaran}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        instansi: { ...settings.instansi, tahunAnggaran: parseInt(e.target.value) || 2026 },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-sm font-black text-emerald-950 focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-emerald-700 mt-1">
                    Seluruh kuota alokasi e-RDKK dan penerbitan kartu otomatis mengacu ke tahun ini.
                  </p>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
                  <label className="block text-xs font-black text-amber-900 mb-1">Musim Tanam (MT) Berjalan</label>
                  <select
                    value={settings.instansi.musimTanamAktif}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        instansi: { ...settings.instansi, musimTanamAktif: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-sm font-black text-amber-950 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="MT 1">MT 1 (Walikan - Padi)</option>
                    <option value="MT 2">MT 2 (Kemarau - Jagung, Palawija dll)</option>
                    <option value="MT 3">MT 3 (Rendeng - Padi)</option>
                  </select>
                  <p className="text-[10px] text-amber-700 mt-1">
                    Menjadi filter default saat membuka kasir poktan & penyaluran kios.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PARAMETER PUPUK & HET */}
          {activeTab === 'PUPUK' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Wheat className="w-5 h-5 text-amber-600" />
                  Parameter HET Pusat & Satuan Kemasan Sak
                </h2>
                <p className="text-xs text-slate-500">
                  Aturan harga HET resmi pemerintah per kg dan penetapan bobot kemasan baku (Kg per Sak).
                </p>
              </div>

              {/* Tabel HET Pusat & Bobot Kemasan */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-green-200 bg-green-50/60 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div>
                    <span className="text-xs font-black text-green-900 block">PUPUK UREA</span>
                    <span className="text-[10px] text-green-700">Subsidi Pemerintah Pusat</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">HET per Kg (Rp)</label>
                    <input
                      type="number"
                      value={settings.pupuk.hetUreaPerKg}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          pupuk: { ...settings.pupuk, hetUreaPerKg: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-green-300 bg-white text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Bobot per Sak (Kg)</label>
                    <input
                      type="number"
                      value={settings.pupuk.kgPerSakUrea}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          pupuk: { ...settings.pupuk, kgPerSakUrea: parseFloat(e.target.value) || 50 },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-green-300 bg-white text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/60 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div>
                    <span className="text-xs font-black text-amber-900 block">PUPUK NPK / PHONSKA</span>
                    <span className="text-[10px] text-amber-700">Subsidi Pemerintah Pusat</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">HET per Kg (Rp)</label>
                    <input
                      type="number"
                      value={settings.pupuk.hetNpkPerKg}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          pupuk: { ...settings.pupuk, hetNpkPerKg: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Bobot per Sak (Kg)</label>
                    <input
                      type="number"
                      value={settings.pupuk.kgPerSakNpk}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          pupuk: { ...settings.pupuk, kgPerSakNpk: parseFloat(e.target.value) || 50 },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-yellow-200 bg-yellow-50/60 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div>
                    <span className="text-xs font-black text-yellow-950 block">PUPUK ORGANIK</span>
                    <span className="text-[10px] text-yellow-800">1 Sak Baku = 40 Kg</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">HET per Kg (Rp)</label>
                    <input
                      type="number"
                      value={settings.pupuk.hetOrganikPerKg}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          pupuk: { ...settings.pupuk, hetOrganikPerKg: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-yellow-300 bg-white text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Bobot per Sak (Kg)</label>
                    <input
                      type="number"
                      value={settings.pupuk.kgPerSakOrganik}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          pupuk: { ...settings.pupuk, kgPerSakOrganik: parseFloat(e.target.value) || 40 },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-yellow-300 bg-white text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Batasan Rasio Maksimal Alokasi per Hektar */}
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-800 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Plafon Maksimal Alokasi per Hektar (Rekomendasi BPP)
                </h3>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Maks Urea (Kg/Ha)</label>
                    <input
                      type="number"
                      value={settings.pupuk.rasioMaksUreaPerHa}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          pupuk: { ...settings.pupuk, rasioMaksUreaPerHa: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Maks NPK (Kg/Ha)</label>
                    <input
                      type="number"
                      value={settings.pupuk.rasioMaksNpkPerHa}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          pupuk: { ...settings.pupuk, rasioMaksNpkPerHa: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Maks Organik (Kg/Ha)</label>
                    <input
                      type="number"
                      value={settings.pupuk.rasioMaksOrganikPerHa}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          pupuk: { ...settings.pupuk, rasioMaksOrganikPerHa: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PETA GIS & GPS */}
          {activeTab === 'GIS' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  Pengaturan Peta Spasial & GPS Smartphone
                </h2>
                <p className="text-xs text-slate-500">
                  Konfigurasi titik koordinat pusat Kecamatan Lembeyan dan preferensi pelacakan pematang sawah.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Latitude Pusat Lembeyan (Lintang)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={settings.gis.defaultCenterLat}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        gis: { ...settings.gis, defaultCenterLat: parseFloat(e.target.value) || -7.7685 },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-bold"
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Longitude Pusat Lembeyan (Bujur)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={settings.gis.defaultCenterLng}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        gis: { ...settings.gis, defaultCenterLng: parseFloat(e.target.value) || 111.4225 },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-bold"
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Zoom Level Awal</label>
                  <input
                    type="number"
                    min={10}
                    max={20}
                    value={settings.gis.defaultZoom}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        gis: { ...settings.gis, defaultZoom: parseInt(e.target.value) || 14 },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Standar BPP: 14 atau 15</p>
                </div>

                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Penyedia Citra Satelit Utama</label>
                  <select
                    value={settings.gis.defaultTileLayer}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        gis: { ...settings.gis, defaultTileLayer: e.target.value },
                      })
                    }
                    className="w-full max-w-full min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold truncate"
                  >
                    <option value="GOOGLE_HYBRID">Google Satellite Hybrid (Sangat Tinggi + Jalan)</option>
                    <option value="ESRI_IMAGERY">Esri World Imagery (Citra Satelit Resolusi Tinggi)</option>
                    <option value="OSM">OpenStreetMap (Peta Jalan & Wilayah Administratif)</option>
                  </select>
                </div>

                <div className="sm:col-span-2 p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2.5 w-full max-w-full min-w-0 box-border overflow-hidden">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="text-xs font-black text-emerald-950">Ambang Jarak Perekaman GPS Walk-Tracking</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Saat petugas berjalan mengelilingi batas sawah dengan HP, patok baru otomatis dicatat setiap pergerakan melampaui:
                  </p>
                  <div className="w-full max-w-full min-w-0 box-border">
                    <select
                      value={settings.gis.gpsWalkThresholdMeters}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          gis: { ...settings.gis, gpsWalkThresholdMeters: parseInt(e.target.value) || 3 },
                        })
                      }
                      className="w-full max-w-full min-w-0 px-3 py-2.5 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-emerald-900 focus:outline-emerald-500 box-border block truncate"
                    >
                      <option value={2}>Setiap 2 meter (Detail, petak kecil)</option>
                      <option value={3}>Setiap 3 meter (Rekomendasi sawah Lembeyan)</option>
                      <option value={5}>Setiap 5 meter (Hamparan luas)</option>
                      <option value={8}>Setiap 8 meter (Cepat & hemat baterai)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FORMAT DOKUMEN & PEJABAT */}
          {activeTab === 'DOKUMEN' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Format Dokumen, Nomor Registrasi & Pejabat BPP
                </h2>
                <p className="text-xs text-slate-500">
                  Pengaturan pola nomor transaksi otomatis dan nama pejabat berwenang penandatangan dokumen.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Prefix Nomor Nota Kasir Poktan</label>
                  <input
                    type="text"
                    value={settings.dokumen.prefixNotaKasir}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dokumen: { ...settings.dokumen, prefixNotaKasir: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Variabel: {'{TAHUN}'}, {'{NO}'}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Prefix Surat Jalan Distribusi Kios</label>
                  <input
                    type="text"
                    value={settings.dokumen.prefixSuratJalan}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dokumen: { ...settings.dokumen, prefixSuratJalan: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Format Kartu Tani Digital</label>
                  <input
                    type="text"
                    value={settings.dokumen.prefixKartuTani}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dokumen: { ...settings.dokumen, prefixKartuTani: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Contoh hasil: KT-3509-2026-720002</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Format Kode Petak Lahan GIS</label>
                  <input
                    type="text"
                    value={settings.dokumen.prefixSuratLahan}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dokumen: { ...settings.dokumen, prefixSuratLahan: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                  />
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <span className="text-xs font-black text-slate-900 block">Pejabat Koordinator BPP Kecamatan</span>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Nama Lengkap & Gelar</label>
                    <input
                      type="text"
                      value={settings.dokumen.namaKoordinatorBpp}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          dokumen: { ...settings.dokumen, namaKoordinatorBpp: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">NIP</label>
                    <input
                      type="text"
                      value={settings.dokumen.nipKoordinatorBpp}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          dokumen: { ...settings.dokumen, nipKoordinatorBpp: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <span className="text-xs font-black text-slate-900 block">Pejabat Mantri Tani / Pengawas</span>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Nama Lengkap & Gelar</label>
                    <input
                      type="text"
                      value={settings.dokumen.namaMantriTani}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          dokumen: { ...settings.dokumen, namaMantriTani: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">NIP</label>
                    <input
                      type="text"
                      value={settings.dokumen.nipMantriTani}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          dokumen: { ...settings.dokumen, nipMantriTani: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: INTEGRASI & CLOUD */}
          {activeTab === 'INTEGRASI' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-blue-600" />
                  Integrasi Google Sheets & Webhook Eksternal
                </h2>
                <p className="text-xs text-slate-500">
                  Kirim riwayat penebusan pupuk dan kuota secara otomatis ke Google Spreadsheet Pemkab / Dinas.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Google Apps Script Webhook URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    value={settings.integrasi.googleSheetWebhookUrl}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        integrasi: { ...settings.integrasi, googleSheetWebhookUrl: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Data transaksi penebusan pupuk kasir akan otomatis disinkronkan ke URL endpoint ini.
                  </p>
                </div>

                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-blue-950 block">Sinkronisasi Otomatis Saat Transaksi</span>
                      <span className="text-[10px] text-blue-800">
                        Otomatis kirim data ke Google Sheets setiap kali kasir poktan menyelesaikan penebusan
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.integrasi.autoSyncOnTransaction}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          integrasi: { ...settings.integrasi, autoSyncOnTransaction: e.target.checked },
                        })
                      }
                      className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kunci API Integrasi SIMLUHTAN Kementan (Opsional)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••••••••••••••••••"
                    value={settings.integrasi.kementanApiKey}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        integrasi: { ...settings.integrasi, kementanApiKey: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CADANGAN (BACKUP & RESTORE) */}
          {activeTab === 'BACKUP' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Database className="w-5 h-5 text-rose-600" />
                  Cadangan Data (*Backup & Maintenance*)
                </h2>
                <p className="text-xs text-slate-500">
                  Unduh cadangan data induk database, amankan riwayat alokasi e-RDKK, dan bersihkan file log.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/80 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-2">
                      <Download className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900">Unduh Cadangan Database Lengkap</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Ekspor data petani, kelompok tani, petak poligon sawah, kuota e-RDKK, nota kasir, dan akun pengguna ke dalam 1 file JSON terpadu.
                    </p>
                  </div>
                  <a
                    href="/api/pengaturan/backup"
                    download
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition text-center cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Cadangan Sekarang</span>
                  </a>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/80 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold mb-2">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900">Ekspor Laporan Audit BPP</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Kompilasi rekapitulasi penyaluran pupuk dan data lahan siap cetak atau ekspor format Excel Kementan resmi.
                    </p>
                  </div>
                  <a
                    href="/laporan"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition text-center cursor-pointer"
                  >
                    <span>Buka Halaman Laporan &rarr;</span>
                  </a>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <strong>Penting untuk Keamanan Data:</strong>
                  <p className="mt-0.5 text-amber-800">
                    Disarankan untuk mengunduh cadangan (*backup*) secara berkala minimal 1 minggu sekali atau setelah selesai musyawarah kesepakatan harga pupuk tingkat kecamatan.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Live Preview & Ringkasan Parameter Aktif (1 Kolom) */}
        <div className="space-y-6">
          {/* Live Preview Kop Surat & Instansi */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Pratinjau Kop Surat Resmi
            </span>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mb-1">
                {settings.instansi.provinsi} &bull; Kab. {settings.instansi.kabupaten}
              </span>
              <h4 className="text-xs font-black text-slate-900 uppercase leading-snug">
                {settings.instansi.namaInstansi}
              </h4>
              <p className="text-[10px] text-slate-500 leading-tight">
                {settings.instansi.alamatKantor} &bull; Telp: {settings.instansi.telepon}
              </p>
              <p className="text-[9px] font-mono text-emerald-800 font-semibold pt-1 border-t border-slate-200 mt-2">
                Tahun Anggaran {currentYear} &bull; {settings.instansi.musimTanamAktif}
              </p>
            </div>
          </div>

          {/* Pratinjau Nilai HET per Sak Baku */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Ringkasan HET Per Sak Baku ({currentYear})
            </span>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-green-50/70 border border-green-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-green-950 block">Urea (50 Kg)</span>
                  <span className="text-[10px] text-green-700">Rp {settings.pupuk.hetUreaPerKg.toLocaleString('id-ID')} / Kg</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-green-900">{formatRupiah(hargaSakUrea)}</span>
                  <span className="text-[9px] text-green-700 block">per sak</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-amber-950 block">NPK / Phonska (50 Kg)</span>
                  <span className="text-[10px] text-amber-700">Rp {settings.pupuk.hetNpkPerKg.toLocaleString('id-ID')} / Kg</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-amber-900">{formatRupiah(hargaSakNpk)}</span>
                  <span className="text-[9px] text-amber-700 block">per sak</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-yellow-50/70 border border-yellow-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-yellow-950 block">Organik (40 Kg)</span>
                  <span className="text-[10px] text-yellow-800">Rp {settings.pupuk.hetOrganikPerKg.toLocaleString('id-ID')} / Kg</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-yellow-950">{formatRupiah(hargaSakOrganik)}</span>
                  <span className="text-[9px] text-yellow-800 block">per sak</span>
                </div>
              </div>
            </div>
          </div>

          {/* Simulasi Nomor Dokumen Registrasi */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Simulasi Penomoran Dokumen
            </span>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[9px] font-sans text-slate-400 block">Kartu Tani Digital:</span>
                <span className="font-bold text-slate-800">
                  {settings.dokumen.prefixKartuTani.replace('{TAHUN}', String(currentYear)).replace('{NIK}', '720002')}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[9px] font-sans text-slate-400 block">Kode Petak Lahan GIS:</span>
                <span className="font-bold text-slate-800">
                  {settings.dokumen.prefixSuratLahan.replace('{TAHUN}', String(currentYear)).replace('{NO}', '003')}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[9px] font-sans text-slate-400 block">Nota Kasir Poktan:</span>
                <span className="font-bold text-slate-800">
                  {settings.dokumen.prefixNotaKasir.replace('{TAHUN}', String(currentYear)).replace('{NO}', '001')}
                </span>
              </div>
            </div>
          </div>

          {/* Tombol Simpan Footer Cepat */}
          <div className="p-5 bg-gradient-to-br from-emerald-800 to-green-950 text-white rounded-3xl shadow-lg space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-black">Simpan Pengaturan</span>
            </div>
            <p className="text-[11px] text-emerald-200 leading-relaxed">
              Pastikan seluruh nilai parameter sudah sesuai dengan kesepakatan musyawarah kecamatan sebelum menyimpan.
            </p>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Terapkan Pengaturan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Sticky Save Bar on Mobile Smartphones */}
      <div className="block sm:hidden fixed bottom-4 inset-x-3 z-40 bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-white/20 flex items-center justify-between gap-3 text-white no-print">
        <div className="min-w-0">
          <p className="text-[10px] text-slate-400">Pengaturan Lembeyan</p>
          <p className="text-xs font-black text-emerald-400 truncate">Parameter Belum Tersimpan?</p>
        </div>
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving || loading}
          className="px-4 py-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Menyimpan...' : 'Simpan Sekarang'}</span>
        </button>
      </div>
    </div>
  );
}
