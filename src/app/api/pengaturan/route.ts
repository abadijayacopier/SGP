import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const settingsFilePath = path.join(process.cwd(), 'src', 'data', 'pengaturan-sistem.json');

const defaultSettings = {
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
    nipKoordinatorBpp: '19780512 200501 2 008',
    namaMantriTani: 'Ir. Hendro Supriyanto',
    nipMantriTani: '19820315 200801 1 012',
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
};

function readSettings() {
  try {
    if (!fs.existsSync(settingsFilePath)) {
      const dir = path.dirname(settingsFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(settingsFilePath, JSON.stringify(defaultSettings, null, 2), 'utf-8');
      return defaultSettings;
    }
    const content = fs.readFileSync(settingsFilePath, 'utf-8');
    const parsed = JSON.parse(content);
    return {
      ...defaultSettings,
      ...parsed,
      instansi: { ...defaultSettings.instansi, ...(parsed.instansi || {}) },
      pupuk: { ...defaultSettings.pupuk, ...(parsed.pupuk || {}) },
      gis: { ...defaultSettings.gis, ...(parsed.gis || {}) },
      dokumen: { ...defaultSettings.dokumen, ...(parsed.dokumen || {}) },
      integrasi: { ...defaultSettings.integrasi, ...(parsed.integrasi || {}) },
      notifikasi: { ...defaultSettings.notifikasi, ...(parsed.notifikasi || {}) },
    };
  } catch (e) {
    return defaultSettings;
  }
}

function writeSettings(data: any) {
  try {
    const dir = path.dirname(settingsFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(settingsFilePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Error writing settings:', e);
    return false;
  }
}

export async function GET() {
  try {
    const settings = readSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const current = readSettings();

    const updated = {
      ...current,
      ...body,
      instansi: { ...current.instansi, ...(body.instansi || {}) },
      pupuk: { ...current.pupuk, ...(body.pupuk || {}) },
      gis: { ...current.gis, ...(body.gis || {}) },
      dokumen: { ...current.dokumen, ...(body.dokumen || {}) },
      integrasi: { ...current.integrasi, ...(body.integrasi || {}) },
      notifikasi: { ...current.notifikasi, ...(body.notifikasi || {}) },
    };

    const ok = writeSettings(updated);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Gagal menulis file pengaturan' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Pengaturan sistem berhasil disimpan!',
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
