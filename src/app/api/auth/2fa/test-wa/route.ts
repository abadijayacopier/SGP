import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, provider, apiKey, senderNumber } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Nomor telepon tujuan wajib diisi!' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API Key WhatsApp Gateway belum diisi! Masukkan API Key dari akun Fonnte/Wablas Anda.' },
        { status: 400 }
      );
    }

    const testMessage = `*SISTEM INFORMASI PERTANIAN KECAMATAN LEMBEYAN*\n\nHalo! Ini adalah *Pesan Uji Coba WhatsApp Gateway API*.\n\nKoneksi API WhatsApp berhasil terhubung secara resmi dan siap digunakan untuk fitur Keamanan 2FA / OTP.\n\nWaktu: ${new Date().toLocaleString('id-ID')}`;

    const res = await sendWhatsAppMessage({
      phone,
      message: testMessage,
      provider: provider || 'fonnte',
      apiKey,
      senderNumber,
    });

    if (res.success && !res.simulated) {
      return NextResponse.json({
        success: true,
        message: `Pesan uji coba berhasil terkirim ke WhatsApp ${phone}!`,
      });
    }

    return NextResponse.json({
      success: false,
      error: res.error || 'Gagal mengirim pesan melalui WhatsApp Gateway. Periksa kembali token API Key Anda.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
