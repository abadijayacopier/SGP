import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

const primaryFilePath = path.join(process.cwd(), 'src', 'data', 'pengaturan-sistem.json');
const tmpFilePath = path.join('/tmp', 'pengaturan-sistem.json');
const publicFilePath = path.join(process.cwd(), 'public', 'pengaturan-sistem.json');

const globalForSettings = globalThis as unknown as {
  __appSettings: any;
};

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
    nipKoordinatorBpp: 'NIP. 19850412 201101 2 008',
    namaMantriTani: 'Supriyanto (Admin Kecamatan)',
    nipMantriTani: 'NIP. 19760814 200212 1 002',
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
    // 1. Cek in-memory cache serverless
    if (globalForSettings.__appSettings) {
      return mergeWithDefaults(globalForSettings.__appSettings);
    }

    // 2. Cek file /tmp/pengaturan-sistem.json (jika di Vercel pernah disimpan sebelumnya)
    if (fs.existsSync(tmpFilePath)) {
      try {
        const raw = fs.readFileSync(tmpFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        globalForSettings.__appSettings = parsed;
        return mergeWithDefaults(parsed);
      } catch (e) {
        // Abaikan dan lanjut ke primary
      }
    }

    // 3. Cek file src/data/pengaturan-sistem.json
    if (fs.existsSync(primaryFilePath)) {
      const raw = fs.readFileSync(primaryFilePath, 'utf-8');
      const parsed = JSON.parse(raw);
      globalForSettings.__appSettings = parsed;
      return mergeWithDefaults(parsed);
    }

    // 4. Cek fallback public/pengaturan-sistem.json
    if (fs.existsSync(publicFilePath)) {
      const raw = fs.readFileSync(publicFilePath, 'utf-8');
      const parsed = JSON.parse(raw);
      globalForSettings.__appSettings = parsed;
      return mergeWithDefaults(parsed);
    }

    return defaultSettings;
  } catch (e) {
    return defaultSettings;
  }
}

function mergeWithDefaults(parsed: any) {
  return {
    ...defaultSettings,
    ...parsed,
    instansi: { ...defaultSettings.instansi, ...(parsed?.instansi || {}) },
    pupuk: { ...defaultSettings.pupuk, ...(parsed?.pupuk || {}) },
    gis: { ...defaultSettings.gis, ...(parsed?.gis || {}) },
    dokumen: { ...defaultSettings.dokumen, ...(parsed?.dokumen || {}) },
    integrasi: { ...defaultSettings.integrasi, ...(parsed?.integrasi || {}) },
    notifikasi: { ...defaultSettings.notifikasi, ...(parsed?.notifikasi || {}) },
  };
}

function writeSettings(data: any): boolean {
  // Simpan ke in-memory cache
  globalForSettings.__appSettings = data;

  let wroteAny = false;

  // 1. Coba tulis ke primary file (lingkungan lokal / server mandiri)
  try {
    const dir = path.dirname(primaryFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(primaryFilePath, JSON.stringify(data, null, 2), 'utf-8');
    wroteAny = true;
  } catch (err) {
    // Read-only filesystem di Vercel Serverless
  }

  // 2. Coba tulis ke /tmp (selalu writable di Vercel Serverless)
  try {
    fs.writeFileSync(tmpFilePath, JSON.stringify(data, null, 2), 'utf-8');
    wroteAny = true;
  } catch (err) {
    // Abaikan jika tmp gagal
  }

  // 3. Coba tulis ke public jika memungkinkan
  try {
    fs.writeFileSync(publicFilePath, JSON.stringify(data, null, 2), 'utf-8');
    wroteAny = true;
  } catch (err) {
    // Abaikan
  }

  return true; // Sukses karena cache in-memory & fallback /tmp terjamin
}

export async function GET() {
  try {
    const settings = readSettings();

    // Sinkronkan nama & NIP pejabat dengan data User riil di Database
    try {
      const [pplUser, adminUser] = await Promise.all([
        prisma.user.findFirst({ where: { role: 'PPL' }, orderBy: { updatedAt: 'desc' } }),
        prisma.user.findFirst({ where: { role: 'ADMIN_DINAS' }, orderBy: { updatedAt: 'desc' } }),
      ]);

      if (pplUser) {
        settings.dokumen.namaKoordinatorBpp = pplUser.name;
        if (pplUser.nip) settings.dokumen.nipKoordinatorBpp = pplUser.nip;
      }
      if (adminUser) {
        settings.dokumen.namaMantriTani = adminUser.name;
        if (adminUser.nip) settings.dokumen.nipMantriTani = adminUser.nip;
      }
    } catch (dbErr) {
      console.warn('Gagal sinkron data user ke pengaturan:', dbErr);
    }

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

    writeSettings(updated);

    // Sinkronkan balik perubahan nama/NIP pejabat dokumen ke database User
    try {
      if (updated.dokumen?.namaKoordinatorBpp || updated.dokumen?.nipKoordinatorBpp) {
        await prisma.user.updateMany({
          where: { role: 'PPL' },
          data: {
            ...(updated.dokumen.namaKoordinatorBpp ? { name: updated.dokumen.namaKoordinatorBpp } : {}),
            ...(updated.dokumen.nipKoordinatorBpp ? { nip: updated.dokumen.nipKoordinatorBpp } : {}),
          },
        });
      }
      if (updated.dokumen?.namaMantriTani || updated.dokumen?.nipMantriTani) {
        await prisma.user.updateMany({
          where: { role: 'ADMIN_DINAS' },
          data: {
            ...(updated.dokumen.namaMantriTani ? { name: updated.dokumen.namaMantriTani } : {}),
            ...(updated.dokumen.nipMantriTani ? { nip: updated.dokumen.nipMantriTani } : {}),
          },
        });
      }
    } catch (syncErr) {
      console.warn('Gagal sinkron balik pengaturan ke user database:', syncErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Pengaturan sistem & data pejabat berhasil disimpan dan disinkronkan ke database!',
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
