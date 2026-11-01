/**
 * Universal Clipboard Copy Helper
 * Kompatibel dengan HTTPS, Localhost, dan HTTP non-secure context (akses melalui IP lokal / Tailscale / Smartphone)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Coba Modern Navigator Clipboard API jika tersedia (HTTPS / Localhost)
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Lanjut ke fallback di bawah
    }
  }

  // 2. Fallback textarea execCommand (Bekerja di HTTP IP lokal / smartphone / browser lama)
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Sembunyikan elemen agar tidak merusak tampilan layar
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');
      
      document.body.appendChild(textArea);
      textArea.select();
      textArea.setSelectionRange(0, 99999); // Untuk perangkat mobile (iOS / Android)
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch (err) {
      console.error('Fallback copy gagal:', err);
      return false;
    }
  }

  return false;
}
