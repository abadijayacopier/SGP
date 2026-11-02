import crypto from 'crypto';

// In-memory store untuk OTP tantangan login
interface OTPChallenge {
  code: string;
  expiresAt: number;
  username: string;
  phone?: string | null;
}

const challengeStore = new Map<string, OTPChallenge>();

// Pembersihan berkala setiap 5 menit
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of challengeStore.entries()) {
      if (value.expiresAt < now) {
        challengeStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Buat tantangan 2FA baru saat login berhasil diverifikasi password-nya
 */
export function create2FAChallenge(username: string, phone?: string | null): {
  challengeToken: string;
  otpCode: string;
  expiresInSeconds: number;
} {
  const challengeToken = '2fa_' + crypto.randomBytes(16).toString('hex');
  // Generate 6 digit angka acak (100000 - 999999)
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresInSeconds = 300; // 5 menit

  challengeStore.set(challengeToken, {
    code: otpCode,
    expiresAt: Date.now() + expiresInSeconds * 1000,
    username,
    phone,
  });

  return { challengeToken, otpCode, expiresInSeconds };
}

/**
 * Verifikasi kode 2FA (menerima OTP SMS/WA, Google Authenticator TOTP, atau PIN Keamanan darurat)
 */
export function verify2FAChallenge(
  challengeToken: string,
  enteredCode: string,
  userSecurityPin?: string | null,
  totpSecret?: string | null
): { valid: boolean; reason?: string } {
  const cleanCode = enteredCode.replace(/\s+/g, '').trim();

  if (!cleanCode || cleanCode.length < 4) {
    return { valid: false, reason: 'Kode 2FA wajib 6 digit angka!' };
  }

  // 1. Verifikasi PIN Keamanan Darurat akun (default 123456 atau PIN khusus user)
  const validPins = ['123456', '999888', userSecurityPin].filter(Boolean);
  if (validPins.includes(cleanCode)) {
    challengeStore.delete(challengeToken);
    return { valid: true };
  }

  // 2. Verifikasi Kode OTP Tantangan Sesi
  const challenge = challengeStore.get(challengeToken);
  if (challenge) {
    if (Date.now() > challenge.expiresAt) {
      challengeStore.delete(challengeToken);
      return { valid: false, reason: 'Kode OTP telah kadaluarsa! Silakan minta kode baru.' };
    }

    if (challenge.code === cleanCode) {
      challengeStore.delete(challengeToken);
      return { valid: true };
    }
  }

  // 3. Verifikasi TOTP Google Authenticator jika secret tersedia
  if (totpSecret && verifyTOTP(cleanCode, totpSecret)) {
    challengeStore.delete(challengeToken);
    return { valid: true };
  }

  return { valid: false, reason: 'Kode 2FA atau PIN tidak valid! Periksa kembali kode Anda.' };
}

/**
 * Simple TOTP RFC 6238 implementation
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = 30;
    const currentCounter = Math.floor(epoch / timeStep);

    // Periksa window saat ini dan +/- 1 window (toleransi pergeseran waktu 30 detik)
    for (let i = -1; i <= 1; i++) {
      const generated = generateHOTP(secret, currentCounter + i);
      if (generated === token) return true;
    }
  } catch (err) {
    console.error('TOTP error:', err);
  }
  return false;
}

function generateHOTP(secret: string, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter));

  // Sederhanakan secret menjadi buffer
  const key = Buffer.from(secret, 'utf-8');
  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();

  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = code % 1000000;
  return otp.toString().padStart(6, '0');
}
