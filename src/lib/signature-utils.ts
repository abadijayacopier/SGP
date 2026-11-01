/**
 * Utilitas Generator Tanda Tangan Digital & Stempel Resmi Instansi
 * Sistem Informasi Pertanian Terpadu Kecamatan Lembeyan
 * Developer: Supriyanto Abadi Jaya
 */

export function getDefaultNipForRole(role: string, usernameOrNik?: string): string {
  switch (role) {
    case 'ADMIN_DINAS':
      return 'NIP. 19760814 200212 2 002';
    case 'PPL':
      return 'NIP. 19850412 201101 2 008';
    case 'POKTAN':
      return 'Reg. Poktan: 521/014/LMB/2026';
    case 'KIOS':
      return 'Reg. KPL: KPL-LMB-008/2026';
    case 'PETANI':
      return `NIK: ${usernameOrNik || '3509012304750001'}`;
    case 'SURVEYOR':
      return 'Reg. GIS: GIS-BPP-LMB/2026';
    default:
      return 'NIP. -';
  }
}

/**
 * Menghasilkan daftar rekomendasi username otomatis berdasarkan Nama Lengkap & Role Jabatan
 */
export function generateRecommendedUsernames(fullName: string, role: string): string[] {
  const withoutTitle = (fullName || 'user')
    .replace(/\(.*?\)/g, '') // hapus teks dalam kurung seperti (UD. Tani Subur)
    .replace(/,.*$/, '') // hapus gelar di belakang koma (, S.P / , M.Si)
    .replace(/^(Ir\.|H\.|Hj\.|Drs\.|Dra\.|Bpk\.|Ibu)\s*/i, '')
    .trim()
    .toLowerCase();

  const words = withoutTitle
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  const joined = words.join('') || 'petugas';
  const underscored = words.join('_') || 'petugas';
  const firstWord = words[0] || 'petugas';

  const prefixMap: Record<string, [string, string]> = {
    PPL: ['ppl', 'bpp'],
    ADMIN_DINAS: ['admin', 'kec'],
    POKTAN: ['poktan', 'ketua'],
    KIOS: ['kios', 'kpl'],
    PETANI: ['petani', 'tani'],
  };

  const [pref1, pref2] = prefixMap[role] || ['user', 'lembeyan'];

  const candidates = [
    `${pref1}_${joined}`,
    underscored,
    `${pref2}_${firstWord}`,
  ];

  // Hilangkan duplikat jika nama hanya 1 kata
  return Array.from(new Set(candidates));
}

/**
 * Menghasilkan DataURL SVG Tanda Tangan Kaligrafi Resmi berdasarkan nama pejabat/petugas
 */
export function generateAutoSignatureSvg(
  fullName: string,
  strokeColor: string = '#0f172a'
): string {
  const cleanName = (fullName || 'Pejabat Resmi')
    .replace(/,.*$/, '') // hapus gelar di belakang koma untuk coretan paraf
    .replace(/^(Ir\.|H\.|Hj\.|Drs\.|Bpk\.|Ibu)\s*/i, '')
    .trim();

  const shortText = cleanName.slice(0, 16);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="100" viewBox="0 0 260 100">
    <defs>
      <style>
        .sig-text {
          font-family: 'Brush Script MT', 'Segoe Script', 'Lucida Handwriting', cursive, serif;
          font-size: 30px;
          font-style: italic;
          font-weight: bold;
          fill: none;
          stroke: ${strokeColor};
          stroke-width: 1.8px;
        }
      </style>
    </defs>
    <!-- Garis lengkung kaligrafi bawah -->
    <path d="M 25 74 Q 95 45 215 68 Q 235 72 180 82 Q 110 90 48 78" fill="none" stroke="${strokeColor}" stroke-width="2.1" stroke-linecap="round" opacity="0.88" />
    <!-- Paraf vertikal awal -->
    <path d="M 38 78 C 22 45, 52 12, 68 38 C 78 55, 55 75, 92 52" fill="none" stroke="${strokeColor}" stroke-width="2.2" stroke-linecap="round" />
    <!-- Teks Nama Kaligrafi -->
    <text x="52" y="58" transform="rotate(-5 110 55)" font-family="'Segoe Script', 'Brush Script MT', Georgia, serif" font-size="27" font-style="italic" font-weight="bold" fill="${strokeColor}" opacity="0.92">${shortText}</text>
    <!-- Titik dua paraf resmi -->
    <circle cx="205" cy="76" r="1.8" fill="${strokeColor}" />
    <circle cx="214" cy="74" r="1.8" fill="${strokeColor}" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Menghasilkan DataURL SVG Stempel Basah Resmi Instansi (Transparan)
 */
export function generateOfficialStampSvg(
  role: string,
  unitOrWilayah?: string
): string {
  let topArc = 'PEMERINTAH KECAMATAN LEMBEYAN';
  let centerTitle = 'KOORDINATOR PERTANIAN';
  let bottomArc = 'KABUPATEN MAGETAN';
  let color = '#1e3a8a'; // Biru tua stempel dinas

  if (role === 'PPL') {
    topArc = 'BALAI PENYULUHAN PERTANIAN';
    centerTitle = 'BPP KEC. LEMBEYAN';
    bottomArc = 'VERIFIKASI SPASIAL & e-RDKK';
    color = '#0369a1';
  } else if (role === 'POKTAN') {
    topArc = 'KELOMPOK TANI TERDAFTAR';
    centerTitle = (unitOrWilayah || 'POKTAN TANI MAKMUR').toUpperCase().slice(0, 20);
    bottomArc = 'KECAMATAN LEMBEYAN';
    color = '#047857';
  } else if (role === 'KADES') {
    topArc = 'PEMERINTAH KABUPATEN MAGETAN';
    centerTitle = `KEPALA DESA ${(unitOrWilayah || 'KEDIREN').toUpperCase().slice(0, 16)}`;
    bottomArc = 'KECAMATAN LEMBEYAN';
    color = '#1e3a8a';
  } else if (role === 'KIOS') {
    topArc = 'KIOS PUPUK LENGKAP (KPL)';
    centerTitle = (unitOrWilayah || 'UD. TANI SUBUR').toUpperCase().slice(0, 20);
    bottomArc = 'PENYALUR RESMI KEC. LEMBEYAN';
    color = '#b45309';
  } else if (role === 'PETANI') {
    topArc = 'PETANI PENERIMA SUBSIDI';
    centerTitle = 'TERVERIFIKASI e-RDKK';
    bottomArc = 'KECAMATAN LEMBEYAN';
    color = '#0f766e';
  } else if (role === 'SURVEYOR') {
    topArc = 'BPP KECAMATAN LEMBEYAN';
    centerTitle = 'SURVEYOR & PEMETAAN GIS';
    bottomArc = 'BIDANG SPASIAL KADASTER';
    color = '#047857';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <g opacity="0.78" transform="rotate(-8 80 80)">
      <circle cx="80" cy="80" r="72" fill="none" stroke="${color}" stroke-width="3.5" />
      <circle cx="80" cy="80" r="66" fill="none" stroke="${color}" stroke-width="1.2" stroke-dasharray="4 2" />
      <circle cx="80" cy="80" r="46" fill="none" stroke="${color}" stroke-width="1.5" />
      <!-- Pita Tengah -->
      <rect x="10" y="66" width="140" height="28" rx="4" fill="#ffffff" fill-opacity="0.88" stroke="${color}" stroke-width="1.8" />
      <text x="80" y="54" text-anchor="middle" font-family="Arial, sans-serif" font-size="7.5" font-weight="bold" fill="${color}" letter-spacing="0.8">${topArc}</text>
      <text x="80" y="83" text-anchor="middle" font-family="Arial, sans-serif" font-size="9.5" font-weight="900" fill="${color}" letter-spacing="0.5">${centerTitle}</text>
      <text x="80" y="113" text-anchor="middle" font-family="Arial, sans-serif" font-size="7.2" font-weight="bold" fill="${color}" letter-spacing="0.8">${bottomArc}</text>
      <text x="80" y="34" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="${color}">★ ★ ★</text>
      <text x="80" y="132" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="${color}">★</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
