'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  Printer,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  Coins,
  Receipt,
  Download,
  Trash2,
  RefreshCw,
  Sparkles,
  PieChart,
  ShieldCheck,
  Building,
  HelpCircle,
  X,
  CreditCard,
} from 'lucide-react';
import { formatRupiah, formatAngka } from '@/lib/calculations';
import { showSuccess, showError, showWarning, showConfirm } from '@/lib/sweetalert';
import {
  getDefaultNipForRole,
  generateAutoSignatureSvg,
  generateOfficialStampSvg,
} from '@/lib/signature-utils';

export default function BukuKasPoktanPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [poktanList, setPoktanList] = useState<any[]>([]);
  const [selectedPoktanId, setSelectedPoktanId] = useState<string>('SEMUA');

  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [pejabatData, setPejabatData] = useState<{
    ppl: { nama: string; nip: string };
    ketuaPoktan: { nama: string; nip: string };
    bendaharaPoktan: { nama: string };
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'jurnal' | 'pembagian' | 'cetak'>('jurnal');
  const [filterJenis, setFilterJenis] = useState<'SEMUA' | 'PEMASUKAN' | 'PENGELUARAN' | 'KASIR'>('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Input Kas Manual
  const [modalOpen, setModalOpen] = useState(false);
  const [modalJenis, setModalJenis] = useState<'PEMASUKAN' | 'PENGELUARAN'>('PEMASUKAN');
  const [formEntry, setFormEntry] = useState({
    kategori: 'IURAN_ANGGOTA',
    kategoriLabel: 'Iuran Kas Bulanan Anggota',
    nominal: '',
    keterangan: '',
    penerimaAtauPenyetor: '',
    tanggal: new Date().toISOString().slice(0, 10),
  });
  const [savingEntry, setSavingEntry] = useState(false);

  // Load Poktan List
  useEffect(() => {
    fetch('/api/poktan')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setPoktanList(json.data);
          if (currentUser.role === 'POKTAN') {
            const myPoktan = json.data.find(
              (p: any) =>
                p.id === currentUser.poktanId ||
                (currentUser.wilayah && p.nama && currentUser.wilayah.toLowerCase().includes(p.nama.toLowerCase()))
            );
            if (myPoktan) setSelectedPoktanId(myPoktan.id);
            else if (json.data.length > 0) setSelectedPoktanId(json.data[0].id);
          }
        }
      })
      .catch(() => {});
  }, [currentUser]);

  // Fetch Buku Kas Data
  const fetchKasData = async () => {
    try {
      setLoading(true);
      const url = `/api/buku-kas-poktan?poktanId=${selectedPoktanId}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setLedgerData(json.data.ledger || []);
        setSummaryData(json.data.summary || null);
        if (json.data.pejabat) {
          setPejabatData(json.data.pejabat);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKasData();
  }, [selectedPoktanId]);

  // Handle Submit Kas Manual
  const handleSubmitKas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEntry.nominal || Number(formEntry.nominal) <= 0) {
      showWarning('Nominal Kosong', 'Harap masukkan jumlah nominal uang yang valid.');
      return;
    }

    try {
      setSavingEntry(true);
      const activePoktanObj = poktanList.find((p) => p.id === selectedPoktanId);

      const res = await fetch('/api/buku-kas-poktan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poktanId: selectedPoktanId !== 'SEMUA' ? selectedPoktanId : poktanList[0]?.id || 'poktan-1',
          namaPoktan: activePoktanObj?.nama || summaryData?.namaPoktanAktif || 'Poktan Desa',
          jenis: modalJenis,
          kategori: formEntry.kategori,
          kategoriLabel: formEntry.kategoriLabel,
          nominal: Number(formEntry.nominal),
          keterangan: formEntry.keterangan,
          penerimaAtauPenyetor: formEntry.penerimaAtauPenyetor || (modalJenis === 'PEMASUKAN' ? 'Anggota Poktan' : 'Bendahara Poktan'),
          tanggal: formEntry.tanggal,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showSuccess('Catatan Tersimpan', `Transaksi kas ${modalJenis.toLowerCase()} berhasil dibukukan.`);
        setModalOpen(false);
        setFormEntry({
          kategori: 'IURAN_ANGGOTA',
          kategoriLabel: 'Iuran Kas Bulanan Anggota',
          nominal: '',
          keterangan: '',
          penerimaAtauPenyetor: '',
          tanggal: new Date().toISOString().slice(0, 10),
        });
        fetchKasData();
      } else {
        showError('Gagal Menyimpan', json.error);
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    } finally {
      setSavingEntry(false);
    }
  };

  // Handle Delete Manual Entry
  const handleDeleteEntry = async (item: any) => {
    if (item.isOtomatisKasir) {
      showWarning('Transaksi Kasir', 'Transaksi ini terhubung otomatis dengan Kasir Poktan.');
      return;
    }

    const conf = await showConfirm({
      title: 'Hapus Catatan Kas?',
      text: `Hapus catatan "${item.kategoriLabel}" sebesar ${formatRupiah(item.nominal)}?`,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    });

    if (!conf) return;

    try {
      const res = await fetch(`/api/buku-kas-poktan?id=${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showSuccess('Berhasil Dihapus', 'Catatan kas berhasil dihapus dari pembukuan.');
        fetchKasData();
      } else {
        showError('Gagal Menghapus', json.error);
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    }
  };

  // Filtered Ledger
  const filteredLedger = ledgerData.filter((item) => {
    if (filterJenis === 'PEMASUKAN' && item.jenis !== 'PEMASUKAN') return false;
    if (filterJenis === 'PENGELUARAN' && item.jenis !== 'PENGELUARAN') return false;
    if (filterJenis === 'KASIR' && !item.isOtomatisKasir) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchKet = (item.keterangan || '').toLowerCase().includes(q);
      const matchKat = (item.kategoriLabel || '').toLowerCase().includes(q);
      const matchPihak = (item.penerimaAtauPenyetor || '').toLowerCase().includes(q);
      const matchNota = (item.nomorNota || '').toLowerCase().includes(q);
      return matchKet || matchKat || matchPihak || matchNota;
    }
    return true;
  });

  const rule = summaryData?.marginRule || {
    urea: { hetPerSak: 90000, kasPoktan: 1000, pengurusPoktan: 3000, sewaGudang: 2000, atk: 2000, transportasi: 5000, totalPerSak: 105000 },
    npk: { hetPerSak: 92000, kasPoktan: 4000, pengurusPoktan: 3000, sewaGudang: 2000, atk: 2000, transportasi: 5000, totalPerSak: 110000 },
    organik: { hetPerSak: 25600, kasPoktan: 1000, pengurusPoktan: 2000, sewaGudang: 1000, atk: 1000, transportasi: 4400, totalPerSak: 35000 },
  };

  const activePoktanName = poktanList.find((p) => p.id === selectedPoktanId)?.nama || summaryData?.namaPoktanAktif || 'Kelompok Tani Wilayah Lembeyan';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold text-emerald-800 mb-2">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            KEUANGAN & ARUS KAS KELOMPOK TANI RESMI
          </div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-emerald-600" />
            Buku Kas & Pembagian Jasa Poktan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Pembukuan arus kas masuk/keluar, akumulasi otomatis margin penebusan dari <Link href="/kasir-poktan" className="text-emerald-700 font-bold hover:underline">Kasir Poktan</Link>, dan transparansi alokasi jasa pengurus.
          </p>
        </div>

        {/* Action Buttons & Poktan Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {currentUser.role !== 'POKTAN' && (
            <div className="relative">
              <select
                value={selectedPoktanId}
                onChange={(e) => setSelectedPoktanId(e.target.value)}
                className="pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              >
                <option value="SEMUA">Semua Kelompok Tani (Kec. Lembeyan)</option>
                {poktanList.map((poktan) => (
                  <option key={poktan.id} value={poktan.id}>
                    {poktan.nama} &bull; Desa {poktan.desa}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setModalJenis('PEMASUKAN');
              setFormEntry((prev) => ({
                ...prev,
                kategori: 'IURAN_ANGGOTA',
                kategoriLabel: 'Iuran Kas Bulanan Anggota',
              }));
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>+ Kas Masuk</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalJenis('PENGELUARAN');
              setFormEntry((prev) => ({
                ...prev,
                kategori: 'OPERASIONAL_GUDANG',
                kategoriLabel: 'Sewa Gudang & Listrik',
              }));
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition shadow-sm active:scale-95"
          >
            <Minus className="w-4 h-4" />
            <span>- Kas Keluar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cetak')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs transition shadow-sm active:scale-95"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Cetak LPJ Kas</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Kas Poktan */}
        <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-5 rounded-3xl shadow-md border border-emerald-700/60 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-emerald-500/10 pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-xs text-emerald-200 mb-2">
              <span className="font-bold uppercase tracking-wider">Saldo Kas Poktan</span>
              <Wallet className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {formatRupiah(summaryData?.saldoKasSaatIni || 0)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-emerald-700/60 text-[11px] text-emerald-200 flex items-center justify-between">
            <span>Kas Tersedia di Rekening</span>
            <span className="font-bold text-amber-300">Net Aktif</span>
          </div>
        </div>

        {/* Card 2: Total Pemasukan */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-bold uppercase tracking-wider">Total Pemasukan Kas</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">
              {formatRupiah(summaryData?.totalPemasukan || 0)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Termasuk margin tebus kasir: <strong className="text-emerald-700">{formatRupiah(summaryData?.totalKasPoktanFromKasir || 0)}</strong>
          </div>
        </div>

        {/* Card 3: Total Pengeluaran */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-bold uppercase tracking-wider">Total Pengeluaran Kas</span>
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600">
              {formatRupiah(summaryData?.totalPengeluaran || 0)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Biaya operasional, gudang, rapat & ATK
          </div>
        </div>

        {/* Card 4: Akumulasi Jasa Pengurus & Kasir */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-bold uppercase tracking-wider">Hak Jasa Pengurus & Kasir</span>
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600">
              {formatRupiah(summaryData?.totalJasaPengurusFromKasir || 0)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Dari {summaryData?.akumulasiSakTebus?.total || 0} Sak pupuk terdistribusi di kasir
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('jurnal')}
          className={`pb-3.5 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'jurnal'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Jurnal Arus Kas ({ledgerData.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pembagian')}
          className={`pb-3.5 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'pembagian'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Alokasi & Pembagian Jasa Poktan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cetak')}
          className={`pb-3.5 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'cetak'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Dokumen LPJ Resmi</span>
        </button>
      </div>

      {/* 4. TAB 1: JURNAL ARUS KAS (LEDGER) */}
      {activeTab === 'jurnal' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              {(['SEMUA', 'PEMASUKAN', 'PENGELUARAN', 'KASIR'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterJenis(mode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    filterJenis === mode
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {mode === 'SEMUA'
                    ? 'Semua Transaksi'
                    : mode === 'PEMASUKAN'
                    ? 'Pemasukan Kas'
                    : mode === 'PENGELUARAN'
                    ? 'Pengeluaran Kas'
                    : '⚡ Otomatis Kasir'}
                </button>
              ))}
            </div>

            <div className="relative min-w-[220px] flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari keterangan, nota, penyetor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>
          </div>

          {/* Table Ledger */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Mobile Card View (Smartphone Friendly) */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {filteredLedger.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada catatan buku kas pada filter ini.
                </div>
              ) : (
                filteredLedger.map((item) => {
                  const isAuto = item.isOtomatisKasir;
                  const dateObj = new Date(item.tanggal);
                  const formattedDate = dateObj.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div key={item.id} className="p-4 hover:bg-slate-50/80 transition space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            {isAuto ? (
                              <span className="bg-amber-100 text-amber-900 border border-amber-300 font-black text-[9px] px-1.5 py-0.5 rounded uppercase">
                                ⚡ Kasir Otomatis
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-700 font-bold text-[9px] px-1.5 py-0.5 rounded uppercase">
                                Manual
                              </span>
                            )}
                            <strong className="text-slate-900 font-bold text-xs truncate">{item.kategoriLabel}</strong>
                          </div>
                          {item.nomorNota ? (
                            <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                              {item.nomorNota}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-400 text-[10px]">{item.id}</span>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          {item.jenis === 'PEMASUKAN' ? (
                            <span className="font-black text-sm text-emerald-600 block leading-tight">
                              + {formatRupiah(item.nominal)}
                            </span>
                          ) : (
                            <span className="font-black text-sm text-rose-600 block leading-tight">
                              - {formatRupiah(item.nominal)}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            {formattedDate} WIB
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-xl border border-slate-100">
                        {item.keterangan}
                        {item.penerimaAtauPenyetor && (
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            Pihak: <strong className="text-slate-700">{item.penerimaAtauPenyetor}</strong>
                          </span>
                        )}
                      </p>

                      {!isAuto && (
                        <div className="flex items-center justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(item)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus Catatan</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Tanggal & Waktu</th>
                    <th className="py-3 px-4">No. Bukti / Nota</th>
                    <th className="py-3 px-4">Kategori & Rincian Transaksi</th>
                    <th className="py-3 px-4">Pihak Terkait</th>
                    <th className="py-3 px-4 text-right">Pemasukan (+)</th>
                    <th className="py-3 px-4 text-right">Pengeluaran (-)</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Belum ada catatan buku kas pada filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((item) => {
                      const isAuto = item.isOtomatisKasir;
                      const dateObj = new Date(item.tanggal);
                      const formattedDate = dateObj.toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {formattedDate}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {item.nomorNota ? (
                              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {item.nomorNota}
                              </span>
                            ) : (
                              <span className="font-mono text-slate-400">{item.id}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 max-w-md">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {isAuto ? (
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 font-black text-[9px] px-1.5 py-0.2 rounded uppercase">
                                  ⚡ Kasir Otomatis
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-700 font-bold text-[9px] px-1.5 py-0.2 rounded uppercase">
                                  Manual
                                </span>
                              )}
                              <strong className="text-slate-900 font-bold">{item.kategoriLabel}</strong>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                              {item.keterangan}
                            </p>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-semibold">
                            {item.penerimaAtauPenyetor}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-right font-black text-emerald-600">
                            {item.jenis === 'PEMASUKAN' ? `+ ${formatRupiah(item.nominal)}` : '-'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-right font-black text-rose-600">
                            {item.jenis === 'PENGELUARAN' ? `- ${formatRupiah(item.nominal)}` : '-'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-center">
                            {!isAuto && (
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(item)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                                title="Hapus catatan manual ini"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 2: ALOKASI & SIMULASI PEMBAGIAN JASA POKTAN */}
      {activeTab === 'pembagian' && (
        <div className="space-y-6">
          {/* Card Penjelasan Kesepakatan Musyawarah */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl p-6 text-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200/70 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Surat Berita Acara Musyawarah: {rule.nomorBeritaAcara || '01/BA-POKTAN/LMB/2026'}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2">
                  Struktur Biaya Penebusan & Margin Poktan per Sak Pupuk
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                  Berdasarkan hasil musyawarah kelompok tani se-Kecamatan Lembeyan, harga tebus pupuk petani terdiri dari Harga Eceran Tertinggi (HET) resmi pemerintah ditambah alokasi biaya penunjang dan jasa pengurus yang disepakati bersama.
                </p>
              </div>
              <Building className="w-10 h-10 text-emerald-600 shrink-0 opacity-40" />
            </div>

            {/* Table Komponen Biaya per Sak */}
            <div className="mt-5 overflow-x-auto bg-white rounded-2xl border border-emerald-200/80 shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-emerald-900 text-white font-bold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Komponen Biaya / Jasa</th>
                    <th className="py-2.5 px-3 text-right">Urea (50 Kg/Sak)</th>
                    <th className="py-2.5 px-3 text-right">NPK Phonska (50 Kg/Sak)</th>
                    <th className="py-2.5 px-3 text-right">Organik (40 Kg/Sak)</th>
                    <th className="py-2.5 px-3">Peruntukan Dana</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  <tr>
                    <td className="py-2.5 px-3 text-slate-700">1. HET Resmi Kios (Penebusan KPL)</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(rule.urea?.hetPerSak || 90000)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(rule.npk?.hetPerSak || 92000)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(rule.organik?.hetPerSak || 25600)}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">Setor modal ke Kios Pupuk Resmi (KPL)</td>
                  </tr>
                  <tr className="bg-emerald-50/40">
                    <td className="py-2.5 px-3 text-emerald-900 font-black">2. Alokasi Kas Poktan (Dana Abadi)</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">{formatRupiah(rule.urea?.kasPoktan || 1000)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">{formatRupiah(rule.npk?.kasPoktan || 4000)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">{formatRupiah(rule.organik?.kasPoktan || 1000)}</td>
                    <td className="py-2.5 px-3 text-emerald-700 font-bold text-[11px]">Masuk ke Saldo Kas Bersih Poktan</td>
                  </tr>
                  <tr className="bg-amber-50/40">
                    <td className="py-2.5 px-3 text-amber-900 font-black">3. Jasa Pengurus & Kasir Lapangan</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">{formatRupiah(rule.urea?.pengurusPoktan || 3000)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">{formatRupiah(rule.npk?.pengurusPoktan || 3000)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">{formatRupiah(rule.organik?.pengurusPoktan || 2000)}</td>
                    <td className="py-2.5 px-3 text-amber-700 font-bold text-[11px]">Honorarium kasir, verifikator & pengurus</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-700">4. Sewa Gudang Transit & Keamanan</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(rule.urea?.sewaGudang || 2000)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(rule.npk?.sewaGudang || 2000)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(rule.organik?.sewaGudang || 1000)}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">Biaya sewa gudang desa & penjaga malam</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-700">5. ATK, Fotocopy & Kupon Nota</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(rule.urea?.atk || 2000)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(rule.npk?.atk || 2000)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(rule.organik?.atk || 1000)}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">Kertas cetak nota, stempel & rekap e-RDKK</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-700">6. Transportasi Truk / Angkut</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(rule.urea?.transportasi || 5000)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(rule.npk?.transportasi || 5000)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(rule.organik?.transportasi || 4400)}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">Ongkir ekspedisi truk kios ke balai poktan</td>
                  </tr>
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                    <td className="py-3 px-3 uppercase">Total Tebus Petani per Sak</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-800">{formatRupiah(rule.urea?.totalPerSak || 105000)}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-800">{formatRupiah(rule.npk?.totalPerSak || 110000)}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-800">{formatRupiah(rule.organik?.totalPerSak || 35000)}</td>
                    <td className="py-3 px-3 text-emerald-800 text-[11px]">Tarif resmi yang dibayarkan petani di Kasir</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Realisasi Total Dana Hasil Tebus Kasir */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                Akumulasi Realisasi Alokasi Dana (Berdasarkan Penjualan Kasir Aktif)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Total pupuk tersalur: <strong className="text-slate-800">{summaryData?.akumulasiSakTebus?.urea || 0} Sak Urea</strong> &bull;{' '}
                <strong className="text-slate-800">{summaryData?.akumulasiSakTebus?.npk || 0} Sak NPK</strong> &bull;{' '}
                <strong className="text-slate-800">{summaryData?.akumulasiSakTebus?.organik || 0} Sak Organik</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">1. Masuk Kas Poktan</span>
                <span className="text-lg font-black text-emerald-700 font-mono block mt-1">
                  {formatRupiah(summaryData?.totalKasPoktanFromKasir || 0)}
                </span>
                <span className="text-[10px] text-emerald-600 mt-1 block">Otomatis tercatat di Saldo Kas</span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">2. Jasa Pengurus/Kasir</span>
                <span className="text-lg font-black text-amber-700 font-mono block mt-1">
                  {formatRupiah(summaryData?.totalJasaPengurusFromKasir || 0)}
                </span>
                <span className="text-[10px] text-amber-600 mt-1 block">Siap dibagi ke kasir & pengurus</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-700 uppercase block">3. Dana Sewa Gudang</span>
                <span className="text-lg font-black text-slate-800 font-mono block mt-1">
                  {formatRupiah(summaryData?.totalSewaGudangFromKasir || 0)}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">Alokasi kebersihan & listrik</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-700 uppercase block">4. Dana Operasional ATK</span>
                <span className="text-lg font-black text-slate-800 font-mono block mt-1">
                  {formatRupiah(summaryData?.totalAtkFromKasir || 0)}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">Alokasi cetak nota & kupon</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-700 uppercase block">5. Dana Transportasi Truk</span>
                <span className="text-lg font-black text-slate-800 font-mono block mt-1">
                  {formatRupiah(summaryData?.totalTransportFromKasir || 0)}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 block">Alokasi angkut dari KPL</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 3: CETAK DOKUMEN LPJ RESMI */}
      {activeTab === 'cetak' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between no-print bg-white p-4 rounded-3xl border border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Pratinjau Lembar Pertanggungjawaban Kas Poktan (LPJ)</h3>
              <p className="text-xs text-slate-500">Format cetak A4 resmi untuk pelaporan ke Koordinator BPP & Kepala Desa.</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang (Print / PDF)</span>
            </button>
          </div>

          {/* Lembar Cetak A4 */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-md print:p-0 print:border-none print:shadow-none space-y-6 text-slate-900">
            {/* Kop Laporan */}
            <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
              <p className="text-xs uppercase tracking-widest font-bold text-slate-600">
                Pemerintah Kabupaten Magetan &bull; BPP Kecamatan Lembeyan
              </p>
              <h2 className="text-xl font-black uppercase text-slate-950">
                LAPORAN PERTANGGUNGJAWABAN KAS & ALOKASI JASA POKTAN
              </h2>
              <p className="text-xs font-bold text-emerald-800 uppercase">
                {activePoktanName} &bull; TAHUN ANGGARAN 2026
              </p>
            </div>

            {/* Rincian Ringkasan Kas */}
            <div className="grid grid-cols-3 gap-4 border border-slate-200 rounded-2xl p-4 bg-slate-50 text-xs">
              <div>
                <span className="text-slate-500 block">Total Pemasukan Kas:</span>
                <strong className="text-sm font-black text-emerald-700">{formatRupiah(summaryData?.totalPemasukan || 0)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Total Pengeluaran Kas:</span>
                <strong className="text-sm font-black text-rose-700">{formatRupiah(summaryData?.totalPengeluaran || 0)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Saldo Kas Akhir (Tersedia):</span>
                <strong className="text-sm font-black text-slate-950">{formatRupiah(summaryData?.saldoKasSaatIni || 0)}</strong>
              </div>
            </div>

            {/* Tabel Ringkasan Jurnal Terakhir */}
            <div>
              <h4 className="font-bold text-xs uppercase text-slate-700 mb-2">Daftar Mutasi Transaksi Kas:</h4>
              <table className="w-full text-xs text-left border border-slate-200">
                <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700 border-b">
                  <tr>
                    <th className="py-2 px-3 border-r">Tanggal</th>
                    <th className="py-2 px-3 border-r">No. Bukti / Nota</th>
                    <th className="py-2 px-3 border-r">Uraian / Keterangan</th>
                    <th className="py-2 px-3 border-r text-right">Masuk (Rp)</th>
                    <th className="py-2 px-3 text-right">Keluar (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerData.slice(0, 15).map((l, idx) => (
                    <tr key={l.id}>
                      <td className="py-2 px-3 border-r font-mono text-[11px]">{new Date(l.tanggal).toLocaleDateString('id-ID')}</td>
                      <td className="py-2 px-3 border-r font-mono">{l.nomorNota || l.id}</td>
                      <td className="py-2 px-3 border-r">{l.kategoriLabel} - {l.keterangan}</td>
                      <td className="py-2 px-3 border-r text-right font-mono">{l.jenis === 'PEMASUKAN' ? formatAngka(l.nominal) : '-'}</td>
                      <td className="py-2 px-3 text-right font-mono">{l.jenis === 'PENGELUARAN' ? formatAngka(l.nominal) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Kolom Tanda Tangan Resmi */}
            <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <p className="text-slate-600 mb-16">Mengetahui,<br/><strong>Ketua Kelompok Tani</strong></p>
                <p className="font-bold border-b border-slate-400 inline-block px-4 pb-0.5">
                  {pejabatData?.ketuaPoktan?.nama || rule.pihakMengetahui?.ketuaPoktan || 'H. Suparman'}
                </p>
                {pejabatData?.ketuaPoktan?.nip && (
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{pejabatData.ketuaPoktan.nip}</p>
                )}
              </div>

              <div>
                <p className="text-slate-600 mb-16">Penyuluh Lapangan,<br/><strong>PPL BPP Kec. Lembeyan</strong></p>
                <p className="font-bold border-b border-slate-400 inline-block px-4 pb-0.5">
                  {pejabatData?.ppl?.nama || 'Iis Sugiarti, S.P'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {pejabatData?.ppl?.nip || 'NIP. 19850412 201101 2 008'}
                </p>
              </div>

              <div>
                <p className="text-slate-600 mb-16">Pengelola Pembukuan,<br/><strong>Bendahara Poktan</strong></p>
                <p className="font-bold border-b border-slate-400 inline-block px-4 pb-0.5">
                  {pejabatData?.bendaharaPoktan?.nama || rule.pihakMengetahui?.bendaharaPoktan || 'Kasdi Mulyono'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL TAMBAH KAS MANUAL (PEMASUKAN / PENGELUARAN) */}
      {modalOpen && (
        <div className="fixed inset-0 z-[1300] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black ${
                    modalJenis === 'PEMASUKAN' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  {modalJenis === 'PEMASUKAN' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Catat {modalJenis === 'PEMASUKAN' ? 'Pemasukan Kas' : 'Pengeluaran Kas'} Poktan
                  </h3>
                  <p className="text-xs text-slate-500">{activePoktanName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitKas} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori Transaksi *</label>
                {modalJenis === 'PEMASUKAN' ? (
                  <select
                    value={formEntry.kategori}
                    onChange={(e) => {
                      const kat = e.target.value;
                      const labelMap: Record<string, string> = {
                        IURAN_ANGGOTA: 'Iuran Kas Bulanan Anggota',
                        BANTUAN_PEMERINTAH: 'Bantuan Operasional Dinas / Pemdes',
                        SEWA_ALSINTAN: 'Bagi Hasil Sewa Traktor / Alsintan',
                        LAIN_LAIN: 'Pemasukan Kas Lain-Lain',
                      };
                      setFormEntry({
                        ...formEntry,
                        kategori: kat,
                        kategoriLabel: labelMap[kat] || 'Pemasukan Kas',
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  >
                    <option value="IURAN_ANGGOTA">Iuran Kas Bulanan Anggota</option>
                    <option value="BANTUAN_PEMERINTAH">Bantuan Operasional Dinas / Pemdes</option>
                    <option value="SEWA_ALSINTAN">Bagi Hasil Sewa Traktor / Alsintan</option>
                    <option value="LAIN_LAIN">Pemasukan Kas Lain-Lain</option>
                  </select>
                ) : (
                  <select
                    value={formEntry.kategori}
                    onChange={(e) => {
                      const kat = e.target.value;
                      const labelMap: Record<string, string> = {
                        OPERASIONAL_GUDANG: 'Sewa Gudang & Listrik',
                        KONSUMSI_RAPAT: 'Konsumsi Musyawarah Tani',
                        ATK_DOKUMEN: 'Pembelian ATK, Nota & Kupon',
                        TRANSPORTASI: 'Ongkos Angkut / Bongkar Muat Pupuk',
                        LAIN_LAIN: 'Pengeluaran Kas Lain-Lain',
                      };
                      setFormEntry({
                        ...formEntry,
                        kategori: kat,
                        kategoriLabel: labelMap[kat] || 'Pengeluaran Kas',
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  >
                    <option value="OPERASIONAL_GUDANG">Sewa Gudang & Listrik</option>
                    <option value="KONSUMSI_RAPAT">Konsumsi Musyawarah Tani</option>
                    <option value="ATK_DOKUMEN">Pembelian ATK, Nota & Kupon</option>
                    <option value="TRANSPORTASI">Ongkos Angkut / Bongkar Muat Pupuk</option>
                    <option value="LAIN_LAIN">Pengeluaran Kas Lain-Lain</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nominal Uang (Rp) *</label>
                <input
                  type="number"
                  required
                  min="1000"
                  placeholder="Misal: 150000"
                  value={formEntry.nominal}
                  onChange={(e) => setFormEntry({ ...formEntry, nominal: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {modalJenis === 'PEMASUKAN' ? 'Penyetor Uang' : 'Penerima Pembayaran'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={modalJenis === 'PEMASUKAN' ? 'Nama anggota / pihak penyetor' : 'Nama pihak penerima'}
                    value={formEntry.penerimaAtauPenyetor}
                    onChange={(e) => setFormEntry({ ...formEntry, penerimaAtauPenyetor: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Transaksi</label>
                  <input
                    type="date"
                    value={formEntry.tanggal}
                    onChange={(e) => setFormEntry({ ...formEntry, tanggal: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan / Catatan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Tambahkan rincian bukti kuitansi atau keterangan..."
                  value={formEntry.keterangan}
                  onChange={(e) => setFormEntry({ ...formEntry, keterangan: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={savingEntry}
                className={`w-full py-3 rounded-xl font-black text-white text-sm shadow-md transition flex items-center justify-center gap-2 active:scale-95 ${
                  modalJenis === 'PEMASUKAN'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <span>{savingEntry ? 'Menyimpan Catatan...' : 'Simpan ke Buku Kas Poktan'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
