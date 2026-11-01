import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  generateAutoSignatureSvg,
  generateOfficialStampSvg,
} from '@/lib/signature-utils';

const primaryFilePath = path.join(process.cwd(), 'src', 'data', 'kepala-desa.json');
const tmpFilePath = path.join('/tmp', 'kepala-desa.json');
const publicFilePath = path.join(process.cwd(), 'public', 'kepala-desa.json');

const globalForKades = globalThis as unknown as {
  __kadesData: any[] | undefined;
};

const DEFAULT_KADES = [
  {
    id: 'kades-kediren',
    desa: 'Kediren',
    nama: 'Dwi Santoso, S.Sos',
    jabatan: 'Kepala Desa Kediren',
    nip: 'NIP. 19740512 200701 1 014',
    kontak: '081234567001',
    alamat: 'Kantor Desa Kediren, Kec. Lembeyan',
  },
  {
    id: 'kades-lembeyankulon',
    desa: 'Lembeyan Kulon',
    nama: 'Bambang Sutrisno, S.E',
    jabatan: 'Kepala Kelurahan Lembeyan Kulon',
    nip: 'NIP. 19780214 200801 1 022',
    kontak: '081234567002',
    alamat: 'Kantor Kelurahan Lembeyan Kulon, Kec. Lembeyan',
  },
  {
    id: 'kades-lembeyanwetan',
    desa: 'Lembeyan Wetan',
    nama: 'Sri Wahyuni, S.Pd',
    jabatan: 'Kepala Desa Lembeyan Wetan',
    nip: 'NIP. -',
    kontak: '081234567003',
    alamat: 'Kantor Desa Lembeyan Wetan, Kec. Lembeyan',
  },
  {
    id: 'kades-dukuh',
    desa: 'Dukuh',
    nama: 'Sugeng Riyadi',
    jabatan: 'Kepala Desa Dukuh',
    nip: 'NIP. -',
    kontak: '081234567004',
    alamat: 'Kantor Desa Dukuh, Kec. Lembeyan',
  },
  {
    id: 'kades-nguri',
    desa: 'Nguri',
    nama: 'Sunarto, S.Sos',
    jabatan: 'Kepala Desa Nguri',
    nip: 'NIP. 19720311 200604 1 018',
    kontak: '081234567005',
    alamat: 'Kantor Desa Nguri, Kec. Lembeyan',
  },
  {
    id: 'kades-tapen',
    desa: 'Tapen',
    nama: 'Slamet Mulyadi',
    jabatan: 'Kepala Desa Tapen',
    nip: 'NIP. -',
    kontak: '081234567006',
    alamat: 'Kantor Desa Tapen, Kec. Lembeyan',
  },
  {
    id: 'kades-tunggur',
    desa: 'Tunggur',
    nama: 'Sukamto',
    jabatan: 'Kepala Desa Tunggur',
    nip: 'NIP. -',
    kontak: '081234567007',
    alamat: 'Kantor Desa Tunggur, Kec. Lembeyan',
  },
  {
    id: 'kades-pupus',
    desa: 'Pupus',
    nama: 'Suparno, S.IP',
    jabatan: 'Kepala Desa Pupus',
    nip: 'NIP. 19790615 200902 1 007',
    kontak: '081234567008',
    alamat: 'Kantor Desa Pupus, Kec. Lembeyan',
  },
  {
    id: 'kades-kedungpanji',
    desa: 'Kedungpanji',
    nama: 'Eko Wahyudi',
    jabatan: 'Kepala Desa Kedungpanji',
    nip: 'NIP. -',
    kontak: '081234567009',
    alamat: 'Kantor Desa Kedungpanji, Kec. Lembeyan',
  },
  {
    id: 'kades-krowe',
    desa: 'Krowe',
    nama: 'Agus Setiawan',
    jabatan: 'Kepala Desa Krowe',
    nip: 'NIP. -',
    kontak: '081234567010',
    alamat: 'Kantor Desa Krowe, Kec. Lembeyan',
  },
];

function readKadesData(): any[] {
  if (globalForKades.__kadesData && Array.isArray(globalForKades.__kadesData) && globalForKades.__kadesData.length > 0) {
    return globalForKades.__kadesData;
  }

  const candidatePaths = [
    primaryFilePath,
    tmpFilePath,
    publicFilePath,
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          globalForKades.__kadesData = parsed;
          return parsed;
        }
      }
    } catch {}
  }

  globalForKades.__kadesData = DEFAULT_KADES;
  return DEFAULT_KADES;
}

function writeKadesData(data: any[]) {
  globalForKades.__kadesData = data;

  const targets = [primaryFilePath, tmpFilePath, publicFilePath];
  for (const t of targets) {
    try {
      const dir = path.dirname(t);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(t, JSON.stringify(data, null, 2), 'utf8');
    } catch {
      // Abaikan error pada sistem read-only Vercel Serverless
    }
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterDesa = searchParams.get('desa');

    const list = readKadesData();
    let withSignatures = list.map((item: any) => ({
      ...item,
      signatureUrl: item.signatureUrl || generateAutoSignatureSvg(item.nama),
      stampUrl: item.stampUrl || generateOfficialStampSvg('KADES', item.desa),
    }));

    if (filterDesa && filterDesa.trim() !== '') {
      const q = filterDesa.trim().toLowerCase().replace(/^(desa|kelurahan)\s+/i, '');
      withSignatures = withSignatures.filter((item: any) => {
        const d = item.desa.toLowerCase().replace(/^(desa|kelurahan)\s+/i, '');
        return d.includes(q) || q.includes(d);
      });
    }

    return NextResponse.json({ success: true, data: withSignatures });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      desa,
      nama,
      jabatan,
      nip,
      kontak,
      alamat,
      signatureUrl,
      stampUrl,
      userRole,
      userDesa,
    } = body;

    if (!desa || !nama) {
      return NextResponse.json(
        { success: false, error: 'Desa dan Nama Kepala Desa wajib diisi.' },
        { status: 400 }
      );
    }

    // Validasi Hak Akses: Kelompok Tani (POKTAN) hanya boleh mengubah Kepala Desa di desanya sendiri
    if (userRole === 'POKTAN' && userDesa) {
      const cleanUserDesa = userDesa.toLowerCase().replace(/^(desa|kelurahan)\s+/i, '').replace(/,\s*kec.*$/i, '').trim();
      const cleanTargetDesa = desa.toLowerCase().replace(/^(desa|kelurahan)\s+/i, '').trim();

      if (!cleanUserDesa.includes(cleanTargetDesa) && !cleanTargetDesa.includes(cleanUserDesa)) {
        return NextResponse.json(
          {
            success: false,
            error: `Akses ditolak: Akun Kelompok Tani hanya berwenang memperbarui data Kepala Desa untuk desa Anda (${userDesa}), bukan ${desa}.`,
          },
          { status: 403 }
        );
      }
    }

    const currentList = readKadesData();
    const cleanDesaTarget = desa.trim().toLowerCase().replace(/^(desa|kelurahan)\s+/i, '');

    const index = currentList.findIndex((item: any) => {
      const d = item.desa.toLowerCase().replace(/^(desa|kelurahan)\s+/i, '');
      return d === cleanDesaTarget;
    });

    if (index >= 0) {
      currentList[index] = {
        ...currentList[index],
        nama: nama.trim(),
        jabatan: jabatan?.trim() || currentList[index].jabatan || `Kepala Desa ${desa}`,
        nip: nip ? (nip.startsWith('NIP.') ? nip.trim() : `NIP. ${nip.trim()}`) : 'NIP. -',
        kontak: kontak?.trim() || currentList[index].kontak || '',
        alamat: alamat?.trim() || currentList[index].alamat || '',
        signatureUrl: signatureUrl || currentList[index].signatureUrl,
        stampUrl: stampUrl || currentList[index].stampUrl,
        updatedAt: new Date().toISOString(),
      };
    } else {
      currentList.push({
        id: `kades-${cleanDesaTarget.replace(/\s+/g, '')}`,
        desa: desa.trim(),
        nama: nama.trim(),
        jabatan: jabatan?.trim() || `Kepala Desa ${desa}`,
        nip: nip ? (nip.startsWith('NIP.') ? nip.trim() : `NIP. ${nip.trim()}`) : 'NIP. -',
        kontak: kontak?.trim() || '',
        alamat: alamat?.trim() || '',
        signatureUrl: signatureUrl || generateAutoSignatureSvg(nama),
        stampUrl: stampUrl || generateOfficialStampSvg('KADES', desa),
        updatedAt: new Date().toISOString(),
      });
    }

    writeKadesData(currentList);

    return NextResponse.json({
      success: true,
      message: `Data Kepala Desa ${desa} berhasil disimpan!`,
      data: currentList,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
