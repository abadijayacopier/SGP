import QRCode from 'qrcode';

/**
 * Menghasilkan Data URL (base64 image/png) dari teks / tautan verifikasi
 */
export async function generateQrCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 256,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Gagal generate QR Code:', err);
    return '';
  }
}

/**
 * Menghasilkan string kode SVG murni dari teks / tautan verifikasi
 */
export async function generateQrCodeSvg(text: string): Promise<string> {
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      width: 160,
      margin: 1,
      color: {
        dark: '#064e3b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Gagal generate QR Code SVG:', err);
    return '';
  }
}
