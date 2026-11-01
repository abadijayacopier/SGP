'use client';

export interface OfflineSurveyItem {
  id: string;
  namaLahan: string;
  petaniId: string;
  petaniNama: string;
  poktanNama?: string;
  komoditas: string;
  coordinates: [number, number][];
  luasHa: number;
  luasM2: number;
  nomorPipil?: string;
  statusKepemilikan?: string;
  statusIrigasi?: string;
  catatan?: string;
  recordedAt: string;
  gpsAccuracy?: number;
  fotoLahan?: string | null;
  syncStatus: 'PENDING' | 'SYNCING' | 'FAILED' | 'SUCCESS';
  syncError?: string;
}

const STORAGE_KEY_SURVEYS = 'gis_lembeyan_offline_surveys_v1';
const STORAGE_KEY_PETANI = 'gis_lembeyan_cached_petani_v1';
const STORAGE_KEY_MAP_TILES = 'gis_lembeyan_offline_tiles_v1';

export function getOfflineSurveys(): OfflineSurveyItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SURVEYS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Gagal membaca antrean offline surveys:', e);
    return [];
  }
}

export function saveOfflineSurvey(
  item: Omit<OfflineSurveyItem, 'id' | 'recordedAt' | 'syncStatus'>
): OfflineSurveyItem {
  const surveys = getOfflineSurveys();
  const newSurvey: OfflineSurveyItem = {
    ...item,
    id: 'offline-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    recordedAt: new Date().toISOString(),
    syncStatus: 'PENDING',
  };

  surveys.unshift(newSurvey);
  try {
    localStorage.setItem(STORAGE_KEY_SURVEYS, JSON.stringify(surveys));
    // Trigger custom event agar komponen UI langsung update
    window.dispatchEvent(new Event('offline-surveys-changed'));
  } catch (e) {
    console.error('Gagal menyimpan offline survey:', e);
  }
  return newSurvey;
}

export function deleteOfflineSurvey(id: string): void {
  const surveys = getOfflineSurveys().filter((s) => s.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY_SURVEYS, JSON.stringify(surveys));
    window.dispatchEvent(new Event('offline-surveys-changed'));
  } catch (e) {
    console.error('Gagal menghapus offline survey:', e);
  }
}

export function updateOfflineSurveyStatus(
  id: string,
  syncStatus: OfflineSurveyItem['syncStatus'],
  syncError?: string
): void {
  const surveys = getOfflineSurveys().map((s) => {
    if (s.id === id) {
      return { ...s, syncStatus, syncError };
    }
    return s;
  });
  try {
    localStorage.setItem(STORAGE_KEY_SURVEYS, JSON.stringify(surveys));
    window.dispatchEvent(new Event('offline-surveys-changed'));
  } catch (e) {
    console.error('Gagal update offline survey:', e);
  }
}

export function clearCompletedSurveys(): void {
  const remaining = getOfflineSurveys().filter((s) => s.syncStatus !== 'SUCCESS');
  try {
    localStorage.setItem(STORAGE_KEY_SURVEYS, JSON.stringify(remaining));
    window.dispatchEvent(new Event('offline-surveys-changed'));
  } catch (e) {
    console.error('Gagal membersihkan survei sukses:', e);
  }
}

export async function syncSingleOfflineSurvey(item: OfflineSurveyItem): Promise<{
  success: boolean;
  message?: string;
  data?: any;
}> {
  updateOfflineSurveyStatus(item.id, 'SYNCING');

  try {
    const payload = {
      namaLahan: item.namaLahan,
      petaniId: item.petaniId,
      petaniNama: item.petaniNama,
      komoditas: item.komoditas,
      kabupaten: 'Magetan',
      coordinates: item.coordinates,
      statusKepemilikan: item.statusKepemilikan || 'Milik Sendiri',
      statusIrigasi: item.statusIrigasi || 'Irigasi Teknis',
      nomorPipil: item.nomorPipil || '',
      fotoLahan: item.fotoLahan || undefined,
      forceOverride: true,
    };

    const res = await fetch('/api/lahan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (json.success) {
      updateOfflineSurveyStatus(item.id, 'SUCCESS');
      return { success: true, data: json.data };
    } else {
      updateOfflineSurveyStatus(item.id, 'FAILED', json.error || 'Server menolak data.');
      return { success: false, message: json.error };
    }
  } catch (err: any) {
    updateOfflineSurveyStatus(item.id, 'FAILED', err.message || 'Gagal koneksi server.');
    return { success: false, message: err.message };
  }
}

export async function syncAllOfflineSurveys(): Promise<{
  total: number;
  successCount: number;
  failedCount: number;
}> {
  const surveys = getOfflineSurveys().filter((s) => s.syncStatus !== 'SUCCESS');
  let successCount = 0;
  let failedCount = 0;

  for (const survey of surveys) {
    const res = await syncSingleOfflineSurvey(survey);
    if (res.success) {
      successCount++;
    } else {
      failedCount++;
    }
  }

  return {
    total: surveys.length,
    successCount,
    failedCount,
  };
}

// Cache Petani List untuk saat offline di sawah
export function cachePetaniList(list: any[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PETANI, JSON.stringify(list));
  } catch (e) {}
}

export function getCachedPetaniList(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PETANI);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
