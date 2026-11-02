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

    // 0. Cek POI / Tempat Lokal Unggulan Lembeyan (Termasuk Fotocopy Abadi Jaya)
    const qLower = query.toLowerCase();
    for (const poi of LEMBEYAN_POI_LIST) {
      const nameMatch = poi.name.toLowerCase().includes(qLower) || qLower.includes(poi.name.toLowerCase());
      const kwMatch = poi.keywords?.some((k) => qLower.includes(k) || k.includes(qLower));
      const addrMatch = poi.alamat.toLowerCase().includes(qLower);

      if (nameMatch || kwMatch || addrMatch) {
        addResult({
          name: poi.name,
          address: `${poi.kategori} &bull; ${poi.alamat}`,
          lat: poi.lat,
          lng: poi.lng,
          source: 'Tempat / Bisnis Terverifikasi Google',
          category: poi.kategori,
        });
      }
    }

    // Siapkan variasi query untuk tempat/bisnis lokal
    const variants = [query];
    if (!qLower.includes('magetan') && !qLower.includes('lembeyan')) {
      variants.push(`${query} Magetan`);
      variants.push(`${query} Lembeyan`);
    }

    // 1. Jalankan pencarian DuckDuckGo Local (Apple Maps) secara paralel
    const ddgPromises = variants.map(async (v) => {
      try {
        const res = await fetch(
          `https://duckduckgo.com/local.js?q=${encodeURIComponent(v)}&cb=x`,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            signal: AbortSignal.timeout(4500),
          }
        );
        const text = await res.text();
        let jsonStr = '';
        const xMatch = text.match(/^x\(([\s\S]*)\);?$/);
        if (xMatch) {
          jsonStr = xMatch[1];
        } else {
          const jsonMatch = text.match(/(\{[\s\S]*\})/);
          if (jsonMatch) jsonStr = jsonMatch[1];
        }

        if (jsonStr) {
          const data = JSON.parse(jsonStr);
          if (data && Array.isArray(data.results)) {
            return data.results;
          }
        }
      } catch (err: any) {
        console.error('[DDG fetch error for ' + v + ']:', err?.message);
      }
      return [];
    });

    // 2. Jalankan pencarian Photon API (OSM POI + Titik Spasial terdekat)
    const photonPromise = (async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=-7.7685&lon=111.4225&limit=8`,
          { signal: AbortSignal.timeout(4000) }
        );
        const data = await res.json();
        if (data && Array.isArray(data.features)) {
          return data.features;
        }
      } catch (err: any) {
        console.error('[Photon fetch error]:', err?.message);
      }
      return [];
    })();

    // 3. Jalankan OpenStreetMap Nominatim Resmi (Server-side)
    const nominatimPromise = (async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'SistemInformasiPertanian/1.0 (admin@pertanian.id)',
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(4000),
          }
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          return data;
        }
      } catch (err: any) {
        console.error('[Nominatim fetch error]:', err?.message);
      }
      return [];
    })();

    // Tunggu semua sumber geocoding selesai
    const [ddgResults, photonFeatures, nominatimResults] = await Promise.all([
      Promise.all(ddgPromises),
      photonPromise,
      nominatimPromise,
    ]);

    // A. Masukkan hasil tempat lokal (Apple Maps / DDG) terlebih dahulu
    for (const list of ddgResults) {
      for (const r of list) {
        if (r.coordinates?.latitude && r.coordinates?.longitude) {
          addResult({
            name: r.name || query,
            address: r.address || (r.address_lines || []).join(', ') || 'Lokasi Tempat / Bisnis',
            lat: Number(r.coordinates.latitude),
            lng: Number(r.coordinates.longitude),
            source: 'Tempat / Bisnis Lokal',
            category: r.ddg_category || 'Tempat',
          });
        }
      }
    }

    // B. Masukkan hasil Photon (POI spasial)
    for (const f of photonFeatures) {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        const name = p.name || p.street || query;
        const addrParts = [
          p.street,
          p.locality,
          p.district,
          p.city || p.county,
          p.state,
        ].filter(Boolean);
        const address = addrParts.join(', ') || p.country || 'Indonesia';

        addResult({
          name,
          address,
          lat,
          lng,
          source: 'Peta Spasial',
          category: p.type || p.osm_value,
        });
      }
    }

    // C. Masukkan hasil Nominatim (Wilayah / Jalan / Kota)
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
