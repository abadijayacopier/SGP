/**
 * Helper untuk memberikan Watermark Geotagging Resmi (GPS, Petani, Tanggal & Waktu)
 * pada foto dokumentasi sawah yang diambil oleh Petugas Surveyor / PPL di lapangan.
 */

export interface GeotagWatermarkOptions {
  namaPetani?: string;
  namaLahan?: string;
  kodeLahan?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  desa?: string;
  komoditas?: string;
}

export async function addGeotagWatermark(
  imageSource: File | Blob | string,
  options: GeotagWatermarkOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Skala canvas (maksimal lebar 1600px untuk menghemat ukuran & memori)
        const maxW = 1600;
        let w = img.width;
        let h = img.height;

        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal menginisialisasi Canvas 2D'));
          return;
        }

        // 1. Gambar foto asli
        ctx.drawImage(img, 0, 0, w, h);

        // 2. Banner Informasi Geotag di Bagian Bawah
        const bannerHeight = Math.max(140, Math.round(h * 0.18));
        const startY = h - bannerHeight;

        // Gradient Background gelap elegan
        const gradient = ctx.createLinearGradient(0, startY, 0, h);
        gradient.addColorStop(0, 'rgba(15, 23, 42, 0.88)');
        gradient.addColorStop(1, 'rgba(6, 78, 59, 0.96)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, startY, w, bannerHeight);

        // Garis batas atas aksen emas/hijau
        ctx.fillStyle = '#10b981';
        ctx.fillRect(0, startY, w, Math.max(3, Math.round(w * 0.003)));

        // 3. Tulis Teks Informasi Geotag
        const paddingX = Math.round(w * 0.03);
        const baseFontSize = Math.max(14, Math.round(w * 0.018));
        const titleFontSize = Math.max(16, Math.round(w * 0.022));

        // Judul Instansi
        ctx.font = `bold ${titleFontSize}px sans-serif`;
        ctx.fillStyle = '#34d399'; // Emerald-400
        ctx.fillText(
          'DOKUMENTASI SPASIAL GIS — BPP KECAMATAN LEMBEYAN',
          paddingX,
          startY + bannerHeight * 0.25
        );

        // Baris 1: Koordinat & Akurasi Satelit
        ctx.font = `bold ${baseFontSize}px monospace`;
        ctx.fillStyle = '#f8fafc';
        const latText = options.lat >= 0 ? `+${options.lat.toFixed(6)}` : options.lat.toFixed(6);
        const lngText = options.lng >= 0 ? `+${options.lng.toFixed(6)}` : options.lng.toFixed(6);
        const accText = options.accuracy !== undefined ? ` ±${options.accuracy}m` : '';
        ctx.fillText(
          `📍 KOORDINAT GPS: ${latText}, ${lngText}${accText}`,
          paddingX,
          startY + bannerHeight * 0.48
        );

        // Baris 2: Petani, Lahan & Komoditas
        ctx.font = `600 ${baseFontSize}px sans-serif`;
        ctx.fillStyle = '#e2e8f0';
        const lahanText = options.namaLahan ? `Petak: ${options.namaLahan}` : '';
        const petaniText = options.namaPetani ? `Petani: ${options.namaPetani}` : '';
        const komoditasText = options.komoditas ? `(${options.komoditas})` : '';
        const line2 = [lahanText, petaniText, komoditasText].filter(Boolean).join(' • ');
        ctx.fillText(
          line2 || 'Verifikasi Lapangan Petak Sawah e-RDKK',
          paddingX,
          startY + bannerHeight * 0.7
        );

        // Baris 3: Tanggal & Waktu Pengambilan
        ctx.font = `500 ${Math.max(11, baseFontSize - 2)}px sans-serif`;
        ctx.fillStyle = '#94a3b8';
        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        const timeStr = now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const desaText = options.desa ? `Desa ${options.desa}, ` : '';
        ctx.fillText(
          `🗓️ ${dateStr} pukul ${timeStr} WIB • ${desaText}Kec. Lembeyan, Magetan`,
          paddingX,
          startY + bannerHeight * 0.88
        );

        // 4. Output JPEG terkompresi
        const resultBase64 = canvas.toDataURL('image/jpeg', 0.85);
        resolve(resultBase64);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('Gagal memuat file gambar untuk pemberian geotag'));
    };

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
      reader.readAsDataURL(imageSource);
    }
  });
}
