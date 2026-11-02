'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  Marker,
  Circle,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  calculatePolygonArea,
  calculatePolygonPerimeter,
  calculateDistanceMeters,
} from '@/lib/calculations';
import { DESA_LEMBEYAN_LIST } from '@/lib/erdkk-format';
import {
  saveOfflineSurvey,
  getOfflineSurveys,
  deleteOfflineSurvey,
  syncSingleOfflineSurvey,
  syncAllOfflineSurveys,
  clearCompletedSurveys,
  cachePetaniList,
  getCachedPetaniList,
  OfflineSurveyItem,
} from '@/lib/offline-gis';
import { useAuth } from '@/lib/auth-context';
import {
  Compass,
  Navigation,
  MapPin,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Check,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff,
  Layers,
  Save,
  UploadCloud,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  RefreshCw,
  LogOut,
  User,
  ExternalLink,
  Info,
  Camera,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { showSuccess, showError, showWarning, showConfirm, showDeleteConfirm, showToast } from '@/lib/sweetalert';
import { copyToClipboard } from '@/lib/clipboard';
import { addGeotagWatermark } from '@/lib/watermark-camera';

// Custom Marker Patok Lapangan
const createPatokIcon = (index: number) => {
  return L.divIcon({
    className: 'custom-patok-field',
    html: `<div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; border: 2.5px solid #ffffff; border-radius: 9999px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 11px; font-family: monospace; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">P${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Custom Marker GPS Surveyor
const surveyorGpsIcon = L.divIcon({
  className: 'custom-surveyor-gps',
  html: `<div style="position: relative; width: 24px; height: 24px;">
    <div style="position: absolute; width: 24px; height: 24px; background: rgba(14, 165, 233, 0.4); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
    <div style="position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; background: #0284c7; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.5);"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Map Controller Subcomponent
function MapController({
  gpsPos,
  targetPos,
  onMapClick,
  isTapMode,
  isDrawing,
  onMapReady,
}: {
  gpsPos: [number, number] | null;
  targetPos: [number, number] | null;
  onMapClick: (lat: number, lng: number) => void;
  isTapMode: boolean;
  isDrawing: boolean;
  onMapReady?: (map: L.Map) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  // Efek ganti cursor menjadi crosshair (+) saat membuat atau menambah titik patok poligon
  useEffect(() => {
    const container = map.getContainer();
    if (isTapMode || isDrawing) {
      container.classList.add('leaflet-drawing-mode');
      container.style.cursor = 'crosshair';
      const targets = container.querySelectorAll<HTMLElement>(
        '.leaflet-pane, .leaflet-tile-pane, .leaflet-overlay-pane, .leaflet-tile, svg'
      );
      targets.forEach((el) => {
        el.style.cursor = 'crosshair';
      });
    } else {
      container.classList.remove('leaflet-drawing-mode');
      container.style.cursor = '';
      const targets = container.querySelectorAll<HTMLElement>(
        '.leaflet-pane, .leaflet-tile-pane, .leaflet-overlay-pane, .leaflet-tile, svg'
      );
      targets.forEach((el) => {
        el.style.cursor = '';
      });
    }
  }, [isTapMode, isDrawing, map]);

  useMapEvents({
    click(e) {
      if (isTapMode || isDrawing) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  useEffect(() => {
    if (targetPos) {
      map.flyTo(targetPos, 19, { animate: true, duration: 1 });
    }
  }, [targetPos, map]);

  return null;
}

export default function FieldMapsMobile() {
  const router = useRouter();
  const { currentUser, logoutUser } = useAuth();

  // Network State
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);

  // GPS State
  const [gpsPos, setGpsPos] = useState<[number, number] | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [showGpsHelpModal, setShowGpsHelpModal] = useState(false);
  const [showVillageMenu, setShowVillageMenu] = useState(false);
  const [isOriginBlocked, setIsOriginBlocked] = useState(false);

  // Polygon Survey State
  const [surveyPoints, setSurveyPoints] = useState<[number, number][]>([]);
  const [isWalkTracking, setIsWalkTracking] = useState(false);
  const [isTapMode, setIsTapMode] = useState(false);
  const [walkThresholdMeters, setWalkThresholdMeters] = useState<number>(3);

  // Sync walkThresholdMeters with localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gis_walk_threshold');
      if (saved) {
        const num = parseInt(saved, 10);
        if ([2, 3, 5, 8].includes(num)) setWalkThresholdMeters(num);
      }
    }
  }, []);

  const handleChangeThreshold = (val: number) => {
    setWalkThresholdMeters(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gis_walk_threshold', String(val));
    }
  };

  // Koordinat Desa se-Kecamatan Lembeyan untuk Navigasi Cepat Lapangan
  const DESA_COORDINATES: Record<string, [number, number]> = {
    'Kediren (Pusat BPP)': [-7.7289, 111.3344],
    'Lembeyan Kulon': [-7.7245, 111.328],
    'Lembeyan Wetan': [-7.7312, 111.341],
    'Tunggur': [-7.739, 111.348],
    'Tapen': [-7.718, 111.352],
    'Pupus': [-7.745, 111.325],
    'Kedungpanji': [-7.712, 111.318],
    'Krowe': [-7.735, 111.312],
    'Dukuh': [-7.748, 111.339],
    'Baji': [-7.705, 111.335],
  };

  // Map Tile Layer
  const [activeLayer, setActiveLayer] = useState<'google' | 'esri' | 'osm'>('google');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Existing Lahan from server (with offline cache fallback)
  const [existingLahan, setExistingLahan] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pertanian_cached_lahan_polygons');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });
  const [petaniList, setPetaniList] = useState<any[]>([]);
  const [poktanList, setPoktanList] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pertanian_cached_poktan_list');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  // Modal Histori Petak Sawah Terdaftar
  const [showHistoriModal, setShowHistoriModal] = useState(false);
  const [historiSearch, setHistoriSearch] = useState('');

  // Mode Jalan Pintas Pendaftaran Petani Baru (Identik dengan Desktop/Web)
  const [isQuickAddPetani, setIsQuickAddPetani] = useState(false);
  const [savingQuickPetani, setSavingQuickPetani] = useState(false);
  const [quickPetaniData, setQuickPetaniData] = useState({
    nama: '',
    nik: '',
    noKk: '',
    poktanId: '',
    tempatLahir: 'Magetan',
    tanggalLahir: '1980-05-15',
    namaIbuKandung: '',
    desa: 'Kediren',
    alamat: '',
    kecamatan: 'Lembeyan',
    kabupaten: 'Magetan',
  });

  // Offline Queue State
  const [offlineSurveys, setOfflineSurveys] = useState<OfflineSurveyItem[]>([]);
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Bottom Sheet Form Modal
  const [showSaveDrawer, setShowSaveDrawer] = useState(false);
  const [fotoLahan, setFotoLahan] = useState<string | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [previewFotoModal, setPreviewFotoModal] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    namaLahan: '',
    petaniId: '',
    petaniManual: '',
    komoditas: 'Padi',
    nomorPipil: '',
    statusKepemilikan: 'Milik Sendiri',
    statusIrigasi: 'Irigasi Teknis',
    catatan: '',
  });

  const getPolygonColor = (komoditas: string) => {
    const lower = (komoditas || '').toLowerCase();
    if (lower.includes('padi') && (lower.includes('jagung') || lower.includes('kedelai') || lower.includes('bawang'))) {
      return { color: '#059669', fillColor: '#10b981' };
    }
    if (lower.includes('padi')) {
      return { color: '#16a34a', fillColor: '#22c55e' };
    }
    if (lower.includes('jagung')) {
      return { color: '#d97706', fillColor: '#f59e0b' };
    }
    if (lower.includes('kedelai')) {
      return { color: '#ca8a04', fillColor: '#eab308' };
    }
    if (lower.includes('bawang')) {
      return { color: '#e11d48', fillColor: '#f43f5e' };
    }
    if (lower.includes('tembakau')) {
      return { color: '#854d0e', fillColor: '#a16207' };
    }
    if (lower.includes('tebu')) {
      return { color: '#7c3aed', fillColor: '#8b5cf6' };
    }
    return { color: '#059669', fillColor: '#10b981' };
  };

  const filteredExistingLahan = useMemo(() => {
    if (!historiSearch.trim()) return existingLahan;
    const q = historiSearch.toLowerCase().trim();
    return existingLahan.filter(
      (l) =>
        (l.namaLahan && l.namaLahan.toLowerCase().includes(q)) ||
        (l.petani?.nama && l.petani.nama.toLowerCase().includes(q)) ||
        (l.komoditas && l.komoditas.toLowerCase().includes(q)) ||
        (l.kodeLahan && l.kodeLahan.toLowerCase().includes(q)) ||
        (l.desa && l.desa.toLowerCase().includes(q))
    );
  }, [existingLahan, historiSearch]);

  const handleFitAllExistingLahan = () => {
    if (!existingLahan || existingLahan.length === 0) {
      showWarning('Belum Ada Petak', 'Belum ada petak sawah tersimpan di database.');
      return;
    }
    const allPts: [number, number][] = [];
    existingLahan.forEach((l) => {
      try {
        const c = JSON.parse(l.coordinates);
        if (Array.isArray(c)) {
          c.forEach((pt: any) => {
            if (Array.isArray(pt) && pt.length >= 2) {
              allPts.push([pt[0], pt[1]]);
            }
          });
        }
      } catch {}
    });

    if (allPts.length > 0 && mapInstanceRef.current) {
      const b = L.latLngBounds(allPts);
      mapInstanceRef.current.fitBounds(b, { padding: [50, 50], maxZoom: 18 });
      showToast(`Fokus ke ${existingLahan.length} Petak Sawah Terdaftar`, 'info');
    }
  };

  const handleFlyToLahan = (lahan: any) => {
    try {
      const c = JSON.parse(lahan.coordinates);
      if (Array.isArray(c) && c.length > 0) {
        const center = c[0];
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(center, 18, { animate: true, duration: 1.2 });
        } else {
          setFlyTarget([center[0], center[1]]);
        }
        setShowHistoriModal(false);
        showToast(`Fokus: ${lahan.namaLahan} (${lahan.petani?.nama || '-'})`, 'success');
      }
    } catch {}
  };

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

  // Calculate live area and perimeter
  const surveyArea = useMemo(() => {
    return calculatePolygonArea(surveyPoints);
  }, [surveyPoints]);

  const surveyPerimeter = useMemo(() => {
    return calculatePolygonPerimeter(surveyPoints);
  }, [surveyPoints]);

  // Online / Offline Detection
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Offline queue change listener
  useEffect(() => {
    setOfflineSurveys(getOfflineSurveys());
    const handleStorageChange = () => {
      setOfflineSurveys(getOfflineSurveys());
    };
    window.addEventListener('offline-surveys-changed', handleStorageChange);
    return () => {
      window.removeEventListener('offline-surveys-changed', handleStorageChange);
    };
  }, []);

  // Fetch Existing Lahan, Petani & Poktan (with offline cache fallback)
  useEffect(() => {
    fetch('/api/lahan?_t=' + Date.now())
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setExistingLahan(json.data);
          try {
            localStorage.setItem('pertanian_cached_lahan_polygons', JSON.stringify(json.data));
          } catch {}
        }
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem('pertanian_cached_lahan_polygons');
          if (cached) setExistingLahan(JSON.parse(cached));
        } catch {}
      });

    const loadPoktan = () => {
      fetch('/api/poktan?_t=' + Date.now(), { cache: 'no-store' })
        .then((r) => r.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setPoktanList(json.data);
            try {
              localStorage.setItem('pertanian_cached_poktan_list', JSON.stringify(json.data));
            } catch {}
            if (json.data.length > 0 && !quickPetaniData.poktanId) {
              setQuickPetaniData((prev) => ({ ...prev, poktanId: json.data[0].id }));
            }
          }
        })
        .catch(() => {
          try {
            const cached = localStorage.getItem('pertanian_cached_poktan_list');
            if (cached) {
              const parsed = JSON.parse(cached);
              setPoktanList(parsed);
              if (parsed.length > 0 && !quickPetaniData.poktanId) {
                setQuickPetaniData((prev) => ({ ...prev, poktanId: parsed[0].id }));
              }
            }
          } catch {}
        });
    };

    loadPoktan();

    const loadPetani = () => {
      fetch('/api/petani?_t=' + Date.now(), { cache: 'no-store' })
        .then((r) => r.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setPetaniList(json.data);
            cachePetaniList(json.data);
            if (json.data.length > 0 && !formData.petaniId) {
              setFormData((prev) => ({ ...prev, petaniId: json.data[0].id }));
            }
          }
        })
        .catch(() => {
          // Fallback to cached petani list
          const cached = getCachedPetaniList();
          if (cached && cached.length > 0) {
            setPetaniList(cached);
            if (!formData.petaniId) {
              setFormData((prev) => ({ ...prev, petaniId: cached[0].id }));
            }
          }
        });
    };

    loadPetani();

    const handleDataSync = () => {
      loadPetani();
      loadPoktan();
    };
    window.addEventListener('petani-updated', handleDataSync);
    window.addEventListener('poktan-updated', handleDataSync);
    window.addEventListener('storage', handleDataSync);
    window.addEventListener('focus', handleDataSync);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleDataSync();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('petani-updated', handleDataSync);
      window.removeEventListener('poktan-updated', handleDataSync);
      window.removeEventListener('storage', handleDataSync);
      window.removeEventListener('focus', handleDataSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Continuous High-Accuracy GPS Geolocation Watcher with Android Fused Fallback
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Smartphone Anda tidak mendukung fitur Geolocation.');
      return;
    }

    let isSubscribed = true;

    // 1. Initial Quick Fix (low accuracy fused location, respon instan 0.5 detik di Android)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!isSubscribed) return;
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setGpsPos(coords);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setGpsError(null);
      },
      (err) => {
        if (!isSubscribed) return;
        if (err.code === 1) {
          setIsOriginBlocked(true);
        }
      },
      { enableHighAccuracy: false, maximumAge: 20000, timeout: 6000 }
    );

    // 2. High-Accuracy Satellite Watcher
    let activeWatchId: number | null = null;
    try {
      activeWatchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!isSubscribed) return;
          const { latitude, longitude, accuracy } = position.coords;
          const newPos: [number, number] = [latitude, longitude];
          setGpsPos(newPos);
          setGpsAccuracy(Math.round(accuracy));
          setGpsError(null);
          setIsOriginBlocked(false);

          // Walk-tracking engine: auto append point if user moved >= walkThresholdMeters
          if (isWalkTracking) {
            setSurveyPoints((prev) => {
              if (prev.length === 0) {
                return [newPos];
              }
              const lastPoint = prev[prev.length - 1];
              const dist = calculateDistanceMeters(lastPoint, [latitude, longitude]);
              if (dist >= walkThresholdMeters) {
                return [...prev, newPos];
              }
              return prev;
            });
          }
        },
        (err) => {
          if (!isSubscribed) return;
          console.warn('GPS Watcher Warning:', err.code, err.message);
          if (err.code === 1) {
            setIsOriginBlocked(true);
            setGpsError('Izin sensor lokasi Chrome belum aktif');
          } else if (err.code === 3) {
            // Timeout pada satelit GPS (wajar jika di dalam ruangan / terhalang atap)
            setGpsError('Mencari satelit GPS... (Tap untuk bantuan)');
          } else {
            setGpsError(err.message);
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 25000, // 25s timeout standar Android
        }
      );
    } catch (e) {
      console.warn('watchPosition init error:', e);
    }

    return () => {
      isSubscribed = false;
      if (activeWatchId !== null) {
        navigator.geolocation.clearWatch(activeWatchId);
      }
    };
  }, [isWalkTracking, walkThresholdMeters]);

  // Center on GPS handler dengan multi-tier fallback
  const handleCenterGps = () => {
    if (gpsPos) {
      setFlyTarget([...gpsPos]);
      showToast(`Peta dipusatkan ke koordinat Anda (±${gpsAccuracy || 0}m)`, 'info');
      return;
    }

    const isLocal = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1'
    );
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

    // Jika diakses via HTTP IP non-lokal di HP Android dan diblokir browser
    if (!isLocal && !isHttps && isOriginBlocked) {
      setShowGpsHelpModal(true);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      showError('GPS Tidak Didukung', 'Smartphone Anda tidak memiliki sensor Geolocation.');
      return;
    }

    showToast('Sedang mencari sinyal satelit GPS...', 'info');

    // Percobaan 1: High Accuracy (Satelit)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setGpsPos(coords);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setFlyTarget(coords);
        showSuccess('Posisi Terkunci', `Koordinat GPS berhasil dikunci (Akurasi ±${Math.round(pos.coords.accuracy)}m).`);
      },
      (err1) => {
        // Percobaan 2: Fused / Network Provider (jika satelit timeout atau indoor)
        if (err1.code === 3 || err1.code === 2) {
          navigator.geolocation.getCurrentPosition(
            (pos2) => {
              const coords: [number, number] = [pos2.coords.latitude, pos2.coords.longitude];
              setGpsPos(coords);
              setGpsAccuracy(Math.round(pos2.coords.accuracy));
              setFlyTarget(coords);
              showSuccess('Posisi Terkunci', `Posisi terkunci via sinyal jaringan (Akurasi ±${Math.round(pos2.coords.accuracy)}m).`);
            },
            () => {
              setShowGpsHelpModal(true);
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 15000 }
          );
        } else if (err1.code === 1) {
          setIsOriginBlocked(true);
          setShowGpsHelpModal(true);
        } else {
          showError('GPS Belum Aktif', err1.message);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };

  // Add Patok GPS Sekarang
  const handleAddCurrentGpsPoint = async () => {
    if (!gpsPos) {
      const confirmTap = await showConfirm({
        title: 'GPS Belum Terkunci',
        text: 'Sinyal GPS belum terkunci di smartphone Anda. Apakah Anda ingin mengaktifkan Mode Tap Layar agar bisa langsung menandai batas sawah dengan menyentuh peta?',
        confirmButtonText: 'Aktifkan Mode Tap Layar',
        cancelButtonText: 'Tunggu GPS',
      });
      if (confirmTap) {
        setIsTapMode(true);
        showSuccess('Mode Tap Aktif', 'Sentuh layar peta satelit pada setiap sudut batas sawah.');
      } else {
        handleCenterGps();
      }
      return;
    }

    setSurveyPoints((prev) => {
      // Cek apakah titik identik dengan titik terakhir
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const dist = calculateDistanceMeters(last, gpsPos);
        if (dist < 0.5) {
          showWarning('Patok Terlalu Dekat', 'Koordinat patok ini sama dengan titik sebelumnya.');
          return prev;
        }
      }
      return [...prev, gpsPos];
    });
  };

  // Manual Tap on Map to Add Point
  const handleMapTap = (lat: number, lng: number) => {
    setSurveyPoints((prev) => [...prev, [lat, lng]]);
  };

  // Undo Last Point
  const handleUndoPoint = () => {
    setSurveyPoints((prev) => prev.slice(0, -1));
  };

  // Reset Draft
  const handleResetSurvey = async () => {
    if (surveyPoints.length === 0) return;
    const confirm = await showConfirm({
      title: 'Hapus Draft Patok?',
      text: 'Semua koordinat patok sawah yang baru saja Anda rekam akan dihapus.',
      confirmButtonText: 'Ya, Hapus Draft',
      cancelButtonText: 'Batal',
    });
    if (confirm) {
      setSurveyPoints([]);
      setIsWalkTracking(false);
    }
  };

  const effectiveOnline = isOnline && !isSimulatedOffline;

  // Fly to offline survey on map
  const handleFlyToOffline = (survey: OfflineSurveyItem) => {
    if (survey.coordinates && survey.coordinates.length > 0) {
      const centerLat = survey.coordinates.reduce((sum, c) => sum + c[0], 0) / survey.coordinates.length;
      const centerLng = survey.coordinates.reduce((sum, c) => sum + c[1], 0) / survey.coordinates.length;
      setFlyTarget([centerLat, centerLng]);
      setShowQueueDrawer(false);
    }
  };

  // Sync a single offline survey item
  const handleSyncSingle = async (item: OfflineSurveyItem) => {
    if (!effectiveOnline) {
      showWarning('Sedang Offline', 'Sambungkan smartphone ke internet atau matikan simulasi offline untuk sinkronisasi.');
      return;
    }
    try {
      setIsSyncing(true);
      const res = await syncSingleOfflineSurvey(item);
      if (res.success) {
        showSuccess('Petak Tersinkronkan!', `Petak "${item.namaLahan}" (${item.luasHa} Ha) berhasil masuk database GIS BPP Lembeyan.`);
        fetch('/api/lahan')
          .then((r) => r.json())
          .then((d) => { if (d.success) setExistingLahan(d.data); });
      } else {
        showError('Gagal Sinkronisasi', res.message || 'Server menolak data.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Ambil Foto Sawah Lapangan dengan Watermark Geotagging
  const handleCapturePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setProcessingPhoto(true);
      showToast('Menempelkan cap koordinat GPS resmi...', 'info');

      const selectedPetani = petaniList.find((p) => p.id === formData.petaniId);
      const lat = gpsPos ? gpsPos[0] : (surveyPoints[0]?.[0] || -7.7123);
      const lng = gpsPos ? gpsPos[1] : (surveyPoints[0]?.[1] || 111.3456);

      const watermarked = await addGeotagWatermark(file, {
        namaPetani: selectedPetani?.nama || formData.petaniManual || 'Petani BPP Lembeyan',
        namaLahan: formData.namaLahan || 'Petak Sawah',
        lat,
        lng,
        accuracy: gpsAccuracy || 5,
        desa: selectedPetani?.desa || 'Kediren',
        komoditas: formData.komoditas,
      });

      setFotoLahan(watermarked);
      showSuccess('Foto Geotag Berhasil', 'Foto sawah fisik berhasil ditempeli cap koordinat GPS resmi.');
    } catch (err: any) {
      showError('Gagal Memproses Foto', err.message);
    } finally {
      setProcessingPhoto(false);
    }
  };

  // Jalan Pintas Pendaftaran Petani Baru Langsung di Lapangan (Mode PWA identik Desktop)
  const handleSaveQuickPetani = async (): Promise<string | null> => {
    if (!quickPetaniData.nama.trim() || !quickPetaniData.nik.trim()) {
      showWarning('Form Belum Lengkap', 'Nama Lengkap dan NIK Petani/Penggarap baru wajib diisi!');
      return null;
    }
    const cleanNik = quickPetaniData.nik.replace(/\D/g, '');
    if (cleanNik.length !== 16) {
      showWarning('NIK Tidak Valid', 'NIK KTP Petani harus terdiri dari tepat 16 digit angka!');
      return null;
    }
    const targetPoktanId = quickPetaniData.poktanId || poktanList[0]?.id;
    if (!targetPoktanId) {
      showWarning('Pilih Poktan', 'Pilih Kelompok Tani (Poktan) terlebih dahulu!');
      return null;
    }

    try {
      setSavingQuickPetani(true);
      if (effectiveOnline) {
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
          const newPetani = json.data;
          setPetaniList((prev) => [newPetani, ...prev.filter((p) => p.id !== newPetani.id)]);
          cachePetaniList([newPetani, ...petaniList.filter((p) => p.id !== newPetani.id)]);
          setFormData((prev) => ({
            ...prev,
            petaniId: newPetani.id,
            petaniManual: '',
          }));
          setIsQuickAddPetani(false);

          if (json.alreadyExisted) {
            showSuccess(
              'Petani Ditemukan!',
              `Petani "${newPetani.nama}" (NIK: ${newPetani.nik}) sudah terdaftar dan otomatis dipilih!`
            );
          } else {
            showSuccess(
              'Petani Terdaftar!',
              `Petani baru "${newPetani.nama}" (NIK: ${newPetani.nik}) berhasil didaftarkan dan otomatis dipilih!`
            );
          }

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('petani-updated', { detail: newPetani }));
            try {
              localStorage.setItem('pertanian_last_petani_update', Date.now().toString());
            } catch {}
          }

          return newPetani.id;
        } else {
          showError('Gagal Menyimpan Petani', json.error || 'Terjadi kesalahan saat mendaftarkan petani.');
          return null;
        }
      } else {
        // Mode Offline: Simpan petani di memori lokal HP
        const offlineId = `offline-petani-${Date.now()}`;
        const targetPoktan = poktanList.find((p) => p.id === targetPoktanId);
        const offlinePetani = {
          id: offlineId,
          nama: quickPetaniData.nama.trim(),
          nik: cleanNik,
          noKk: (quickPetaniData.noKk || cleanNik).replace(/\D/g, ''),
          desa: quickPetaniData.desa,
          poktanId: targetPoktanId,
          poktan: targetPoktan || { nama: 'Poktan Lembeyan' },
        };
        setPetaniList((prev) => [offlinePetani, ...prev]);
        cachePetaniList([offlinePetani, ...petaniList]);
        setFormData((prev) => ({
          ...prev,
          petaniId: offlineId,
          petaniManual: '',
        }));
        setIsQuickAddPetani(false);
        showSuccess(
          'Tersimpan di Memori HP',
          `Petani "${offlinePetani.nama}" disimpan di HP dan siap disinkronkan saat online.`
        );
        return offlineId;
      }
    } catch (err: any) {
      showError('Kesalahan Jaringan', err.message);
      return null;
    } finally {
      setSavingQuickPetani(false);
    }
  };

  // Submit Simpan Survei Lahan
  const handleSaveLahan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (surveyPoints.length < 3) {
      showWarning('Patok Kurang', 'Minimal dibutuhkan 3 patok untuk membentuk poligon sawah.');
      return;
    }

    if (!formData.namaLahan.trim()) {
      showWarning('Nama Blok Kosong', 'Harap isi nama blok/hamparan sawah.');
      return;
    }

    // Jika sedang dalam form Quick Add Petani, simpan petaninya terlebih dahulu
    let effectivePetaniId = formData.petaniId || (petaniList.length > 0 ? petaniList[0].id : '');
    if (isQuickAddPetani) {
      const createdId = await handleSaveQuickPetani();
      if (!createdId) return; // Validasi belum lengkap
      effectivePetaniId = createdId;
    }

    if (!effectivePetaniId && !formData.petaniManual.trim()) {
      showWarning('Pilih Petani', 'Harap pilih petani pemilik/penggarap atau gunakan form jalan pintas untuk menambah petani baru.');
      return;
    }

    const selectedPetani = petaniList.find((p) => p.id === effectivePetaniId);
    const isManualPetani = !effectivePetaniId || effectivePetaniId === 'new';
    const petaniNama = selectedPetani ? selectedPetani.nama : formData.petaniManual.trim() || 'Petani Terdaftar';
    const poktanNama = selectedPetani?.poktan?.nama || 'Poktan Wilayah Lembeyan';

    // 1. Jika Offline atau pengguna memilih simpan offline
    if (!effectiveOnline) {
      saveOfflineSurvey({
        namaLahan: formData.namaLahan,
        petaniId: effectivePetaniId || 'offline-petani',
        petaniNama,
        poktanNama,
        komoditas: formData.komoditas || 'Padi',
        coordinates: surveyPoints,
        luasHa: surveyArea.luasHa,
        luasM2: surveyArea.luasM2,
        nomorPipil: formData.nomorPipil,
        statusKepemilikan: formData.statusKepemilikan,
        statusIrigasi: formData.statusIrigasi,
        catatan: formData.catatan,
        gpsAccuracy: gpsAccuracy || undefined,
        fotoLahan: fotoLahan || undefined,
      });

      showSuccess(
        'Disimpan di Antrean Offline!',
        'Data patok sawah & foto geotag tersimpan aman di memori HP Anda. Nanti saat dapat sinyal, tekan tombol sinkronisasi.'
      );

      setShowSaveDrawer(false);
      setSurveyPoints([]);
      setFotoLahan(null);
      setIsWalkTracking(false);
      return;
    }

    // 2. Jika Online, kirim ke server /api/lahan
    try {
      const payload = {
        namaLahan: formData.namaLahan,
        petaniId: effectivePetaniId || undefined,
        petaniNama,
        petaniManual: !effectivePetaniId ? formData.petaniManual.trim() : undefined,
        komoditas: formData.komoditas || 'Padi',
        kabupaten: 'Magetan',
        coordinates: surveyPoints,
        statusKepemilikan: formData.statusKepemilikan,
        statusIrigasi: formData.statusIrigasi,
        nomorPipil: formData.nomorPipil,
        fotoLahan: fotoLahan || null,
        forceOverride: true,
      };

      const res = await fetch('/api/lahan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        showSuccess(
          'Pemetaan Berhasil!',
          `Petak "${formData.namaLahan}" (${surveyArea.luasHa} Ha) berhasil didaftarkan ke sistem GIS BPP Lembeyan.`
        );
        setShowSaveDrawer(false);
        setSurveyPoints([]);
        setFotoLahan(null);
        setIsWalkTracking(false);

        // Jika petani baru didaftarkan otomatis, tambahkan ke list petani lokal
        if (json.data?.petani) {
          setPetaniList((prev) => {
            if (!prev.some((p) => p.id === json.data.petani.id)) {
              return [json.data.petani, ...prev];
            }
            return prev;
          });
        }

        // Refresh existing polygons and update cache
        fetch('/api/lahan')
          .then((r) => r.json())
          .then((d) => {
            if (d.success && Array.isArray(d.data)) {
              setExistingLahan(d.data);
              try {
                localStorage.setItem('pertanian_cached_lahan_polygons', JSON.stringify(d.data));
              } catch {}
            }
          });
      } else {
        // Jika server error, tawarkan simpan ke offline queue
        const simpanOffline = await showConfirm({
          title: 'Gagal Simpan ke Server',
          text: `${json.error || 'Terjadi gangguan jaringan'}. Apakah Anda ingin menyimpannya ke antrean offline HP terlebih dahulu?`,
          confirmButtonText: 'Simpan ke Antrean HP',
          cancelButtonText: 'Coba Lagi',
        });

        if (simpanOffline) {
          saveOfflineSurvey({
            namaLahan: formData.namaLahan,
            petaniId: formData.petaniId || 'offline-petani',
            petaniNama,
            poktanNama,
            komoditas: formData.komoditas,
            coordinates: surveyPoints,
            luasHa: surveyArea.luasHa,
            luasM2: surveyArea.luasM2,
            nomorPipil: formData.nomorPipil,
            statusKepemilikan: formData.statusKepemilikan,
            statusIrigasi: formData.statusIrigasi,
            catatan: formData.catatan,
            gpsAccuracy: gpsAccuracy || undefined,
          });
          setShowSaveDrawer(false);
          setSurveyPoints([]);
        }
      }
    } catch (err: any) {
      showError('Gagal Mengirim Data', err.message);
    }
  };

  // Hapus Lahan Tersimpan di Server (untuk Ukur Ulang jika ada kesalahan titik/posisi)
  const handleDeleteLahanServer = async (lahan: any) => {
    const confirm = await showDeleteConfirm(
      lahan.namaLahan,
      `Hapus petak sawah <strong>"${lahan.namaLahan}"</strong> (${lahan.luasHa} Ha)?<br/><span class="text-xs text-rose-600 block mt-1">Data petak akan dihapus dari server dan Anda dapat langsung mengukur ulang di lokasi.</span>`
    );
    if (!confirm) return;

    try {
      const res = await fetch(`/api/lahan?id=${lahan.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showSuccess('Petak Dihapus', `Petak "${lahan.namaLahan}" berhasil dihapus. Silakan mulai ukur ulang.`);
        // Refresh existing polygons
        fetch('/api/lahan')
          .then((r) => r.json())
          .then((d) => {
            if (d.success) setExistingLahan(d.data);
          });
      } else {
        showError('Gagal Menghapus', json.error || 'Server menolak penghapusan petak.');
      }
    } catch (err: any) {
      showError('Gagal Menghapus', err.message);
    }
  };

  // Sync All Offline Surveys
  const handleSyncQueue = async () => {
    if (!effectiveOnline) {
      showWarning('Sedang Offline', 'Sambungkan smartphone Anda ke jaringan internet seluler / WiFi untuk sinkronisasi.');
      return;
    }

    try {
      setIsSyncing(true);
      const res = await syncAllOfflineSurveys();
      if (res.successCount > 0) {
        showSuccess(
          'Sinkronisasi Berhasil!',
          `${res.successCount} petak sawah berhasil diunggah ke server database BPP Lembeyan.`
        );
        clearCompletedSurveys();
        // Refresh existing lahan
        fetch('/api/lahan')
          .then((r) => r.json())
          .then((d) => {
            if (d.success) setExistingLahan(d.data);
          });
      } else if (res.failedCount > 0) {
        showError('Gagal Sinkronisasi', `${res.failedCount} petak gagal diunggah. Periksa kembali koneksi internet Anda.`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Tile URL configuration
  const tileUrl = useMemo(() => {
    switch (activeLayer) {
      case 'google':
        return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      case 'esri':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'osm':
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  }, [activeLayer]);

  const tileAttribution = useMemo(() => {
    switch (activeLayer) {
      case 'google':
        return '&copy; Google Maps Satellite';
      case 'esri':
        return '&copy; Esri World Imagery';
      case 'osm':
      default:
        return '&copy; OpenStreetMap contributors';
    }
  }, [activeLayer]);

  const defaultCenter: [number, number] = [-7.7289, 111.3344]; // Lembeyan Center

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-slate-900 select-none flex flex-col">
      {/* 1. TOP FLOATING STATUS BAR (ARCGIS FIELD MAPS STYLE) */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-2.5 sm:p-3 pointer-events-none">
        <div className="flex items-center justify-between gap-2 pointer-events-auto">
          {/* Left: Surveyor Profile Pill & Back to Desktop */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 text-white shadow-lg text-xs">
            <Link
              href="/peta"
              className="flex items-center gap-1 hover:text-emerald-400 font-bold transition pr-1.5 border-r border-white/20"
              title="Kembali ke Tampilan Web Desktop"
            >
              <span>← Web</span>
            </Link>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-extrabold truncate max-w-[110px] sm:max-w-[160px]">
                {currentUser?.name || 'Surveyor Lapangan'}
              </span>
            </div>
          </div>

          {/* Center / Right: Online/Offline Badge & Antrean Offline */}
          <div className="flex items-center gap-1.5">
            {/* Offline Queue Button */}
            {offlineSurveys.length > 0 && (
              <button
                type="button"
                onClick={() => setShowQueueDrawer(true)}
                className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black px-2.5 py-1.5 rounded-full border border-amber-300 text-[11px] shadow-lg flex items-center gap-1.5 transition animate-bounce"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{offlineSurveys.length} Antrean HP</span>
              </button>
            )}

            {/* Connection Status Badge (Clickable to toggle Offline Simulation) */}
            <button
              type="button"
              onClick={() => {
                const next = !isSimulatedOffline;
                setIsSimulatedOffline(next);
                if (next) {
                  showWarning(
                    'Simulasi Offline Aktif!',
                    'Mode tanpa sinyal seluler diaktifkan. Setiap petak sawah yang Anda simpan akan masuk ke Antrean Offline HP.'
                  );
                } else {
                  showSuccess(
                    'Simulasi Offline Dimatikan!',
                    'Koneksi internet kembali aktif. Anda dapat langsung mengunggah antrean ke server.'
                  );
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-black border shadow-lg transition active:scale-95 cursor-pointer ${
                isSimulatedOffline
                  ? 'bg-amber-950/90 border-amber-500/80 text-amber-300 animate-pulse'
                  : effectiveOnline
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/90 border-rose-500/60 text-rose-300'
              }`}
              title="Klik untuk menyalakan/mematikan simulasi tanpa sinyal di sawah"
            >
              {isSimulatedOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>📴 Simulasi Offline</span>
                </>
              ) : effectiveOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Offline (Sawah)</span>
                </>
              )}
            </button>

            {/* Layer Switcher Button */}
            <button
              type="button"
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="bg-slate-900/90 hover:bg-slate-800 text-white p-2 rounded-full border border-white/15 shadow-lg active:scale-95 transition"
              title="Ganti Lapisan Satelit / Peta"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* GPS Accuracy Strip & Quick Action Bar (Below header) */}
        <div className="mt-2 flex items-center justify-between pointer-events-auto gap-2">
          <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] sm:text-xs text-slate-200 shadow-md flex items-center gap-2 min-w-0 flex-1">
            <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            {gpsPos ? (
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono text-[10px] sm:text-xs">
                  {gpsPos[0].toFixed(5)}, {gpsPos[1].toFixed(5)}
                </span>
                <span
                  className={`font-black px-1.5 py-0.2 rounded-full text-[9px] shrink-0 ${
                    (gpsAccuracy || 99) <= 5
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : (gpsAccuracy || 99) <= 15
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  ± {gpsAccuracy !== null ? `${gpsAccuracy}m` : 'Mencari...'}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (isOriginBlocked || gpsError) {
                    setShowGpsHelpModal(true);
                  } else {
                    handleCenterGps();
                  }
                }}
                className="text-amber-400 hover:text-amber-300 active:scale-95 transition underline font-semibold flex items-center gap-1 cursor-pointer text-left truncate"
                title="Tap untuk panduan izin sensor GPS Android / iOS"
              >
                <span className="truncate">{gpsError ? `⚠️ ${gpsError}` : 'Mengunci Sinyal Satelit GPS...'}</span>
                <span className="text-[9px] bg-amber-400/20 px-1.5 py-0.5 rounded text-amber-300 shrink-0 font-bold">
                  Bantuan
                </span>
              </button>
            )}
          </div>

          {/* Quick Village Fly-To Button */}
          <button
            type="button"
            onClick={() => setShowVillageMenu(!showVillageMenu)}
            className="bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] sm:text-xs text-emerald-400 hover:text-emerald-300 shadow-md flex items-center gap-1 shrink-0 font-bold active:scale-95 transition cursor-pointer"
            title="Lompat ke Lokasi Desa se-Kecamatan Lembeyan"
          >
            <MapPin className="w-3 h-3 text-emerald-400" />
            <span>Desa</span>
          </button>

          {/* Quick Histori Petak Sawah Button */}
          <button
            type="button"
            onClick={() => setShowHistoriModal(true)}
            className="bg-emerald-950/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-500/40 text-[10px] sm:text-xs text-amber-300 hover:text-white shadow-md flex items-center gap-1 shrink-0 font-black active:scale-95 transition cursor-pointer"
            title="Buka Daftar Histori Petak Sawah yang Sudah Dipoligon"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>{existingLahan.length} Petak</span>
          </button>
        </div>
      </div>

      {/* Floating Center Radar Pill: Fokus ke Petak Terdaftar */}
      {existingLahan.length > 0 && !showSaveDrawer && !showHistoriModal && (
        <div className="absolute top-22 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto no-print">
          <button
            type="button"
            onClick={handleFitAllExistingLahan}
            className="bg-slate-950/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full border border-emerald-400/50 shadow-2xl flex items-center gap-2 hover:bg-slate-900 active:scale-95 transition backdrop-blur-md cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>{existingLahan.length} Petak Sawah Terdaftar</span>
            <span className="text-[10px] text-emerald-300 bg-emerald-900/80 px-2 py-0.5 rounded-full border border-emerald-700/60 font-black">
              Fokuskan &rarr;
            </span>
          </button>
        </div>
      )}

      {/* 2. LAYER SELECTION MODAL / DROPDOWN */}
      {showLayerMenu && (
        <div className="absolute top-14 right-3 z-[1100] bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-2xl p-3 shadow-2xl text-white w-64 space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
            <span className="text-xs font-black uppercase text-emerald-400">Pilih Citra Satelit</span>
            <button onClick={() => setShowLayerMenu(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => {
              setActiveLayer('google');
              setShowLayerMenu(false);
            }}
            className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between ${
              activeLayer === 'google' ? 'bg-emerald-600 font-black' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <span>🛰️ Google Hybrid High-Res</span>
            {activeLayer === 'google' && <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              setActiveLayer('esri');
              setShowLayerMenu(false);
            }}
            className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between ${
              activeLayer === 'esri' ? 'bg-emerald-600 font-black' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <span>🌍 Esri World Imagery</span>
            {activeLayer === 'esri' && <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              setActiveLayer('osm');
              setShowLayerMenu(false);
            }}
            className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between ${
              activeLayer === 'osm' ? 'bg-emerald-600 font-black' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <span>🗺️ OpenStreetMap (Jalan & Batas)</span>
            {activeLayer === 'osm' && <Check className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* 2b. VILLAGE QUICK-NAV DROPDOWN */}
      {showVillageMenu && (
        <div className="absolute top-24 right-3 z-[1100] bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-2xl p-3 shadow-2xl text-white w-64 max-h-[70vh] overflow-y-auto space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
            <span className="text-xs font-black uppercase text-emerald-400">Pilih Desa Sawah</span>
            <button onClick={() => setShowVillageMenu(false)} className="text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight pb-1">
            Lompat langsung ke hamparan sawah desa di Kec. Lembeyan:
          </p>
          {Object.entries(DESA_COORDINATES).map(([name, coords]) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setFlyTarget(coords);
                setShowVillageMenu(false);
                showToast(`Peta bergeser ke Desa ${name}`, 'info');
              }}
              className="w-full text-left p-2 rounded-xl text-xs bg-white/5 hover:bg-emerald-600/50 hover:border-emerald-400 border border-white/5 transition flex items-center justify-between group cursor-pointer"
            >
              <span className="font-semibold text-slate-200 group-hover:text-white">{name}</span>
              <Navigation className="w-3.5 h-3.5 text-emerald-400 group-hover:text-amber-300" />
            </button>
          ))}
        </div>
      )}

      {/* 3. MAIN LEAFLET FULLSCREEN MAP */}
      <div className="flex-1 w-full h-full relative">
        <MapContainer
          center={defaultCenter}
          zoom={16}
          maxZoom={22}
          zoomControl={false}
          className={`w-full h-full ${isTapMode || surveyPoints.length > 0 ? 'leaflet-drawing-mode' : ''}`}
        >
          <TileLayer
            url={tileUrl}
            attribution={tileAttribution}
            maxZoom={22}
            maxNativeZoom={activeLayer === 'google' ? 20 : activeLayer === 'esri' ? 18 : 19}
          />

          <MapController
            gpsPos={gpsPos}
            targetPos={flyTarget}
            onMapClick={handleMapTap}
            isTapMode={isTapMode}
            isDrawing={isTapMode || surveyPoints.length > 0}
            onMapReady={(m) => {
              mapInstanceRef.current = m;
            }}
          />

          {/* User GPS Position Marker & Accuracy Halo */}
          {gpsPos && (
            <>
              <Marker position={gpsPos} icon={surveyorGpsIcon}>
                <Tooltip direction="top" offset={[0, -12]} opacity={0.9} permanent>
                  <span className="text-[10px] font-black">Posisi Petugas</span>
                </Tooltip>
              </Marker>
              {gpsAccuracy && (
                <Circle
                  center={gpsPos}
                  radius={gpsAccuracy}
                  pathOptions={{
                    color: '#0284c7',
                    fillColor: '#38bdf8',
                    fillOpacity: 0.15,
                    weight: 1,
                  }}
                />
              )}
            </>
          )}

          {/* Existing Registered Polygons (Histori Petak Sawah Terdaftar) */}
          {existingLahan.map((lahan) => {
            let coords: [number, number][] = [];
            try {
              coords = JSON.parse(lahan.coordinates);
            } catch {
              return null;
            }
            if (!Array.isArray(coords) || coords.length < 3) return null;

            const styling = getPolygonColor(lahan.komoditas);

            return (
              <Polygon
                key={lahan.id}
                positions={coords}
                pathOptions={{
                  color: styling.color,
                  fillColor: styling.fillColor,
                  fillOpacity: 0.55,
                  weight: 3.5,
                }}
              >
                {/* Label Permanen di Tengah Kotak Poligon: Nama Petani & Luas Sawah */}
                <Tooltip
                  permanent
                  direction="center"
                  className="lahan-polygon-label"
                >
                  <div
                    style={{
                      color: '#0f172a',
                      textAlign: 'center',
                      lineHeight: 1.25,
                      fontWeight: 900,
                    }}
                    className="font-sans px-1 py-0.5"
                  >
                    <div
                      style={{ color: '#0f172a', fontWeight: 900, fontSize: '11px' }}
                      className="font-black tracking-tight"
                    >
                      {lahan.petani?.nama || lahan.namaLahan || 'Petani'}
                    </div>
                    <div
                      style={{
                        color: '#065f46',
                        backgroundColor: '#d1fae5',
                        border: '1px solid #34d399',
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '9999px',
                        marginTop: '2px',
                        display: 'inline-block',
                        fontWeight: 800,
                      }}
                      className="luas-pill font-mono"
                    >
                      {lahan.luasHa} Ha &bull; {lahan.komoditas}
                    </div>
                  </div>
                </Tooltip>

                <Popup>
                  <div className="p-1 text-xs space-y-1.5 min-w-[200px] max-w-[240px]">
                    <div className="border-b border-slate-100 pb-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Petak Sawah Terdaftar</span>
                      <strong className="block text-emerald-800 text-sm font-black">{lahan.namaLahan}</strong>
                      <span className="text-slate-600 font-medium block">Petani: <strong>{lahan.petani?.nama || '-'}</strong></span>
                      <span className="text-emerald-700 font-mono font-bold block text-[11px]">
                        {lahan.luasHa} Ha ({lahan.luasM2 ? lahan.luasM2.toLocaleString('id-ID') : Math.round(lahan.luasHa * 10000)} m²) &bull; {lahan.komoditas}
                      </span>
                    </div>

                    {lahan.fotoLahan && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 mt-1 bg-slate-50">
                        <img
                          src={lahan.fotoLahan}
                          alt="Foto Sawah Geotag"
                          className="w-full h-24 object-cover cursor-pointer hover:opacity-90 transition"
                          onClick={() => setPreviewFotoModal(lahan.fotoLahan)}
                        />
                        <div className="text-[9px] text-slate-600 bg-slate-100 py-0.5 text-center font-bold">
                          📸 Klik untuk Memperbesar Foto GPS
                        </div>
                      </div>
                    )}

                    <div className="pt-1.5 flex items-center gap-1.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleDeleteLahanServer(lahan)}
                        className="w-full py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
                        title="Hapus petak ini jika ada salah posisi/patok untuk diukur ulang"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus / Ukur Ulang Petak
                      </button>
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {/* Offline Pending Surveys (Poligon Antrean HP Tersimpan) */}
          {offlineSurveys.map((offline) => {
            if (!offline.coordinates || offline.coordinates.length < 3) return null;
            return (
              <Polygon
                key={offline.id}
                positions={offline.coordinates}
                pathOptions={{
                  color: '#f59e0b',
                  fillColor: '#fbbf24',
                  fillOpacity: 0.35,
                  weight: 3,
                  dashArray: '6, 6',
                }}
              >
                <Popup>
                  <div className="p-1 text-xs space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px]">
                      📴 Antrean HP (Belum Terunggah)
                    </span>
                    <strong className="block text-slate-900 font-black">{offline.namaLahan}</strong>
                    <span className="text-slate-600 block">Petani: {offline.petaniNama}</span>
                    <span className="text-emerald-700 font-mono font-bold block">
                      {offline.luasHa} Ha &bull; {offline.komoditas}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Patok: {offline.coordinates.length} titik &bull; Akurasi: ±{offline.gpsAccuracy || 2}m
                    </span>

                    {offline.fotoLahan && (
                      <div className="rounded-xl overflow-hidden border border-amber-200 mt-1 bg-amber-50">
                        <img
                          src={offline.fotoLahan}
                          alt="Foto Geotag Offline"
                          className="w-full h-20 object-cover cursor-pointer"
                          onClick={() => setPreviewFotoModal(offline.fotoLahan || null)}
                        />
                        <div className="text-[9px] text-amber-800 bg-amber-100 py-0.5 text-center font-bold">
                          📸 Foto GPS di Memori HP
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => setShowQueueDrawer(true)}
                        className="text-[10px] bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-2.5 py-1 rounded-lg"
                      >
                        Buka Menu Antrean
                      </button>
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {/* Active Surveying Polygon / Path */}
          {surveyPoints.length > 0 && (
            <>
              {surveyPoints.length >= 3 && (
                <Polygon
                  positions={surveyPoints}
                  pathOptions={{
                    color: '#f59e0b',
                    fillColor: '#fbbf24',
                    fillOpacity: 0.45,
                    weight: 3,
                  }}
                />
              )}
              {surveyPoints.length >= 2 && (
                <Polyline
                  positions={surveyPoints}
                  pathOptions={{
                    color: '#f59e0b',
                    weight: 3,
                    dashArray: '4, 4',
                  }}
                />
              )}
              {surveyPoints.map((pt, idx) => (
                <Marker key={idx} position={pt} icon={createPatokIcon(idx)} />
              ))}
            </>
          )}
        </MapContainer>
      </div>

      {/* 4. RIGHT FLOATING ACTION BUTTONS (TOUCH FIRST) */}
      <div className="absolute right-3.5 bottom-36 z-[1000] flex flex-col gap-2.5">
        {/* Histori Petak Sawah Terdaftar */}
        <button
          type="button"
          onClick={() => setShowHistoriModal(true)}
          className="w-12 h-12 rounded-2xl bg-slate-900/90 text-emerald-400 border border-emerald-500/40 shadow-xl flex flex-col items-center justify-center active:scale-90 transition hover:bg-slate-800 relative cursor-pointer"
          title={`Lihat Histori Petak Sawah (${existingLahan.length} Petak Terdaftar)`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-[9px] font-black text-white bg-emerald-600 px-1 rounded-full absolute -top-1 -right-1 border border-slate-900 shadow-xs">
            {existingLahan.length}
          </span>
        </button>

        {/* Fokus ke Seluruh Petak Sawah Terdaftar */}
        <button
          type="button"
          onClick={handleFitAllExistingLahan}
          className="w-12 h-12 rounded-2xl bg-slate-900/90 text-amber-400 border border-amber-500/30 shadow-xl flex items-center justify-center active:scale-90 transition hover:bg-slate-800 cursor-pointer"
          title="Fokuskan Peta ke Seluruh Petak Sawah yang Sudah Dipoligon"
        >
          <Compass className="w-5 h-5 text-amber-400" />
        </button>

        {/* Center on GPS */}
        <button
          type="button"
          onClick={handleCenterGps}
          className="w-12 h-12 rounded-2xl bg-slate-900/90 text-sky-400 border border-white/20 shadow-xl flex items-center justify-center active:scale-90 transition hover:bg-slate-800"
          title="Pusatkan Peta ke Lokasi GPS Saya"
        >
          <Navigation className="w-5 h-5" />
        </button>

        {/* Walk-Tracking Toggle Button */}
        <button
          type="button"
          onClick={() => {
            const next = !isWalkTracking;
            setIsWalkTracking(next);
            if (next) {
              setIsTapMode(false);
              showSuccess(
                'Walk-Tracking Aktif!',
                'Silakan berjalan mengelilingi batas pematang sawah. Koordinat patok akan otomatis direkam setiap 3 meter.'
              );
            }
          }}
          className={`w-12 h-12 rounded-2xl border shadow-xl flex items-center justify-center active:scale-90 transition ${
            isWalkTracking
              ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
              : 'bg-slate-900/90 text-emerald-400 border-white/20 hover:bg-slate-800'
          }`}
          title={isWalkTracking ? 'Hentikan Walk-Tracking' : 'Mulai Rekam Jejak Jalan (Walk-Tracking)'}
        >
          {isWalkTracking ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        {/* Manual Screen Tap Toggle */}
        <button
          type="button"
          onClick={() => {
            const next = !isTapMode;
            setIsTapMode(next);
            if (next) {
              setIsWalkTracking(false);
              showToast('Mode Buat Titik Aktif: Klik pada peta untuk menaruh patok batas', 'info');
            }
          }}
          className={`w-12 h-12 rounded-2xl border shadow-xl flex items-center justify-center active:scale-90 transition cursor-pointer ${
            isTapMode
              ? 'bg-amber-500 text-slate-950 font-black border-amber-300'
              : 'bg-slate-900/90 text-amber-300 border-white/20 hover:bg-slate-800'
          }`}
          title="Mode Tap Manual di Layar Satelit"
        >
          <MapPin className="w-5 h-5" />
        </button>

        {/* Undo Last Point */}
        {surveyPoints.length > 0 && (
          <button
            type="button"
            onClick={handleUndoPoint}
            className="w-12 h-12 rounded-2xl bg-slate-900/90 text-slate-200 border border-white/20 shadow-xl flex items-center justify-center active:scale-90 transition hover:bg-slate-800"
            title="Batalkan Titik Patok Terakhir"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}

        {/* Reset / Delete Survey */}
        {surveyPoints.length > 0 && (
          <button
            type="button"
            onClick={handleResetSurvey}
            className="w-12 h-12 rounded-2xl bg-rose-950/90 text-rose-300 border border-rose-500/40 shadow-xl flex items-center justify-center active:scale-90 transition hover:bg-rose-900"
            title="Reset Seluruh Patok"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 5. BOTTOM FLOATING CONTROL DOCK (FIELD SURVEYOR COCKPIT) */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000]">
        <div className="bg-slate-900/95 backdrop-blur-md rounded-3xl border border-white/15 p-3.5 shadow-2xl text-white">
          {surveyPoints.length === 0 ? (
            /* Idle State: Big Primary Button to Drop 1st Point or Start Walk */
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleAddCurrentGpsPoint}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3.5 px-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition text-sm"
              >
                <MapPin className="w-5 h-5 text-amber-300" />
                <span>Patok GPS Posisi Sekarang</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsWalkTracking(true);
                  setIsTapMode(false);
                  showSuccess(
                    'Walk-Tracking Dimulai!',
                    'Mulai melangkah menyusuri pematang sawah. Koordinat otomatis tercatat.'
                  );
                }}
                className="bg-slate-800 hover:bg-slate-700 text-emerald-400 p-3.5 rounded-2xl border border-white/10 active:scale-95 transition"
                title="Mulai Berjalan Merekam Pematang"
              >
                <Play className="w-5 h-5" />
              </button>
            </div>
          ) : (
            /* Survey In-Progress: Live Stats & Finish Button */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                  <span className="font-extrabold text-amber-300">
                    {surveyPoints.length} Patok Tercatat
                  </span>
                  {isWalkTracking && (
                    <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-0.5 rounded-full border border-white/10 text-[10px]">
                      <span className="text-emerald-400 font-bold">🚶 Rekam per:</span>
                      {[2, 3, 5].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleChangeThreshold(m)}
                          className={`px-1.5 py-0.5 rounded font-black transition ${
                            walkThresholdMeters === m
                              ? 'bg-amber-400 text-slate-950 shadow-2xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  )}
                  {isTapMode && (
                    <span className="text-[10px] bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                      Tap Layar Aktif
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <div className="font-black text-sm text-emerald-400">
                    {surveyArea.luasHa} Ha{' '}
                    <span className="text-xs text-slate-300 font-normal">
                      ({surveyArea.luasM2.toLocaleString('id-ID')} m²)
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Keliling: {surveyPerimeter.toLocaleString('id-ID')} m
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddCurrentGpsPoint}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-3 rounded-xl border border-white/10 text-xs flex items-center gap-1.5 active:scale-95 transition shrink-0"
                  title="Tambah Titik GPS Posisi Saya Sekarang"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>+ Patok GPS</span>
                </button>

                <button
                  type="button"
                  disabled={surveyPoints.length < 3}
                  onClick={() => setShowSaveDrawer(true)}
                  className={`flex-1 font-black py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-lg ${
                    surveyPoints.length >= 3
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                      : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {surveyPoints.length >= 3
                      ? 'Selesai & Simpan Petak'
                      : `Tambah ${3 - surveyPoints.length} Titik Lagi`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. BOTTOM DRAWER / MODAL: INPUT IDENTITAS LAHAN & PETANI */}
      {showSaveDrawer && (
        <div className="fixed inset-0 z-[2500] bg-slate-950/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans overflow-y-auto">
          <div className="bg-white w-full sm:max-w-xl md:max-w-2xl rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[92vh] sm:max-h-[88vh] overflow-y-auto space-y-4 shadow-2xl border border-slate-200 font-sans text-slate-800 pb-8 sm:pb-6 my-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2 font-sans">
                  <Save className="w-5 h-5 text-emerald-600" />
                  Simpan Petak Sawah Hasil Ukur
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Hasil ukur: <strong className="text-emerald-700">{surveyArea.luasHa} Ha</strong> (
                  {surveyArea.luasM2} m²) &bull; {surveyPoints.length} Titik Patok
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveDrawer(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLahan} className="space-y-3.5 text-xs font-sans">
              <div>
                <label className="block font-bold text-slate-700 mb-1 font-sans">
                  Nama Petak Sawah / Blok Hamparan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Sawah Blok Glundengan Kidul"
                  value={formData.namaLahan}
                  onChange={(e) => setFormData({ ...formData, namaLahan: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-sans font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Pemilihan Petani atau Jalan Pintas Pendaftaran Petani Baru */}
              <div className="space-y-2 font-sans">
                <label className="block font-bold text-slate-700 text-xs font-sans">
                  Petani Pemilik / Penggarap *
                </label>

                {!isQuickAddPetani ? (
                  <div className="space-y-1.5 font-sans">
                    <select
                      value={formData.petaniId}
                      onChange={(e) => {
                        if (e.target.value === '__QUICK_ADD__') {
                          setIsQuickAddPetani(true);
                          setFormData({ ...formData, petaniId: '' });
                        } else {
                          setFormData({ ...formData, petaniId: e.target.value });
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-sans font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs cursor-pointer"
                    >
                      <option value="" className="font-sans">-- Pilih dari Petani Terdaftar ({petaniList.length}) --</option>
                      {petaniList.map((p) => (
                        <option key={p.id} value={p.id} className="font-sans">
                          {p.nama} (NIK: {p.nik}) &bull; Desa {p.desa || 'Kediren'}
                        </option>
                      ))}
                      <option value="__QUICK_ADD__" className="font-sans font-bold text-emerald-700 bg-emerald-50">
                        + Petani Belum Ada? Klik untuk Tambah Petani / Penggarap Baru...
                      </option>
                    </select>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>*Memilih petani mengaitkan kepemilikan sawah ke akun e-RDKK.</span>
                      <button
                        type="button"
                        onClick={() => setIsQuickAddPetani(true)}
                        className="text-emerald-700 font-bold underline hover:text-emerald-800 cursor-pointer shrink-0 ml-2"
                      >
                        + Input Petani Baru
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Panel Jalan Pintas Input Petani / Penggarap Baru (Identik dengan Mode Desktop) */
                  <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-2xl p-3.5 space-y-3 animate-in fade-in duration-150 font-sans">
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-2 font-sans">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-sans">
                          JALAN PINTAS PENDAFTARAN PETANI
                        </span>
                        <h4 className="font-black text-slate-900 text-xs mt-1 font-sans">
                          Input Data Petani / Penggarap Baru
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsQuickAddPetani(false)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 font-bold cursor-pointer font-sans"
                      >
                        Batal
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-sans">
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5 text-[11px] font-sans">
                          Nama Lengkap Petani / Penggarap *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Suparno"
                          value={quickPetaniData.nama}
                          onChange={(e) => setQuickPetaniData({ ...quickPetaniData, nama: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-sans font-semibold focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5 text-[11px] font-sans">
                          NIK Sesuai KTP (16 Digit) *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={16}
                          placeholder="Contoh: 3520041205800003"
                          value={quickPetaniData.nik}
                          onChange={(e) =>
                            setQuickPetaniData({
                              ...quickPetaniData,
                              nik: e.target.value.replace(/\D/g, ''),
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-sans">
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5 text-[11px] font-sans">
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
                        <label className="block font-bold text-slate-700 mb-0.5 text-[11px] font-sans">
                          Kelompok Tani (Poktan) *
                        </label>
                        <select
                          value={quickPetaniData.poktanId}
                          onChange={(e) => setQuickPetaniData({ ...quickPetaniData, poktanId: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-sans font-semibold focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                          {poktanList.map((pk) => (
                            <option key={pk.id} value={pk.id} className="font-sans">
                              {pk.nama} (Desa {pk.desa})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-sans">
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5 text-[11px] font-sans">
                          Tempat Lahir
                        </label>
                        <input
                          type="text"
                          placeholder="Magetan"
                          value={quickPetaniData.tempatLahir}
                          onChange={(e) => setQuickPetaniData({ ...quickPetaniData, tempatLahir: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-sans"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5 text-[11px] font-sans">
                          Tanggal Lahir
                        </label>
                        <input
                          type="date"
                          value={quickPetaniData.tanggalLahir}
                          onChange={(e) => setQuickPetaniData({ ...quickPetaniData, tanggalLahir: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-sans"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-sans">
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5 text-[11px] font-sans">
                          Nama Ibu Kandung
                        </label>
                        <input
                          type="text"
                          placeholder="Nama gadis ibu"
                          value={quickPetaniData.namaIbuKandung}
                          onChange={(e) => setQuickPetaniData({ ...quickPetaniData, namaIbuKandung: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-sans"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5 text-[11px] font-sans">
                          Desa / Kelurahan (Kec. Lembeyan)
                        </label>
                        <select
                          value={quickPetaniData.desa}
                          onChange={(e) => setQuickPetaniData({ ...quickPetaniData, desa: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-sans font-semibold cursor-pointer"
                        >
                          {DESA_LEMBEYAN_LIST.map((d) => (
                            <option key={d} value={d} className="font-sans">
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-0.5 text-[11px] font-sans">
                        Alamat Dusun / RT / RW
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: RT 03 / RW 01, Dusun Krajan"
                        value={quickPetaniData.alamat}
                        onChange={(e) => setQuickPetaniData({ ...quickPetaniData, alamat: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-sans"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1 font-sans">
                      <span className="text-[10px] text-emerald-800 font-medium font-sans">
                        *Petani baru otomatis didaftarkan ke sistem e-RDKK.
                      </span>
                      <button
                        type="button"
                        disabled={savingQuickPetani}
                        onClick={handleSaveQuickPetani}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 font-sans"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {savingQuickPetani ? 'Menyimpan...' : 'Daftarkan & Pilih Petani Ini'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Komoditas Selector */}
              <div className="font-sans">
                <div className="flex items-center justify-between mb-1.5 font-sans">
                  <label className="block font-bold text-slate-700 font-sans">
                    Komoditas Tanam (Bisa Pilih &gt; 1 / Tumpang Sari) *
                  </label>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-sans">
                    Multi-Komoditas
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2 font-sans">
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>Klik tombol pill untuk kombinasi multi-komoditas.</span>
                  <span className="font-semibold text-emerald-800">
                    Terpilih: <strong>{formData.komoditas || '-'}</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 font-sans">Nomor Pipil / SPPT</label>
                  <input
                    type="text"
                    placeholder="Contoh: 35.20.040.005"
                    value={formData.nomorPipil}
                    onChange={(e) => setFormData({ ...formData, nomorPipil: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-sans font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 font-sans">Status Penguasaan</label>
                  <select
                    value={formData.statusKepemilikan}
                    onChange={(e) => setFormData({ ...formData, statusKepemilikan: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-sans font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Milik Sendiri" className="font-sans">Milik Sendiri</option>
                    <option value="Sewa" className="font-sans">Sewa / Sakap</option>
                    <option value="Bagi Hasil" className="font-sans">Bagi Hasil</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 font-sans">Jenis Irigasi</label>
                  <select
                    value={formData.statusIrigasi}
                    onChange={(e) => setFormData({ ...formData, statusIrigasi: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-sans font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Irigasi Teknis" className="font-sans">Irigasi Teknis</option>
                    <option value="Pompa Sumur Dangkal" className="font-sans">Pompa Sumur Dangkal</option>
                    <option value="Tadah Hujan" className="font-sans">Tadah Hujan</option>
                  </select>
                </div>
              </div>

              {/* Geotagged Photo Camera Section */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    Foto Dokumentasi Sawah (Watermark GPS)
                  </label>
                  {fotoLahan && (
                    <button
                      type="button"
                      onClick={() => setFotoLahan(null)}
                      className="text-[11px] text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>

                {fotoLahan ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-300 shadow-sm max-h-48">
                    <img src={fotoLahan} alt="Foto Sawah Geotag" className="w-full h-auto object-cover max-h-48" />
                    <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                      ✓ Geotagged GPS
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-emerald-400/80 bg-emerald-50/60 hover:bg-emerald-100/80 rounded-xl cursor-pointer text-xs font-bold text-emerald-800 transition">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span>{processingPhoto ? 'Menempelkan Cap GPS...' : 'Ambil Foto Sawah (Kamera HP)'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleCapturePhoto}
                        disabled={processingPhoto}
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Foto otomatis dicap koordinat GPS, nama petani, tanggal & stempel BPP Lembeyan.
                    </p>
                  </div>
                )}
              </div>

              {!effectiveOnline && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Mode Offline Aktif:</strong> Petak sawah ini akan disimpan di antrean HP. Saat sinyal kembali, buka menu Antrean HP untuk mengunggah.
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm active:scale-[0.99] mt-2"
              >
                <Save className="w-4 h-4" />
                <span>{effectiveOnline ? 'Simpan ke Server Database' : 'Simpan ke Antrean HP (Offline)'}</span>
              </button>
            </form>
          </div>
        </div>
      )}



      {/* 7. OFFLINE QUEUE DRAWER MODAL */}
      {showQueueDrawer && (
        <div className="fixed inset-0 z-[2500] bg-slate-950/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans overflow-y-auto">
          <div className="bg-white w-full sm:max-w-xl md:max-w-2xl rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[92vh] sm:max-h-[88vh] overflow-y-auto space-y-4 shadow-2xl border border-slate-200 font-sans text-slate-800 pb-8 sm:pb-6 my-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-amber-600" />
                  Antrean Survei Offline Smartphone ({offlineSurveys.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Daftar petak sawah yang direkam saat sinyal seluler lemah di persawahan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQueueDrawer(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {offlineSurveys.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold">Semua data lapangan telah berhasil disinkronkan!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offlineSurveys.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2.5 text-xs shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <strong className="text-slate-900 block truncate text-sm font-black">
                          {item.namaLahan}
                        </strong>
                        <span className="text-slate-600 block truncate">
                          Petani: <span className="font-semibold text-slate-800">{item.petaniNama}</span> &bull; {item.komoditas}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[11px]">
                          <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {item.luasHa} Ha ({item.luasM2.toLocaleString('id-ID')} m²)
                          </span>
                          <span className="text-slate-400">
                            {item.coordinates.length} patok
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 ${
                          item.syncStatus === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : item.syncStatus === 'FAILED'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                        }`}
                      >
                        {item.syncStatus === 'SUCCESS'
                          ? '✓ TERUNGGAH'
                          : item.syncStatus === 'FAILED'
                          ? '✕ GAGAL'
                          : '⏳ MENUNGGU SINYAL'}
                      </span>
                    </div>

                    {/* Action buttons per survey */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => handleFlyToOffline(item)}
                        className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold px-3 py-1.5 rounded-xl text-[11px] flex items-center gap-1.5 transition active:scale-95"
                      >
                        <Compass className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Lihat di Peta</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isSyncing}
                          onClick={() => handleSyncSingle(item)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded-xl text-[11px] flex items-center gap-1.5 transition active:scale-95 shadow-xs"
                          title="Unggah petak ini saja ke server"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Unggah</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            const conf = await showConfirm({
                              title: 'Hapus Antrean?',
                              text: `Hapus petak "${item.namaLahan}" dari antrean offline smartphone?`,
                              confirmButtonText: 'Ya, Hapus',
                              cancelButtonText: 'Batal',
                            });
                            if (conf) deleteOfflineSurvey(item.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                          title="Hapus dari antrean"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  disabled={isSyncing || offlineSurveys.length === 0}
                  onClick={handleSyncQueue}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3.5 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-sm active:scale-[0.99] mt-3"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Mengunggah Seluruh Data...' : '🚀 Sinkronkan Semua ke Server'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. DRAWER / MODAL: HISTORI PETAK SAWAH TERDAFTAR */}
      {showHistoriModal && (
        <div className="fixed inset-0 z-[2500] bg-slate-950/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans overflow-y-auto">
          <div className="bg-white w-full sm:max-w-xl md:max-w-2xl rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[92vh] sm:max-h-[88vh] overflow-y-auto space-y-4 shadow-2xl border border-slate-200 font-sans text-slate-800 pb-8 sm:pb-6 my-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Histori Petak Sawah Terdaftar ({existingLahan.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Daftar seluruh petak sawah yang sudah selesai di-poligon di Kecamatan Lembeyan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoriModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick action: Fokus Semua Petak di Peta */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  handleFitAllExistingLahan();
                  setShowHistoriModal(false);
                }}
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition active:scale-98"
              >
                <Compass className="w-4 h-4" />
                Fokuskan Peta ke Semua Petak ({existingLahan.length})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama petani, blok sawah, atau desa..."
                value={historiSearch}
                onChange={(e) => setHistoriSearch(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* List of Lahan */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {filteredExistingLahan.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-medium">
                  {existingLahan.length === 0
                    ? 'Belum ada petak sawah terdaftar di database.'
                    : 'Tidak ada petak sawah yang cocok dengan pencarian.'}
                </div>
              ) : (
                filteredExistingLahan.map((lahan) => {
                  const styling = getPolygonColor(lahan.komoditas);
                  return (
                    <div
                      key={lahan.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: styling.color }}
                          />
                          <h4 className="font-black text-slate-900 text-xs truncate">
                            {lahan.namaLahan}
                          </h4>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {lahan.luasHa} Ha
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate">
                          Petani: <strong className="text-slate-800">{lahan.petani?.nama || '-'}</strong>
                          {lahan.desa ? ` &bull; Desa ${lahan.desa}` : ''}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {lahan.kodeLahan} &bull; {lahan.komoditas}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleFlyToLahan(lahan)}
                        className="py-2 px-3 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-2xs cursor-pointer transition active:scale-95"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        Lihat di Peta
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}



      {/* Modal Pratinjau Foto Dokumentasi Lahan (GPS Watermark) Full Size */}
      {previewFotoModal && (
        <div className="fixed inset-0 z-[3000] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between text-white">
              <span className="text-xs font-black flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                Dokumentasi Lapangan Ber-Watermark GPS
              </span>
              <button
                type="button"
                onClick={() => setPreviewFotoModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 overflow-auto flex-1 flex items-center justify-center bg-black/40">
              <img
                src={previewFotoModal}
                alt="Foto Sawah Watermark GPS"
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>
            <div className="p-3 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setPreviewFotoModal(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Modal Bantuan GPS Android & iOS */}
      {showGpsHelpModal && (
        <div className="fixed inset-0 z-[3000] bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-white">
            <div className="p-4 bg-emerald-950 border-b border-emerald-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-black text-white">Panduan Sensor GPS HP</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGpsHelpModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto text-xs leading-relaxed">
              {/* Opsi 1: Rekomendasi Instan */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>Solusi Instan: Mode Tap Layar Satelit</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Anda tetap bisa memetakan sawah dengan presisi tinggi tanpa GPS dengan menyentuh langsung batas pematang pada citra satelit Google High-Res.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsTapMode(true);
                    setShowGpsHelpModal(false);
                    showSuccess('Mode Tap Aktif', 'Sentuh layar pada sudut-sudut batas sawah.');
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Aktifkan Mode Tap Layar Sekarang</span>
                </button>
              </div>

              {/* Opsi 2: Aturan Keamanan Chrome Android */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Izin Geolocation di Chrome Android</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Google Chrome memblokir sensor GPS jika web diakses via IP HTTP lokal (<code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">http://100.100.x.x</code>).
                </p>
                <div className="bg-black/50 p-2.5 rounded-xl space-y-1 font-mono text-[10px] text-slate-300">
                  <p className="text-slate-400 font-sans font-bold">Cara Aktifkan di Chrome HP (30 Detik):</p>
                  <p>1. Buka tab baru Chrome, ketik: <span className="text-amber-300 select-all">chrome://flags</span></p>
                  <p>2. Cari: <span className="text-amber-300">Insecure origins treated as secure</span></p>
                  <p>3. Masukkan URL server web ini:</p>
                  <div className="flex items-center justify-between bg-slate-900 p-1.5 rounded border border-white/10 mt-1">
                    <span className="text-emerald-400 truncate">{typeof window !== 'undefined' ? window.location.origin : 'http://...'}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (typeof window !== 'undefined') {
                          await copyToClipboard(window.location.origin);
                          showToast('URL Server Berhasil Disalin!', 'success');
                        }
                      }}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[9px] font-sans font-bold shrink-0 ml-1"
                    >
                      Salin URL
                    </button>
                  </div>
                  <p className="pt-1">4. Ubah status ke <strong>Enabled</strong> & tekan <strong>Relaunch</strong>.</p>
                </div>
              </div>

              {/* Opsi 3: Pengembang / HTTPS */}
              <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-2xl space-y-1.5 text-[11px] text-slate-300">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span>Mode HTTPS Resmi</span>
                </p>
                <p>
                  Bagi administrator server, jalankan perintah <code className="bg-black/40 px-1 py-0.5 rounded text-emerald-300">npm run dev:https</code> di laptop agar seluruh HP Android langsung mendapatkan izin GPS otomatis tanpa perlu setting flags.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowGpsHelpModal(false);
                  handleCenterGps();
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
              >
                Coba Kunci GPS Lagi
              </button>
              <button
                type="button"
                onClick={() => setShowGpsHelpModal(false)}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
