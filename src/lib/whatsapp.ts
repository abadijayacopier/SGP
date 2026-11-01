/**
 * Utility WhatsApp Gateway & Notifikasi Digital Resmi
 * BPP Kecamatan Lembeyan - Kabupaten Magetan
 */

export function cleanPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62') && cleaned.length > 5) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function generateWhatsAppNotaKasir(trx: {
  nomorNota: string;
  petaniNama: string;
  petaniNik: string;
  poktanNama?: string;
  namaKios?: string;
  jumlahUreaKg: number;
  jumlahNpkKg: number;
  jumlahOrganikKg: number;
  totalHarga: number;
  tanggal?: string;
  verificationUrl?: string;
}): string {
  const tgl = trx.tanggal
    ? new Date(trx.tanggal).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  const totalRp = Number(trx.totalHarga || 0).toLocaleString('id-ID');
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://pertanian.lembeyan.id';
  const verif = trx.verificationUrl || `${baseUrl}/verifikasi?code=${encodeURIComponent(trx.nomorNota)}`;

  return (
    `🌾 *BUKTI PENEBUSAN PUPUK BERSUBSIDI* 🌾\n` +
    `*Pemerintah Kecamatan Lembeyan — BPP Lembeyan*\n` +
    `====================================\n` +
    `📄 *No. Struk Nota:* \`${trx.nomorNota}\`\n` +
    `👤 *Nama Petani:* ${trx.petaniNama}\n` +
    `🆔 *NIK:* ${trx.petaniNik}\n` +
    `👥 *Kelompok Tani:* ${trx.poktanNama || 'Poktan BPP'}\n` +
    `🏪 *Kios Pengecer:* ${trx.namaKios || 'Kios Resmi KPL'}\n` +
    `🗓️ *Tanggal Penebusan:* ${tgl}\n\n` +
    `📦 *Rincian Pupuk Ditebus:*\n` +
    `• Pupuk Urea: ${trx.jumlahUreaKg} Kg (${Math.round(trx.jumlahUreaKg / 50)} Sak)\n` +
    `• Pupuk NPK Phonska: ${trx.jumlahNpkKg} Kg (${Math.round(trx.jumlahNpkKg / 50)} Sak)\n` +
    `• Pupuk Organik: ${trx.jumlahOrganikKg} Kg (${Math.round(trx.jumlahOrganikKg / 40)} Sak)\n\n` +
    `💰 *Total Pembayaran:* *Rp ${totalRp}* (LUNAS)\n` +
    `✍️ *Tanda Tangan Petani:* Tersimpan & Sah Digital\n\n` +
    `🔍 *Verifikasi Keaslian QR Code Resmi:*\n` +
    `${verif}\n` +
    `====================================\n` +
    `_Terima kasih telah menebus pupuk bersubsidi sesuai kuota SK e-RDKK resmi. Simpan pesan ini sebagai bukti sah._`
  );
}

export function generateWhatsAppSuratJalan(sj: {
  nomorSuratJalan: string;
  namaKios: string;
  namaPoktan: string;
  desa: string;
  namaSopir: string;
  nomorPolisi: string;
  jumlahUreaSak: number;
  jumlahUreaKg: number;
  jumlahNpkSak: number;
  jumlahNpkKg: number;
  jumlahOrganikSak: number;
  jumlahOrganikKg: number;
  tanggalKirim: string;
  verificationUrl?: string;
}): string {
  const tgl = sj.tanggalKirim
    ? new Date(sj.tanggalKirim).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://pertanian.lembeyan.id';
  const verif = sj.verificationUrl || `${baseUrl}/verifikasi?code=${encodeURIComponent(sj.nomorSuratJalan)}`;

  return (
    `🚚 *PEMBERITAHUAN PENGIRIMAN PUPUK KIOS (DO)* 🚚\n` +
    `*Kios Pengecer Resmi (KPL) Kecamatan Lembeyan*\n` +
    `====================================\n` +
    `📄 *No. Surat Jalan:* \`${sj.nomorSuratJalan}\`\n` +
    `🏪 *Kios Pengirim:* ${sj.namaKios}\n` +
    `👥 *Tujuan Poktan:* ${sj.namaPoktan} (Desa ${sj.desa})\n` +
    `🚛 *Sopir & Armada:* ${sj.namaSopir} (Plat: ${sj.nomorPolisi})\n` +
    `🗓️ *Tanggal Pengiriman:* ${tgl}\n\n` +
    `📦 *Muatan Pupuk Bersubsidi:*\n` +
    `• Urea: ${sj.jumlahUreaSak} Sak (${sj.jumlahUreaKg.toLocaleString('id-ID')} Kg)\n` +
    `• NPK Phonska: ${sj.jumlahNpkSak} Sak (${sj.jumlahNpkKg.toLocaleString('id-ID')} Kg)\n` +
    `• Organik: ${sj.jumlahOrganikSak} Sak (${sj.jumlahOrganikKg.toLocaleString('id-ID')} Kg)\n\n` +
    `🔍 *Verifikasi QR Code Surat Jalan:*\n` +
    `${verif}\n` +
    `====================================\n` +
    `_Mohon pengurus Kelompok Tani bersiap di gudang/balai desa untuk memeriksa fisik barang dan membubuhkan tanda terima._`
  );
}

export function openWhatsApp(phone: string, message: string) {
  const clean = cleanPhoneForWhatsApp(phone);
  const encoded = encodeURIComponent(message);
  const url = clean ? `https://wa.me/${clean}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
