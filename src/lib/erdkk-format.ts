// Utilitas Standar Format e-RDKK Kementerian Pertanian RI
// Kecamatan Lembeyan, Kabupaten Magetan
// Developer: Supriyanto Abadi Jaya

export const DESA_LEMBEYAN_LIST = [
  'Kediren',
  'Lembeyan Kulon',
  'Lembeyan Wetan',
  'Dukuh',
  'Nguri',
  'Tapen',
  'Tunggur',
  'Pupus',
  'Kedungpanji',
  'Krowe',
];

export interface WilayahDesaCoord {
  key: string;
  label: string;
  lat: number;
  lng: number;
  zoom: number;
  keterangan: string;
}

export const DESA_COORDINATES_LEMBEYAN: Record<string, WilayahDesaCoord> = {
  SEMUA: {
    key: 'SEMUA',
    label: 'Pusat Kecamatan Lembeyan (BPP)',
    lat: -7.7565,
    lng: 111.3888,
    zoom: 14,
    keterangan: 'Pusat Koordinasi Pemetaan Pertanian Kecamatan Lembeyan, Kab. Magetan',
  },
  Kediren: {
    key: 'Kediren',
    label: 'Desa Kediren',
    lat: -7.7599,
    lng: 111.3739,
    zoom: 16,
    keterangan: 'Sentra Sawah Irigasi Teknis & Jagung Krajan (Poktan Tani Makmur I)',
  },
  'Lembeyan Kulon': {
    key: 'Lembeyan Kulon',
    label: 'Kel. Lembeyan Kulon',
    lat: -7.7566,
    lng: 111.3888,
    zoom: 16,
    keterangan: 'Pusat Pemerintahan Kecamatan & Hamparan Sawah Lembeyan Kulon',
  },
  'Lembeyan Wetan': {
    key: 'Lembeyan Wetan',
    label: 'Desa Lembeyan Wetan',
    lat: -7.7689,
    lng: 111.3978,
    zoom: 16,
    keterangan: 'Hamparan Sawah Irigasi & Tegalan Lembeyan Wetan',
  },
  Dukuh: {
    key: 'Dukuh',
    label: 'Desa Dukuh',
    lat: -7.7691,
    lng: 111.4425,
    zoom: 16,
    keterangan: 'Wilayah Pertanian Padi & Palawija Desa Dukuh',
  },
  Nguri: {
    key: 'Nguri',
    label: 'Desa Nguri',
    lat: -7.7445,
    lng: 111.4246,
    zoom: 16,
    keterangan: 'Hamparan Pertanian Utara Desa Nguri, Kec. Lembeyan',
  },
  Tapen: {
    key: 'Tapen',
    label: 'Desa Tapen',
    lat: -7.7412,
    lng: 111.3888,
    zoom: 16,
    keterangan: 'Sentra Perkebunan Tebu & Lahan Kering Desa Tapen (Poktan Karya Bersama)',
  },
  Tunggur: {
    key: 'Tunggur',
    label: 'Desa Tunggur',
    lat: -7.7700,
    lng: 111.4246,
    zoom: 16,
    keterangan: 'Sentra Kedelai & Padi Sawah Desa Tunggur (Poktan Sumber Rejeki II)',
  },
  Pupus: {
    key: 'Pupus',
    label: 'Desa Pupus',
    lat: -7.7403,
    lng: 111.4067,
    zoom: 16,
    keterangan: 'Wilayah Pertanian Selatan Desa Pupus, Kec. Lembeyan',
  },
  Kedungpanji: {
    key: 'Kedungpanji',
    label: 'Desa Kedungpanji',
    lat: -7.7459,
    lng: 111.4455,
    zoom: 16,
    keterangan: 'Wilayah Pertanian Barat Laut Desa Kedungpanji, Kec. Lembeyan',
  },
  Krowe: {
    key: 'Krowe',
    label: 'Desa Krowe',
    lat: -7.7265,
    lng: 111.3769,
    zoom: 16,
    keterangan: 'Wilayah Pertanian Utara Desa Krowe, Kec. Lembeyan',
  },
};

export interface LembeyanPoi {
  id: string;
  name: string;
  kategori: string;
  alamat: string;
  lat: number;
  lng: number;
  zoom?: number;
  icon?: string;
  keywords?: string[];
}

export const LEMBEYAN_POI_LIST: LembeyanPoi[] = [
  {
    id: 'poi-fotocopy-abadi-jaya',
    name: 'Fotocopy Abadi Jaya',
    kategori: 'Toko Fotokopi, Percetakan & ATK',
    alamat: 'Jl. Lembeyan - Parang, Lembeyan Kulon, Kec. Lembeyan, Kab. Magetan',
    lat: -7.753439,
    lng: 111.38198,
    zoom: 18,
    icon: '🖨️',
    keywords: ['fotocopy', 'fotokopi', 'foto copy', 'foto kopi', 'abadi jaya', 'copier', 'print', 'percetakan', 'atk', 'toko fotokopi'],
  },
  {
    id: 'poi-bpp-lembeyan',
    name: 'Balai Penyuluhan Pertanian (BPP) Lembeyan',
    kategori: 'Pusat Koordinasi Pertanian & e-RDKK',
    alamat: 'Kediren, Kec. Lembeyan, Kab. Magetan',
    lat: -7.7685,
    lng: 111.4225,
    zoom: 17,
    icon: '🌾',
  },
  {
    id: 'poi-kantor-camat-lembeyan',
    name: 'Kantor Kecamatan Lembeyan',
    kategori: 'Pusat Pemerintahan Kecamatan',
    alamat: 'Jl. Raya Lembeyan, Lembeyan Kulon, Kec. Lembeyan',
    lat: -7.7728,
    lng: 111.4190,
    zoom: 17,
    icon: '🏛️',
  },
  {
    id: 'poi-pasar-lembeyan',
    name: 'Pasar Tradisional Lembeyan',
    kategori: 'Pusat Perdagangan & Pasar',
    alamat: 'Lembeyan Kulon, Kec. Lembeyan, Kab. Magetan',
    lat: -7.7738,
    lng: 111.4208,
    zoom: 17,
    icon: '🛒',
  },
  {
    id: 'poi-puskesmas-lembeyan',
    name: 'Puskesmas Lembeyan',
    kategori: 'Fasilitas Kesehatan Masyarakat',
    alamat: 'Lembeyan Kulon, Kec. Lembeyan, Kab. Magetan',
    lat: -7.7712,
    lng: 111.4182,
    zoom: 17,
    icon: '🏥',
  },
];

export interface ErdkkRowData {
  no: number;
  kabupaten: string;
  kecamatan: string;
  desa: string;
  namaPoktan: string;
  kodeKios: string;
  namaKios: string;
  namaPpl: string;
  nik: string;
  namaPetani: string;
  tempatLahir: string;
  tanggalLahir: string;
  namaIbuKandung: string;
  alamat: string;
  subsektor: string;
  komoditas: string;
  luasHa: number;
  ureaMt1: number;
  npkMt1: number;
  organikMt1: number;
  ureaMt2: number;
  npkMt2: number;
  organikMt2: number;
  ureaMt3: number;
  npkMt3: number;
  organikMt3: number;
  totalUrea: number;
  totalNpk: number;
  totalOrganik: number;
  status: string;
  nomorPengajuan?: string;
}

/**
 * Mengonversi daftar PengajuanLahan menjadi baris standar 25 kolom e-RDKK Kementan
 */
export function mapPengajuanToErdkkRows(
  pengajuanList: any[],
  namaPplDefault = 'Iis Sugiarti, S.P'
): ErdkkRowData[] {
  return pengajuanList.map((item, idx) => {
    const luas = Number(item.luasHa || 0);
    // Proporsi MT1 (40%), MT2 (40%), MT3 (20%) sesuai standar alokasi tahunan
    const totalUrea = Number(item.usulanUreaKg || Math.round(luas * 250));
    const totalNpk = Number(item.usulanNpkKg || Math.round(luas * 250));
    const totalOrganik = Number(item.usulanOrganikKg || Math.round(luas * 500));

    const ureaMt1 = Math.round(totalUrea * 0.4);
    const ureaMt2 = Math.round(totalUrea * 0.4);
    const ureaMt3 = Math.max(0, totalUrea - ureaMt1 - ureaMt2);

    const npkMt1 = Math.round(totalNpk * 0.4);
    const npkMt2 = Math.round(totalNpk * 0.4);
    const npkMt3 = Math.max(0, totalNpk - npkMt1 - npkMt2);

    const organikMt1 = Math.round(totalOrganik * 0.4);
    const organikMt2 = Math.round(totalOrganik * 0.4);
    const organikMt3 = Math.max(0, totalOrganik - organikMt1 - organikMt2);

    return {
      no: idx + 1,
      kabupaten: item.kabupaten || item.petani?.kabupaten || 'Magetan',
      kecamatan: item.kecamatan || item.petani?.kecamatan || 'Lembeyan',
      desa: item.desa || item.petani?.desa || 'Kediren',
      namaPoktan: item.poktan?.nama || 'Poktan Tani Makmur I',
      kodeKios: 'KPL-LBY-001',
      namaKios: 'UD. Tani Subur',
      namaPpl: item.diverifikasiOleh || item.verifikatorPpl || namaPplDefault,
      nik: item.nikPemilik || item.nik || item.petani?.nik || '',
      namaPetani: item.namaPemilik || item.namaPetani || item.petani?.nama || '',
      tempatLahir: item.tempatLahir || item.petani?.tempatLahir || 'Magetan',
      tanggalLahir: item.tanggalLahir || item.petani?.tanggalLahir || '1980-01-01',
      namaIbuKandung: item.namaIbuKandung || item.petani?.namaIbuKandung || '-',
      alamat: item.alamat || item.petani?.alamat || `Desa ${item.desa || 'Kediren'}`,
      subsektor: 'TANAMAN PANGAN',
      komoditas: item.komoditasRencana || item.komoditas || 'Padi',
      luasHa: luas,
      ureaMt1,
      npkMt1,
      organikMt1,
      ureaMt2,
      npkMt2,
      organikMt2,
      ureaMt3,
      npkMt3,
      organikMt3,
      totalUrea,
      totalNpk,
      totalOrganik,
      status: item.status || 'DISETUJUI_DINAS',
      nomorPengajuan: item.nomorPengajuan,
    };
  });
}

/**
 * Menghasilkan string CSV (dengan BOM UTF-8 agar langsung rapi saat dibuka di Microsoft Excel)
 */
export function generateErdkkCsvContent(rows: ErdkkRowData[]): string {
  const headers = [
    'No',
    'Kabupaten',
    'Kecamatan',
    'Desa',
    'Nama Poktan',
    'Kode Kios Pengecer',
    'Nama Kios Pengecer',
    'Penyuluh (PPL)',
    'NIK Petani',
    'Nama Petani',
    'Tempat Lahir',
    'Tanggal Lahir',
    'Nama Ibu Kandung',
    'Alamat',
    'Subsektor',
    'Komoditas',
    'Luas Lahan (Ha)',
    'Urea MT1 (Kg)',
    'NPK MT1 (Kg)',
    'Organik MT1 (Kg)',
    'Urea MT2 (Kg)',
    'NPK MT2 (Kg)',
    'Organik MT2 (Kg)',
    'Urea MT3 (Kg)',
    'NPK MT3 (Kg)',
    'Organik MT3 (Kg)',
    'Total Urea (Kg)',
    'Total NPK (Kg)',
    'Total Organik (Kg)',
    'Status e-RDKK',
  ];

  const escapeCsvCell = (val: any) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) =>
      [
        r.no,
        r.kabupaten,
        r.kecamatan,
        r.desa,
        r.namaPoktan,
        r.kodeKios,
        r.namaKios,
        r.namaPpl,
        `'${r.nik}`, // Tanda kutip tunggal agar Excel tidak mengubah NIK 16 digit menjadi eksponensial
        r.namaPetani,
        r.tempatLahir,
        r.tanggalLahir,
        r.namaIbuKandung,
        r.alamat,
        r.subsektor,
        r.komoditas,
        r.luasHa,
        r.ureaMt1,
        r.npkMt1,
        r.organikMt1,
        r.ureaMt2,
        r.npkMt2,
        r.organikMt2,
        r.ureaMt3,
        r.npkMt3,
        r.organikMt3,
        r.totalUrea,
        r.totalNpk,
        r.totalOrganik,
        r.status,
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];

  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Menghasilkan Template CSV untuk Import Massal Usulan e-RDKK
 */
export function generateErdkkImportTemplateCsv(): string {
  const headers = [
    'NIK',
    'No_KK',
    'Nama_Petani',
    'Tempat_Lahir',
    'Tanggal_Lahir',
    'Nama_Ibu_Kandung',
    'Telepon',
    'Alamat',
    'Desa',
    'Kecamatan',
    'Kabupaten',
    'Nama_Poktan',
    'Nama_Blok_Lahan',
    'Luas_Ha',
    'Komoditas',
    'Jenis_Tanah',
    'Irigasi',
    'Latitude',
    'Longitude',
  ];

  const sampleRows = [
    [
      '3520041205810009',
      '3520040101050099',
      'Budi Santoso',
      'Magetan',
      '1981-05-12',
      'Siti Aminah',
      '081234567801',
      'Dusun Krajan RT 02 RW 01',
      'Kediren',
      'Lembeyan',
      'Magetan',
      'Poktan Tani Makmur I',
      'Blok Sawah Barat 1',
      '0.5',
      'Padi',
      'Aluvial Sawah',
      'Teknis',
      '-7.6852',
      '111.4258',
    ],
    [
      '3520041908790012',
      '3520040101050100',
      'Slamet Riyadi',
      'Magetan',
      '1979-08-19',
      'Sumiati',
      '081234567802',
      'Dusun Dukuh RT 01 RW 03',
      'Dukuh',
      'Lembeyan',
      'Magetan',
      'Poktan Karya Tani',
      'Blok Lor Kali 2',
      '0.75',
      'Jagung',
      'Regosol',
      'Semi Teknis',
      '-7.6912',
      '111.4315',
    ],
  ];

  const lines = [
    headers.join(','),
    ...sampleRows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ];

  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Mem-parsing isi CSV menjadi array objek untuk Import Massal e-RDKK
 */
export function parseErdkkImportCsv(csvText: string): Array<Record<string, string>> {
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Deteksi delimiter koma atau titik koma (Excel Indonesia sering memakai ;)
  const firstLine = lines[0];
  const delimiter = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^'/, ''));
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim().replace(/^'/, ''));
    return result;
  };

  const headers = parseLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, '_')
  );

  const records: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.every((c) => !c)) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] ?? '';
    });
    records.push(obj);
  }

  return records;
}
