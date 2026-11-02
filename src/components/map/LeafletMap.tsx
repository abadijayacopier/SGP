'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  Popup,
  Marker,
  useMapEvents,
  useMap,
  LayersControl,
  Tooltip,
} from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link';
import {
  calculatePolygonArea,
  calculatePolygonPerimeter,
  calculateSegmentLengths,
  checkPolygonOverlap,
  OverlapResult,
} from '@/lib/calculations';
import {
  Printer,
  MapPin,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Navigation,
  Trash2,
  Crosshair,
  ShieldAlert,
  ShieldCheck,
  Ruler,
  Search,
  Compass,
  X,
  Camera,
  Play,
  Square,
  Smartphone,
  Radio,
  Sparkles,
  Globe,
  Loader2,
} from 'lucide-react';
import { DESA_COORDINATES_LEMBEYAN, DESA_LEMBEYAN_LIST } from '@/lib/erdkk-format';
import { calculateDistanceMeters } from '@/lib/calculations';
import type { FlyToTarget } from './MapWrapper';
import { showWarning, showError, showInfo, showSuccess, showToast } from '@/lib/sweetalert';

// Marker Patok Batas Kadastral P1, P2, P3...
const createPatokIcon = (index: number) => {
  return L.divIcon({
    className: 'custom-patok-marker',
    html: `<div style="background-color: #f59e0b; color: #0f172a; border: 2.5px solid #ffffff; border-radius: 9999px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 11px; font-family: monospace; box-shadow: 0 4px 10px rgba(0,0,0,0.35); cursor: move;">P${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Marker GPS Lokasi Saya
const gpsIcon = L.divIcon({
  className: 'custom-gps-marker',
  html: `<div style="background-color: #0284c7; border: 3px solid #ffffff; border-radius: 9999px; width: 22px; height: 22px; box-shadow: 0 0 0 6px rgba(2,132,199,0.3), 0 4px 8px rgba(0,0,0,0.4);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Marker Lokasi Desa / Wilayah yang Dipusatkan
const desaCenterIcon = L.divIcon({
  className: 'custom-desa-marker',
  html: `<div style="background-color: #059669; color: #ffffff; border: 3px solid #fde047; border-radius: 9999px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 13px; box-shadow: 0 0 0 6px rgba(5,150,105,0.28), 0 4px 10px rgba(0,0,0,0.45);">📍</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

export interface LahanItem {
  id: string;
  kodeLahan: string;
  namaLahan: string;
  komoditas: string;
  luasHa: number;
  luasM2: number;
  statusKepemilikan: string;
  statusIrigasi: string;
  nomorPipil?: string | null;
  kabupaten?: string;
  batasUtara?: string | null;
  batasSelatan?: string | null;
  batasTimur?: string | null;
  batasBarat?: string | null;
  desa?: string;
  coordinates: string; // JSON array of [lat, lng]
  centerLat: number;
  centerLng: number;
  statusVerifikasi: string;
  fotoLahan?: string | null;
  petani?: {
    id: string;
    nama: string;
    nik: string;
    desa?: string;
    poktan?: {
      nama: string;
      desa: string;
      kecamatan: string;
    };
  };
}

interface LeafletMapProps {
  lahanList: LahanItem[];
  isDrawingMode: boolean;
  onPolygonCreated?: (
    coords: [number, number][],
    luasHa: number,
    luasM2: number,
    perimeterM: number,
    overlapInfo?: OverlapResult
  ) => void;
  selectedLahanId?: string | null;
  flyToTarget?: FlyToTarget | null;
  onSelectDesaFromMap?: (desaKey: string) => void;
}

// Komponen untuk otomatis memusatkan dan zoom ke poligon atau wilayah desa yang dipilih
function MapFlyTo({
  selectedLahan,
  flyToTarget,
}: {
  selectedLahan?: LahanItem | null;
  flyToTarget?: FlyToTarget | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (selectedLahan && selectedLahan.centerLat && selectedLahan.centerLng) {
      map.flyTo([selectedLahan.centerLat, selectedLahan.centerLng], 16, { duration: 1.2 });
    }
  }, [selectedLahan, map]);

  useEffect(() => {
    if (flyToTarget && flyToTarget.lat && flyToTarget.lng) {
      map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom || 16, { duration: 1.2 });
    }
  }, [flyToTarget, map]);

  return null;
}

// Komponen penangkap event klik pada peta untuk mode gambar poligon
function DrawEventsHandler({
  isDrawingMode,
  drawingPoints,
  setDrawingPoints,
}: {
  isDrawingMode: boolean;
  drawingPoints: [number, number][];
  setDrawingPoints: React.Dispatch<React.SetStateAction<[number, number][]>>;
}) {
  const map = useMap();

  // Sinkronkan class cursor crosshair pada container map saat mode gambar aktif
  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;
    if (isDrawingMode) {
      container.classList.add('leaflet-drawing-mode');
      container.style.cursor = 'crosshair';
    } else {
      container.classList.remove('leaflet-drawing-mode');
      container.style.cursor = '';
    }
    return () => {
      container.classList.remove('leaflet-drawing-mode');
      container.style.cursor = '';
    };
  }, [map, isDrawingMode]);

  useMapEvents({
    click(e) {
      if (!isDrawingMode) return;
      const newPoint: [number, number] = [
        Math.round(e.latlng.lat * 100000) / 100000,
        Math.round(e.latlng.lng * 100000) / 100000,
      ];
      setDrawingPoints((prev) => [...prev, newPoint]);
    },
  });
  return null;
}

// Tombol GPS Geolocation di dalam Map
function GpsButton({ onGpsFound }: { onGpsFound: (coords: [number, number]) => void }) {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  const handleLocate = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();

    // Cek Secure Context (HTTP vs HTTPS)
    const isLocal = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1'
    );
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

    if (!isLocal && !isHttps) {
      showWarning(
        'Perhatian Sensor GPS (Koneksi HTTP)',
        `Browser iPhone Safari & Chrome membatasi sensor GPS jika web dibuka via IP HTTP biasa (${window.location.host}).\n\nJika tombol tidak merespons:\n1. Buka Pengaturan iPhone > Safari > Lokasi > pilih 'Izinkan'\n2. Pastikan Layanan Lokasi di iOS aktif.\n3. Atau jalankan aplikasi melalui domain HTTPS.`
      );
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      showError('GPS Tidak Didukung', 'Browser Anda tidak mendukung sensor Geolocation GPS.');
      return;
    }

    setLocating(true);
    showToast('Menghubungi satelit GPS smartphone...', 'info');

    const handleLocateSuccess = (pos: GeolocationPosition) => {
      setLocating(false);
      const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      onGpsFound(coords);
      map.flyTo(coords, 18, { duration: 1.2 });
      showSuccess(
        'Lokasi GPS Terkunci',
        `Posisi Anda berhasil dideteksi dengan akurasi ±${Math.round(pos.coords.accuracy)} meter.`
      );
    };

    navigator.geolocation.getCurrentPosition(
      handleLocateSuccess,
      (err) => {
        // Fallback ke low accuracy (Fused/Cellular/Wi-Fi) jika satelit timeout
        if (err.code === 3 || err.code === 2) {
          navigator.geolocation.getCurrentPosition(
            handleLocateSuccess,
            (fallbackErr) => {
              setLocating(false);
              let title = 'GPS Tidak Dapat Diakses';
              let detail = fallbackErr.message;
              if (fallbackErr.code === 1) {
                title = 'Izin Lokasi Belum Aktif';
                detail = 'Browser Chrome/Safari memerlukan izin sensor lokasi. Silakan izinkan akses lokasi di pengaturan HP.';
              }
              showError(title, detail);
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
          );
          return;
        }

        setLocating(false);
        let title = 'GPS Tidak Dapat Diakses';
        let detail = err.message;
        if (err.code === 1) { // PERMISSION_DENIED
          title = 'Izin Lokasi Ditolak';
          detail =
            'Browser Safari/Chrome belum diizinkan mengakses GPS. Silakan buka Pengaturan HP > Privasi & Keamanan > Layanan Lokasi > aktifkan izin untuk Safari/Chrome.';
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          title = 'Sinyal GPS Hilang';
          detail =
            'Sinyal satelit tidak terdeteksi. Pastikan Anda berada di area terbuka (luar ruangan sawah) dan fitur Lokasi HP menyala.';
        } else if (err.code === 3) { // TIMEOUT
          title = 'Waktu GPS Habis';
          detail =
            'Pencarian sinyal satelit melebihi batas waktu. Silakan tap kembali tombol ini untuk mencoba lagi.';
        }
        showError(title, detail);
      },
      { enableHighAccuracy: true, timeout: 25000, maximumAge: 5000 }
    );
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="leaflet-top leaflet-left !top-20 !left-3 z-[400]"
    >
      <button
        type="button"
        onClick={handleLocate}
        title="Deteksi Lokasi Saya (GPS Lapangan)"
        className="w-9 h-9 bg-white hover:bg-slate-50 text-slate-700 active:bg-blue-50 rounded-xl shadow-md border border-slate-200 flex items-center justify-center transition hover:text-blue-600 active:scale-95 cursor-pointer"
      >
        <Crosshair className={`w-4 h-4 ${locating ? 'animate-spin text-blue-600' : 'text-slate-700'}`} />
      </button>
    </div>
  );
}

export default function LeafletMap({
  lahanList,
  isDrawingMode,
  onPolygonCreated,
  selectedLahanId,
  flyToTarget,
  onSelectDesaFromMap,
}: LeafletMapProps) {
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [selectedFotoPreview, setSelectedFotoPreview] = useState<string | null>(null);
  const [myGpsLocation, setMyGpsLocation] = useState<[number, number] | null>(null);
  const [internalFlyTo, setInternalFlyTo] = useState<FlyToTarget | null>(null);
  const [mapSearchText, setMapSearchText] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<Array<{
    display_name: string;
    name?: string;
    lat: string;
    lon: string;
    type?: string;
    class?: string;
  }>>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const centerPosition: [number, number] = [-7.7685, 111.4225]; // Pusat Pemetaan Kecamatan Lembeyan, Kabupaten Magetan

  // Mode GPS Walk-Tracking (Keliling Batas Sawah via Smartphone)
  const [isGpsTracking, setIsGpsTracking] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsWatchId, setGpsWatchId] = useState<number | null>(null);
  const [minDistanceThreshold, setMinDistanceThreshold] = useState<number>(3); // Catat patok tiap minimal 3 meter
  const [trackingStatusMsg, setTrackingStatusMsg] = useState<string>('');

  const activeFlyTo = internalFlyTo || flyToTarget || null;

  // Deteksi format koordinat (misal: -7.768, 111.421 atau -7.768 111.421)
  const parsedCoordinate = useMemo(() => {
    const q = mapSearchText.trim();
    const match = q.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
    return null;
  }, [mapSearchText]);

  // Pencarian cepat lokal (10 Desa Kec. Lembeyan + Petak Sawah Terdaftar)
  const localSearchResults = useMemo(() => {
    const q = mapSearchText.trim().toLowerCase();
    const desaMatches = Object.values(DESA_COORDINATES_LEMBEYAN).filter((d) =>
      !q
        ? true
        : d.label.toLowerCase().includes(q) ||
          d.key.toLowerCase().includes(q) ||
          d.keterangan.toLowerCase().includes(q)
    );
    const lahanMatches = !q
      ? []
      : lahanList
          .filter(
            (l) =>
              l.namaLahan.toLowerCase().includes(q) ||
              l.kodeLahan.toLowerCase().includes(q) ||
              (l.petani?.nama || '').toLowerCase().includes(q)
          )
          .slice(0, 5);
    return { desaMatches, lahanMatches };
  }, [mapSearchText, lahanList]);

  // Debounced Live Global Geocoding via OpenStreetMap Nominatim
  useEffect(() => {
    const q = mapSearchText.trim();
    if (q.length < 3 || parsedCoordinate) {
      setGlobalSearchResults([]);
      setIsSearchingGlobal(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingGlobal(true);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setGlobalSearchResults(data);
        }
      } catch {
        // Abaikan error jaringan saat mengetik
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [mapSearchText, parsedCoordinate]);

  const applyGlobalHit = (hit: any) => {
    const lat = parseFloat(hit.lat);
    const lng = parseFloat(hit.lon);

    let targetZoom = 16;
    const type = hit.type || '';
    const category = hit.class || '';

    if (type === 'country') targetZoom = 6;
    else if (type === 'state' || type === 'province') targetZoom = 9;
    else if (type === 'city' || type === 'administrative') targetZoom = 13;
    else if (type === 'town' || type === 'village' || type === 'suburb') targetZoom = 15;
    else if (category === 'highway' || category === 'building' || category === 'amenity') targetZoom = 18;

    const shortName = hit.name || hit.display_name.split(',')[0] || mapSearchText;

    setInternalFlyTo({
      lat,
      lng,
      zoom: targetZoom,
      label: shortName,
      keterangan: hit.display_name,
      timestamp: Date.now(),
    });
  };

  // Pencarian Wilayah / Desa / Tempat Global via OSM Nominatim atau Titik Koordinat
  const handleExternalGeocodeSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = mapSearchText.trim();
    if (!q) return;

    // 1. Cek Koordinat GPS Langsung
    if (parsedCoordinate) {
      setInternalFlyTo({
        lat: parsedCoordinate.lat,
        lng: parsedCoordinate.lng,
        zoom: 17,
        label: `Titik [${parsedCoordinate.lat.toFixed(5)}, ${parsedCoordinate.lng.toFixed(5)}]`,
        keterangan: 'Koordinat Geografis GPS',
        timestamp: Date.now(),
      });
      setSearchDropdownOpen(false);
      return;
    }

    // 2. Cek apakah cocok langsung dengan salah satu Desa di Lembeyan
    const exactDesa = Object.values(DESA_COORDINATES_LEMBEYAN).find(
      (d) =>
        d.key.toLowerCase() === q.toLowerCase() ||
        d.label.toLowerCase() === q.toLowerCase() ||
        `desa ${d.key.toLowerCase()}` === q.toLowerCase()
    );
    if (exactDesa) {
      setInternalFlyTo({
        lat: exactDesa.lat,
        lng: exactDesa.lng,
        zoom: exactDesa.zoom,
        label: exactDesa.label,
        keterangan: exactDesa.keterangan,
        timestamp: Date.now(),
      });
      setSearchDropdownOpen(false);
      if (onSelectDesaFromMap) {
        onSelectDesaFromMap(exactDesa.key);
      }
      return;
    }

    // 3. Cek apakah cocok dengan Petak Sawah Terdaftar
    const exactLahan = lahanList.find(
      (l) =>
        l.kodeLahan.toLowerCase() === q.toLowerCase() ||
        l.namaLahan.toLowerCase() === q.toLowerCase()
    );
    if (exactLahan) {
      setInternalFlyTo({
        lat: exactLahan.centerLat,
        lng: exactLahan.centerLng,
        zoom: 18,
        label: `${exactLahan.kodeLahan} - ${exactLahan.namaLahan}`,
        keterangan: `Milik ${exactLahan.petani?.nama || '-'} (${exactLahan.luasHa} Ha)`,
        timestamp: Date.now(),
      });
      setSearchDropdownOpen(false);
      return;
    }

    // 4. Jika hasil global search live sudah ada di daftar
    if (globalSearchResults.length > 0) {
      applyGlobalHit(globalSearchResults[0]);
      setSearchDropdownOpen(false);
      return;
    }

    // 5. Fetch pencarian tempat global secara langsung
    try {
      setGeocodingLoading(true);
      let res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&addressdetails=1`
      );
      let data = await res.json();

      // Coba fallback dengan konteks Indonesia jika belum ditemukan dan tidak eksplisit menyebut negara lain
      if ((!Array.isArray(data) || data.length === 0) && !q.toLowerCase().includes('indonesia')) {
        res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', Indonesia')}&limit=1&addressdetails=1`
        );
        data = await res.json();
      }

      if (Array.isArray(data) && data.length > 0) {
        const hit = data[0];
        applyGlobalHit(hit);
        setSearchDropdownOpen(false);
      } else {
        showWarning(
          'Lokasi Tidak Ditemukan',
          `Tempat "${q}" tidak ditemukan di peta. Coba periksa ejaan, tambahkan nama kota/kecamatan, atau masukkan koordinat (contoh: -7.768, 111.421).`
        );
      }
    } catch {
      showError('Pencarian Gagal', 'Gagal menghubungi server pencarian peta global. Periksa koneksi internet Anda.');
    } finally {
      setGeocodingLoading(false);
    }
  };

  const selectedLahan = lahanList.find((l) => l.id === selectedLahanId) || null;

  // Warna poligon berdasarkan komoditas (mendukung multi-komoditas / tumpang sari)
  const getPolygonColor = (komoditas: string) => {
    const lower = (komoditas || '').toLowerCase();
    if (lower.includes('padi') && (lower.includes('jagung') || lower.includes('kedelai') || lower.includes('bawang'))) {
      // Tumpang sari / multi-komoditas padi + jagung/palawija
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
      return { color: '#0284c7', fillColor: '#38bdf8' };
    }
    return { color: '#9333ea', fillColor: '#c084fc' };
  };

  useEffect(() => {
    if (!isDrawingMode) {
      setDrawingPoints([]);
      if (gpsWatchId !== null) {
        navigator.geolocation?.clearWatch(gpsWatchId);
        setGpsWatchId(null);
      }
      setIsGpsTracking(false);
      setTrackingStatusMsg('');
    }
  }, [isDrawingMode, gpsWatchId]);

  // Fungsi Mulai / Hentikan Tracking GPS saat berjalan keliling sawah
  const toggleGpsWalkTracking = () => {
    if (!navigator.geolocation) {
      showWarning('GPS Tidak Didukung', 'Browser di smartphone Anda tidak mendukung fitur Geolocation GPS.');
      return;
    }

    if (isGpsTracking) {
      // Hentikan tracking
      if (gpsWatchId !== null) {
        navigator.geolocation.clearWatch(gpsWatchId);
        setGpsWatchId(null);
      }
      setIsGpsTracking(false);
      setTrackingStatusMsg('Tracking GPS dihentikan.');
      return;
    }

    // Mulai tracking GPS secara kontinu
    setIsGpsTracking(true);
    setTrackingStatusMsg('Mencari sinyal GPS akurasi tinggi...');

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = Math.round(position.coords.latitude * 100000) / 100000;
        const lng = Math.round(position.coords.longitude * 100000) / 100000;
        const accuracy = Math.round(position.coords.accuracy);
        const newCoord: [number, number] = [lat, lng];

        setMyGpsLocation(newCoord);
        setGpsAccuracy(accuracy);

        setDrawingPoints((prev) => {
          if (prev.length === 0) {
            setTrackingStatusMsg(`Patok P1 tercatat! (Akurasi GPS: ±${accuracy}m)`);
            return [newCoord];
          }

          const lastPoint = prev[prev.length - 1];
          const dist = calculateDistanceMeters(lastPoint, newCoord);

          // Hanya catat patok baru jika petugas sudah berjalan melebihi batas jarak (contoh: minimal 3 meter)
          if (dist >= minDistanceThreshold) {
            const nextPatokIdx = prev.length + 1;
            setTrackingStatusMsg(`Patok P${nextPatokIdx} tercatat (+${Math.round(dist)}m, Akurasi: ±${accuracy}m)`);
            return [...prev, newCoord];
          }

          setTrackingStatusMsg(`Berjalan di pematang... (${Math.round(dist)}m dari patok terakhir, Akurasi: ±${accuracy}m)`);
          return prev;
        });
      },
      (error) => {
        console.error('GPS Watch Error:', error);
        setIsGpsTracking(false);
        setTrackingStatusMsg('Gagal membaca GPS: ' + error.message);
        showError('GPS Lapangan Terkendala', 'Gagal melacak GPS di smartphone: ' + error.message + '. Pastikan izin Lokasi / GPS telah diaktifkan dengan mode Akurasi Tinggi.');
      },
      {
        enableHighAccuracy: true,
        timeout: 25000,
        maximumAge: 5000,
      }
    );

    setGpsWatchId(watchId);
  };

  // Fungsi Tambah Patok Manual dari Posisi GPS saat ini
  const handleAddCurrentGpsPoint = () => {
    if (!navigator.geolocation) {
      showWarning('GPS Tidak Didukung', 'Browser tidak mendukung Geolocation GPS');
      return;
    }
    const applyPos = (pos: GeolocationPosition) => {
      const lat = Math.round(pos.coords.latitude * 100000) / 100000;
      const lng = Math.round(pos.coords.longitude * 100000) / 100000;
      const accuracy = Math.round(pos.coords.accuracy);
      const newCoord: [number, number] = [lat, lng];
      setMyGpsLocation(newCoord);
      setGpsAccuracy(accuracy);
      setDrawingPoints((prev) => [...prev, newCoord]);
      setTrackingStatusMsg(`Patok P${drawingPoints.length + 1} ditambahkan manual dari GPS (±${accuracy}m)`);
      showToast(`Patok P${drawingPoints.length + 1} tercatat (Akurasi: ±${accuracy}m)`, 'success');
    };

    navigator.geolocation.getCurrentPosition(
      applyPos,
      (err) => {
        // Fallback jika satellite timeout
        if (err.code === 3 || err.code === 2) {
          navigator.geolocation.getCurrentPosition(
            applyPos,
            (fallbackErr) => {
              showError('Titik GPS Gagal', 'Gagal mendapatkan titik GPS: ' + fallbackErr.message);
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
          );
          return;
        }
        showError('Titik GPS Gagal', 'Gagal mendapatkan titik GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 25000, maximumAge: 5000 }
    );
  };

  // Realtime Spatial Calculations
  const currentArea = useMemo(() => calculatePolygonArea(drawingPoints), [drawingPoints]);
  const currentPerimeter = useMemo(() => calculatePolygonPerimeter(drawingPoints), [drawingPoints]);
  const currentSegments = useMemo(() => calculateSegmentLengths(drawingPoints), [drawingPoints]);

  // Realtime Spatial Overlap Check
  const overlapCheck = useMemo(() => {
    if (drawingPoints.length < 3) return { hasOverlap: false, overlappingPlots: [] };
    return checkPolygonOverlap(drawingPoints, lahanList);
  }, [drawingPoints, lahanList]);

  // Marker drag handler untuk edit posisi patok
  const handleMarkerDragEnd = (index: number, e: any) => {
    const latlng = e.target.getLatLng();
    const updated: [number, number] = [
      Math.round(latlng.lat * 100000) / 100000,
      Math.round(latlng.lng * 100000) / 100000,
    ];
    setDrawingPoints((prev) => {
      const copy = [...prev];
      copy[index] = updated;
      return copy;
    });
  };

  const handleRemovePoint = (index: number) => {
    setDrawingPoints((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUndoLastPoint = () => {
    setDrawingPoints((prev) => prev.slice(0, -1));
  };

  const handleFinishDrawing = () => {
    if (drawingPoints.length < 3) {
      showWarning('Titik Belum Cukup', 'Poligon lahan sawah membutuhkan minimal 3 titik batas patok!');
      return;
    }
    if (onPolygonCreated) {
      onPolygonCreated(
        drawingPoints,
        currentArea.luasHa,
        currentArea.luasM2,
        currentPerimeter,
        overlapCheck
      );
    }
  };

  const handleResetDrawing = () => {
    setDrawingPoints([]);
  };

  // Set conflicting plot IDs for highlight
  const overlappingPlotIds = useMemo(
    () => new Set(overlapCheck.overlappingPlots.map((p) => p.id)),
    [overlapCheck]
  );

  return (
    <div className={`relative isolate w-full h-[620px] rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs bg-slate-100 ${isDrawingMode ? 'cursor-crosshair' : ''}`}>
      {/* Floating Control: Pencarian Wilayah / Desa & Pusatkan Lokasi (Saat tidak dalam mode gambar) */}
      {!isDrawingMode && (
        <div className="absolute top-3 left-14 right-14 sm:right-auto z-[400] flex flex-wrap items-center gap-2 max-w-xl">
          {/* Search Box Wilayah / Tempat Global / Koordinat / Desa */}
          <div className="relative flex-1 min-w-0 w-full sm:min-w-[320px] md:min-w-[380px]">
            <form
              onSubmit={handleExternalGeocodeSearch}
              className="flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/90 overflow-hidden"
            >
              <Search className="w-4 h-4 text-emerald-600 ml-3 shrink-0" />
              <input
                type="text"
                value={mapSearchText}
                onFocus={() => setSearchDropdownOpen(true)}
                onChange={(e) => {
                  setMapSearchText(e.target.value);
                  setSearchDropdownOpen(true);
                }}
                placeholder="Cari lokasi global (desa, jalan, kota, koordinat, petak)..."
                className="w-full px-2.5 py-2 text-xs font-medium text-slate-800 bg-transparent focus:outline-none"
              />
              {mapSearchText && (
                <button
                  type="button"
                  onClick={() => {
                    setMapSearchText('');
                    setSearchDropdownOpen(false);
                    setGlobalSearchResults([]);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                disabled={geocodingLoading}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shrink-0 cursor-pointer flex items-center gap-1"
              >
                {geocodingLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mencari...</span>
                  </>
                ) : (
                  'Pusatkan'
                )}
              </button>
            </form>

            {/* Dropdown Hasil Pencarian Global, Koordinat, Desa & Petak Sawah */}
            {searchDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-80 overflow-y-auto z-50 divide-y divide-slate-100 text-xs">
                <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase sticky top-0 z-10 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-3 h-3 text-emerald-600" />
                    <span>Pencarian Lokasi Global & Lembeyan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSearchingGlobal && (
                      <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold normal-case">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Peta Global...
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSearchDropdownOpen(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      Tutup
                    </button>
                  </div>
                </div>

                {/* 1. Hasil Deteksi Koordinat GPS */}
                {parsedCoordinate && (
                  <button
                    type="button"
                    onClick={() => {
                      setInternalFlyTo({
                        lat: parsedCoordinate.lat,
                        lng: parsedCoordinate.lng,
                        zoom: 17,
                        label: `Koordinat [${parsedCoordinate.lat.toFixed(5)}, ${parsedCoordinate.lng.toFixed(5)}]`,
                        keterangan: 'Titik Koordinat Geografis GPS Pengguna',
                        timestamp: Date.now(),
                      });
                      setSearchDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 bg-emerald-50/80 hover:bg-emerald-100 flex items-center justify-between gap-2 transition cursor-pointer"
                  >
                    <div>
                      <div className="font-black text-emerald-900 flex items-center gap-1.5">
                        <Crosshair className="w-4 h-4 text-emerald-600 shrink-0" />
                        Pusatkan ke Titik Koordinat: {parsedCoordinate.lat.toFixed(5)}, {parsedCoordinate.lng.toFixed(5)}
                      </div>
                      <div className="text-[10px] text-emerald-700 pl-5">Klik untuk terbang langsung ke posisi lintang & bujur ini</div>
                    </div>
                    <span className="text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full shrink-0">
                      GPS Koordinat
                    </span>
                  </button>
                )}

                {/* 2. Hasil Wilayah Desa Kecamatan Lembeyan */}
                {localSearchResults.desaMatches.length > 0 && (
                  <>
                    <div className="px-3 py-1 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                      <span>Wilayah Desa (Kec. Lembeyan)</span>
                      <span className="text-[9px] text-slate-400 font-normal">Lokal Cepat</span>
                    </div>
                    {localSearchResults.desaMatches.map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => {
                          setInternalFlyTo({
                            lat: d.lat,
                            lng: d.lng,
                            zoom: d.zoom,
                            label: d.label,
                            keterangan: d.keterangan,
                            timestamp: Date.now(),
                          });
                          setMapSearchText(d.key === 'SEMUA' ? '' : d.label);
                          setSearchDropdownOpen(false);
                          if (onSelectDesaFromMap) {
                            onSelectDesaFromMap(d.key);
                          }
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 flex items-start justify-between gap-2 transition cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            {d.label}
                          </div>
                          <div className="text-[10px] text-slate-500 pl-5">{d.keterangan}</div>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                          {d.lat.toFixed(3)}, {d.lng.toFixed(3)}
                        </span>
                      </button>
                    ))}
                  </>
                )}

                {/* 3. Hasil Pencarian Petak Lahan Sawah & Petani */}
                {localSearchResults.lahanMatches.length > 0 && (
                  <>
                    <div className="px-3 py-1 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                      Petak Lahan Sawah & Petani Cocok
                    </div>
                    {localSearchResults.lahanMatches.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          setInternalFlyTo({
                            lat: l.centerLat,
                            lng: l.centerLng,
                            zoom: 18,
                            label: `${l.kodeLahan} - ${l.namaLahan}`,
                            keterangan: `Milik ${l.petani?.nama || '-'} (${l.luasHa} Ha - ${l.komoditas})`,
                            timestamp: Date.now(),
                          });
                          setSearchDropdownOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-amber-50 flex items-center justify-between gap-2 transition cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-800">
                            {l.kodeLahan} &bull; {l.namaLahan}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Petani: {l.petani?.nama} ({l.luasHa} Ha - {l.komoditas})
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded shrink-0">
                          Fokus Petak
                        </span>
                      </button>
                    ))}
                  </>
                )}

                {/* 4. Hasil Pencarian Global (OpenStreetMap Nominatim) */}
                {globalSearchResults.length > 0 && (
                  <>
                    <div className="px-3 py-1 bg-blue-50/80 text-[10px] font-bold text-blue-800 uppercase flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-blue-600" />
                      <span>Pencarian Tempat, Jalan & Wilayah Global</span>
                    </div>
                    {globalSearchResults.map((hit, idx) => {
                      const title = hit.name || hit.display_name.split(',')[0];
                      const lat = parseFloat(hit.lat);
                      const lon = parseFloat(hit.lon);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            applyGlobalHit(hit);
                            setMapSearchText(title);
                            setSearchDropdownOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-blue-50 flex items-start justify-between gap-2 transition cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                              <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate">{title}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 pl-5 line-clamp-1">
                              {hit.display_name}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                            {lat.toFixed(3)}, {lon.toFixed(3)}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}

                {/* 5. Placeholder jika belum ada hasil langsung */}
                {!parsedCoordinate &&
                  localSearchResults.desaMatches.length === 0 &&
                  localSearchResults.lahanMatches.length === 0 &&
                  globalSearchResults.length === 0 &&
                  mapSearchText.trim().length >= 3 && (
                    <div className="px-4 py-4 text-center text-xs text-slate-500">
                      {isSearchingGlobal ? (
                        <div className="flex items-center justify-center gap-2 text-slate-600">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                          <span>Mencari di peta global...</span>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold text-slate-700">Tidak ada saran instan untuk &quot;{mapSearchText}&quot;</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Klik tombol <strong className="text-emerald-700">Pusatkan</strong> untuk mencari secara luas di seluruh dunia.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Tombol Cepat Pusatkan ke Kecamatan Lembeyan */}
          <button
            type="button"
            onClick={() => {
              const center = DESA_COORDINATES_LEMBEYAN.SEMUA;
              setInternalFlyTo({
                lat: center.lat,
                lng: center.lng,
                zoom: center.zoom,
                label: center.label,
                keterangan: center.keterangan,
                timestamp: Date.now(),
              });
              setMapSearchText('');
              setSearchDropdownOpen(false);
              if (onSelectDesaFromMap) onSelectDesaFromMap('SEMUA');
            }}
            title="Pusatkan Kembali ke Kecamatan Lembeyan"
            className="px-3 py-2 rounded-2xl bg-white/95 hover:bg-emerald-50 text-slate-800 border border-slate-200 shadow-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Compass className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Pusatkan Kec. Lembeyan</span>
          </button>
        </div>
      )}

      {/* Floating Toolbar saat mode gambar aktif */}
      {isDrawingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] max-w-2xl w-[94%] sm:w-auto bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border border-slate-200 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`flex h-2.5 w-2.5 rounded-full ${isGpsTracking ? 'bg-emerald-500 animate-ping' : 'bg-amber-500 animate-ping'}`} />
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Digitasi Batas: <strong className="text-emerald-700">{drawingPoints.length} Patok</strong></span>
                  {isGpsTracking && (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase flex items-center gap-1">
                      <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-600" /> GPS AKTIF
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500">
                  {isGpsTracking
                    ? 'Petugas silakan berjalan mengelilingi pematang sawah'
                    : 'Bisa klik peta langsung ATAU tekan "Mulai Tracking GPS" lalu berjalan'}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 ml-auto">
              {/* Tombol Khusus Smartphone: Tracking GPS Berjalan Keliling Sawah */}
              <button
                type="button"
                onClick={toggleGpsWalkTracking}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                  isGpsTracking
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
                title="Petugas berjalan mengelilingi batas pematang sawah dengan membawa HP"
              >
                {isGpsTracking ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Hentikan Tracking GPS</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mulai Tracking GPS Keliling Sawah</span>
                  </>
                )}
              </button>

              {/* Tombol Tambah Patok dari Posisi GPS saat ini */}
              <button
                type="button"
                onClick={handleAddCurrentGpsPoint}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition flex items-center gap-1"
                title="Ambil titik koordinat GPS saat ini sebagai patok"
              >
                <Crosshair className="w-3 h-3 text-blue-600" />
                <span className="hidden sm:inline">Patok GPS</span>
              </button>

              <button
                onClick={handleUndoLastPoint}
                disabled={drawingPoints.length === 0}
                className="px-2 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition flex items-center gap-1"
                title="Batal titik terakhir"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Undo</span>
              </button>
              <button
                onClick={handleResetDrawing}
                disabled={drawingPoints.length === 0}
                className="px-2 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 transition"
              >
                Reset
              </button>
              <button
                onClick={handleFinishDrawing}
                disabled={drawingPoints.length < 3}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer ${
                  drawingPoints.length >= 3
                    ? overlapCheck.hasOverlap
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Simpan Batas</span>
              </button>
            </div>
          </div>

          {/* Status Bar GPS & Akurasi Smartphone */}
          {(isGpsTracking || trackingStatusMsg) && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-900">
              <div className="flex items-center gap-1.5 font-medium">
                <Navigation className={`w-3.5 h-3.5 text-emerald-600 ${isGpsTracking ? 'animate-bounce' : ''}`} />
                <span>{trackingStatusMsg || 'Melacak pergerakan GPS secara kontinu...'}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                {gpsAccuracy !== null && (
                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-800">
                    Akurasi HP: ±{gpsAccuracy}m
                  </span>
                )}
                <span className="text-slate-500">
                  Ambang Jarak:
                  <select
                    value={minDistanceThreshold}
                    onChange={(e) => setMinDistanceThreshold(Number(e.target.value))}
                    className="ml-1 bg-white border border-slate-200 rounded px-1 text-[10px] font-bold text-slate-700"
                  >
                    <option value={2}>Tiap 2 meter</option>
                    <option value={3}>Tiap 3 meter</option>
                    <option value={5}>Tiap 5 meter</option>
                    <option value={8}>Tiap 8 meter</option>
                  </select>
                </span>
              </div>
            </div>
          )}

          {/* Metrics & Overlap Status Indicator */}
          {drawingPoints.length >= 3 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
              <div className="bg-emerald-50 text-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold flex items-center gap-1">
                <span>Luas Terbentuk:</span>
                <span className="font-mono text-emerald-800">{currentArea.luasHa} Ha</span>
                <span className="text-[10px] text-emerald-600">({currentArea.luasM2.toLocaleString('id-ID')} m²)</span>
              </div>

              <div className="bg-blue-50 text-blue-900 px-2.5 py-1 rounded-lg border border-blue-200 font-semibold flex items-center gap-1">
                <Ruler className="w-3 h-3 text-blue-600" />
                <span>Keliling:</span>
                <span className="font-mono font-bold text-blue-800">{currentPerimeter.toLocaleString('id-ID')} m</span>
              </div>

              {/* Overlap Status Badge */}
              {overlapCheck.hasOverlap ? (
                <div className="bg-red-50 text-red-800 px-2.5 py-1 rounded-lg border border-red-300 font-bold flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>
                    Tumpang Tindih ({overlapCheck.overlappingPlots.length} Lahan: {overlapCheck.overlappingPlots[0]?.kodeLahan})
                  </span>
                </div>
              ) : (
                <div className="bg-emerald-100/70 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-300 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Batas Lahan Bebas Sengketa (Valid)</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Legend Warna Komoditas */}
      <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-200/80 text-xs">
        <div className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          Komoditas Lahan
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-500 border border-green-700 inline-block"></span>
            Padi
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500 border border-amber-700 inline-block"></span>
            Jagung
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-yellow-400 border border-yellow-600 inline-block"></span>
            Kedelai
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-sky-400 border border-sky-600 inline-block"></span>
            Tebu
          </div>
        </div>
      </div>

      <MapContainer
        center={centerPosition}
        zoom={14}
        minZoom={10}
        maxZoom={22}
        scrollWheelZoom={true}
        className={`w-full h-full relative ${isDrawingMode ? 'leaflet-drawing-mode' : ''}`}
      >
        <MapFlyTo selectedLahan={selectedLahan} flyToTarget={activeFlyTo} />

        {/* Marker Titik Pusat Desa / Wilayah yang Dipilih */}
        {activeFlyTo && activeFlyTo.label && (
          <Marker position={[activeFlyTo.lat, activeFlyTo.lng]} icon={desaCenterIcon}>
            <Popup>
              <div className="p-1.5 text-xs space-y-1 max-w-[220px]">
                <div className="font-black text-emerald-800">{activeFlyTo.label}</div>
                {activeFlyTo.keterangan && (
                  <div className="text-[11px] text-slate-600">{activeFlyTo.keterangan}</div>
                )}
                <div className="font-mono text-[10px] text-slate-500">
                  Koordinat: {activeFlyTo.lat.toFixed(5)}, {activeFlyTo.lng.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        <GpsButton onGpsFound={(coords) => setMyGpsLocation(coords)} />

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Google Satellite Hybrid (Satelit + Jalan)">
            <TileLayer
              attribution="&copy; Google Maps &mdash; Citra Satelit Resolusi Sangat Tinggi"
              url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              maxZoom={22}
              maxNativeZoom={20}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Citra Satelit (Esri World Imagery)">
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Citra Satelit Resolusi Tinggi"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={22}
              maxNativeZoom={18}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="OpenStreetMap (Jalan & Peta Wilayah)">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={22}
              maxNativeZoom={19}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <DrawEventsHandler
          isDrawingMode={isDrawingMode}
          drawingPoints={drawingPoints}
          setDrawingPoints={setDrawingPoints}
        />

        {/* Marker GPS Lapangan User */}
        {myGpsLocation && (
          <Marker position={myGpsLocation} icon={gpsIcon}>
            <Popup>
              <div className="p-1 text-xs font-bold text-blue-800">
                Titik GPS Saya di Lapangan
              </div>
            </Popup>
          </Marker>
        )}

        {/* Render polygon yang sedang digambar user */}
        {drawingPoints.length > 0 && (
          <>
            {drawingPoints.map((pt, idx) => (
              <Marker
                key={idx}
                position={pt}
                icon={createPatokIcon(idx)}
                draggable={isDrawingMode}
                eventHandlers={{
                  dragend: (e) => handleMarkerDragEnd(idx, e),
                }}
              >
                <Popup>
                  <div className="p-2 text-xs space-y-1">
                    <div className="font-bold text-slate-800">Patok Batas P{idx + 1}</div>
                    <div className="font-mono text-[11px] text-slate-600">
                      {pt[0].toFixed(5)}, {pt[1].toFixed(5)}
                    </div>
                    {isDrawingMode && (
                      <button
                        onClick={() => handleRemovePoint(idx)}
                        className="text-[10px] text-red-600 font-bold hover:underline flex items-center gap-1 pt-1"
                      >
                        <Trash2 className="w-3 h-3" /> Hapus Patok Ini
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {drawingPoints.length === 2 && (
              <Polyline
                positions={drawingPoints}
                pathOptions={{
                  color: '#059669',
                  weight: 3,
                  dashArray: '6, 6',
                }}
              />
            )}

            {drawingPoints.length >= 3 && (
              <Polygon
                positions={drawingPoints}
                pathOptions={{
                  color: overlapCheck.hasOverlap ? '#dc2626' : '#059669',
                  fillColor: overlapCheck.hasOverlap ? '#ef4444' : '#10b981',
                  fillOpacity: overlapCheck.hasOverlap ? 0.6 : 0.45,
                  weight: overlapCheck.hasOverlap ? 3.5 : 2.5,
                  dashArray: overlapCheck.hasOverlap ? '6, 6' : undefined,
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs font-bold font-sans">
                    {overlapCheck.hasOverlap ? (
                      <span className="text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Peringatan Tumpang Tindih Spasial!
                      </span>
                    ) : (
                      <span className="text-emerald-700">
                        {currentArea.luasHa} Ha ({currentArea.luasM2.toLocaleString('id-ID')} m²)
                      </span>
                    )}
                  </div>
                </Tooltip>
              </Polygon>
            )}
          </>
        )}

        {/* Render poligon lahan tersimpan */}
        {lahanList.map((lahan) => {
          let coords: [number, number][] = [];
          try {
            coords = JSON.parse(lahan.coordinates);
          } catch (e) {
            return null;
          }

          if (!Array.isArray(coords) || coords.length === 0) return null;

          const styling = getPolygonColor(lahan.komoditas);
          const isSelected = selectedLahanId === lahan.id;
          const isConflicting = overlappingPlotIds.has(lahan.id);

          return (
            <Polygon
              key={lahan.id}
              positions={coords}
              interactive={!isDrawingMode}
              pathOptions={{
                color: isConflicting ? '#dc2626' : isSelected ? '#ffffff' : styling.color,
                weight: isConflicting ? 4 : isSelected ? 3.5 : 2.5,
                fillColor: isConflicting ? '#f87171' : styling.fillColor,
                fillOpacity: isConflicting ? 0.75 : isSelected ? 0.8 : 0.5,
                dashArray: isConflicting ? '4, 4' : undefined,
              }}
            >
              {/* Label Permanen di Dalam Kotak Poligon: Nama Petani & Luas Lahan Saja */}
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
                    style={{ color: '#0f172a', fontWeight: 900, fontSize: '12px' }}
                    className="font-black tracking-tight"
                  >
                    {lahan.petani?.nama || lahan.namaLahan || 'Petani'}
                  </div>
                  <div
                    style={{
                      color: '#065f46',
                      backgroundColor: '#d1fae5',
                      border: '1.5px solid #059669',
                      borderRadius: '6px',
                      padding: '1px 8px',
                      marginTop: '3px',
                      display: 'inline-block',
                      fontWeight: 900,
                      fontSize: '11px',
                    }}
                    className="luas-pill font-mono"
                  >
                    {lahan.luasHa} Ha
                  </div>
                </div>
              </Tooltip>

              <Popup>
                <div className="p-3 min-w-[210px] max-w-[250px] font-sans text-center space-y-2">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Petani Pemilik / Penggarap
                    </div>
                    <h4 className="font-black text-slate-900 text-sm mt-0.5">
                      {lahan.petani?.nama || '-'}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {lahan.namaLahan} ({lahan.komoditas})
                    </p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl py-1.5 px-3">
                    <div className="text-[10px] font-semibold text-emerald-700 uppercase">
                      Luas Lahan
                    </div>
                    <div className="text-base font-black text-emerald-900">
                      {lahan.luasHa} Ha{' '}
                      <span className="text-[11px] font-normal text-emerald-700">
                        ({lahan.luasM2.toLocaleString('id-ID')} m²)
                      </span>
                    </div>
                  </div>

                  {isConflicting && (
                    <div className="p-1.5 bg-red-50 text-red-800 border border-red-200 rounded text-[10px] font-bold flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>Tumpang Tindih Spasial!</span>
                    </div>
                  )}

                  {lahan.fotoLahan && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 mt-2 bg-slate-50">
                      <img
                        src={lahan.fotoLahan}
                        alt="Foto Dokumentasi Sawah"
                        className="w-full h-24 object-cover cursor-pointer hover:opacity-90 transition"
                        onClick={() => setSelectedFotoPreview(lahan.fotoLahan || null)}
                      />
                      <div className="text-[9px] text-slate-600 bg-slate-100 py-0.5 text-center font-bold">
                        📸 Klik untuk Perbesar Foto GPS
                      </div>
                    </div>
                  )}

                  <div className="pt-1.5 space-y-1.5">
                    <Link
                      href={`/cek-kuota?tab=kalkulator&lahanId=${lahan.id}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl shadow-xs transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Jadwal Kalender Tanam
                    </Link>
                    <Link
                      href={`/cetak-lahan/${lahan.id}`}
                      target="_blank"
                      className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl shadow-xs transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Cetak Surat Lahan
                    </Link>
                  </div>
                </div>
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>

      {/* Modal Pratinjau Foto Dokumentasi Lahan (GPS Watermark) Full Size */}
      {selectedFotoPreview && (
        <div className="fixed inset-0 z-[4000] bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between text-white">
              <span className="text-xs font-black flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                Dokumentasi Lahan Ber-Watermark GPS Resmi
              </span>
              <button
                type="button"
                onClick={() => setSelectedFotoPreview(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 overflow-auto flex-1 flex items-center justify-center bg-black/40">
              <img
                src={selectedFotoPreview}
                alt="Foto Sawah Watermark GPS"
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>
            <div className="p-3 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setSelectedFotoPreview(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
