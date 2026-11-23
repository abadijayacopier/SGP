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
 * Catatan: Jika otomatis dimatikan, fungsi mengembalikan string kosong agar ruang tanda tangan manual tetap bersih.
 */
export function generateAutoSignatureSvg(
  _fullName?: string,
  _strokeColor: string = '#0f172a'
): string {
  return '';
}

/**
 * Menghasilkan DataURL SVG Stempel Basah Resmi Instansi (Transparan)
 * Catatan: Jika otomatis dimatikan, fungsi mengembalikan string kosong agar stempel dibubuhkan secara manual/asli.
 */
export function generateOfficialStampSvg(
  _role?: string,
  _unitOrWilayah?: string
): string {
  return '';
}
