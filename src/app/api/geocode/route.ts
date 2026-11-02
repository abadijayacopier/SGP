import { NextResponse } from 'next/server';
import { LEMBEYAN_POI_LIST } from '@/lib/erdkk-format';

export interface GeocodeItem {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  source: string;
  category?: string;
}

// Helper untuk fetch langsung dari engine Google Maps Live
async function fetchGoogleMapsLive(
  q: string
): Promise<Array<{ name: string; address: string; lat: number; lng: number }>> {
  try {
    const res = await fetch(
      'https://www.google.com/search?tbm=map&q=' + encodeURIComponent(q),
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        signal: AbortSignal.timeout(4500),
      }
    );
    const text = await res.text();
    const clean = text.replace(/^[\)\}\]\'\s]+/, '');
    const data = JSON.parse(clean);
    const results: Array<{ name: string; address: string; lat: number; lng: number }> = [];
    const seen = new Set<string>();

    function findPlaces(obj: any) {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        if (
          obj.length >= 20 &&
          Array.isArray(obj[9]) &&
          typeof obj[9][2] === 'number' &&
          typeof obj[9][3] === 'number'
        ) {
          const lat = obj[9][2];
          const lng = obj[9][3];
          const name = obj[11];
          const address = obj[18] || (Array.isArray(obj[2]) ? obj[2].join(', ') : '');
          const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
          if (name && lat && lng && !seen.has(key)) {
            seen.add(key);
            results.push({ name, address, lat, lng });
          }
        }
        for (const item of obj) findPlaces(item);
      }
    }
    findPlaces(data);
    return results;
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, results: [] });
    }

    const results: GeocodeItem[] = [];
    const seen = new Set<string>();

    const addResult = (item: {
      name: string;
      address: string;
      lat: number;
      lng: number;
      source: string;
      category?: string;
    }) => {
      if (typeof item.lat !== 'number' || typeof item.lng !== 'number') return;
      if (isNaN(item.lat) || isNaN(item.lng)) return;
      const key = `${item.lat.toFixed(4)},${item.lng.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          id: `${key}-${results.length}`,
          ...item,
        });
      }
    };

    const qLower = query.toLowerCase();

    // 0. Cek POI / Tempat Lokal Unggulan Lembeyan (Termasuk Fotocopy Abadi Jaya)
    for (const poi of LEMBEYAN_POI_LIST) {
      const nameMatch =
        poi.name.toLowerCase().includes(qLower) || qLower.includes(poi.name.toLowerCase());
      const kwMatch = poi.keywords?.some((k) => qLower.includes(k) || k.includes(qLower));
      const addrMatch = poi.alamat.toLowerCase().includes(qLower);

      if (nameMatch || kwMatch || addrMatch) {
        addResult({
          name: poi.name,
          address: `${poi.kategori} &bull; ${poi.alamat}`,
          lat: poi.lat,
          lng: poi.lng,
          source: 'Google Maps (Lokal Lembeyan)',
          category: poi.kategori,
        });
      }
    }

    // 1. Jalankan Live Google Maps Engine (Prioritas Wilayah Lembeyan / Magetan + Global)
    const googleVariants: string[] = [];
    if (!qLower.includes('lembeyan') && !qLower.includes('magetan')) {
      googleVariants.push(`${query} Lembeyan Magetan`);
      googleVariants.push(`${query} Kediren Lembeyan`);
      googleVariants.push(`${query} Magetan`);
    }
    googleVariants.push(query);

    const googlePromises = googleVariants.map((v) => fetchGoogleMapsLive(v));

    // 2. Fallback Nominatim (OSM Resmi) untuk batas administrasi wilayah
    const nominatimPromise = (async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=4&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'SistemInformasiPertanian/1.0 (admin@pertanian.id)',
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(3500),
          }
        );
        const data = await res.json();
        if (Array.isArray(data)) return data;
      } catch {
        // ignore
      }
      return [];
    })();

    // Eksekusi paralel
    const [googleResultsByVariant, nominatimResults] = await Promise.all([
      Promise.all(googlePromises),
      nominatimPromise,
    ]);

    // Masukkan hasil Google Maps Live (Prioritas Tertinggi)
    for (const list of googleResultsByVariant) {
      for (const item of list) {
        addResult({
          name: item.name,
          address: item.address || 'Lokasi Terdaftar di Google Maps',
          lat: item.lat,
          lng: item.lng,
          source: 'Google Maps (Live)',
          category: 'Tempat / Jalan',
        });
      }
    }

    // Masukkan hasil Nominatim hanya jika hasil masih sedikit (sebagai pelengkap)
    if (results.length < 5) {
      for (const item of nominatimResults) {
        addResult({
          name: item.name || item.display_name.split(',')[0] || query,
          address: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          source: 'Wilayah Global',
          category: item.type || item.class,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results: results.slice(0, 10),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Geocoding failed', results: [] },
      { status: 500 }
    );
  }
}
