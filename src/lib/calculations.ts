/**
 * Menghitung estimasi luas area poligon dari koordinat [lat, lng] dalam m2 dan Hektar (Ha).
 * Menggunakan pendekatan proyeksi speroid WGS84 sederhana (rumus Shoelace terproyeksi).
 */
export function calculatePolygonArea(coords: [number, number][]): { luasM2: number; luasHa: number } {
  if (!coords || coords.length < 3) {
    return { luasM2: 0, luasHa: 0 };
  }

  const R = 6378137; // Radius bumi dalam meter
  let area = 0;

  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const lat1 = (coords[i][0] * Math.PI) / 180;
    const lng1 = (coords[i][1] * Math.PI) / 180;
    const lat2 = (coords[j][0] * Math.PI) / 180;
    const lng2 = (coords[j][1] * Math.PI) / 180;

    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = Math.abs((area * R * R) / 2);
  const luasM2 = Math.round(area * 100) / 100;
  const luasHa = Math.round((area / 10000) * 100) / 100;

  return { luasM2, luasHa };
}

/**
 * Standar rekomendasi kuota pupuk subsidi e-RDKK per Hektar per musim tanam
 */
export const STANDAR_PUPUK: Record<string, { urea: number; npk: number; organik: number }> = {
  Padi: { urea: 250, npk: 150, organik: 100 },
  Jagung: { urea: 300, npk: 200, organik: 100 },
  Kedelai: { urea: 100, npk: 150, organik: 100 },
  Tebu: { urea: 400, npk: 300, organik: 200 },
  'Bawang Merah': { urea: 250, npk: 250, organik: 200 },
  Tembakau: { urea: 150, npk: 200, organik: 100 },
  Hortikultura: { urea: 200, npk: 200, organik: 150 },
  Lainnya: { urea: 200, npk: 150, organik: 100 },
};

/**
 * Menghitung kuota rekomendasi pupuk berdasarkan jenis komoditas dan luas lahan (Hektar)
 * Mendukung komoditas ganda / tumpang sari (misal: "Padi, Jagung" atau "Padi / Kedelai")
 */
export function hitungRekomendasiPupuk(komoditas: string, luasHa: number) {
  if (!komoditas || luasHa <= 0) {
    const ref = STANDAR_PUPUK['Lainnya'];
    return {
      ureaKg: Math.round(ref.urea * (luasHa || 0)),
      npkKg: Math.round(ref.npk * (luasHa || 0)),
      organikKg: Math.round(ref.organik * (luasHa || 0)),
    };
  }

  // Pisahkan jika ada beberapa komoditas (misal: "Padi, Jagung")
  const items = komoditas
    .split(/[,/&]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (items.length <= 1) {
    const item = items[0] || komoditas;
    const normalized =
      Object.keys(STANDAR_PUPUK).find((k) =>
        item.toLowerCase().includes(k.toLowerCase())
      ) || 'Lainnya';
    const ref = STANDAR_PUPUK[normalized] || STANDAR_PUPUK['Lainnya'];
    return {
      ureaKg: Math.round(ref.urea * luasHa),
      npkKg: Math.round(ref.npk * luasHa),
      organikKg: Math.round(ref.organik * luasHa),
    };
  }

  // Tumpang sari / multi-komoditas: bagi alokasi luas lahan secara proporsional
  const portionHa = luasHa / items.length;
  let totalUrea = 0;
  let totalNpk = 0;
  let totalOrganik = 0;

  for (const item of items) {
    const normalized =
      Object.keys(STANDAR_PUPUK).find((k) =>
        item.toLowerCase().includes(k.toLowerCase())
      ) || 'Lainnya';
    const ref = STANDAR_PUPUK[normalized] || STANDAR_PUPUK['Lainnya'];
    totalUrea += ref.urea * portionHa;
    totalNpk += ref.npk * portionHa;
    totalOrganik += ref.organik * portionHa;
  }

  return {
    ureaKg: Math.round(totalUrea),
    npkKg: Math.round(totalNpk),
    organikKg: Math.round(totalOrganik),
  };
}

/**
 * Format angka ke Rupiah Indonesia secara konsisten dan deterministik
 * (Bebas dari bug perbedaan spasi antara Node.js V8 dan Safari / iOS WebKit)
 */
export function formatRupiah(amount: number): string {
  const num = Math.round(Number(amount) || 0);
  return `Rp ${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

/**
 * Format angka ribuan dengan titik pemisah secara deterministik
 */
export function formatAngka(num: number): string {
  const n = Math.round(Number(num) || 0);
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Menghitung jarak geodesic antara dua koordinat [lat, lng] dalam meter (Haversine formula).
 */
export function calculateDistanceMeters(p1: [number, number], p2: [number, number]): number {
  const R = 6378137; // Radius bumi (meter)
  const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
  const dLng = ((p2[1] - p1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1[0] * Math.PI) / 180) *
      Math.cos((p2[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Menghitung panjang keliling poligon batas lahan dalam meter.
 */
export function calculatePolygonPerimeter(coords: [number, number][]): number {
  if (!coords || coords.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < coords.length; i++) {
    const next = coords[(i + 1) % coords.length];
    total += calculateDistanceMeters(coords[i], next);
  }
  return Math.round(total * 10) / 10;
}

/**
 * Menghitung panjang setiap segmen sisi sisi poligon batas lahan.
 */
export function calculateSegmentLengths(coords: [number, number][]): number[] {
  if (!coords || coords.length < 2) return [];
  const lengths: number[] = [];
  for (let i = 0; i < coords.length; i++) {
    const next = coords[(i + 1) % coords.length];
    lengths.push(calculateDistanceMeters(coords[i], next));
  }
  return lengths;
}

/**
 * Cek apakah sebuah titik koordinat berada di dalam poligon (Ray casting algorithm).
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  let inside = false;
  const [lat, lng] = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi || 0.0000001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Cek apakah dua segmen garis batas saling memotong / berpotongan.
 */
export function doLineSegmentsIntersect(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  p4: [number, number]
): boolean {
  function ccw(A: [number, number], B: [number, number], C: [number, number]): boolean {
    return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0]);
  }
  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

export interface OverlappingPlotInfo {
  id: string;
  kodeLahan: string;
  namaLahan: string;
  namaPetani: string;
  komoditas: string;
  severity: 'TINGGI' | 'SEDANG' | 'SEDIKIT';
  intersectionType: string;
}

export interface OverlapResult {
  hasOverlap: boolean;
  overlappingPlots: OverlappingPlotInfo[];
}

/**
 * Mendeteksi potensi tumpang tindih spasial (Spatial Overlap) antara batas poligon baru
 * dengan seluruh poligon lahan pertanian yang telah terdaftar di database.
 */
export function checkPolygonOverlap(
  newCoords: [number, number][],
  existingPlots: Array<{
    id: string;
    kodeLahan: string;
    namaLahan: string;
    komoditas: string;
    coordinates: string;
    petani?: { nama: string };
  }>,
  ignoreId?: string | null
): OverlapResult {
  if (!newCoords || newCoords.length < 3) {
    return { hasOverlap: false, overlappingPlots: [] };
  }

  const overlappingPlots: OverlappingPlotInfo[] = [];

  for (const plot of existingPlots) {
    if (ignoreId && plot.id === ignoreId) continue;

    let coords: [number, number][] = [];
    try {
      coords = typeof plot.coordinates === 'string' ? JSON.parse(plot.coordinates) : plot.coordinates;
    } catch {
      continue;
    }

    if (!Array.isArray(coords) || coords.length < 3) continue;

    // 1. Quick Bounding Box Check untuk optimasi performa cepat
    const newLats = newCoords.map((c) => c[0]);
    const newLngs = newCoords.map((c) => c[1]);
    const plotLats = coords.map((c) => c[0]);
    const plotLngs = coords.map((c) => c[1]);

    const b1 = {
      minLat: Math.min(...newLats),
      maxLat: Math.max(...newLats),
      minLng: Math.min(...newLngs),
      maxLng: Math.max(...newLngs),
    };
    const b2 = {
      minLat: Math.min(...plotLats),
      maxLat: Math.max(...plotLats),
      minLng: Math.min(...plotLngs),
      maxLng: Math.max(...plotLngs),
    };

    const bboxOverlap =
      b1.minLat <= b2.maxLat &&
      b1.maxLat >= b2.minLat &&
      b1.minLng <= b2.maxLng &&
      b1.maxLng >= b2.minLng;

    if (!bboxOverlap) continue;

    // 2. Point in polygon test
    let pointsOfNewInPlot = 0;
    for (const pt of newCoords) {
      if (isPointInPolygon(pt, coords)) {
        pointsOfNewInPlot++;
      }
    }

    let pointsOfPlotInNew = 0;
    for (const pt of coords) {
      if (isPointInPolygon(pt, newCoords)) {
        pointsOfPlotInNew++;
      }
    }

    // 3. Segment intersection test
    let edgesIntersect = false;
    for (let i = 0; i < newCoords.length; i++) {
      const p1 = newCoords[i];
      const p2 = newCoords[(i + 1) % newCoords.length];
      for (let j = 0; j < coords.length; j++) {
        const q1 = coords[j];
        const q2 = coords[(j + 1) % coords.length];
        if (doLineSegmentsIntersect(p1, p2, q1, q2)) {
          edgesIntersect = true;
          break;
        }
      }
      if (edgesIntersect) break;
    }

    if (pointsOfNewInPlot > 0 || pointsOfPlotInNew > 0 || edgesIntersect) {
      let severity: 'TINGGI' | 'SEDANG' | 'SEDIKIT' = 'SEDANG';
      let intersectionType = 'Batas Sempadan Berpotongan / Bersinggungan';

      if (pointsOfNewInPlot >= newCoords.length - 1 || pointsOfPlotInNew >= coords.length - 1) {
        severity = 'TINGGI';
        intersectionType = 'Tumpang Tindih Penuh / Potensi Klaim Ganda';
      } else if (pointsOfNewInPlot > 0 || pointsOfPlotInNew > 0) {
        severity = 'TINGGI';
        intersectionType = 'Sebagian Bidang Sawah Masuk ke Lahan Terdaftar';
      }

      overlappingPlots.push({
        id: plot.id,
        kodeLahan: plot.kodeLahan,
        namaLahan: plot.namaLahan,
        namaPetani: plot.petani?.nama || 'Petani Terdaftar',
        komoditas: plot.komoditas,
        severity,
        intersectionType,
      });
    }
  }

  return {
    hasOverlap: overlappingPlots.length > 0,
    overlappingPlots,
  };
}
