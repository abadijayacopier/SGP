import { NextResponse } from 'next/server';
import { create2FAChallenge } from '@/lib/two-factor';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, phone } = body;

    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Username wajib disertakan untuk kirim ulang OTP.' },
        { status: 400 }
      );
    }

    const challenge = create2FAChallenge(username, phone);
    const maskedPhone = phone
      ? phone.slice(0, 4) + '****' + phone.slice(-3)
      : '0812****9988';

    return NextResponse.json({
      success: true,
      challengeToken: challenge.challengeToken,
      otpCode: challenge.otpCode,
      maskedPhone,
      message: `Kode 2FA baru berhasil dikirim ke nomor ${maskedPhone}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
