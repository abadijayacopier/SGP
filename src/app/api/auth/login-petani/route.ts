import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  generateAutoSignatureSvg,
  generateOfficialStampSvg,
} from '@/lib/signature-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nik } = body;

    if (!nik || typeof nik !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Nomor Induk Kependudukan (NIK) 16 digit wajib diisi!' },
        { status: 400 }
      );
    }

    const cleanNik = nik.trim().replace(/[^0-9]/g, '');

    if (cleanNik.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Format NIK tidak valid. Masukkan 16 digit NIK terdaftar.' },
        { status: 400 }
      );
    }

    // Cari Petani di basis data e-RDKK
    const petani = await prisma.petani.findFirst({
      where: {
        OR: [
          { nik: cleanNik },
          { id: cleanNik },
          { noKk: cleanNik },
        ],
      },
      include: {
        poktan: true,
        lahan: true,
        alokasiPupuk: true,
      },
    });

    if (!petani) {
      return NextResponse.json(
        {
          success: false,
          error: `NIK "${cleanNik}" belum terdaftar dalam sistem e-RDKK Kecamatan Lembeyan. Pastikan NIK Anda sudah terdaftar di Kelompok Tani setempat atau hubungi ketua Poktan.`,
        },
        { status: 404 }
      );
    }

    // Bangun Sesi Khusus Petani (Role: PETANI murni, BUKAN ADMIN)
    const sessionData = {
      id: petani.id,
      username: petani.nik,
      name: petani.nama,
      role: 'PETANI' as const,
      roleLabel: 'Petani Terdaftar e-RDKK',
      wilayah: `Poktan ${petani.poktan?.nama || 'Petani'} - Desa ${petani.desa}, Kec. Lembeyan`,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      avatarText: 'PT',
      avatarUrl: null,
      nip: `NIK: ${petani.nik}`,
      nik: petani.nik,
      phone: petani.telepon || null,
      signatureUrl: generateAutoSignatureSvg(petani.nama),
      stampUrl: generateOfficialStampSvg('PETANI', petani.poktan?.nama),
      petaniId: petani.id,
      poktanId: petani.poktanId,
      kiosName: null,
    };

    return NextResponse.json({
      success: true,
      message: `Login berhasil sebagai Petani ${petani.nama}.`,
      data: sessionData,
      redirectUrl: '/cek-kuota',
    });
  } catch (error: any) {
    console.error('Error login-petani:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem: ' + error.message },
      { status: 500 }
    );
  }
}
