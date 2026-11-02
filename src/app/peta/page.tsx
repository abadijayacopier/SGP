'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import MapWrapper, { type FlyToTarget } from '@/components/map/MapWrapper';
import type { LahanItem } from '@/components/map/LeafletMap';
import { useAuth } from '@/lib/auth-context';
import {
  Map,
  Plus,
  Printer,
  Filter,
  CheckCircle2,
  X,
  Layers,
  Sprout,
  FileText,
  Search,
  MapPin,
  User,
  Users,
  Compass,
  ArrowRight,
  Eye,
  AlertTriangle,
  Ruler,
  ShieldAlert,
  ShieldCheck,
  Download,
  Trash2,
  Sparkles,
  Camera,
  Edit3,
} from 'lucide-react';
import {
  showSuccess,
  showError,
  showWarning,
  showConfirm,
  showDeleteConfirm,
  showToast,
} from '@/lib/sweetalert';
import type { OverlapResult } from '@/lib/calculations';
import { DESA_LEMBEYAN_LIST, DESA_COORDINATES_LEMBEYAN } from '@/lib/erdkk-format';
import { getOfflineSurveys, cachePetaniList, getCachedPetaniList } from '@/lib/offline-gis';

export default function PetaPage() {
  const { currentUser, permissions } = useAuth();
  const [lahanList, setLahanList] = useState<LahanItem[]>([]);
  const [petaniList, setPetaniList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [komoditasFilter, setKomoditasFilter] = useState('SEMUA');
  const [desaFilter, setDesaFilter] = useState('SEMUA');
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget | null>(null);
  const [selectedPetaniFilter, setSelectedPetaniFilter] = useState('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLahanId, setSelectedLahanId] = useState<string | null>(null);

  // Mode Gambar Poligon
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawnCoords, setDrawnCoords] = useState<[number, number][]>([]);
  const [drawnLuasHa, setDrawnLuasHa] = useState(0);
  const [drawnLuasM2, setDrawnLuasM2] = useState(0);
  const [drawnPerimeter, setDrawnPerimeter] = useState(0);
  const [overlapData, setOverlapData] = useState<OverlapResult | null>(null);
  const [forceOverride, setForceOverride] = useState(false);
  const [previewFotoLahan, setPreviewFotoLahan] = useState<string | null>(null);

  // Form Data Lahan Baru
  const [formData, setFormData] = useState({
    namaLahan: '',
    petaniId: '',
    komoditas: 'Padi',
    kabupaten: 'Magetan',
    statusKepemilikan: 'Milik Sendiri',
    statusIrigasi: 'Irigasi Teknis',
    nomorPipil: '',
    batasUtara: '',
    batasSelatan: '',
    batasTimur: '',
    batasBarat: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const POPULAR_KOMODITAS = [
    'Padi',
    'Jagung',
    'Kedelai',
    'Bawang Merah',
    'Tembakau',
    'Tebu',
    'Hortikultura',
  ];

  const toggleKomoditas = (item: string) => {
    const raw = formData.komoditas || '';
    const currentList = raw
      .split(/[,/]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    let nextList: string[];
    const index = currentList.findIndex((c) => c.toLowerCase() === item.toLowerCase());
    if (index >= 0) {
      nextList = currentList.filter((_, i) => i !== index);
      if (nextList.length === 0) {
        nextList = [item];
      }
    } else {
      nextList = [...currentList, item];
    }
    setFormData((prev) => ({ ...prev, komoditas: nextList.join(', ') }));
  };

  // Jalan Pintas (Shortcut) Tambah Petani / Penggarap Baru langsung di Modal Digitasi
  const [poktanList, setPoktanList] = useState<any[]>([]);
  const [isQuickAddPetani, setIsQuickAddPetani] = useState(false);
  const [savingQuickPetani, setSavingQuickPetani] = useState(false);
  const [quickPetaniData, setQuickPetaniData] = useState({
    nama: '',
    nik: '',
    noKk: '',
    tempatLahir: 'Magetan',
    tanggalLahir: '1980-05-15',
    namaIbuKandung: '',
    telepon: '',
    alamat: 'Dusun Krajan RT 01 / RW 01',
    desa: 'Kediren',
    kecamatan: 'Lembeyan',
    kabupaten: 'Magetan',
    poktanId: '',
  });

  // Load Lahan List
  const fetchLahan = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (komoditasFilter !== 'SEMUA') params.append('komoditas', komoditasFilter);

      // Isolasi cakupan data spasial per jabatan
      if (currentUser.role === 'PETANI' && currentUser.petaniId) {
        params.append('petaniId', currentUser.petaniId);
      } else if (currentUser.role === 'POKTAN' && currentUser.poktanId) {
        params.append('poktanId', currentUser.poktanId);
        if (selectedPetaniFilter !== 'SEMUA') params.append('petaniId', selectedPetaniFilter);
      } else {
        if (selectedPetaniFilter !== 'SEMUA') params.append('petaniId', selectedPetaniFilter);
      }

      const url = `/api/lahan${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setLahanList(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Load Petani List with their registered blocks count
  const fetchPetani = async () => {
    try {
      const timestamp = Date.now();
      let url = `/api/petani?_t=${timestamp}`;
      if (currentUser.role === 'PETANI' && currentUser.petaniId) {
        url += `&petaniId=${currentUser.petaniId}`;
      } else if (currentUser.role === 'POKTAN' && currentUser.poktanId) {
        url += `&poktanId=${currentUser.poktanId}`;
      }
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPetaniList(json.data);
        cachePetaniList(json.data);
        if (json.data.length > 0 && !formData.petaniId) {
          setFormData((prev) => ({ ...prev, petaniId: json.data[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
      const cached = getCachedPetaniList();
      if (cached && cached.length > 0) {
        setPetaniList(cached);
      }
    }
  };

  const fetchPoktan = async () => {
    try {
      const res = await fetch(`/api/poktan?_t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPoktanList(json.data);
        if (json.data.length > 0 && !quickPetaniData.poktanId) {
          setQuickPetaniData((prev) => ({ ...prev, poktanId: json.data[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLahan();
  }, [komoditasFilter, selectedPetaniFilter, currentUser.role, currentUser.petaniId, currentUser.poktanId]);

  useEffect(() => {
    fetchPetani();
    fetchPoktan();

    const handleDataUpdated = () => {
      fetchPetani();
      fetchPoktan();
      fetchLahan();
    };
    window.addEventListener('petani-updated', handleDataUpdated);
    window.addEventListener('poktan-updated', handleDataUpdated);
    window.addEventListener('storage', handleDataUpdated);
    window.addEventListener('focus', handleDataUpdated);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleDataUpdated();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const checkOffline = () => {
      const surveys = getOfflineSurveys();
      setOfflineCount(surveys.filter((s) => s.syncStatus !== 'SUCCESS').length);
    };
    checkOffline();
    window.addEventListener('offline-surveys-changed', checkOffline);
    return () => {
      window.removeEventListener('petani-updated', handleDataUpdated);
      window.removeEventListener('poktan-updated', handleDataUpdated);
      window.removeEventListener('storage', handleDataUpdated);
      window.removeEventListener('focus', handleDataUpdated);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('offline-surveys-changed', checkOffline);
    };
  }, [currentUser.role, currentUser.petaniId, currentUser.poktanId]);

  // Simpan Cepat Petani Baru dari dalam Modal Digitasi Lahan
  const handleSaveQuickPetani = async (): Promise<string | null> => {
    if (!quickPetaniData.nama.trim() || !quickPetaniData.nik.trim()) {
      showWarning('Form Belum Lengkap', 'Nama Lengkap dan NIK Petani/Penggarap baru wajib diisi!');
      return null;
    }
    const cleanNik = quickPetaniData.nik.replace(/\D/g, '');
    if (cleanNik.length < 10) {
      showWarning('NIK Tidak Valid', 'NIK Petani minimal harus 10 digit angka!');
      return null;
    }
    let targetPoktanId = quickPetaniData.poktanId || poktanList[0]?.id;
    if (!targetPoktanId) {
      try {
        const resPok = await fetch('/api/poktan');
        const jsonPok = await resPok.json();
        if (jsonPok.success && jsonPok.data?.length > 0) {
          targetPoktanId = jsonPok.data[0].id;
        }
      } catch {}
    }
    if (!targetPoktanId) {
      showWarning('Pilih Poktan', 'Pilih Kelompok Tani (Poktan) terlebih dahulu!');
      return null;
    }

    try {
      setSavingQuickPetani(true);
      const res = await fetch('/api/petani', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...quickPetaniData,
          nik: cleanNik,
          noKk: (quickPetaniData.noKk || cleanNik).replace(/\D/g, ''),
          poktanId: targetPoktanId,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const savedPetani = json.data;
        setPetaniList((prev) => [savedPetani, ...prev.filter((p) => p.id !== savedPetani.id)]);
        try {
          cachePetaniList([savedPetani, ...petaniList.filter((p) => p.id !== savedPetani.id)]);
        } catch {}

        setFormData((prev) => ({
          ...prev,
          petaniId: savedPetani.id,
          kabupaten: quickPetaniData.kabupaten || prev.kabupaten || 'Magetan',
        }));
        setIsQuickAddPetani(false);

        if (json.alreadyExisted) {
          showSuccess('Petani Ditemukan', `Petani "${savedPetani.nama}" (NIK: ${savedPetani.nik}) sudah terdaftar dan otomatis dipilih!`);
        } else {
          showSuccess('Petani Terdaftar', `Petani baru "${savedPetani.nama}" berhasil didaftarkan dan dipilih!`);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('petani-updated', { detail: savedPetani }));
          try {
            localStorage.setItem('pertanian_last_petani_update', Date.now().toString());
          } catch {}
        }

        fetchPetani();
        return savedPetani.id;
      } else {
        showError('Gagal Menyimpan', json.error || 'Terjadi kesalahan saat menyimpan petani.');
        return null;
      }
    } catch (err: any) {
      showError('Kesalahan Jaringan', err.message);
      return null;
    } finally {
      setSavingQuickPetani(false);
    }
  };

  const handlePolygonCreated = (
    coords: [number, number][],
    luasHa: number,
    luasM2: number,
    perimeterM: number = 0,
    overlapInfo?: OverlapResult
  ) => {
    setDrawnCoords(coords);
    setDrawnLuasHa(luasHa);
    setDrawnLuasM2(luasM2);
    setDrawnPerimeter(perimeterM);
    setOverlapData(overlapInfo || null);
    setForceOverride(false);
    setModalOpen(true);
    setIsDrawingMode(false);
  };

  const handleSubmitLahan = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetPetaniId = formData.petaniId || (petaniList.length > 0 ? petaniList[0].id : '');

    // Jika user sedang membuka form jalan pintas Petani Baru dan langsung klik Simpan Petak Lahan,
    // daftarkan petani baru tersebut secara otomatis terlebih dahulu!
    if (isQuickAddPetani) {
      const createdId = await handleSaveQuickPetani();
      if (!createdId) return;
      targetPetaniId = createdId;
    }

    if (!formData.namaLahan || !targetPetaniId) {
      showWarning('Form Belum Lengkap', 'Nama petak lahan dan petani pemilik/penggarap wajib diisi!');
      return;
    }

    if (overlapData?.hasOverlap && !forceOverride) {
      showWarning(
        'Lahan Tumpang Tindih',
        'Lahan ini terdeteksi tumpang tindih dengan petak terdaftar. Silakan centang konfirmasi klarifikasi PPL/Lapangan jika ingin tetap melanjutkan pendaftaran.'
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/lahan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          petaniId: targetPetaniId,
          coordinates: drawnCoords,
          forceOverride,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showSuccess('Petak Lahan Tersimpan', 'Petak lahan baru berhasil disimpan dan kuota e-RDKK petani otomatis diperbarui!');
        setModalOpen(false);
        setIsQuickAddPetani(false);
        setFormData({
          namaLahan: '',
          petaniId: targetPetaniId || petaniList[0]?.id || '',
          komoditas: 'Padi',
          kabupaten: 'Magetan',
          statusKepemilikan: 'Milik Sendiri',
          statusIrigasi: 'Irigasi Teknis',
          nomorPipil: '',
          batasUtara: '',
          batasSelatan: '',
          batasTimur: '',
          batasBarat: '',
        });
        fetchLahan();
        fetchPetani();
      } else {
        showError('Gagal Menyimpan', json.error);
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Export seluruh poligon lahan terfilter ke format standar GeoJSON (.geojson) untuk QGIS / ArcGIS
  const handleExportGeoJSON = () => {
    const features = filteredLahan.map((l) => {
      let parsedCoords: [number, number][] = [];
      try {
        parsedCoords = typeof l.coordinates === 'string' ? JSON.parse(l.coordinates) : l.coordinates;
      } catch {
        parsedCoords = [];
      }
      // Standar RFC 7946 GeoJSON Polygon menggunakan urutan [longitude, latitude] dan menutup ring
      const ring = parsedCoords.map((c) => [c[1], c[0]]);
      if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
        ring.push([...ring[0]]);
      }

      return {
        type: 'Feature',
        properties: {
          kodeLahan: l.kodeLahan,
          namaLahan: l.namaLahan,
          komoditas: l.komoditas,
          luasHa: l.luasHa,
          luasM2: l.luasM2,
          statusKepemilikan: l.statusKepemilikan,
          statusIrigasi: l.statusIrigasi,
          nomorPipil: l.nomorPipil || '-',
          namaPetani: l.petani?.nama || '-',
          nikPetani: l.petani?.nik || '-',
          poktan: l.petani?.poktan?.nama || '-',
          kecamatan: 'Lembeyan',
          developer: 'Supriyanto Abadi Jaya',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [ring],
        },
      };
    });

    const geojsonObj = {
      type: 'FeatureCollection',
      name: 'Peta_Lahan_Pertanian_Kecamatan_Lembeyan',
      crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
      features,
    };

    const blob = new Blob([JSON.stringify(geojsonObj, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Peta_GIS_Kecamatan_Lembeyan_${new Date().toISOString().slice(0, 10)}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteLahan = async (item: LahanItem) => {
    const confirmDelete = await showDeleteConfirm(
      item.namaLahan,
      `Hapus petak lahan <strong>"${item.namaLahan}"</strong> (${item.kodeLahan}) milik <strong>${item.petani?.nama}</strong>?<br/><span class="text-xs text-rose-600 block mt-1 font-semibold">Luas baku & kuota pupuk petani akan disesuaikan otomatis.</span>`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/lahan?id=${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showSuccess('Lahan Dihapus', 'Petak sawah berhasil dihapus dari peta.');
        if (selectedLahanId === item.id) setSelectedLahanId(null);
        fetchLahan();
        fetchPetani();
      } else {
        showError('Gagal Menghapus', json.error);
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    }
  };

  // Mode Edit Petak Lahan
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingLahan, setEditingLahan] = useState<LahanItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    namaLahan: '',
    petaniId: '',
    komoditas: 'Padi',
    kabupaten: 'Magetan',
    statusKepemilikan: 'Milik Sendiri',
    statusIrigasi: 'Irigasi Teknis',
    nomorPipil: '',
    batasUtara: '',
    batasSelatan: '',
    batasTimur: '',
    batasBarat: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const handleOpenEditLahan = (item: LahanItem) => {
    setEditingLahan(item);
    setEditFormData({
      namaLahan: item.namaLahan || '',
      petaniId: item.petani?.id || (item as any).petaniId || '',
      komoditas: item.komoditas || 'Padi',
      kabupaten: item.kabupaten || 'Magetan',
      statusKepemilikan: item.statusKepemilikan || 'Milik Sendiri',
      statusIrigasi: item.statusIrigasi || 'Irigasi Teknis',
      nomorPipil: item.nomorPipil || '',
      batasUtara: item.batasUtara || '',
      batasSelatan: item.batasSelatan || '',
      batasTimur: item.batasTimur || '',
      batasBarat: item.batasBarat || '',
    });
    setEditModalOpen(true);
  };

  const toggleEditKomoditas = (item: string) => {
    const raw = editFormData.komoditas || '';
    const currentList = raw
      .split(/[,/]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    let nextList: string[];
    const index = currentList.findIndex((c) => c.toLowerCase() === item.toLowerCase());
    if (index >= 0) {
      nextList = currentList.filter((_, i) => i !== index);
      if (nextList.length === 0) nextList = [item];
    } else {
      nextList = [...currentList, item];
    }
    setEditFormData((prev) => ({ ...prev, komoditas: nextList.join(', ') }));
  };

  const handleSaveEditLahan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLahan) return;

    if (!editFormData.namaLahan.trim()) {
      showWarning('Nama Blok Lahan Kosong', 'Harap masukkan nama petak / blok sawah.');
      return;
    }
    if (!editFormData.petaniId) {
      showWarning('Petani Belum Dipilih', 'Harap pilih petani pemilik atau penggarap sawah.');
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch('/api/lahan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingLahan.id,
          ...editFormData,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showSuccess(
          'Petak Lahan Diperbarui!',
          `Data petak sawah "${editFormData.namaLahan}" (${editingLahan.kodeLahan}) berhasil diperbarui.`
        );
        setEditModalOpen(false);
        setEditingLahan(null);
        fetchLahan();
        fetchPetani();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('lahan-updated'));
          window.dispatchEvent(new CustomEvent('petani-updated'));
        }
      } else {
        showError('Gagal Menyimpan Perubahan', json.error || 'Terjadi kesalahan pada server');
      }
    } catch (err: any) {
      showError('Terjadi Kesalahan', err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Filtered List Petak Lahan
  const filteredLahan: LahanItem[] = useMemo(() => {
    return lahanList.filter((l: any): l is LahanItem => {
      // 1. Filter Petani jika dipilih
      if (selectedPetaniFilter !== 'SEMUA' && l.petani?.id !== selectedPetaniFilter) {
        return false;
      }
      // 2. Filter Desa jika dipilih
      if (desaFilter !== 'SEMUA') {
        const lDesa = l.desa || l.petani?.desa || l.petani?.poktan?.desa;
        if (lDesa !== desaFilter) return false;
      }
      // 3. Filter Pencarian Teks
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const namaMatch = (l.namaLahan || '').toLowerCase().includes(q);
      const kodeMatch = (l.kodeLahan || '').toLowerCase().includes(q);
      const petaniMatch = (l.petani?.nama || '').toLowerCase().includes(q);
      const nikMatch = (l.petani?.nik || '').includes(q);
      const poktanMatch = (l.petani?.poktan?.nama || '').toLowerCase().includes(q);
      return namaMatch || kodeMatch || petaniMatch || nikMatch || poktanMatch;
    });
  }, [lahanList, selectedPetaniFilter, desaFilter, searchQuery]);

  // Handler Submit Pencarian Petak Lahan (Otomatis seleksi dan terbangkan peta ke petak)
  const handleSearchLahanSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    const match = lahanList.find((l: any) => {
      const namaMatch = (l.namaLahan || '').toLowerCase().includes(q);
      const kodeMatch = (l.kodeLahan || '').toLowerCase().includes(q);
      const petaniMatch = (l.petani?.nama || '').toLowerCase().includes(q);
      const nikMatch = (l.petani?.nik || '').includes(q);
      return namaMatch || kodeMatch || petaniMatch || nikMatch;
    });

    if (match) {
      if (desaFilter !== 'SEMUA') {
        const lDesa = match.desa || match.petani?.desa;
        if (lDesa !== desaFilter) {
          setDesaFilter('SEMUA');
        }
      }
      setSelectedLahanId(match.id);
      setFlyToTarget({
        lat: match.centerLat,
        lng: match.centerLng,
        zoom: 18,
        label: `${match.kodeLahan} - ${match.namaLahan}`,
        keterangan: `Milik ${match.petani?.nama || '-'} (${match.luasHa} Ha)`,
        timestamp: Date.now(),
      });
      showToast(`Peta difokuskan ke petak sawah "${match.namaLahan}" (${match.kodeLahan})`, 'success');
    } else {
      showWarning('Petak Tidak Ditemukan', `Tidak ada petak sawah atau petani yang cocok dengan kata kunci "${searchQuery}".`);
    }
  };

  // Petani yang sedang difilter/dipilih
  const activePetaniObj = petaniList.find((p) => p.id === selectedPetaniFilter);
  const activePetaniBlokList = lahanList.filter((l) => l.petani?.id === selectedPetaniFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Map className="w-6 h-6 text-emerald-600" />
            Pemetaan Lahan Pertanian (GIS Spasial)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Peta interaktif poligon petak sawah & tegalan terintegrasi dengan daftar blok lahan per petani.
          </p>
        </div>

        {/* Action Button: Export GeoJSON GIS */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportGeoJSON}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition shadow-sm cursor-pointer active:scale-95"
            title="Unduh file poligon spasial GeoJSON untuk QGIS / ArcGIS"
          >
            <Download className="w-4 h-4" />
            <span>Export GeoJSON GIS</span>
          </button>
        </div>
      </div>

      {/* Banner Antrean Offline Jika Ada Survei Belum Tersinkron */}
      {offlineCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-orange-500/15 border-2 border-amber-400/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-amber-950 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-xs shrink-0">
              📴
            </div>
            <div>
              <div className="flex items-center gap-2">
                <strong className="text-sm sm:text-base font-black text-slate-900">
                  {offlineCount} Petak Sawah Tersimpan di Antrean HP (Offline)
                </strong>
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Siap Unggah
                </span>
              </div>
              <p className="text-xs text-amber-900/80 mt-0.5">
                Data patok ini direkam saat surveyor berada di area persawahan tanpa sinyal internet. Hubungkan perangkat Anda ke internet dan sinkronkan ke database.
              </p>
            </div>
          </div>
          <Link
            href="/field-maps"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition shadow-md shadow-amber-500/20 shrink-0 active:scale-95"
          >
            <Compass className="w-4 h-4 text-slate-950" />
            <span>Buka Field Maps & Sinkronkan</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Filter and Search Bar Row */}
      <div className="bg-white p-3.5 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs max-w-full overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 max-w-full">
          {/* Sisi Kiri: Filter Petani & Filter Desa */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
            {/* Filter Pilih Petani */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1 shrink-0">
                <User className="w-4 h-4 text-emerald-600" /> Petani:
              </span>
              <select
                value={selectedPetaniFilter}
                onChange={(e) => setSelectedPetaniFilter(e.target.value)}
                className="w-full min-w-0 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-slate-50 truncate cursor-pointer"
              >
                <option value="SEMUA">Semua Petani ({petaniList.length} Orang)</option>
                {petaniList.map((p) => {
                  const countBlok = lahanList.filter((l) => l.petani?.id === p.id).length;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({countBlok} Blok &bull; {p.totalLuasLahan} Ha)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Filter Desa */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0 sm:max-w-xs">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1 shrink-0">
                <MapPin className="w-4 h-4 text-emerald-600" /> Desa:
              </span>
              <select
                value={desaFilter}
                onChange={(e) => {
                  setDesaFilter(e.target.value);
                  setSelectedLahanId(null);
                }}
                className="w-full min-w-0 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-emerald-500 cursor-pointer truncate"
              >
                <option value="SEMUA">Semua Desa (Kec. Lembeyan)</option>
                {DESA_LEMBEYAN_LIST.map((d) => (
                  <option key={d} value={d}>
                    Desa / Kel. {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sisi Kanan: Form Pencarian Petak & NIK Petani dengan Tombol Cari */}
          <form
            onSubmit={handleSearchLahanSubmit}
            className="flex items-center gap-2 w-full lg:w-auto shrink-0"
          >
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari petak, NIK, petani..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari Petak</span>
            </button>
          </form>
        </div>
      </div>

      {/* BANNER DAFTAR BLOK SAWAH PETANI YANG DIPILIH */}
      {selectedPetaniFilter !== 'SEMUA' && activePetaniObj && (
        <div className="bg-gradient-to-r from-emerald-900 to-green-900 text-white rounded-3xl p-6 shadow-md border border-emerald-700/60 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-700/60 pb-4 mb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-emerald-800 text-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider mb-1.5">
                <User className="w-3.5 h-3.5" /> Rincian Lahan Petani
              </div>
              <h2 className="text-xl font-black">{activePetaniObj.nama}</h2>
              <p className="text-xs text-emerald-200 mt-0.5">
                NIK: <span className="font-mono text-white font-bold">{activePetaniObj.nik}</span> &bull; {activePetaniObj.poktan?.nama} ({activePetaniObj.desa})
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-emerald-800/80 border border-emerald-600/60 px-4 py-2 rounded-2xl text-center">
                <span className="text-[10px] text-emerald-300 block font-semibold uppercase">Total Blok Sawah</span>
                <span className="text-xl font-black text-white">{activePetaniBlokList.length} Petak</span>
              </div>
              <div className="bg-emerald-800/80 border border-emerald-600/60 px-4 py-2 rounded-2xl text-center">
                <span className="text-[10px] text-emerald-300 block font-semibold uppercase">Total Luas Akumulasi</span>
                <span className="text-xl font-black text-amber-300">
                  {activePetaniBlokList.reduce((sum, l) => sum + l.luasHa, 0).toFixed(2)} Ha
                </span>
              </div>
              <button
                onClick={() => setSelectedPetaniFilter('SEMUA')}
                className="text-xs text-emerald-300 hover:text-white underline ml-2"
              >
                Lihat Semua Petani
              </button>
            </div>
          </div>

          {/* Cards List Blok Sawah Milik Petani Ini */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Daftar Petak / Blok Sawah Milik {activePetaniObj.nama}:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activePetaniBlokList.map((blok, idx) => (
                <div
                  key={blok.id}
                  className={`bg-white/10 backdrop-blur-md rounded-2xl p-4 border transition cursor-pointer hover:bg-white/20 ${
                    selectedLahanId === blok.id ? 'border-amber-400 ring-2 ring-amber-400/50 bg-white/20' : 'border-white/15'
                  }`}
                  onClick={() => setSelectedLahanId(blok.id)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded text-emerald-100">
                      Blok #{idx + 1} &bull; {blok.kodeLahan}
                    </span>
                    <span className="text-[11px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                      {blok.komoditas}
                    </span>
                  </div>

                  <h5 className="font-black text-sm text-white mb-1">{blok.namaLahan}</h5>
                  <p className="text-xs text-emerald-200 font-semibold mb-2">
                    Luas: <span className="text-white font-bold">{blok.luasHa} Ha</span> ({blok.luasM2.toLocaleString('id-ID')} m²)
                  </p>
                  <p className="text-[11px] text-emerald-300 mb-3">
                    Status: {blok.statusKepemilikan} ({blok.statusIrigasi}) &bull; Pipil: {blok.nomorPipil || '-'}
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/15">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLahanId(blok.id);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-200 hover:text-white"
                    >
                      <Compass className="w-3.5 h-3.5 text-amber-300" />
                      Fokus di Peta
                    </button>
                    <Link
                      href={`/cetak-lahan/${blok.id}`}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] font-bold bg-white text-emerald-950 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition shadow-xs"
                    >
                      <Printer className="w-3 h-3 text-emerald-800" />
                      Cetak Kartu
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Map Component */}
      <MapWrapper
        lahanList={filteredLahan}
        isDrawingMode={isDrawingMode}
        onPolygonCreated={handlePolygonCreated}
        selectedLahanId={selectedLahanId}
        flyToTarget={flyToTarget}
        onSelectDesaFromMap={(desaKey) => {
          setDesaFilter(desaKey);
          const c = DESA_COORDINATES_LEMBEYAN[desaKey] || DESA_COORDINATES_LEMBEYAN.SEMUA;
          if (c) {
            setFlyToTarget({
              lat: c.lat,
              lng: c.lng,
              zoom: c.zoom,
              label: c.label,
              keterangan: c.keterangan,
              timestamp: Date.now(),
            });
          }
        }}
        onToggleDrawingMode={() => setIsDrawingMode(!isDrawingMode)}
        canDigitasiGis={permissions.canDigitasiGis}
      />

      {/* Table list of Lahan with Direct Print Card button */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-black text-slate-800 text-base">
              Daftar Petak Lahan Terpetakan ({filteredLahan.length} Petak)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik nama petani untuk memfilter seluruh blok sawah miliknya, atau klik &quot;Cetak Kartu Lahan&quot; untuk mencetak laporan resmi.
            </p>
          </div>
          {selectedPetaniFilter !== 'SEMUA' && (
            <button
              onClick={() => setSelectedPetaniFilter('SEMUA')}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition"
            >
              Reset Filter Petani (Tampilkan Semua)
            </button>
          )}
        </div>

        {/* Mobile Card View (Smartphone Friendly) */}
        <div className="block lg:hidden divide-y divide-slate-100">
          {filteredLahan.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs italic">
              Tidak ada petak sawah yang sesuai pencarian.
            </div>
          ) : (
            filteredLahan.map((item) => {
              const countPetaniBlok = lahanList.filter((l) => l.petani?.id === item.petani?.id).length;
              const isSelected = selectedLahanId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-4 transition space-y-3 cursor-pointer ${
                    isSelected ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : 'hover:bg-slate-50/80'
                  }`}
                  onClick={() => setSelectedLahanId(item.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded">
                        {item.kodeLahan}
                      </span>
                      <h4 className="font-black text-slate-900 text-sm mt-1 leading-tight truncate">
                        {item.namaLahan}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        👤 <strong>{item.petani?.nama || '-'}</strong> ({countPetaniBlok} Blok) &bull; {item.petani?.poktan?.nama}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-emerald-800 text-sm block leading-tight">
                        {item.luasHa} Ha
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {item.luasM2.toLocaleString('id-ID')} m²
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                      🌾 {item.komoditas}
                    </span>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                      📜 Pipil: {item.nomorPipil || '-'}
                    </span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                      {item.statusKepemilikan}
                    </span>
                  </div>

                  {/* Tombol Aksi Touch-Friendly Responsif */}
                  <div
                    className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedLahanId(item.id)}
                      className="flex-1 min-w-[90px] inline-flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition"
                    >
                      <Compass className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Peta</span>
                    </button>

                    <Link
                      href={`/cetak-lahan/${item.id}`}
                      target="_blank"
                      className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-emerald-700 text-white font-bold text-xs active:scale-95 transition shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Cetak</span>
                    </Link>

                    <Link
                      href={`/cek-kuota?tab=kalkulator&lahanId=${item.id}`}
                      className="flex-1 min-w-[110px] inline-flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs active:scale-95 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Kalender</span>
                    </Link>

                    {item.fotoLahan && (
                      <button
                        type="button"
                        onClick={() => setPreviewFotoLahan(item.fotoLahan || null)}
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition"
                        title="Foto Watermark GPS"
                      >
                        <Camera className="w-4 h-4 text-emerald-600" />
                      </button>
                    )}

                    {permissions.canVerifyPpl && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditLahan(item)}
                        className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 active:scale-95 transition"
                        title="Edit Data Petak Lahan"
                      >
                        <Edit3 className="w-4 h-4 text-slate-700" />
                      </button>
                    )}

                    {permissions.canVerifyPpl && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLahan(item)}
                        className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 active:scale-95 transition"
                        title="Hapus Petak Lahan"
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

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Kode & Nama Petak</th>
                <th className="py-3 px-4">Petani & Poktan (Klik untuk Filter Blok)</th>
                <th className="py-3 px-4">Komoditas</th>
                <th className="py-3 px-4">Luas Lahan</th>
                <th className="py-3 px-4">Status & No. Pipil</th>
                <th className="py-3 px-4 text-right">Aksi Dokumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLahan.map((item) => {
                const countPetaniBlok = lahanList.filter((l) => l.petani?.id === item.petani?.id).length;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 transition cursor-pointer ${
                      selectedLahanId === item.id ? 'bg-emerald-50/60' : ''
                    }`}
                    onClick={() => setSelectedLahanId(item.id)}
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">
                        {item.kodeLahan}
                      </span>
                      <div className="font-bold text-slate-800 mt-1">{item.namaLahan}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.petani?.id) setSelectedPetaniFilter(item.petani.id);
                        }}
                        className="text-left group"
                      >
                        <div className="font-bold text-slate-900 group-hover:text-emerald-700 flex items-center gap-1.5">
                          {item.petani?.nama || '-'}
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full border border-emerald-200">
                            {countPetaniBlok} Blok
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          NIK: {item.petani?.nik} &bull; {item.petani?.poktan?.nama}
                        </div>
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {item.komoditas}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{item.luasHa} Ha</div>
                      <div className="text-[11px] text-slate-400">{item.luasM2.toLocaleString('id-ID')} m²</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-700 font-medium">{item.statusKepemilikan}</div>
                      <div className="text-[11px] font-mono text-amber-700">
                        {item.nomorPipil || 'Belum ada pipil'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLahanId(item.id);
                          }}
                          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition"
                        >
                          <Compass className="w-3.5 h-3.5 text-emerald-600" />
                          Peta
                        </button>
                        <Link
                          href={`/cek-kuota?tab=kalkulator&lahanId=${item.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2.5 py-1.5 rounded-lg text-xs transition"
                          title="Hitung Jadwal Kalender Tanam & Pemupukan Presisi"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          Kalender Tanam
                        </Link>
                        <Link
                          href={`/cetak-lahan/${item.id}`}
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs transition"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-300" />
                          Cetak Kartu
                        </Link>
                        {item.fotoLahan && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewFotoLahan(item.fotoLahan || null);
                            }}
                            className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer"
                            title="Lihat Foto Dokumentasi Ber-watermark GPS"
                          >
                            <Camera className="w-3.5 h-3.5 text-emerald-600" />
                            Foto GPS
                          </button>
                        )}
                        {permissions.canVerifyPpl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditLahan(item);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition cursor-pointer"
                            title="Edit Data Petak Lahan"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {permissions.canVerifyPpl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLahan(item);
                            }}
                            className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Hapus Petak Lahan"
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

      {/* Modal Input Form Data Lahan Hasil Digitasi Poligon */}
      {modalOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <Map className="w-5 h-5 text-emerald-600" />
                Simpan Petak Lahan Hasil Digitasi
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ringkasan Pengukuran Kadastral Spasial */}
            <div className="my-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Luas Spasial</span>
                  <div className="text-emerald-800 font-black text-base mt-0.5">{drawnLuasHa} Ha</div>
                  <span className="text-[10px] text-slate-500 font-mono">({drawnLuasM2.toLocaleString('id-ID')} m²)</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Keliling Batas</span>
                  <div className="text-blue-800 font-black text-base mt-0.5">{drawnPerimeter.toLocaleString('id-ID')} m</div>
                  <span className="text-[10px] text-slate-500">Panjang Sempadan</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Patok Kadastral</span>
                  <div className="text-amber-800 font-black text-base mt-0.5">{drawnCoords.length} Titik</div>
                  <span className="text-[10px] text-slate-500 font-mono">P1 s/d P{drawnCoords.length}</span>
                </div>
              </div>

              {/* Status Verifikasi Spasial (Overlap Warning / Clean) */}
              {overlapData?.hasOverlap ? (
                <div className="bg-red-50 border border-red-300 rounded-xl p-3 space-y-2 text-red-900">
                  <div className="flex items-center gap-2 font-bold text-xs text-red-800">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Terdeteksi Tumpang Tindih Spasial (Spatial Overlap)!</span>
                  </div>
                  <p className="text-[11px] text-red-700 leading-relaxed">
                    Poligon yang digambar bersinggungan atau memotong petak lahan yang telah terdaftar sebelumnya:
                  </p>
                  <div className="space-y-1">
                    {overlapData.overlappingPlots.map((plot, idx) => (
                      <div key={idx} className="bg-white/80 p-2 rounded-lg border border-red-200 text-[11px]">
                        <strong className="text-red-900">{plot.namaLahan}</strong> ({plot.kodeLahan}) &bull; Pemilik: <span className="font-bold">{plot.namaPetani}</span>
                        <div className="text-[10px] text-red-600 italic mt-0.5">{plot.intersectionType}</div>
                      </div>
                    ))}
                  </div>

                  <label className="flex items-start gap-2 pt-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceOverride}
                      onChange={(e) => setForceOverride(e.target.checked)}
                      className="mt-0.5 rounded border-red-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-[11px] font-semibold text-red-900 leading-snug">
                      Konfirmasi PPL: Batas fisik pematang tanah telah diverifikasi langsung di lapangan dan telah disepakati bersama pihak pemilik/poktan terkait.
                    </span>
                  </label>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Batas Spasial Bersih: Tidak ditemukan tumpang tindih dengan petak lahan lain.</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmitLahan} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Petak Lahan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Blok Klampisireng / Sawah Mbambung"
                  value={formData.namaLahan}
                  onChange={(e) => setFormData({ ...formData, namaLahan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label className="block font-bold text-slate-800 text-xs">
                    Petani Pemilik / Penggarap *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isQuickAddPetani && desaFilter !== 'SEMUA') {
                        setQuickPetaniData((prev) => ({ ...prev, desa: desaFilter }));
                      }
                      setIsQuickAddPetani(!isQuickAddPetani);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
                      isQuickAddPetani
                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700'
                    }`}
                  >
                    {isQuickAddPetani ? (
                      <>
                        <Users className="w-3.5 h-3.5 text-slate-700" />
                        Pilih dari Petani Terdaftar ({petaniList.length})
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 text-white" />
                        + Jalan Pintas: Tambah Petani Baru
                      </>
                    )}
                  </button>
                </div>

                {!isQuickAddPetani ? (
                  <>
                    <select
                      value={formData.petaniId || (petaniList.length > 0 ? petaniList[0].id : '')}
                      onChange={(e) => {
                        if (e.target.value === '__QUICK_ADD__') {
                          if (desaFilter !== 'SEMUA') {
                            setQuickPetaniData((prev) => ({ ...prev, desa: desaFilter }));
                          }
                          setIsQuickAddPetani(true);
                          return;
                        }
                        setFormData({ ...formData, petaniId: e.target.value });
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                    >
                      {petaniList.map((p) => {
                        const existingCount = lahanList.filter((l) => l.petani?.id === p.id).length;
                        return (
                          <option key={p.id} value={p.id}>
                            {p.nama} (NIK: {p.nik}) &bull; Saat ini memiliki {existingCount} blok
                          </option>
                        );
                      })}
                      <option value="__QUICK_ADD__" className="font-bold text-emerald-700 bg-emerald-50">
                        + Petani Belum Ada? Klik untuk Tambah Petani / Penggarap Baru...
                      </option>
                    </select>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                      <span>*Memilih petani akan mengakumulasi total luas lahan ke akun petani tersebut.</span>
                      <button
                        type="button"
                        onClick={() => setIsQuickAddPetani(true)}
                        className="text-emerald-700 font-bold underline hover:text-emerald-800 cursor-pointer shrink-0 ml-2"
                      >
                        + Input Petani Baru
                      </button>
                    </div>
                  </>
                ) : (
                  /* Panel Jalan Pintas Input Petani / Penggarap Baru Langsung di Modal Digitasi */
                  <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl p-3.5 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                          Jalan Pintas Pendaftaran Petani
                        </span>
                        <h4 className="font-black text-slate-900 text-xs mt-1">
                          Input Data Petani / Penggarap Baru
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsQuickAddPetani(false)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold"
                      >
                        Batal
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">
                          Nama Lengkap Petani / Penggarap *
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Suparno"
                          value={quickPetaniData.nama}
                          onChange={(e) => setQuickPetaniData({ ...quickPetaniData, nama: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">
                          NIK Sesuai KTP (16 Digit) *
                        </label>
                        <input
                          type="text"
                          maxLength={16}
                          placeholder="Contoh: 3520041205800003"
                          value={quickPetaniData.nik}
                          onChange={(e) =>
                            setQuickPetaniData({
                              ...quickPetaniData,
                              nik: e.target.value.replace(/\D/g, ''),
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">
                          Nomor Kartu Keluarga (KK)
                        </label>
                        <input
                          type="text"
                          maxLength={16}
                          placeholder="Kosongkan jika sama dgn NIK"
                          value={quickPetaniData.noKk}
                          onChange={(e) =>
                            setQuickPetaniData({
                              ...quickPetaniData,
                              noKk: e.target.value.replace(/\D/g, ''),
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">
                          Kelompok Tani (Poktan) *
                        </label>
                        <select
                          value={quickPetaniData.poktanId}
                          onChange={(e) => setQuickPetaniData({ ...quickPetaniData, poktanId: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                        >
                          {poktanList.map((pk) => (
                            <option key={pk.id} value={pk.id}>
                              {pk.nama} (Desa {pk.desa})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">
                          Tempat Lahir
                        </label>
                        <input
                          type="text"
                          placeholder="Magetan"
                          value={quickPetaniData.tempatLahir}
                          onChange={(e) => setQuickPetaniData({ ...quickPetaniData, tempatLahir: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">
                          Tanggal Lahir
                        </label>
                        <input
                          type="date"
                          value={quickPetaniData.tanggalLahir}
                          onChange={(e) => setQuickPetaniData({ ...quickPetaniData, tanggalLahir: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">
                          Nama Ibu Kandung
                        </label>
                        <input
                          type="text"
                          placeholder="Nama gadis ibu"
                          value={quickPetaniData.namaIbuKandung}
                          onChange={(e) => setQuickPetaniData({ ...quickPetaniData, namaIbuKandung: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">
                          Desa / Kelurahan (Kec. Lembeyan)
                        </label>
                        <select
                          value={quickPetaniData.desa}
                          onChange={(e) => setQuickPetaniData({ ...quickPetaniData, desa: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                        >
                          {DESA_LEMBEYAN_LIST.map((d) => (
                            <option key={d} value={d}>
                              Desa / Kel. {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">
                          Alamat Dusun / RT / RW
                        </label>
                        <input
                          type="text"
                          placeholder="Dusun Krajan RT 01 / RW 01"
                          value={quickPetaniData.alamat}
                          onChange={(e) => setQuickPetaniData({ ...quickPetaniData, alamat: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-emerald-200/80">
                      <span className="text-[10px] text-emerald-800 italic">
                        *Dapat langsung klik &quot;Simpan Petak Lahan&quot; di bawah atau simpan petani dulu:
                      </span>
                      <button
                        type="button"
                        disabled={savingQuickPetani}
                        onClick={async () => {
                          await handleSaveQuickPetani();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition cursor-pointer shrink-0"
                      >
                        {savingQuickPetani ? 'Menyimpan...' : '✓ Simpan & Pilih Petani Ini'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Komoditas Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    Komoditas Tanam (Bisa Pilih &gt; 1 / Tumpang Sari) *
                  </label>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Multi-Komoditas Aktif
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {POPULAR_KOMODITAS.map((k) => {
                    const isSelected = (formData.komoditas || '')
                      .toLowerCase()
                      .includes(k.toLowerCase());
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => toggleKomoditas(k)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs border border-emerald-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        <span className="text-[11px]">{isSelected ? '✓' : '+'}</span>
                        <span>{k}</span>
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Contoh: Padi, Jagung"
                  value={formData.komoditas}
                  onChange={(e) => setFormData({ ...formData, komoditas: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs font-bold bg-white"
                />
                <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>Klik tombol pill untuk memilih lebih dari 1 komoditas.</span>
                  <span className="font-semibold text-emerald-800">
                    Terpilih: <strong>{formData.komoditas || '-'}</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Kepemilikan</label>
                  <select
                    value={formData.statusKepemilikan}
                    onChange={(e) => setFormData({ ...formData, statusKepemilikan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="Milik Sendiri">Milik Sendiri</option>
                    <option value="Sewa">Sewa</option>
                    <option value="Bagi Hasil">Bagi Hasil</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Irigasi</label>
                  <select
                    value={formData.statusIrigasi}
                    onChange={(e) => setFormData({ ...formData, statusIrigasi: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="Irigasi Teknis">Irigasi Teknis</option>
                    <option value="Tadah Hujan">Tadah Hujan</option>
                    <option value="Rawa / Lebak">Rawa / Lebak</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Pipil / SPPT PBB</label>
                  <input
                    type="text"
                    placeholder="Contoh: PBB-3520-00991"
                    value={formData.nomorPipil}
                    onChange={(e) => setFormData({ ...formData, nomorPipil: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kabupaten / Kota Lokasi Lahan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Magetan"
                  value={formData.kabupaten}
                  onChange={(e) => setFormData({ ...formData, kabupaten: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Batas Tanah */}
              <div className="pt-2 border-t border-slate-100">
                <span className="block font-bold text-slate-700 mb-1.5">Batas Tanah Sekitar:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Batas Utara (misal: sawah)"
                    value={formData.batasUtara}
                    onChange={(e) => setFormData({ ...formData, batasUtara: e.target.value })}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Batas Selatan (misal: saluran)"
                    value={formData.batasSelatan}
                    onChange={(e) => setFormData({ ...formData, batasSelatan: e.target.value })}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Batas Timur (misal: jalan)"
                    value={formData.batasTimur}
                    onChange={(e) => setFormData({ ...formData, batasTimur: e.target.value })}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Batas Barat (misal: jalan)"
                    value={formData.batasBarat}
                    onChange={(e) => setFormData({ ...formData, batasBarat: e.target.value })}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
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
                  {submitting ? 'Menyimpan...' : 'Simpan Petak Lahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pratinjau Foto Dokumentasi Lahan (GPS Watermark) Full Size */}
      {previewFotoLahan && (
        <div className="fixed inset-0 z-[3000] bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between text-white">
              <span className="text-xs font-black flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                Dokumentasi Lahan Ber-Watermark GPS Resmi
              </span>
              <button
                type="button"
                onClick={() => setPreviewFotoLahan(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 overflow-auto flex-1 flex items-center justify-center bg-black/40">
              <img
                src={previewFotoLahan}
                alt="Foto Sawah Watermark GPS"
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>
            <div className="p-3 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setPreviewFotoLahan(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Data Petak Lahan */}
      {editModalOpen && editingLahan && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-emerald-600" />
                  Perbarui Data Petak Lahan
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ubah identitas blok, kepemilikan petani, komoditas, atau nomor pipil.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informasi Spasial Kadastral Tetap */}
            <div className="my-4 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold bg-white text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded shadow-2xs">
                  {editingLahan.kodeLahan}
                </span>
                <span className="font-black text-emerald-800 text-sm">
                  {editingLahan.luasHa} Ha ({editingLahan.luasM2.toLocaleString('id-ID')} m²)
                </span>
              </div>
              <p className="text-[11px] text-emerald-900 leading-snug">
                📍 Wilayah: <strong>Kecamatan Lembeyan, Kabupaten {editingLahan.kabupaten || 'Magetan'}</strong>
              </p>
            </div>

            <form onSubmit={handleSaveEditLahan} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Petak Lahan / Blok Hamparan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Blok Klampisireng / Sawah Mbambung"
                  value={editFormData.namaLahan}
                  onChange={(e) => setEditFormData({ ...editFormData, namaLahan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Petani Pemilik / Penggarap *
                </label>
                <select
                  value={editFormData.petaniId}
                  onChange={(e) => setEditFormData({ ...editFormData, petaniId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium text-slate-900 cursor-pointer"
                >
                  <option value="">-- Pilih Petani Terdaftar --</option>
                  {petaniList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} (NIK: {p.nik}) &bull; Poktan: {p.poktan?.nama || '-'} &bull; Desa {p.desa || 'Kediren'}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  *Mengalihkan petani pemilik otomatis memperbarui akumulasi luas baku petani bersangkutan.
                </p>
              </div>

              {/* Komoditas */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Komoditas Tanam *</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {POPULAR_KOMODITAS.map((k) => {
                    const isSelected = (editFormData.komoditas || '')
                      .toLowerCase()
                      .includes(k.toLowerCase());
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => toggleEditKomoditas(k)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {k}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Padi, Jagung"
                  value={editFormData.komoditas}
                  onChange={(e) => setEditFormData({ ...editFormData, komoditas: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Penguasaan</label>
                  <select
                    value={editFormData.statusKepemilikan}
                    onChange={(e) => setEditFormData({ ...editFormData, statusKepemilikan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white cursor-pointer font-medium"
                  >
                    <option value="Milik Sendiri">Milik Sendiri</option>
                    <option value="Sewa">Sewa / Sakap</option>
                    <option value="Bagi Hasil">Bagi Hasil</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Irigasi</label>
                  <select
                    value={editFormData.statusIrigasi}
                    onChange={(e) => setEditFormData({ ...editFormData, statusIrigasi: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white cursor-pointer font-medium"
                  >
                    <option value="Irigasi Teknis">Irigasi Teknis</option>
                    <option value="Pompa Sumur Dangkal">Pompa Sumur Dangkal</option>
                    <option value="Tadah Hujan">Tadah Hujan</option>
                    <option value="Rawa / Lebak">Rawa / Lebak</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Pipil / SPPT</label>
                  <input
                    type="text"
                    placeholder="Contoh: 35.20.040.005"
                    value={editFormData.nomorPipil}
                    onChange={(e) => setEditFormData({ ...editFormData, nomorPipil: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kabupaten / Kota Lokasi Lahan</label>
                <input
                  type="text"
                  required
                  placeholder="Magetan"
                  value={editFormData.kabupaten}
                  onChange={(e) => setEditFormData({ ...editFormData, kabupaten: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
              </div>

              {/* Batas Tanah */}
              <div className="pt-2 border-t border-slate-100">
                <span className="block font-bold text-slate-700 mb-1.5">Batas Tanah Sekitar:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Batas Utara (misal: sawah)"
                    value={editFormData.batasUtara}
                    onChange={(e) => setEditFormData({ ...editFormData, batasUtara: e.target.value })}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Batas Selatan (misal: saluran)"
                    value={editFormData.batasSelatan}
                    onChange={(e) => setEditFormData({ ...editFormData, batasSelatan: e.target.value })}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Batas Timur (misal: jalan)"
                    value={editFormData.batasTimur}
                    onChange={(e) => setEditFormData({ ...editFormData, batasTimur: e.target.value })}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Batas Barat (misal: jalan)"
                    value={editFormData.batasBarat}
                    onChange={(e) => setEditFormData({ ...editFormData, batasBarat: e.target.value })}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
