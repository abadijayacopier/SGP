import fs from 'fs';
import path from 'path';

export interface KeamananSettings {
  enable2FA: boolean;
  whatsappProvider: 'fonnte' | 'wablas' | 'starsender' | 'custom';
  whatsappApiKey: string;
  whatsappSenderNumber: string;
  emergencyPin: string;
  otpExpiryMinutes: number;
}

export interface SystemSettings {
  instansi: Record<string, any>;
  pupuk: Record<string, any>;
  gis: Record<string, any>;
  dokumen: Record<string, any>;
  integrasi: Record<string, any>;
  notifikasi: Record<string, any>;
  keamanan: KeamananSettings;
}

const primaryFilePath = path.join(process.cwd(), 'src', 'data', 'pengaturan-sistem.json');
const tmpFilePath = path.join('/tmp', 'pengaturan-sistem.json');
const publicFilePath = path.join(process.cwd(), 'public', 'pengaturan-sistem.json');

const globalForSettings = globalThis as unknown as {
  __appSettings: SystemSettings | undefined;
};

export const defaultSettings: SystemSettings = {
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
    nipKoordinatorBpp: 'NIP. 19850412 201101 2 008',
    namaMantriTani: 'MANTRI TANI',
    nipMantriTani: 'NIP. 19760814 200212 1 002',
  },
  integrasi: {
    googleSheetWebhookUrl: 'https://script.google.com/macros/s/AKfycbzp-osiTcBJeq2OMUuWVSvv9Icx6SYlWf0gV0CIqdWTjEjTmud2qMkQGulgHe0NW8FiUg/exec',
    googleSheetWebhookUrlErdkk: 'https://script.google.com/macros/s/AKfycbzp-osiTcBJeq2OMUuWVSvv9Icx6SYlWf0gV0CIqdWTjEjTmud2qMkQGulgHe0NW8FiUg/exec',
    googleSheetWebhookUrlPenyaluran: 'https://script.google.com/macros/s/AKfycbzp-osiTcBJeq2OMUuWVSvv9Icx6SYlWf0gV0CIqdWTjEjTmud2qMkQGulgHe0NW8FiUg/exec',
    autoSyncOnTransaction: true,
    autoSyncTime: '18:00',
    kementanApiKey: '',
  },
  notifikasi: {
    alertStokMenipisPersen: 20,
    peringatanBatasTebusHari: 7,
    notifikasiPengajuanBaru: true,
  },
  keamanan: {
    enable2FA: false, // Default NONAKTIF
    whatsappProvider: 'fonnte',
    whatsappApiKey: '',
    whatsappSenderNumber: '',
    emergencyPin: '123456',
    otpExpiryMinutes: 5,
  },
};

export function mergeWithDefaults(parsed: any): SystemSettings {
  return {
    ...defaultSettings,
    ...parsed,
    instansi: { ...defaultSettings.instansi, ...(parsed?.instansi || {}) },
    pupuk: { ...defaultSettings.pupuk, ...(parsed?.pupuk || {}) },
    gis: { ...defaultSettings.gis, ...(parsed?.gis || {}) },
    dokumen: { ...defaultSettings.dokumen, ...(parsed?.dokumen || {}) },
    integrasi: { ...defaultSettings.integrasi, ...(parsed?.integrasi || {}) },
    notifikasi: { ...defaultSettings.notifikasi, ...(parsed?.notifikasi || {}) },
    keamanan: { ...defaultSettings.keamanan, ...(parsed?.keamanan || {}) },
  };
}

export function getSystemSettings(): SystemSettings {
  try {
    if (globalForSettings.__appSettings) {
      return mergeWithDefaults(globalForSettings.__appSettings);
    }

    if (fs.existsSync(tmpFilePath)) {
      try {
        const raw = fs.readFileSync(tmpFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        globalForSettings.__appSettings = mergeWithDefaults(parsed);
        return globalForSettings.__appSettings;
      } catch {}
    }

    if (fs.existsSync(primaryFilePath)) {
      try {
        const raw = fs.readFileSync(primaryFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        globalForSettings.__appSettings = mergeWithDefaults(parsed);
        return globalForSettings.__appSettings;
      } catch {}
    }

    if (fs.existsSync(publicFilePath)) {
      try {
        const raw = fs.readFileSync(publicFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        globalForSettings.__appSettings = mergeWithDefaults(parsed);
        return globalForSettings.__appSettings;
      } catch {}
    }

    return defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSystemSettings(newSettings: Partial<SystemSettings>): SystemSettings {
  const merged = mergeWithDefaults(newSettings);
  globalForSettings.__appSettings = merged;

  const content = JSON.stringify(merged, null, 2);

  try {
    const dir = path.dirname(primaryFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(primaryFilePath, content, 'utf-8');
  } catch {}

  try {
    const pubDir = path.dirname(publicFilePath);
    if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
    fs.writeFileSync(publicFilePath, content, 'utf-8');
  } catch {}

  try {
    fs.writeFileSync(tmpFilePath, content, 'utf-8');
  } catch {}

  return merged;
}
