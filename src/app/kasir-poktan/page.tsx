'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  ShoppingCart,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Printer,
  DollarSign,
  Package,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  History,
  FileText,
  UserCheck,
  Settings,
  RefreshCw,
  Boxes,
  PlusCircle,
  Check,
  HelpCircle,
  Info,
  Warehouse,
  TrendingDown,
  TrendingUp,
  FileCheck,
  Sliders,
  Scale,
  Award,
  Trash2,
  Eye,
  MessageCircle,
  Share2,
} from 'lucide-react';
import { generateAutoSignatureSvg, generateOfficialStampSvg } from '@/lib/signature-utils';
import QrCodeView from '@/components/ui/QrCodeView';
import PetaniSignaturePad from '@/components/ui/PetaniSignaturePad';
import { generateWhatsAppNotaKasir, openWhatsApp } from '@/lib/whatsapp';
import {
  showSuccess,
  showError,
  showWarning,
  showConfirm,
  showDeleteConfirm,
  showToast,
} from '@/lib/sweetalert';

interface PetaniOption {
  id: string;
  nik: string;
  nama: string;
  desa: string;
  poktanId: string;
  namaPoktan: string;
  totalLuasLahan: number;
  alokasiPupuk: {
    musimTanam: string;
    jatahUreaKg: number;
    sisaUreaKg: number;
    jatahNpkKg: number;
    sisaNpkKg: number;
    jatahOrganikKg: number;
    sisaOrganikKg: number;
  }[];
}

interface HargaPupukPoktan {
  ureaPerKg: number;
  ureaPerSak: number;
  npkPerKg: number;
  npkPerSak: number;
  organikPerKg: number;
  organikPerSak: number;
  catatan?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// Preset default kesepakatan harga dari musyawarah (sesuai data riil pengguna)
const defaultRincianKesepakatan = {
  tahunAnggaran: 2026,
  nomorBeritaAcara: '01/BA-POKTAN/LMB/2026',
  tanggalMusyawarah: '2026-01-15',
  lokasiMusyawarah: 'Balai Pertemuan / Gudang Poktan',
  catatanKesepakatan: 'Berdasarkan hasil musyawarah kesepakatan harga pupuk bersubsidi se-Kecamatan Lembeyan Tahun Anggaran 2026.',
  pihakMengetahui: {
    ketuaPoktan: 'Samsi',
    bendaharaPoktan: 'Kasdi Mulyono',
    penyuluhPpl: 'Ir. Hendro Supriyanto',
    kepalaDesa: 'Drs. H. Dwi Santoso',
    perwakilanPetani: 'Parno',
  },
  urea: {
    hetPerSak: 90000,
    transportasi: 5000,
    sewaGudang: 2000,
    atk: 2000,
    kasPoktan: 1000,
    penyandangDana: 2000,
    pengurusPoktan: 3000,
  },
  npk: {
    hetPerSak: 92000,
    transportasi: 5000,
    sewaGudang: 2000,
    atk: 2000,
    kasPoktan: 4000,
    penyandangDana: 2000,
    pengurusPoktan: 3000,
  },
  organik: {
    hetPerSak: 25600,
    transportasi: 4400,
    sewaGudang: 1000,
    atk: 1000,
    kasPoktan: 1000,
    penyandangDana: 0,
    pengurusPoktan: 2000,
  },
};

export default function KasirPoktanPage() {
  const { currentUser } = useAuth();

  // State Data Master
  const [petaniList, setPetaniList] = useState<PetaniOption[]>([]);
  const [poktanList, setPoktanList] = useState<any[]>([]);
  const [selectedPoktanId, setSelectedPoktanId] = useState<string>('SEMUA');
  const [selectedPetani, setSelectedPetani] = useState<PetaniOption | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Tab Navigasi: Kasir | Manajemen Stok & Harga | Riwayat Transaksi
  const [activeTab, setActiveTab] = useState<'KASIR' | 'STOK_HARGA' | 'RIWAYAT'>('KASIR');

  // Harga Pupuk Aktif Poktan
  const [hargaPupuk, setHargaPupuk] = useState<HargaPupukPoktan>({
    ureaPerKg: 2100,
    ureaPerSak: 105000,
    npkPerKg: 2200,
    npkPerSak: 110000,
    organikPerKg: 875,
    organikPerSak: 35000,
    catatan: 'Sesuai Berita Acara Kesepakatan Harga Jual Pupuk TA 2026',
    updatedAt: '',
    updatedBy: 'Sistem',
  });

  // State Rincian Kesepakatan Komponen Harga Jual Poktan (Sesuai Berita Acara)
  const [rincian, setRincian] = useState<any>(defaultRincianKesepakatan);
  const [applyToAllPoktan, setApplyToAllPoktan] = useState<boolean>(false);
  const [savingKesepakatan, setSavingKesepakatan] = useState<boolean>(false);
  const [pesanKesepakatanSukses, setPesanKesepakatanSukses] = useState<string>('');
  const [modalBeritaAcaraOpen, setModalBeritaAcaraOpen] = useState<boolean>(false);

  // Stok Fisik Gudang Poktan
  const [stokPoktan, setStokPoktan] = useState<any>({
    urea: { stokAwalKg: 0, masukKiosKg: 0, totalMasukKg: 0, tertebusKg: 0, sisaKg: 0, sisaSak: 0, sisaSakBulat: 0 },
    npk: { stokAwalKg: 0, masukKiosKg: 0, totalMasukKg: 0, tertebusKg: 0, sisaKg: 0, sisaSak: 0, sisaSakBulat: 0 },
    organik: { stokAwalKg: 0, masukKiosKg: 0, totalMasukKg: 0, tertebusKg: 0, sisaKg: 0, sisaSak: 0, sisaSakBulat: 0 },
  });
  const [mutasiList, setMutasiList] = useState<any[]>([]);

  // Keranjang Kasir
  const [ureaKg, setUreaKg] = useState<number>(0);
  const [npkKg, setNpkKg] = useState<number>(0);
  const [organikKg, setOrganikKg] = useState<number>(0);

  // Pembayaran Kasir
  const [metodePembayaran, setMetodePembayaran] = useState<'TUNAI' | 'TRANSFER' | 'QRIS'>('TUNAI');
  const [uangDiterima, setUangDiterima] = useState<number>(0);
  const [catatan, setCatatan] = useState('');
  const [tandaTanganPetani, setTandaTanganPetani] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [transaksiSukses, setTransaksiSukses] = useState<any | null>(null);
  const [riwayatTrx, setRiwayatTrx] = useState<any[]>([]);

  // State Form Penyesuaian Stok (Opname Gudang)
  const [opnamePupuk, setOpnamePupuk] = useState<'UREA' | 'NPK' | 'ORGANIK'>('UREA');
  const [opnameMode, setOpnameMode] = useState<'SAK' | 'KG'>('SAK');
  const [opnameJumlah, setOpnameJumlah] = useState<number>(0);
  const [opnameTipe, setOpnameTipe] = useState<'TAMBAH_STOK_MASUK' | 'KOREKSI_OPNAME'>('TAMBAH_STOK_MASUK');
  const [opnameCatatan, setOpnameCatatan] = useState<string>('');
  const [savingOpname, setSavingOpname] = useState<boolean>(false);
  const [pesanOpnameSukses, setPesanOpnameSukses] = useState<string>('');

  // Hitung Otomatis Total Biaya per Sak & Harga per Kg
  const totalUreaSak =
    (parseFloat(rincian.urea?.hetPerSak) || 0) +
    (parseFloat(rincian.urea?.transportasi) || 0) +
    (parseFloat(rincian.urea?.sewaGudang) || 0) +
    (parseFloat(rincian.urea?.atk) || 0) +
    (parseFloat(rincian.urea?.kasPoktan) || 0) +
    (parseFloat(rincian.urea?.penyandangDana) || 0) +
    (parseFloat(rincian.urea?.pengurusPoktan) || 0);
  const hargaUreaKg = Math.round(totalUreaSak / 50);

  const totalNpkSak =
    (parseFloat(rincian.npk?.hetPerSak) || 0) +
    (parseFloat(rincian.npk?.transportasi) || 0) +
    (parseFloat(rincian.npk?.sewaGudang) || 0) +
    (parseFloat(rincian.npk?.atk) || 0) +
    (parseFloat(rincian.npk?.kasPoktan) || 0) +
    (parseFloat(rincian.npk?.penyandangDana) || 0) +
    (parseFloat(rincian.npk?.pengurusPoktan) || 0);
  const hargaNpkKg = Math.round(totalNpkSak / 50);

  const totalOrgSak =
    (parseFloat(rincian.organik?.hetPerSak) || 0) +
    (parseFloat(rincian.organik?.transportasi) || 0) +
    (parseFloat(rincian.organik?.sewaGudang) || 0) +
    (parseFloat(rincian.organik?.atk) || 0) +
    (parseFloat(rincian.organik?.kasPoktan) || 0) +
    (parseFloat(rincian.organik?.pengurusPoktan) || 0);
  const hargaOrgKg = Math.round(totalOrgSak / 40); // 1 Sak Organik = 40 Kg

  // Hitung Subtotal & Total Kasir berdasarkan Harga Aktif Poktan
  const subtotalUrea = ureaKg * hargaPupuk.ureaPerKg;
  const subtotalNpk = npkKg * hargaPupuk.npkPerKg;
  const subtotalOrganik = organikKg * hargaPupuk.organikPerKg;
  const totalBayar = subtotalUrea + subtotalNpk + subtotalOrganik;
  const kembalian = Math.max(0, uangDiterima - totalBayar);

  // Cek Defisit Stok Fisik Gudang Poktan
  const isUreaExceedsStok = ureaKg > (stokPoktan.urea?.sisaKg ?? 0);
  const isNpkExceedsStok = npkKg > (stokPoktan.npk?.sisaKg ?? 0);
  const isOrgExceedsStok = organikKg > (stokPoktan.organik?.sisaKg ?? 0);
  const hasStokDeficit = isUreaExceedsStok || isNpkExceedsStok || isOrgExceedsStok;

  // Fetch Data Awal & Sinkronisasi Realtime
  const loadData = async (poktanIdToLoad?: string) => {
    try {
      setLoading(true);
      const pid = poktanIdToLoad !== undefined ? poktanIdToLoad : selectedPoktanId;

      const [resPetani, resPoktan, resTrx, resStokHarga] = await Promise.all([
        fetch('/api/petani'),
        fetch('/api/poktan'),
        fetch(`/api/kasir-poktan?poktanId=${encodeURIComponent(pid)}`),
        fetch(`/api/stok-harga-poktan?poktanId=${encodeURIComponent(pid)}`),
      ]);

      const jsonPet = await resPetani.json();
      const jsonPok = await resPoktan.json();
      const jsonTrx = await resTrx.json();
      const jsonStok = await resStokHarga.json();

      if (jsonPok.success) {
        setPoktanList(jsonPok.data);
        if (currentUser?.role === 'POKTAN' && currentUser?.wilayah && selectedPoktanId === 'SEMUA') {
          const matched = jsonPok.data.find(
            (p: any) =>
              p.nama.toLowerCase().includes(currentUser.wilayah?.toLowerCase()) ||
              currentUser.wilayah?.toLowerCase().includes(p.nama.toLowerCase())
          );
          if (matched) setSelectedPoktanId(matched.id);
        }
      }

      if (jsonPet.success && Array.isArray(jsonPet.data)) {
        setPetaniList(jsonPet.data);
      }

      if (jsonTrx.success) {
        setRiwayatTrx(jsonTrx.data);
      }

      if (jsonStok.success && jsonStok.data) {
        if (jsonStok.data.hargaPupuk) {
          setHargaPupuk(jsonStok.data.hargaPupuk);
        }
        if (jsonStok.data.rincianKesepakatan) {
          setRincian(jsonStok.data.rincianKesepakatan);
        }
        if (jsonStok.data.stokGudang) {
          setStokPoktan(jsonStok.data.stokGudang);
        }
        if (jsonStok.data.mutasi) {
          setMutasiList(jsonStok.data.mutasi);
        }
      } else if (jsonTrx.stokPoktan) {
        setStokPoktan(jsonTrx.stokPoktan);
        if (jsonTrx.hargaPupuk) {
          setHargaPupuk(jsonTrx.hargaPupuk);
        }
      }
    } catch (e) {
      console.error('Error loadData kasir-poktan:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedPoktanId);
  }, [selectedPoktanId]);

  // Cari Poktan Aktif
  const activePoktanObj = poktanList.find((p) => p.id === selectedPoktanId);
  const activePoktanName = activePoktanObj?.nama || (selectedPoktanId === 'SEMUA' ? 'Semua Kelompok Tani' : 'Kelompok Tani');

  // Filter Petani berdasarkan Poktan & Kata Kunci
  const filteredPetani = petaniList.filter((p) => {
    const matchPoktan = selectedPoktanId === 'SEMUA' || p.poktanId === selectedPoktanId;
    const matchSearch =
      searchQuery === '' ||
      p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nik.includes(searchQuery);
    return matchPoktan && matchSearch;
  });

  // Ambil Alokasi Aktif Petani Terpilih
  const activeAlokasi = selectedPetani?.alokasiPupuk?.[0] || {
    musimTanam: 'MT 1',
    jatahUreaKg: 250,
    sisaUreaKg: 250,
    jatahNpkKg: 200,
    sisaNpkKg: 200,
    jatahOrganikKg: 100,
    sisaOrganikKg: 100,
  };

  // Reset Form Kasir
  const handleResetForm = () => {
    setSelectedPetani(null);
    setUreaKg(0);
    setNpkKg(0);
    setOrganikKg(0);
    setUangDiterima(0);
    setCatatan('');
    setTandaTanganPetani('');
    setTransaksiSukses(null);
  };

  // Submit Transaksi Kasir
  const handleSubmitTransaksi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPetani) {
      showWarning('Pilih Petani', 'Silakan pilih petani di panel sebelah kiri terlebih dahulu!');
      return;
    }
    if (totalBayar === 0) {
      showWarning('Jumlah Pupuk Kosong', 'Tentukan minimal satu jenis pupuk yang ditebus!');
      return;
    }
    if (hasStokDeficit) {
      showError('Stok Tidak Cukup', 'Transaksi ditolak! Stok fisik pupuk di gudang Poktan tidak mencukupi untuk jumlah yang diminta.');
      return;
    }
    if (ureaKg > activeAlokasi.sisaUreaKg) {
      showWarning('Melebihi Kuota', `Jumlah Urea (${ureaKg} Kg) melebihi sisa kuota e-RDKK petani (${activeAlokasi.sisaUreaKg} Kg)!`);
      return;
    }
    if (npkKg > activeAlokasi.sisaNpkKg) {
      showWarning('Melebihi Kuota', `Jumlah NPK (${npkKg} Kg) melebihi sisa kuota e-RDKK petani (${activeAlokasi.sisaNpkKg} Kg)!`);
      return;
    }
    if (organikKg > activeAlokasi.sisaOrganikKg) {
      showWarning('Melebihi Kuota', `Jumlah Organik (${organikKg} Kg) melebihi sisa kuota e-RDKK petani (${activeAlokasi.sisaOrganikKg} Kg)!`);
      return;
    }
    if (metodePembayaran === 'TUNAI' && uangDiterima < totalBayar) {
      showWarning('Uang Tidak Cukup', `Jumlah uang tunai diterima (Rp ${uangDiterima.toLocaleString('id-ID')}) kurang dari total tagihan (Rp ${totalBayar.toLocaleString('id-ID')})!`);
      return;
    }

    try {
      setSubmitting(true);
      const finalTtd = tandaTanganPetani || generateAutoSignatureSvg(selectedPetani.nama);
      const res = await fetch('/api/kasir-poktan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petaniId: selectedPetani.id,
          poktanId: selectedPetani.poktanId,
          namaPoktan: (selectedPetani as any).poktan?.nama || selectedPetani.namaPoktan || activePoktanName,
          desa: selectedPetani.desa || activePoktanObj?.desa || 'Kediren',
          namaPetani: selectedPetani.nama,
          nik: selectedPetani.nik,
          jumlahUreaKg: ureaKg,
          jumlahNpkKg: npkKg,
          jumlahOrganikKg: organikKg,
          totalBayar,
          metodePembayaran,
          jumlahUangDiterima: uangDiterima || totalBayar,
          kembalian,
          namaKasir: currentUser?.name || 'Pengurus Poktan',
          tandaTanganPetani: finalTtd,
          catatan,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showSuccess('Penebusan Berhasil', `Transaksi penebusan ${json.data.nomorNota} berhasil diproses.`);
        setTransaksiSukses(json.data);
        loadData(selectedPoktanId);
      } else {
        showError('Gagal Penebusan', json.error || 'Gagal memproses transaksi penebusan.');
      }
    } catch (e: any) {
      showError('Gagal Koneksi', 'Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  // Simpan Komponen Rincian Kesepakatan Harga Pupuk (Sesuai Berita Acara)
  const handleSimpanKesepakatan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPoktanId === 'SEMUA' && !applyToAllPoktan) {
      showWarning('Pilih Poktan', 'Pilih salah satu Kelompok Tani spesifik atau centang opsi "Terapkan ke Seluruh Poktan se-Kecamatan"!');
      return;
    }

    try {
      setSavingKesepakatan(true);
      setPesanKesepakatanSukses('');

      const res = await fetch('/api/stok-harga-poktan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_KESEPAKATAN_HARGA',
          poktanId: selectedPoktanId,
          namaPoktan: activePoktanName,
          desa: activePoktanObj?.desa || 'Kediren',
          rincianKesepakatan: rincian,
          applyToAllPoktan,
          petugas: currentUser?.name || 'Pengurus Poktan',
        }),
      });

      const json = await res.json();
      if (json.success) {
        showSuccess('Kesepakatan Disimpan', json.message || 'Harga kesepakatan pupuk berhasil diperbarui!');
        setPesanKesepakatanSukses(json.message);
        if (json.hargaPupuk) setHargaPupuk(json.hargaPupuk);
        if (json.rincianKesepakatan) setRincian(json.rincianKesepakatan);
        loadData(selectedPoktanId);
        setTimeout(() => setPesanKesepakatanSukses(''), 6000);
      } else {
        showError('Gagal Menyimpan', json.error || 'Gagal menyimpan kesepakatan harga.');
      }
    } catch (err: any) {
      showError('Gagal Koneksi', 'Terjadi kesalahan koneksi.');
    } finally {
      setSavingKesepakatan(false);
    }
  };

  // Tombol Cepat: Muat Preset Berita Acara (Sesuai Gambar Excel)
  const handleLoadPresetExcel = () => {
    setRincian(JSON.parse(JSON.stringify(defaultRincianKesepakatan)));
    showSuccess('Preset Dimuat', 'Preset angka kesepakatan musyawarah berhasil dimuat (Urea Rp 105.000 / NPK Rp 110.000 / Organik Rp 35.000 per sak)!');
  };

  // Tombol Cepat: Reset ke HET Murni Pusat
  const handleResetKeHetMurni = () => {
    setRincian({
      ...rincian,
      urea: {
        hetPerSak: 112500, // Rp 2.250/kg
        transportasi: 0,
        sewaGudang: 0,
        atk: 0,
        kasPoktan: 0,
        penyandangDana: 0,
        pengurusPoktan: 0,
      },
      npk: {
        hetPerSak: 115000, // Rp 2.300/kg
        transportasi: 0,
        sewaGudang: 0,
        atk: 0,
        kasPoktan: 0,
        penyandangDana: 0,
        pengurusPoktan: 0,
      },
      organik: {
        hetPerSak: 32000, // Rp 800/kg * 40kg
        transportasi: 0,
        sewaGudang: 0,
        atk: 0,
        kasPoktan: 0,
        penyandangDana: 0,
        pengurusPoktan: 0,
      },
    });
  };

  // Simpan Penyesuaian Stok (Opname Gudang / Tambah Pasokan)
  const handleSimpanOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPoktanId === 'SEMUA') {
      showWarning('Pilih Poktan', 'Pilih salah satu Kelompok Tani (Poktan) spesifik untuk melakukan penyesuaian stok!');
      return;
    }
    if (opnameJumlah <= 0) {
      showWarning('Jumlah Tidak Valid', 'Masukkan jumlah pupuk yang valid (lebih dari 0)!');
      return;
    }

    const sakKg = opnamePupuk === 'ORGANIK' ? 40 : 50;
    const jumlahKg = opnameMode === 'SAK' ? opnameJumlah * sakKg : opnameJumlah;

    const payloadStok: any = {
      ureaKg: opnamePupuk === 'UREA' ? jumlahKg : opnameTipe === 'KOREKSI_OPNAME' ? (stokPoktan.urea?.sisaKg ?? 0) : 0,
      npkKg: opnamePupuk === 'NPK' ? jumlahKg : opnameTipe === 'KOREKSI_OPNAME' ? (stokPoktan.npk?.sisaKg ?? 0) : 0,
      organikKg: opnamePupuk === 'ORGANIK' ? jumlahKg : opnameTipe === 'KOREKSI_OPNAME' ? (stokPoktan.organik?.sisaKg ?? 0) : 0,
      tipe: opnameTipe,
    };

    try {
      setSavingOpname(true);
      setPesanOpnameSukses('');
      const res = await fetch('/api/stok-harga-poktan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PENYESUAIAN_STOK',
          poktanId: selectedPoktanId,
          namaPoktan: activePoktanName,
          desa: activePoktanObj?.desa || 'Kediren',
          penyesuaianStok: payloadStok,
          catatan: opnameCatatan || `Penyesuaian stok fisik gudang ${opnamePupuk} sebesar ${jumlahKg} Kg (${opnameJumlah} ${opnameMode})`,
          petugas: currentUser?.name || 'Pengurus Poktan',
        }),
      });

      const json = await res.json();
      if (json.success) {
        showSuccess('Stok Disesuaikan', `Stok gudang berhasil disesuaikan (${opnamePupuk}: ${jumlahKg} Kg)!`);
        setPesanOpnameSukses(`✅ Stok gudang berhasil disesuaikan (${opnamePupuk}: ${jumlahKg} Kg)!`);
        setOpnameJumlah(0);
        setOpnameCatatan('');
        loadData(selectedPoktanId);
        setTimeout(() => setPesanOpnameSukses(''), 5000);
      } else {
        showError('Gagal Penyesuaian', json.error || 'Gagal menyesuaikan stok gudang.');
      }
    } catch (err: any) {
      showError('Gagal Koneksi', 'Terjadi kesalahan koneksi.');
    } finally {
      setSavingOpname(false);
    }
  };

  // Batalkan / Hapus Transaksi Kasir Poktan (Rollback Kuota & Stok Gudang)
  const handleBatalTransaksi = async (trx: any) => {
    const confirmBatal = await showDeleteConfirm(
      trx.nomorNota,
      `Batalkan transaksi penebusan <strong>${trx.nomorNota}</strong> atas nama <strong>${trx.namaPetani}</strong>?<br/><br/><span class="text-xs text-slate-600 block text-left bg-slate-50 p-2.5 rounded-xl border border-slate-200">Pembatalan ini otomatis:<br/>&bull; Mengembalikan kuota e-RDKK petani (Urea: ${trx.jumlahUreaKg} Kg, NPK: ${trx.jumlahNpkKg} Kg, Organik: ${trx.jumlahOrganikKg} Kg)<br/>&bull; Mengembalikan stok fisik pupuk di gudang Poktan<br/>&bull; Mencatat mutasi pembatalan resmi</span>`
    );
    if (!confirmBatal) return;

    try {
      const res = await fetch(`/api/kasir-poktan?id=${trx.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showSuccess('Transaksi Dibatalkan', json.message || 'Transaksi berhasil dibatalkan & kuota petani telah dikembalikan!');
        loadData(selectedPoktanId);
      } else {
        showError('Gagal Membatalkan', json.error || 'Gagal membatalkan transaksi');
      }
    } catch (e: any) {
      showError('Terjadi Kesalahan', e.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-12 space-y-6">
      {/* HEADER UTAMA APLIKASI KASIR POKTAN */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden no-print">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold mb-3">
              <ShoppingCart className="w-3.5 h-3.5" />
              Sistem POS Kasir & Penetapan Harga Jual Berita Acara Poktan
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Kasir & Manajemen Stok Poktan
            </h1>
            <p className="text-emerald-100/80 text-xs sm:text-sm mt-1 max-w-2xl">
              Sistem penebusan pupuk bersubsidi dengan transparansi komponen harga jual kesepakatan musyawarah se-Kecamatan (HET, transport, gudang, kas, ATK, operasional) dan cetak Berita Acara resmi untuk ditempel di gudang.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-white/20 text-right">
              <span className="text-[11px] text-emerald-200 block font-semibold">Kasir / Petugas:</span>
              <strong className="text-sm font-bold text-white flex items-center gap-1.5 justify-end">
                <UserCheck className="w-4 h-4 text-emerald-300" />
                {currentUser?.name || 'Pengurus Poktan'}
              </strong>
            </div>

            {/* TAB NAVIGATION BUTTONS */}
            <div className="flex bg-emerald-950/70 p-1.5 rounded-2xl border border-emerald-700/50 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('KASIR')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'KASIR' ? 'bg-emerald-500 text-white shadow-md' : 'text-emerald-200 hover:text-white'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Kasir Penebusan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('STOK_HARGA')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'STOK_HARGA' ? 'bg-emerald-500 text-white shadow-md' : 'text-emerald-200 hover:text-white'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                Kesepakatan Harga & Stok
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('RIWAYAT')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'RIWAYAT' ? 'bg-emerald-500 text-white shadow-md' : 'text-emerald-200 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Riwayat ({riwayatTrx.length})
              </button>
            </div>
          </div>
        </div>

        {/* INDIKATOR STOK GUDANG POKTAN TERINTEGRASI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-emerald-700/50 relative z-10">
          {/* UREA CARD */}
          <div className="bg-emerald-950/40 border border-emerald-700/40 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-300 font-bold uppercase tracking-wider">Stok Gudang Urea</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Rp {hargaPupuk.ureaPerSak?.toLocaleString('id-ID')}/Sak
                </span>
              </div>
              <strong className="text-xl font-black text-white mt-1 block">
                {stokPoktan.urea?.sisaKg?.toLocaleString('id-ID') || 0} <span className="text-xs font-normal text-emerald-300">Kg</span>
              </strong>
              <div className="flex items-center gap-2 text-[10px] text-emerald-300/80 mt-1">
                <span>≈ {stokPoktan.urea?.sisaSak || 0} Sak (@ 50 Kg)</span>
                <span>&bull;</span>
                <span>@ Rp {hargaPupuk.ureaPerKg?.toLocaleString('id-ID')}/Kg</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center font-black text-xs">
              UREA
            </div>
          </div>

          {/* NPK CARD */}
          <div className="bg-emerald-950/40 border border-emerald-700/40 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-blue-300 font-bold uppercase tracking-wider">Stok Gudang NPK Phonska</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Rp {hargaPupuk.npkPerSak?.toLocaleString('id-ID')}/Sak
                </span>
              </div>
              <strong className="text-xl font-black text-white mt-1 block">
                {stokPoktan.npk?.sisaKg?.toLocaleString('id-ID') || 0} <span className="text-xs font-normal text-blue-300">Kg</span>
              </strong>
              <div className="flex items-center gap-2 text-[10px] text-blue-300/80 mt-1">
                <span>≈ {stokPoktan.npk?.sisaSak || 0} Sak (@ 50 Kg)</span>
                <span>&bull;</span>
                <span>@ Rp {hargaPupuk.npkPerKg?.toLocaleString('id-ID')}/Kg</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center font-black text-xs">
              NPK
            </div>
          </div>

          {/* ORGANIK CARD */}
          <div className="bg-emerald-950/40 border border-emerald-700/40 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-amber-300 font-bold uppercase tracking-wider">Stok Gudang Organik</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Rp {hargaPupuk.organikPerSak?.toLocaleString('id-ID')}/Sak (40kg)
                </span>
              </div>
              <strong className="text-xl font-black text-white mt-1 block">
                {stokPoktan.organik?.sisaKg?.toLocaleString('id-ID') || 0} <span className="text-xs font-normal text-amber-300">Kg</span>
              </strong>
              <div className="flex items-center gap-2 text-[10px] text-amber-300/80 mt-1">
                <span>≈ {stokPoktan.organik?.sisaSak || 0} Sak (@ 40 Kg)</span>
                <span>&bull;</span>
                <span>@ Rp {hargaPupuk.organikPerKg?.toLocaleString('id-ID')}/Kg</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center font-black text-xs">
              ORG
            </div>
          </div>
        </div>

        {/* BANNER HARGA KESEPAKATAN & TOMBOL BERITA ACARA */}
        <div className="mt-4 pt-3 border-t border-emerald-700/40 flex flex-wrap items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">Kelompok Tani:</span>
            <span className="bg-emerald-700/50 px-2.5 py-0.5 rounded-lg text-emerald-100 font-bold">
              {activePoktanName}
            </span>
            <span className="text-emerald-300/80 text-[11px]">
              &bull; Berita Acara: <strong className="text-white">{rincian.nomorBeritaAcara || '01/BA-POKTAN/LMB/2026'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 mt-2 sm:mt-0">
            <button
              type="button"
              onClick={() => setModalBeritaAcaraOpen(true)}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck className="w-4 h-4 text-slate-900" />
              Cetak Berita Acara (Siap Tempel Gudang)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('STOK_HARGA')}
              className="text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-300" />
              Kelola Komponen Biaya
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: KASIR PENEBUSAN PUPUK */}
      {/* ========================================================================= */}
      {activeTab === 'KASIR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
          {/* KOLOM KIRI (5 Kolom): Pilih Petani & Cek Kuota e-RDKK */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-emerald-600" />
                1. Pilih Petani Penebus
              </h2>

              {/* Selector Poktan */}
              <div className="mb-3">
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                  Kelompok Tani (Poktan):
                </label>
                <select
                  value={selectedPoktanId}
                  onChange={(e) => {
                    setSelectedPoktanId(e.target.value);
                    setSelectedPetani(null);
                  }}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="SEMUA">-- Semua Kelompok Tani --</option>
                  {poktanList.map((pok) => (
                    <option key={pok.id} value={pok.id}>
                      {pok.nama} (Desa {pok.desa})
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Petani */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ketik NIK atau Nama Petani..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Daftar Petani */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-2xl">
                {loading ? (
                  <p className="text-xs text-center text-slate-400 py-6">Memuat data petani...</p>
                ) : filteredPetani.length === 0 ? (
                  <p className="text-xs text-center text-slate-400 py-6">Petani tidak ditemukan</p>
                ) : (
                  filteredPetani.slice(0, 15).map((p) => {
                    const isSelected = selectedPetani?.id === p.id;
                    const alo = p.alokasiPupuk?.[0];
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPetani(p);
                          setUreaKg(0);
                          setNpkKg(0);
                          setOrganikKg(0);
                          setTandaTanganPetani(generateAutoSignatureSvg(p.nama));
                        }}
                        className={`p-3 text-left cursor-pointer transition flex items-center justify-between ${
                          isSelected ? 'bg-emerald-50 border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">{p.nama}</p>
                          <p className="text-[10px] font-mono text-slate-500">NIK: {p.nik}</p>
                          <p className="text-[10px] text-slate-400">
                            {(p as any).poktan?.nama || p.namaPoktan} &bull; Desa {p.desa}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Sisa: {alo?.sisaUreaKg ?? 250} Kg Urea
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Kartu Rincian Kuota e-RDKK Petani Terpilih */}
            {selectedPetani && (
              <div className="bg-emerald-50/60 rounded-3xl border border-emerald-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Petani Terpilih e-RDKK
                    </span>
                    <h3 className="text-base font-black text-slate-900">{selectedPetani.nama}</h3>
                    <p className="text-xs font-mono text-slate-600">NIK: {selectedPetani.nik}</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 text-center">
                  <div className="bg-white p-2.5 rounded-2xl border border-emerald-100">
                    <span className="text-[10px] font-bold text-slate-500 block">Sisa Urea</span>
                    <strong className="text-sm font-black text-emerald-700">
                      {activeAlokasi.sisaUreaKg} <span className="text-[10px] font-normal">Kg</span>
                    </strong>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      (Jatah: {activeAlokasi.jatahUreaKg} Kg)
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-2xl border border-emerald-100">
                    <span className="text-[10px] font-bold text-slate-500 block">Sisa NPK</span>
                    <strong className="text-sm font-black text-blue-700">
                      {activeAlokasi.sisaNpkKg} <span className="text-[10px] font-normal">Kg</span>
                    </strong>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      (Jatah: {activeAlokasi.jatahNpkKg} Kg)
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-2xl border border-emerald-100">
                    <span className="text-[10px] font-bold text-slate-500 block">Sisa Organik</span>
                    <strong className="text-sm font-black text-amber-700">
                      {activeAlokasi.sisaOrganikKg} <span className="text-[10px] font-normal">Kg</span>
                    </strong>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      (Jatah: {activeAlokasi.jatahOrganikKg} Kg)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* KOLOM KANAN (7 Kolom): Input Penebusan, Hitung Dinamis & Kasir */}
          <div className="lg:col-span-7 space-y-5">
            <form onSubmit={handleSubmitTransaksi} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600" />
                    2. Keranjang Penebusan Pupuk Poktan
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Sesuai Berita Acara Kesepakatan Harga Jual Poktan & memotong stok gudang fisik.
                  </p>
                </div>
                {selectedPetani && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Reset Pilihan
                  </button>
                )}
              </div>

              {hasStokDeficit && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Peringatan Defisit Stok Gudang!</strong>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      Jumlah pupuk yang dimasukkan melebihi sisa fisik di gudang Poktan. Harap kurangi jumlah tebus atau lakukan penyesuaian stok di tab Kesepakatan Harga & Stok.
                    </p>
                  </div>
                </div>
              )}

              {!selectedPetani ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
                  <p className="text-sm font-medium">Silakan pilih petani di panel sebelah kiri terlebih dahulu.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* BARIS ITEM 1: UREA */}
                  <div className={`p-4 rounded-2xl border transition ${
                    isUreaExceedsStok ? 'bg-rose-50/50 border-rose-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900">Pupuk UREA Bersubsidi</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                            Gudang: {stokPoktan.urea?.sisaKg || 0} Kg
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Harga Kesepakatan: <strong>Rp {hargaPupuk.ureaPerSak?.toLocaleString('id-ID')} / Sak (50kg)</strong> &bull; (Rp {hargaPupuk.ureaPerKg?.toLocaleString('id-ID')} / Kg)
                        </p>
                      </div>
                      <span className="text-xs font-bold text-emerald-700">
                        Rp {subtotalUrea.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                        <input
                          type="number"
                          min="0"
                          max={activeAlokasi.sisaUreaKg}
                          step="1"
                          value={ureaKg || ''}
                          onChange={(e) => setUreaKg(Math.min(activeAlokasi.sisaUreaKg, Math.max(0, parseFloat(e.target.value) || 0)))}
                          placeholder="0"
                          className="w-full text-sm font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-right focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-semibold text-slate-500">Kg</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setUreaKg(Math.min(activeAlokasi.sisaUreaKg, ureaKg + 50))}
                          className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-200 hover:bg-emerald-50 text-slate-700 cursor-pointer"
                        >
                          +1 Sak (50kg)
                        </button>
                        <button
                          type="button"
                          onClick={() => setUreaKg(Math.min(activeAlokasi.sisaUreaKg, ureaKg + 100))}
                          className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-200 hover:bg-emerald-50 text-slate-700 cursor-pointer"
                        >
                          +2 Sak (100kg)
                        </button>
                        <button
                          type="button"
                          onClick={() => setUreaKg(activeAlokasi.sisaUreaKg)}
                          className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 cursor-pointer"
                        >
                          Habiskan Kuota
                        </button>
                      </div>
                    </div>
                    {isUreaExceedsStok && (
                      <p className="text-[11px] text-rose-600 font-bold mt-1.5">
                        ⚠️ Stok gudang Poktan tersisa {stokPoktan.urea?.sisaKg || 0} Kg (tidak cukup untuk {ureaKg} Kg).
                      </p>
                    )}
                  </div>

                  {/* BARIS ITEM 2: NPK PHONSKA */}
                  <div className={`p-4 rounded-2xl border transition ${
                    isNpkExceedsStok ? 'bg-rose-50/50 border-rose-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900">Pupuk NPK PHONSKA Bersubsidi</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                            Gudang: {stokPoktan.npk?.sisaKg || 0} Kg
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Harga Kesepakatan: <strong>Rp {hargaPupuk.npkPerSak?.toLocaleString('id-ID')} / Sak (50kg)</strong> &bull; (Rp {hargaPupuk.npkPerKg?.toLocaleString('id-ID')} / Kg)
                        </p>
                      </div>
                      <span className="text-xs font-bold text-blue-700">
                        Rp {subtotalNpk.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                        <input
                          type="number"
                          min="0"
                          max={activeAlokasi.sisaNpkKg}
                          step="1"
                          value={npkKg || ''}
                          onChange={(e) => setNpkKg(Math.min(activeAlokasi.sisaNpkKg, Math.max(0, parseFloat(e.target.value) || 0)))}
                          placeholder="0"
                          className="w-full text-sm font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-right focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-xs font-semibold text-slate-500">Kg</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setNpkKg(Math.min(activeAlokasi.sisaNpkKg, npkKg + 50))}
                          className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-200 hover:bg-blue-50 text-slate-700 cursor-pointer"
                        >
                          +1 Sak (50kg)
                        </button>
                        <button
                          type="button"
                          onClick={() => setNpkKg(Math.min(activeAlokasi.sisaNpkKg, npkKg + 100))}
                          className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-200 hover:bg-blue-50 text-slate-700 cursor-pointer"
                        >
                          +2 Sak (100kg)
                        </button>
                        <button
                          type="button"
                          onClick={() => setNpkKg(activeAlokasi.sisaNpkKg)}
                          className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 cursor-pointer"
                        >
                          Habiskan Kuota
                        </button>
                      </div>
                    </div>
                    {isNpkExceedsStok && (
                      <p className="text-[11px] text-rose-600 font-bold mt-1.5">
                        ⚠️ Stok gudang Poktan tersisa {stokPoktan.npk?.sisaKg || 0} Kg (tidak cukup untuk {npkKg} Kg).
                      </p>
                    )}
                  </div>

                  {/* BARIS ITEM 3: ORGANIK (40 KG) */}
                  <div className={`p-4 rounded-2xl border transition ${
                    isOrgExceedsStok ? 'bg-rose-50/50 border-rose-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900">Pupuk ORGANIK (Petroganik)</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                            Gudang: {stokPoktan.organik?.sisaKg || 0} Kg
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Harga Kesepakatan: <strong>Rp {hargaPupuk.organikPerSak?.toLocaleString('id-ID')} / Sak (40 Kg)</strong> &bull; (Rp {hargaPupuk.organikPerKg?.toLocaleString('id-ID')} / Kg)
                        </p>
                      </div>
                      <span className="text-xs font-bold text-amber-700">
                        Rp {subtotalOrganik.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                        <input
                          type="number"
                          min="0"
                          max={activeAlokasi.sisaOrganikKg}
                          step="1"
                          value={organikKg || ''}
                          onChange={(e) => setOrganikKg(Math.min(activeAlokasi.sisaOrganikKg, Math.max(0, parseFloat(e.target.value) || 0)))}
                          placeholder="0"
                          className="w-full text-sm font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-right focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-xs font-semibold text-slate-500">Kg</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setOrganikKg(Math.min(activeAlokasi.sisaOrganikKg, organikKg + 40))}
                          className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-200 hover:bg-amber-50 text-slate-700 cursor-pointer"
                        >
                          +1 Sak (40kg)
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrganikKg(Math.min(activeAlokasi.sisaOrganikKg, organikKg + 80))}
                          className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-200 hover:bg-amber-50 text-slate-700 cursor-pointer"
                        >
                          +2 Sak (80kg)
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrganikKg(activeAlokasi.sisaOrganikKg)}
                          className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 cursor-pointer"
                        >
                          Habiskan Kuota
                        </button>
                      </div>
                    </div>
                    {isOrgExceedsStok && (
                      <p className="text-[11px] text-rose-600 font-bold mt-1.5">
                        ⚠️ Stok gudang Poktan tersisa {stokPoktan.organik?.sisaKg || 0} Kg (tidak cukup untuk {organikKg} Kg).
                      </p>
                    )}
                  </div>

                  {/* TOTAL PEMBAYARAN & METODE */}
                  <div className="pt-4 border-t border-slate-200 space-y-4">
                    <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block font-semibold">TOTAL TEBUS PUPUK:</span>
                        <span className="text-[11px] text-emerald-400">
                          {ureaKg} Kg Urea &bull; {npkKg} Kg NPK &bull; {organikKg} Kg Organik
                        </span>
                      </div>
                      <div className="text-right">
                        <strong className="text-2xl font-black text-emerald-400">
                          Rp {totalBayar.toLocaleString('id-ID')}
                        </strong>
                      </div>
                    </div>

                    {/* Metode Pembayaran */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 block">Metode Pembayaran:</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['TUNAI', 'QRIS', 'TRANSFER'] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setMetodePembayaran(m)}
                              className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                                metodePembayaran === m
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      {metodePembayaran === 'TUNAI' && (
                        <div>
                          <label className="text-xs font-bold text-slate-700 mb-1 block">Uang Diterima Petani:</label>
                          <input
                            type="number"
                            min={totalBayar}
                            value={uangDiterima || ''}
                            onChange={(e) => setUangDiterima(parseFloat(e.target.value) || 0)}
                            placeholder={`Min Rp ${totalBayar.toLocaleString('id-ID')}`}
                            className="w-full text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                          />
                          {uangDiterima > totalBayar && (
                            <p className="text-xs text-emerald-700 font-bold mt-1">
                              Kembalian: Rp {kembalian.toLocaleString('id-ID')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">Catatan Penebusan (Opsional):</label>
                      <input
                        type="text"
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        placeholder="Contoh: Ditebus langsung oleh petani bersangkutan, lunas."
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                      />
                    </div>

                    {/* Tanda Tangan Digital Petani Penerima Pupuk */}
                    <PetaniSignaturePad
                      namaPetani={selectedPetani.nama}
                      signature={tandaTanganPetani}
                      onChange={setTandaTanganPetani}
                      disabled={submitting}
                    />

                    <button
                      type="submit"
                      disabled={submitting || totalBayar === 0 || hasStokDeficit}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black rounded-2xl text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {submitting ? 'Menyimpan Transaksi...' : hasStokDeficit ? 'Stok Gudang Tidak Cukup' : 'Selesaikan Transaksi & Cetak Struk Penebusan'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MANAJEMEN KOMPONEN KESEPAKATAN HARGA & STOK GUDANG */}
      {/* ========================================================================= */}
      {activeTab === 'STOK_HARGA' && (
        <div className="space-y-6 no-print">
          {/* BAR FILTER / PILIH POKTAN */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold mb-1">
                <Scale className="w-3.5 h-3.5" />
                Musyawarah Harga Jual Pupuk Bersubsidi
              </div>
              <h2 className="text-base font-black text-slate-900">
                Komponen Kesepakatan Harga Jual Pupuk se-Kecamatan & Poktan
              </h2>
              <p className="text-xs text-slate-500">
                Rincian komponen biaya operasional riil per sak (HET, transport, sewa gudang, kas, ATK, operasional) dan Berita Acara siap tempel di gudang.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-bold text-slate-700 shrink-0">Poktan:</label>
              <select
                value={selectedPoktanId}
                onChange={(e) => setSelectedPoktanId(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="SEMUA">-- Semua Poktan (Standar Kecamatan) --</option>
                {poktanList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} (Desa {p.desa})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setModalBeritaAcaraOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                Cetak Berita Acara
              </button>

              <button
                type="button"
                onClick={() => loadData(selectedPoktanId)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                title="Refresh Data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* FORM BESAR: 3 TABEL RINCIAN KOMPONEN KESEPAKATAN HARGA JUAL PUPUK */}
          <form onSubmit={handleSimpanKesepakatan} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  Rincian Komponen Biaya Penjualan ke Petani (Dihitung per Sak)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Ubah angka komponen di bawah ini untuk menetapkan harga jual resmi yang disepakati bersama.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadPresetExcel}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg border border-emerald-200 transition cursor-pointer"
                >
                  Preset Contoh Musyawarah
                </button>
                <button
                  type="button"
                  onClick={handleResetKeHetMurni}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition cursor-pointer"
                >
                  HET Pusat Saja
                </button>
              </div>
            </div>

            {pesanKesepakatanSukses && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {pesanKesepakatanSukses}
              </div>
            )}

            {/* DATA BERITA ACARA MUSYAWARAH */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Tahun Anggaran:</label>
                <input
                  type="number"
                  value={rincian.tahunAnggaran || 2026}
                  onChange={(e) => setRincian({ ...rincian, tahunAnggaran: parseInt(e.target.value) || 2026 })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Nomor Berita Acara:</label>
                <input
                  type="text"
                  value={rincian.nomorBeritaAcara || ''}
                  onChange={(e) => setRincian({ ...rincian, nomorBeritaAcara: e.target.value })}
                  placeholder="01/BA-POKTAN/LMB/2026"
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Tanggal Musyawarah:</label>
                <input
                  type="date"
                  value={rincian.tanggalMusyawarah || '2026-01-15'}
                  onChange={(e) => setRincian({ ...rincian, tanggalMusyawarah: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Lokasi Pertemuan:</label>
                <input
                  type="text"
                  value={rincian.lokasiMusyawarah || ''}
                  onChange={(e) => setRincian({ ...rincian, lokasiMusyawarah: e.target.value })}
                  placeholder="Balai Pertemuan / Gudang Poktan"
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5"
                />
              </div>
            </div>

            {/* 3 TABEL KOMPONEN BIAYA (PERSIS SEPERTI EXCEL USER) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* TABEL 1: UREA (50 KG) */}
              <div className="border border-emerald-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-emerald-700 text-white p-3 font-black text-xs uppercase tracking-wide flex justify-between items-center">
                  <span>1. PUPUK UREA (Sak @ 50 Kg)</span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">50 Kg</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-emerald-50 text-slate-700 font-bold border-b border-emerald-100">
                    <tr>
                      <th className="py-2 px-2 text-center w-8">No</th>
                      <th className="py-2 px-2">Uraian Komponen</th>
                      <th className="py-2 px-2 text-right">Biaya/Sak (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">1</td>
                      <td className="py-1.5 px-2">Harga pupuk UREA (HET)</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.urea?.hetPerSak || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              urea: { ...rincian.urea, hetPerSak: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">2</td>
                      <td className="py-1.5 px-2">Transportasi (kios ke poktan)</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.urea?.transportasi || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              urea: { ...rincian.urea, transportasi: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">3</td>
                      <td className="py-1.5 px-2">Sewa gudang</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.urea?.sewaGudang || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              urea: { ...rincian.urea, sewaGudang: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">4</td>
                      <td className="py-1.5 px-2">ATK & Administrasi</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.urea?.atk || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              urea: { ...rincian.urea, atk: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">5</td>
                      <td className="py-1.5 px-2">Kas Poktan</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.urea?.kasPoktan || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              urea: { ...rincian.urea, kasPoktan: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">6</td>
                      <td className="py-1.5 px-2">Penyandang dana (modal)</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.urea?.penyandangDana || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              urea: { ...rincian.urea, penyandangDana: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">7</td>
                      <td className="py-1.5 px-2">Pengurus Poktan (operasional)</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.urea?.pengurusPoktan || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              urea: { ...rincian.urea, pengurusPoktan: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-emerald-100/70 border-t-2 border-emerald-300 font-black">
                    <tr>
                      <td colSpan={2} className="py-2 px-2 text-emerald-950 uppercase text-[11px]">
                        TOTAL RINCIAN (PER SAK):
                      </td>
                      <td className="py-2 px-2 text-right text-emerald-900 text-xs">
                        Rp {totalUreaSak.toLocaleString('id-ID')}
                      </td>
                    </tr>
                    <tr className="bg-emerald-200/60 border-t border-emerald-300">
                      <td colSpan={2} className="py-1.5 px-2 text-emerald-950 text-[10px]">
                        HARGA TEBUS PER KG:
                      </td>
                      <td className="py-1.5 px-2 text-right text-emerald-950 font-mono text-[11px]">
                        Rp {hargaUreaKg.toLocaleString('id-ID')} / Kg
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* TABEL 2: NPK / PHONSKA (50 KG) */}
              <div className="border border-blue-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-blue-700 text-white p-3 font-black text-xs uppercase tracking-wide flex justify-between items-center">
                  <span>2. PUPUK NPK/PHONSKA (Sak @ 50 Kg)</span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">50 Kg</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-blue-50 text-slate-700 font-bold border-b border-blue-100">
                    <tr>
                      <th className="py-2 px-2 text-center w-8">No</th>
                      <th className="py-2 px-2">Uraian Komponen</th>
                      <th className="py-2 px-2 text-right">Biaya/Sak (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">1</td>
                      <td className="py-1.5 px-2">Harga pupuk NPK (HET)</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.npk?.hetPerSak || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              npk: { ...rincian.npk, hetPerSak: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">2</td>
                      <td className="py-1.5 px-2">Transportasi (kios ke poktan)</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.npk?.transportasi || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              npk: { ...rincian.npk, transportasi: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">3</td>
                      <td className="py-1.5 px-2">Sewa gudang</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.npk?.sewaGudang || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              npk: { ...rincian.npk, sewaGudang: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">4</td>
                      <td className="py-1.5 px-2">ATK & Administrasi</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.npk?.atk || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              npk: { ...rincian.npk, atk: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">5</td>
                      <td className="py-1.5 px-2">Kas Poktan</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.npk?.kasPoktan || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              npk: { ...rincian.npk, kasPoktan: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">6</td>
                      <td className="py-1.5 px-2">Penyandang dana (modal)</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.npk?.penyandangDana || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              npk: { ...rincian.npk, penyandangDana: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">7</td>
                      <td className="py-1.5 px-2">Pengurus Poktan (operasional)</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.npk?.pengurusPoktan || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              npk: { ...rincian.npk, pengurusPoktan: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-blue-100/70 border-t-2 border-blue-300 font-black">
                    <tr>
                      <td colSpan={2} className="py-2 px-2 text-blue-950 uppercase text-[11px]">
                        TOTAL RINCIAN (PER SAK):
                      </td>
                      <td className="py-2 px-2 text-right text-blue-900 text-xs">
                        Rp {totalNpkSak.toLocaleString('id-ID')}
                      </td>
                    </tr>
                    <tr className="bg-blue-200/60 border-t border-blue-300">
                      <td colSpan={2} className="py-1.5 px-2 text-blue-950 text-[10px]">
                        HARGA TEBUS PER KG:
                      </td>
                      <td className="py-1.5 px-2 text-right text-blue-950 font-mono text-[11px]">
                        Rp {hargaNpkKg.toLocaleString('id-ID')} / Kg
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* TABEL 3: ORGANIK (40 KG) */}
              <div className="border border-amber-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-amber-600 text-white p-3 font-black text-xs uppercase tracking-wide flex justify-between items-center">
                  <span>3. PUPUK ORGANIK (Sak @ 40 Kg)</span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">40 Kg</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-50 text-slate-700 font-bold border-b border-amber-100">
                    <tr>
                      <th className="py-2 px-2 text-center w-8">No</th>
                      <th className="py-2 px-2">Uraian Komponen</th>
                      <th className="py-2 px-2 text-right">Biaya/Sak (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">1</td>
                      <td className="py-1.5 px-2">Harga pupuk organik (HET)</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.organik?.hetPerSak || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              organik: { ...rincian.organik, hetPerSak: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">2</td>
                      <td className="py-1.5 px-2">Transportasi (kios ke poktan)</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.organik?.transportasi || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              organik: { ...rincian.organik, transportasi: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">3</td>
                      <td className="py-1.5 px-2">Sewa gudang</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.organik?.sewaGudang || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              organik: { ...rincian.organik, sewaGudang: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">4</td>
                      <td className="py-1.5 px-2">ATK & Administrasi</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.organik?.atk || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              organik: { ...rincian.organik, atk: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">5</td>
                      <td className="py-1.5 px-2">Kas Poktan</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.organik?.kasPoktan || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              organik: { ...rincian.organik, kasPoktan: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 text-center font-bold">6</td>
                      <td className="py-1.5 px-2">Pengurus Poktan (operasional)</td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="100"
                          value={rincian.organik?.pengurusPoktan || 0}
                          onChange={(e) =>
                            setRincian({
                              ...rincian,
                              organik: { ...rincian.organik, pengurusPoktan: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-24 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                        />
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-amber-100/70 border-t-2 border-amber-300 font-black">
                    <tr>
                      <td colSpan={2} className="py-2 px-2 text-amber-950 uppercase text-[11px]">
                        TOTAL RINCIAN (PER SAK):
                      </td>
                      <td className="py-2 px-2 text-right text-amber-900 text-xs">
                        Rp {totalOrgSak.toLocaleString('id-ID')}
                      </td>
                    </tr>
                    <tr className="bg-amber-200/60 border-t border-amber-300">
                      <td colSpan={2} className="py-1.5 px-2 text-amber-950 text-[10px]">
                        HARGA TEBUS PER KG (40 Kg):
                      </td>
                      <td className="py-1.5 px-2 text-right text-amber-950 font-mono text-[11px]">
                        Rp {hargaOrgKg.toLocaleString('id-ID')} / Kg
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* FORM PIHAK-PIHAK YANG MENGETAHUI / TTD BERITA ACARA */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Pihak-Pihak Penandatangan Berita Acara (Musyawarah Bersama):
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Ketua Poktan:</label>
                  <input
                    type="text"
                    value={rincian.pihakMengetahui?.ketuaPoktan || ''}
                    onChange={(e) =>
                      setRincian({
                        ...rincian,
                        pihakMengetahui: { ...rincian.pihakMengetahui, ketuaPoktan: e.target.value },
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Bendahara Poktan:</label>
                  <input
                    type="text"
                    value={rincian.pihakMengetahui?.bendaharaPoktan || ''}
                    onChange={(e) =>
                      setRincian({
                        ...rincian,
                        pihakMengetahui: { ...rincian.pihakMengetahui, bendaharaPoktan: e.target.value },
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Perwakilan Petani:</label>
                  <input
                    type="text"
                    value={rincian.pihakMengetahui?.perwakilanPetani || ''}
                    onChange={(e) =>
                      setRincian({
                        ...rincian,
                        pihakMengetahui: { ...rincian.pihakMengetahui, perwakilanPetani: e.target.value },
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">PPL Pendamping BPP:</label>
                  <input
                    type="text"
                    value={rincian.pihakMengetahui?.penyuluhPpl || ''}
                    onChange={(e) =>
                      setRincian({
                        ...rincian,
                        pihakMengetahui: { ...rincian.pihakMengetahui, penyuluhPpl: e.target.value },
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Kepala Desa:</label>
                  <input
                    type="text"
                    value={rincian.pihakMengetahui?.kepalaDesa || ''}
                    onChange={(e) =>
                      setRincian({
                        ...rincian,
                        pihakMengetahui: { ...rincian.pihakMengetahui, kepalaDesa: e.target.value },
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* OPSI CHECKBOX SE-KECAMATAN & TOMBOL SIMPAN */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-200">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToAllPoktan}
                  onChange={(e) => setApplyToAllPoktan(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <span>Terapkan kesepakatan harga ini ke SELURUH Poktan se-Kecamatan Lembeyan</span>
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalBeritaAcaraOpen(true)}
                  className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4 text-emerald-300" />
                  Pratinjau & Cetak Berita Acara
                </button>
                <button
                  type="submit"
                  disabled={savingKesepakatan}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black rounded-xl text-xs transition shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {savingKesepakatan ? 'Menyimpan Kesepakatan...' : 'Simpan & Terapkan Harga ke Kasir'}
                </button>
              </div>
            </div>
          </form>

          {/* SECTION 2: FORM PENYESUAIAN STOK FISIK / OPNAME GUDANG */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-emerald-600" />
                  Penyesuaian Stok Fisik / Opname Gudang Poktan
                </h3>
                <p className="text-[11px] text-slate-500">
                  Catat penerimaan pasokan tambahan fisik mandiri atau koreksi hasil opname fisik gudang Poktan.
                </p>
              </div>
            </div>

            {pesanOpnameSukses && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold">
                {pesanOpnameSukses}
              </div>
            )}

            <form onSubmit={handleSimpanOpname} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Pilih Pupuk */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Jenis Pupuk:</label>
                  <select
                    value={opnamePupuk}
                    onChange={(e: any) => setOpnamePupuk(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="UREA">Pupuk UREA (Sak @ 50 Kg)</option>
                    <option value="NPK">Pupuk NPK PHONSKA (Sak @ 50 Kg)</option>
                    <option value="ORGANIK">Pupuk ORGANIK (Sak @ 40 Kg)</option>
                  </select>
                </div>

                {/* Satuan Input */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Satuan Input:</label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setOpnameMode('SAK')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        opnameMode === 'SAK' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Sak ({opnamePupuk === 'ORGANIK' ? '40kg' : '50kg'})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpnameMode('KG')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        opnameMode === 'KG' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Kg
                    </button>
                  </div>
                </div>

                {/* Input Jumlah */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Jumlah ({opnameMode === 'SAK' ? `Sak @ ${opnamePupuk === 'ORGANIK' ? '40' : '50'} Kg` : 'Kilogram'}):</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      {opnameMode === 'SAK'
                        ? `Konversi: ${(opnameJumlah * (opnamePupuk === 'ORGANIK' ? 40 : 50)).toLocaleString('id-ID')} Kg`
                        : `Konversi: ${(opnameJumlah / (opnamePupuk === 'ORGANIK' ? 40 : 50)).toFixed(1)} Sak`}
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={opnameMode === 'SAK' ? '1' : '10'}
                    value={opnameJumlah || ''}
                    onChange={(e) => setOpnameJumlah(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-right focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Tipe Penyesuaian */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Tipe Penyesuaian:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOpnameTipe('TAMBAH_STOK_MASUK')}
                    className={`p-2.5 text-xs text-left rounded-xl border transition cursor-pointer ${
                      opnameTipe === 'TAMBAH_STOK_MASUK'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tambah Pasokan Fisik (+ Stok)</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block font-normal mt-0.5">
                      Menambah akumulasi sisa stok fisik riil
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOpnameTipe('KOREKSI_OPNAME')}
                    className={`p-2.5 text-xs text-left rounded-xl border transition cursor-pointer ${
                      opnameTipe === 'KOREKSI_OPNAME'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Warehouse className="w-3.5 h-3.5 text-blue-600" />
                      <span>Koreksi Hasil Opname Gudang (Set Jumlah Riil)</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block font-normal mt-0.5">
                      Menyesuaikan stok langsung dengan hitungan fisik riil
                    </span>
                  </button>
                </div>
              </div>

              {/* Catatan Berita Acara */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  Keterangan / Berita Acara Opname:
                </label>
                <input
                  type="text"
                  value={opnameCatatan}
                  onChange={(e) => setOpnameCatatan(e.target.value)}
                  placeholder="Contoh: Penerimaan tambahan dari swadaya atau opname akhir bulan"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <button
                type="submit"
                disabled={savingOpname || opnameJumlah <= 0 || selectedPoktanId === 'SEMUA'}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <Boxes className="w-4 h-4 text-emerald-300" />
                {savingOpname ? 'Menyesuaikan Stok...' : 'Simpan Penyesuaian Stok Gudang'}
              </button>
            </form>
          </div>

          {/* SECTION 3: BUKU MUTASI STOK & LOG PERUBAHAN */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Buku Mutasi Stok & Riwayat Perubahan Harga Poktan
                </h3>
                <p className="text-xs text-slate-500">
                  Riwayat setiap pergerakan stok keluar kasir, pasokan masuk, dan penetapan Berita Acara harga.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-slate-100 rounded-full text-slate-600">
                {mutasiList.length} Catatan Mutasi
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 border-r">No</th>
                    <th className="py-2.5 px-3 border-r">Waktu</th>
                    <th className="py-2.5 px-3 border-r">Tipe Mutasi</th>
                    <th className="py-2.5 px-3 border-r">Keterangan / Dokumen</th>
                    <th className="py-2.5 px-3 border-r text-center">Urea</th>
                    <th className="py-2.5 px-3 border-r text-center">NPK</th>
                    <th className="py-2.5 px-3 border-r text-center">Organik</th>
                    <th className="py-2.5 px-3">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mutasiList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                        Belum ada mutasi stok atau perubahan harga yang tercatat.
                      </td>
                    </tr>
                  ) : (
                    mutasiList.map((m, idx) => (
                      <tr key={m.id || idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 border-r text-center font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 border-r text-slate-500 whitespace-nowrap">
                          {new Date(m.tanggal).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2 px-3 border-r">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              m.tipe === 'TEBUS_KASIR'
                                ? 'bg-rose-100 text-rose-800'
                                : m.tipe === 'TAMBAH_STOK'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.tipe === 'KESEPAKATAN_HARGA' || m.tipe === 'PERUBAHAN_HARGA'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {m.tipe}
                          </span>
                        </td>
                        <td className="py-2 px-3 border-r text-slate-800 font-medium">{m.keterangan}</td>
                        <td className="py-2 px-3 border-r text-center font-mono">
                          {m.ureaKg !== undefined ? (
                            <span
                              className={
                                m.ureaKg < 0 ? 'text-rose-600 font-bold' : m.ureaKg > 0 ? 'text-emerald-700 font-bold' : 'text-slate-400'
                              }
                            >
                              {m.ureaKg > 0 ? `+${m.ureaKg}` : m.ureaKg} Kg
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2 px-3 border-r text-center font-mono">
                          {m.npkKg !== undefined ? (
                            <span
                              className={
                                m.npkKg < 0 ? 'text-rose-600 font-bold' : m.npkKg > 0 ? 'text-blue-700 font-bold' : 'text-slate-400'
                              }
                            >
                              {m.npkKg > 0 ? `+${m.npkKg}` : m.npkKg} Kg
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2 px-3 border-r text-center font-mono">
                          {m.organikKg !== undefined ? (
                            <span
                              className={
                                m.organikKg < 0 ? 'text-rose-600 font-bold' : m.organikKg > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'
                              }
                            >
                              {m.organikKg > 0 ? `+${m.organikKg}` : m.organikKg} Kg
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-semibold">{m.petugas || 'Admin'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RIWAYAT TRANSAKSI KASIR POKTAN */}
      {/* ========================================================================= */}
      {activeTab === 'RIWAYAT' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 no-print">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                Riwayat Transaksi Kasir Poktan
              </h3>
              <p className="text-xs text-slate-500">
                Daftar penebusan pupuk bersubsidi yang telah dilayani oleh Poktan se-Kecamatan Lembeyan.
              </p>
            </div>
          </div>

          {/* Mobile Card View Riwayat Transaksi (Smartphone Friendly) */}
          <div className="block lg:hidden divide-y divide-slate-100">
            {riwayatTrx.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                Belum ada transaksi penebusan pupuk di kasir Poktan.
              </div>
            ) : (
              riwayatTrx.map((trx, index) => (
                <div key={trx.id} className="p-4 hover:bg-slate-50/80 transition space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-[11px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {trx.nomorNota}
                      </span>
                      <h4 className="font-black text-slate-900 text-sm mt-1 leading-tight truncate">
                        {trx.namaPetani}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        NIK: {trx.nik} &bull; {trx.namaPoktan}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-emerald-800 text-sm block leading-tight">
                        Rp {(trx.totalBayar || trx.totalBayarRp || 0).toLocaleString('id-ID')}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 inline-block mt-0.5">
                        {trx.metodePembayaran}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100 text-slate-600">
                    <span>📅 {new Date(trx.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB</span>
                    <span>&bull;</span>
                    <span className="text-emerald-700 font-semibold">✓ TTD Sah Petani</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                    <div className="bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-200">
                      <span className="text-[9px] text-emerald-700 block font-bold uppercase">Urea</span>
                      <strong className="text-emerald-950 font-black">{trx.ureaKg} Kg</strong>
                    </div>
                    <div className="bg-blue-50/70 p-1.5 rounded-lg border border-blue-200">
                      <span className="text-[9px] text-blue-700 block font-bold uppercase">NPK</span>
                      <strong className="text-blue-950 font-black">{trx.npkKg} Kg</strong>
                    </div>
                    <div className="bg-amber-50/70 p-1.5 rounded-lg border border-amber-200">
                      <span className="text-[9px] text-amber-700 block font-bold uppercase">Organik</span>
                      <strong className="text-amber-950 font-black">{trx.organikKg} Kg</strong>
                    </div>
                  </div>

                  {/* Tombol Aksi Responsif */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setTransaksiSukses(trx)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs active:scale-95 transition shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Cetak Struk</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatalTransaksi(trx)}
                      className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 active:scale-95 transition"
                      title="Batalkan Transaksi & Kembalikan Kuota"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 border-r">No</th>
                  <th className="py-2.5 px-3 border-r">No. Nota</th>
                  <th className="py-2.5 px-3 border-r">Waktu</th>
                  <th className="py-2.5 px-3 border-r">Nama Petani</th>
                  <th className="py-2.5 px-3 border-r">NIK</th>
                  <th className="py-2.5 px-3 border-r">Kelompok Tani</th>
                  <th className="py-2.5 px-3 border-r text-center">Urea</th>
                  <th className="py-2.5 px-3 border-r text-center">NPK</th>
                  <th className="py-2.5 px-3 border-r text-center">Organik</th>
                  <th className="py-2.5 px-3 border-r text-right">Total Bayar</th>
                  <th className="py-2.5 px-3 border-r text-center">Metode</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riwayatTrx.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400 italic">
                      Belum ada transaksi penebusan pupuk di kasir Poktan.
                    </td>
                  </tr>
                ) : (
                  riwayatTrx.map((trx, index) => (
                    <tr key={trx.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 border-r text-center font-mono">{index + 1}</td>
                      <td className="py-2.5 px-3 border-r font-mono font-bold text-slate-800">{trx.nomorNota}</td>
                      <td className="py-2.5 px-3 border-r text-slate-500">
                        {new Date(trx.tanggal).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 border-r">
                        <div className="font-bold text-slate-900">{trx.namaPetani}</div>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold mt-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          TTD Sah Petani
                        </div>
                      </td>
                      <td className="py-2.5 px-3 border-r font-mono text-slate-600">{trx.nik}</td>
                      <td className="py-2.5 px-3 border-r">{trx.namaPoktan}</td>
                      <td className="py-2.5 px-3 border-r text-center font-bold text-emerald-800">{trx.jumlahUreaKg} Kg</td>
                      <td className="py-2.5 px-3 border-r text-center font-bold text-blue-800">{trx.jumlahNpkKg} Kg</td>
                      <td className="py-2.5 px-3 border-r text-center font-bold text-amber-800">{trx.jumlahOrganikKg} Kg</td>
                      <td className="py-2.5 px-3 border-r text-right font-black text-slate-900">
                        Rp {trx.totalBayar.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 border-r text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {trx.metodePembayaran}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setTransaksiSukses(trx)}
                            title="Lihat & Cetak Ulang Struk Kasir"
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3 h-3 text-emerald-300" /> Struk
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBatalTransaksi(trx)}
                            title="Batalkan Transaksi & Kembalikan Kuota/Stok Gudang"
                            className="p-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL BERITA ACARA KESEPAKATAN HARGA JUAL PUPUK (SIAP TEMPEL DI GUDANG) */}
      {/* ========================================================================= */}
      {modalBeritaAcaraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-300 shadow-2xl max-w-4xl w-full p-4 sm:p-8 space-y-6 max-h-[96vh] overflow-y-auto">
            {/* Header Pop-up (Disembunyikan saat cetak) */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Pratinjau Dokumen Berita Acara (Siap Cetak & Ditempel di Gudang Poktan)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Dokumen (Print/PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setModalBeritaAcaraOpen(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-700 px-2 py-1"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* DOKUMEN CETAK BERITA ACARA RESMI */}
            <div className="p-6 sm:p-8 bg-white border border-slate-300 rounded-2xl text-slate-900 font-serif space-y-5 print:border-none print:p-0 print:m-0">
              {/* KOP SURAT RESMI */}
              <div className="text-center border-b-4 border-double border-slate-900 pb-4">
                <h4 className="text-xs uppercase tracking-widest font-bold text-slate-700">
                  PEMERINTAH KABUPATEN MAGETAN &bull; KECAMATAN LEMBEYAN
                </h4>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-950 mt-1">
                  KELOMPOK TANI &ldquo;{activePoktanName}&rdquo;
                </h2>
                <p className="text-xs text-slate-600">
                  Sekretariat / Gudang Pupuk: Desa {activePoktanObj?.desa || 'Kediren'}, Kecamatan Lembeyan, Kabupaten Magetan
                </p>
              </div>

              {/* JUDUL BERITA ACARA */}
              <div className="text-center space-y-1">
                <h3 className="text-base sm:text-lg font-black uppercase tracking-wider underline">
                  BERITA ACARA KESEPAKATAN HARGA JUAL PUPUK BERSUBSIDI
                </h3>
                <p className="text-xs font-bold font-mono">
                  Nomor: {rincian.nomorBeritaAcara || '01/BA-POKTAN/LMB/2026'} &bull; Tahun Anggaran {rincian.tahunAnggaran || 2026}
                </p>
              </div>

              {/* KONSIDERAN MUSYAWARAH */}
              <p className="text-xs text-justify leading-relaxed font-sans text-slate-800">
                Pada hari ini, tanggal <strong>{new Date(rincian.tanggalMusyawarah || '2026-01-15').toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>, bertempat di <strong>{rincian.lokasiMusyawarah || 'Gudang Poktan'}</strong>, telah diselenggarakan musyawarah bersama penetapan rincian biaya operasional dan harga penjualan pupuk bersubsidi tingkat Kelompok Tani se-Kecamatan Lembeyan. Berdasarkan hasil musyawarah mufakat, telah disepakati rincian biaya per sak pupuk yang berlaku resmi untuk seluruh anggota kelompok tani sebagai berikut:
              </p>

              {/* 3 TABEL RINCIAN SESUAI FORMAT EXCEL RESMI */}
              <div className="space-y-4 font-sans text-xs">
                {/* 1. UREA */}
                <div>
                  <h4 className="font-black text-xs text-slate-950 mb-1">
                    1. PUPUK UREA — Harga kesepakatan penjualan ke petani (Sak @ 50 Kg):
                  </h4>
                  <table className="w-full border-collapse border border-slate-400 text-xs">
                    <thead className="bg-slate-100 font-bold">
                      <tr>
                        <th className="border border-slate-400 py-1.5 px-2 text-center w-10">No.</th>
                        <th className="border border-slate-400 py-1.5 px-3 text-left">Uraian Komponen</th>
                        <th className="border border-slate-400 py-1.5 px-3 text-right w-36">Biaya per Sak</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">1</td>
                        <td className="border border-slate-400 py-1 px-3">Harga pupuk UREA (HET Pusat)</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.urea?.hetPerSak) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">2</td>
                        <td className="border border-slate-400 py-1 px-3">Transportasi (dari kios pengecer ke poktan)</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.urea?.transportasi) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">3</td>
                        <td className="border border-slate-400 py-1 px-3">Sewa gudang pupuk</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.urea?.sewaGudang) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">4</td>
                        <td className="border border-slate-400 py-1 px-3">ATK & Administrasi pembukuan</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.urea?.atk) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">5</td>
                        <td className="border border-slate-400 py-1 px-3">Kas Poktan</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.urea?.kasPoktan) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">6</td>
                        <td className="border border-slate-400 py-1 px-3">Penyandang dana (jasa modal talangan)</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.urea?.penyandangDana) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">7</td>
                        <td className="border border-slate-400 py-1 px-3">Pengurus Poktan (jasa bongkar muat & distribusi)</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.urea?.pengurusPoktan) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold">
                      <tr>
                        <td colSpan={2} className="border border-slate-400 py-1.5 px-3 text-center uppercase">
                          TOTAL RINCIAN (HARGA JUAL PER SAK 50 KG):
                        </td>
                        <td className="border border-slate-400 py-1.5 px-3 text-right font-black">
                          Rp {totalUreaSak.toLocaleString('id-ID')}
                        </td>
                      </tr>
                      <tr className="bg-slate-200/60">
                        <td colSpan={2} className="border border-slate-400 py-1 px-3 text-center text-[10px]">
                          Ekuivalen Harga Tebus per Kilogram (Kg):
                        </td>
                        <td className="border border-slate-400 py-1 px-3 text-right font-bold text-[11px]">
                          Rp {hargaUreaKg.toLocaleString('id-ID')} / Kg
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* 2. NPK */}
                <div>
                  <h4 className="font-black text-xs text-slate-950 mb-1">
                    2. PUPUK NPK/PHONSKA — Harga kesepakatan penjualan ke petani (Sak @ 50 Kg):
                  </h4>
                  <table className="w-full border-collapse border border-slate-400 text-xs">
                    <thead className="bg-slate-100 font-bold">
                      <tr>
                        <th className="border border-slate-400 py-1.5 px-2 text-center w-10">No.</th>
                        <th className="border border-slate-400 py-1.5 px-3 text-left">Uraian Komponen</th>
                        <th className="border border-slate-400 py-1.5 px-3 text-right w-36">Biaya per Sak</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">1</td>
                        <td className="border border-slate-400 py-1 px-3">Harga pupuk NPK/PHONSKA (HET Pusat)</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.npk?.hetPerSak) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">2</td>
                        <td className="border border-slate-400 py-1 px-3">Transportasi (dari kios pengecer ke poktan)</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.npk?.transportasi) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">3</td>
                        <td className="border border-slate-400 py-1 px-3">Sewa gudang pupuk</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.npk?.sewaGudang) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">4</td>
                        <td className="border border-slate-400 py-1 px-3">ATK & Administrasi pembukuan</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.npk?.atk) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">5</td>
                        <td className="border border-slate-400 py-1 px-3">Kas Poktan</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.npk?.kasPoktan) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">6</td>
                        <td className="border border-slate-400 py-1 px-3">Penyandang dana (jasa modal talangan)</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.npk?.penyandangDana) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">7</td>
                        <td className="border border-slate-400 py-1 px-3">Pengurus Poktan (jasa bongkar muat & distribusi)</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.npk?.pengurusPoktan) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold">
                      <tr>
                        <td colSpan={2} className="border border-slate-400 py-1.5 px-3 text-center uppercase">
                          TOTAL RINCIAN (HARGA JUAL PER SAK 50 KG):
                        </td>
                        <td className="border border-slate-400 py-1.5 px-3 text-right font-black">
                          Rp {totalNpkSak.toLocaleString('id-ID')}
                        </td>
                      </tr>
                      <tr className="bg-slate-200/60">
                        <td colSpan={2} className="border border-slate-400 py-1 px-3 text-center text-[10px]">
                          Ekuivalen Harga Tebus per Kilogram (Kg):
                        </td>
                        <td className="border border-slate-400 py-1 px-3 text-right font-bold text-[11px]">
                          Rp {hargaNpkKg.toLocaleString('id-ID')} / Kg
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* 3. ORGANIK (40 KG) */}
                <div>
                  <h4 className="font-black text-xs text-slate-950 mb-1">
                    3. PUPUK ORGANIK — Harga kesepakatan penjualan ke petani (Sak @ 40 Kg):
                  </h4>
                  <table className="w-full border-collapse border border-slate-400 text-xs">
                    <thead className="bg-slate-100 font-bold">
                      <tr>
                        <th className="border border-slate-400 py-1.5 px-2 text-center w-10">No.</th>
                        <th className="border border-slate-400 py-1.5 px-3 text-left">Uraian Komponen</th>
                        <th className="border border-slate-400 py-1.5 px-3 text-right w-36">Biaya per Sak</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">1</td>
                        <td className="border border-slate-400 py-1 px-3">Harga pupuk organik (HET Pusat)</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.organik?.hetPerSak) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">2</td>
                        <td className="border border-slate-400 py-1 px-3">Transportasi (dari kios pengecer ke poktan)</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.organik?.transportasi) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">3</td>
                        <td className="border border-slate-400 py-1 px-3">Sewa gudang pupuk</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.organik?.sewaGudang) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">4</td>
                        <td className="border border-slate-400 py-1 px-3">ATK & Administrasi pembukuan</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.organik?.atk) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">5</td>
                        <td className="border border-slate-400 py-1 px-3">Kas Poktan</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.organik?.kasPoktan) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 py-1 px-2 text-center">6</td>
                        <td className="border border-slate-400 py-1 px-3">Pengurus Poktan (jasa bongkar muat & distribusi)</td>
                        <td className="border border-slate-400 py-1 px-3 text-right">Rp {(parseFloat(rincian.organik?.pengurusPoktan) || 0).toLocaleString('id-ID')}</td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold">
                      <tr>
                        <td colSpan={2} className="border border-slate-400 py-1.5 px-3 text-center uppercase">
                          TOTAL RINCIAN (HARGA JUAL PER SAK 40 KG):
                        </td>
                        <td className="border border-slate-400 py-1.5 px-3 text-right font-black">
                          Rp {totalOrgSak.toLocaleString('id-ID')}
                        </td>
                      </tr>
                      <tr className="bg-slate-200/60">
                        <td colSpan={2} className="border border-slate-400 py-1 px-3 text-center text-[10px]">
                          Ekuivalen Harga Tebus per Kilogram (Kg):
                        </td>
                        <td className="border border-slate-400 py-1 px-3 text-right font-bold text-[11px]">
                          Rp {hargaOrgKg.toLocaleString('id-ID')} / Kg
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* KETENTUAN PENEMPELAN GUDANG */}
              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 text-[11px] text-slate-800 font-sans leading-relaxed">
                <strong>Catatan & Ketentuan Penempelan:</strong>
                <p className="mt-0.5">
                  Berita Acara ini telah disepakati bersama secara musyawarah dan mufakat, berlaku mengikat seluruh anggota Poktan, dan <strong>wajib ditempelkan di dinding Gudang Pupuk Poktan</strong> secara terbuka sebagai bukti transparansi publik dan acuan resmi kasir penebusan.
                </p>
              </div>

              {/* 5 KOLOM TANDA TANGAN PIHAK TERKAIT */}
              <div className="pt-4 border-t border-slate-400 grid grid-cols-5 gap-2 text-center text-[10px] font-sans">
                <div>
                  <p className="text-slate-600">Ketua Kelompok Tani,</p>
                  <div className="h-14 flex items-center justify-center relative my-1">
                    <img
                      src={generateOfficialStampSvg('POKTAN', activePoktanName)}
                      alt="Stempel Poktan"
                      className="h-12 w-12 object-contain absolute opacity-70"
                    />
                    <img
                      src={generateAutoSignatureSvg(rincian.pihakMengetahui?.ketuaPoktan || 'Ketua Poktan')}
                      alt="TTD Ketua"
                      className="h-10 object-contain relative z-10"
                    />
                  </div>
                  <p className="font-bold underline uppercase">{rincian.pihakMengetahui?.ketuaPoktan || 'Ketua Poktan'}</p>
                </div>

                <div>
                  <p className="text-slate-600">Bendahara Poktan,</p>
                  <div className="h-14 flex items-center justify-center my-1">
                    <img
                      src={generateAutoSignatureSvg(rincian.pihakMengetahui?.bendaharaPoktan || 'Bendahara')}
                      alt="TTD Bendahara"
                      className="h-10 object-contain"
                    />
                  </div>
                  <p className="font-bold underline uppercase">{rincian.pihakMengetahui?.bendaharaPoktan || 'Bendahara Poktan'}</p>
                </div>

                <div>
                  <p className="text-slate-600">Perwakilan Petani,</p>
                  <div className="h-14 flex items-center justify-center my-1">
                    <img
                      src={generateAutoSignatureSvg(rincian.pihakMengetahui?.perwakilanPetani || 'Petani')}
                      alt="TTD Petani"
                      className="h-10 object-contain"
                    />
                  </div>
                  <p className="font-bold underline uppercase">{rincian.pihakMengetahui?.perwakilanPetani || 'Perwakilan Petani'}</p>
                </div>

                <div>
                  <p className="text-slate-600">PPL Pertanian,</p>
                  <div className="h-14 flex items-center justify-center my-1">
                    <img
                      src={generateAutoSignatureSvg(rincian.pihakMengetahui?.penyuluhPpl || 'PPL')}
                      alt="TTD PPL"
                      className="h-10 object-contain"
                    />
                  </div>
                  <p className="font-bold underline uppercase">{rincian.pihakMengetahui?.penyuluhPpl || 'PPL Lembeyan'}</p>
                </div>

                <div>
                  <p className="text-slate-600">Mengetahui Kepala Desa,</p>
                  <div className="h-14 flex items-center justify-center relative my-1">
                    <img
                      src={generateOfficialStampSvg('DESA', activePoktanObj?.desa || 'Kediren')}
                      alt="Stempel Desa"
                      className="h-12 w-12 object-contain absolute opacity-70"
                    />
                    <img
                      src={generateAutoSignatureSvg(rincian.pihakMengetahui?.kepalaDesa || 'Kepala Desa')}
                      alt="TTD Kades"
                      className="h-10 object-contain relative z-10"
                    />
                  </div>
                  <p className="font-bold underline uppercase">{rincian.pihakMengetahui?.kepalaDesa || 'Kepala Desa'}</p>
                </div>
              </div>

              <div className="text-center pt-2 text-[9px] text-slate-500 font-sans border-t border-dashed border-slate-300">
                Dokumen Resmi Sistem Informasi Pertanian Kecamatan Lembeyan &bull; Dicetak Otomatis pada {new Date().toLocaleString('id-ID')}
              </div>
            </div>

            {/* Tombol Cetak / Selesai */}
            <div className="flex items-center gap-3 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                Cetak Dokumen Sekarang (Siap Ditempel di Dinding Gudang)
              </button>
              <button
                type="button"
                onClick={() => setModalBeritaAcaraOpen(false)}
                className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / STRUK CETAK NOTA RESMI KASIR POKTAN */}
      {/* ========================================================================= */}
      {transaksiSukses && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 max-h-[95vh] overflow-y-auto">
            {/* Header Pop-up */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 no-print">
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Transaksi Kasir Berhasil Diproses
              </span>
              <button
                onClick={() => setTransaksiSukses(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {/* AREA STRUK CETAK KASIR POKTAN */}
            <div className="border border-slate-300 p-5 rounded-2xl bg-white space-y-4 text-xs text-slate-800 font-sans">
              {/* Kop Struk */}
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <h3 className="font-black text-sm uppercase tracking-wide text-slate-900">
                  {transaksiSukses.namaPoktan}
                </h3>
                <p className="text-[10px] text-slate-600">
                  Kecamatan Lembeyan &bull; Kabupaten Magetan
                </p>
                <p className="text-[9px] text-slate-500">
                  Bukti Resmi Penebusan Pupuk Bersubsidi Tingkat Kelompok Tani
                </p>
              </div>

              {/* Data Nota */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Nota:</span>
                  <span className="font-mono font-bold text-slate-900">{transaksiSukses.nomorNota}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waktu:</span>
                  <span>{new Date(transaksiSukses.tanggal).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Petani:</span>
                  <span className="font-bold text-slate-900">{transaksiSukses.namaPetani}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NIK:</span>
                  <span className="font-mono">{transaksiSukses.nik}</span>
                </div>
              </div>

              {/* Rincian Pupuk dengan Harga Dinamis */}
              <div className="border-t border-b border-dashed border-slate-300 py-2.5 space-y-1.5 text-[11px]">
                {transaksiSukses.jumlahUreaKg > 0 && (
                  <div className="flex justify-between">
                    <div>
                      <span>Pupuk UREA ({transaksiSukses.jumlahUreaKg} Kg)</span>
                      <span className="text-[9px] text-slate-400 block">
                        @ Rp {(transaksiSukses.hargaUreaPerKg ?? 2100).toLocaleString('id-ID')} / Kg
                      </span>
                    </div>
                    <span className="font-bold">
                      Rp {(transaksiSukses.subtotalUrea ?? (transaksiSukses.jumlahUreaKg * 2100)).toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
                {transaksiSukses.jumlahNpkKg > 0 && (
                  <div className="flex justify-between">
                    <div>
                      <span>Pupuk NPK PHONSKA ({transaksiSukses.jumlahNpkKg} Kg)</span>
                      <span className="text-[9px] text-slate-400 block">
                        @ Rp {(transaksiSukses.hargaNpkPerKg ?? 2200).toLocaleString('id-ID')} / Kg
                      </span>
                    </div>
                    <span className="font-bold">
                      Rp {(transaksiSukses.subtotalNpk ?? (transaksiSukses.jumlahNpkKg * 2200)).toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
                {transaksiSukses.jumlahOrganikKg > 0 && (
                  <div className="flex justify-between">
                    <div>
                      <span>Pupuk ORGANIK ({transaksiSukses.jumlahOrganikKg} Kg)</span>
                      <span className="text-[9px] text-slate-400 block">
                        @ Rp {(transaksiSukses.hargaOrganikPerKg ?? 875).toLocaleString('id-ID')} / Kg (Sak 40kg)
                      </span>
                    </div>
                    <span className="font-bold">
                      Rp {(transaksiSukses.subtotalOrganik ?? (transaksiSukses.jumlahOrganikKg * 875)).toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>

              {/* Total & Bayar */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-black text-sm text-slate-900">
                  <span>TOTAL BIAYA:</span>
                  <span>Rp {transaksiSukses.totalBayar.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Metode:</span>
                  <span>{transaksiSukses.metodePembayaran}</span>
                </div>
                {transaksiSukses.metodePembayaran === 'TUNAI' && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Uang Diterima:</span>
                      <span>Rp {Number(transaksiSukses.jumlahUangDiterima).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-700">
                      <span>Kembalian:</span>
                      <span>Rp {Number(transaksiSukses.kembalian).toLocaleString('id-ID')}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Tanda Tangan & QR Validasi */}
              <div className="pt-3 border-t border-dashed border-slate-300 grid grid-cols-2 gap-3 text-center text-[10px]">
                <div className="border border-slate-200/80 bg-slate-50/50 p-2 rounded-xl">
                  <p className="text-slate-500 font-semibold">Petani Penerima Pupuk,</p>
                  <div className="h-12 flex items-center justify-center my-1 bg-white rounded-lg border border-slate-200/60 p-0.5">
                    <img
                      src={transaksiSukses.tandaTanganPetani || generateAutoSignatureSvg(transaksiSukses.namaPetani)}
                      alt="TTD Petani"
                      className="max-h-11 max-w-full object-contain"
                    />
                  </div>
                  <p className="font-bold underline uppercase text-slate-900">{transaksiSukses.namaPetani}</p>
                  <span className="text-[8px] text-slate-400 block font-mono">NIK: {transaksiSukses.nik}</span>
                </div>

                <div className="border border-slate-200/80 bg-slate-50/50 p-2 rounded-xl">
                  <p className="text-slate-500 font-semibold">Kasir / Pengurus Poktan,</p>
                  <div className="h-12 flex items-center justify-center relative my-1 bg-white rounded-lg border border-slate-200/60 p-0.5">
                    <img
                      src={generateOfficialStampSvg('POKTAN', transaksiSukses.namaPoktan)}
                      alt="Stempel Poktan"
                      className="h-12 w-12 object-contain absolute opacity-70"
                    />
                    <img
                      src={generateAutoSignatureSvg(transaksiSukses.namaKasir)}
                      alt="TTD Kasir"
                      className="max-h-11 max-w-full object-contain relative z-10"
                    />
                  </div>
                  <p className="font-bold underline uppercase text-slate-900">{transaksiSukses.namaKasir}</p>
                  <span className="text-[8px] text-slate-400 block font-mono">Pengurus {transaksiSukses.namaPoktan}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-200 flex flex-col items-center justify-center gap-1">
                <QrCodeView value={`/verifikasi?code=${transaksiSukses.nomorNota}`} size={56} />
                <span className="text-[8px] text-slate-400 font-mono">Scan QR Validasi Keaslian Nota Resmi</span>
              </div>

              <div className="text-center pt-1 text-[9px] text-slate-400">
                Dokumen Sah Sistem Informasi Pertanian Kecamatan Lembeyan
              </div>
            </div>

            {/* Tombol Cetak, Kirim WA & Selesai */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 no-print">
              <button
                type="button"
                onClick={() => {
                  const msg = generateWhatsAppNotaKasir({
                    nomorNota: transaksiSukses.nomorNota,
                    petaniNama: transaksiSukses.petaniNama,
                    petaniNik: transaksiSukses.petaniNik,
                    poktanNama: selectedPetani?.namaPoktan || 'Poktan BPP',
                    namaKios: transaksiSukses.namaKios || 'Kios Resmi KPL',
                    jumlahUreaKg: transaksiSukses.jumlahUreaKg,
                    jumlahNpkKg: transaksiSukses.jumlahNpkKg,
                    jumlahOrganikKg: transaksiSukses.jumlahOrganikKg,
                    totalHarga: transaksiSukses.totalHarga,
                    tanggal: transaksiSukses.tanggal,
                  });
                  const telp = (selectedPetani as any)?.telepon || '';
                  openWhatsApp(telp, msg);
                }}
                className="w-full sm:flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
              >
                <MessageCircle className="w-4 h-4 text-emerald-200" />
                Kirim Struk via WA
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Printer className="w-4 h-4 text-emerald-300" />
                Cetak Struk Nota
              </button>

              <button
                type="button"
                onClick={handleResetForm}
                className="w-full sm:flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition text-center cursor-pointer border border-slate-300 active:scale-98"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
