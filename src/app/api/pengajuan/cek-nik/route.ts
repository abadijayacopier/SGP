import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawNik = searchParams.get('nik') || '';
    const tahun = parseInt(searchParams.get('tahun') || '2027', 10);

    const cleanNik = rawNik.trim().replace(/\D/g, '');

    if (!cleanNik || cleanNik.length < 10) {
      return NextResponse.json(
        { success: false, error: 'NIK wajib minimal 10 digit angka.' },
        { status: 400 }
      );
    }

    // 1. Cek apakah sudah pernah mengajukan untuk tahun tersebut (Edge Case 1: Blokir Duplikasi)
    const existingPengajuan = await prisma.pengajuanLahan.findFirst({
      where: {
        nikPemilik: cleanNik,
        tahunPengajuan: tahun,
      },
      include: {
        poktan: true,
        petani: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingPengajuan) {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        tahun,
        pengajuan: existingPengajuan,
        message: `NIK ${cleanNik} sudah terdaftar dalam pengajuan e-RDKK Tahun ${tahun} dengan status: ${existingPengajuan.status}.`,
      });
    }

    // 2. Cek apakah NIK sudah terdaftar di Master Database Petani (Auto-fill)
    const petani = await prisma.petani.findUnique({
      where: { nik: cleanNik },
      include: {
        poktan: true,
        lahan: true,
      },
    });

    if (petani) {
      const sumLahan =
        petani.lahan?.reduce((sum, l) => sum + (Number(l.luasHa) || 0), 0) ||
        Number(petani.totalLuasLahan) ||
        0;

      return NextResponse.json({
        success: true,
        alreadySubmitted: false,
        isRegisteredFarmer: true,
        petani: {
          id: petani.id,
          nik: petani.nik,
          nama: petani.nama,
          noKk: petani.noKk,
          tempatLahir: petani.tempatLahir || 'Magetan',
          tanggalLahir: petani.tanggalLahir || '',
          namaIbuKandung: petani.namaIbuKandung || '',
          telepon: petani.telepon || '',
          alamat: petani.alamat,
          desa: petani.desa,
          kecamatan: petani.kecamatan,
          kabupaten: petani.kabupaten,
          poktanId: petani.poktanId,
          poktanNama: petani.poktan?.nama || '',
          totalLuasLahan: sumLahan > 0 ? sumLahan : 0.5,
          lahanCount: petani.lahan?.length || 0,
        },
      });
    }

    // 3. Warga baru yang belum terdaftar di database master
    return NextResponse.json({
      success: true,
      alreadySubmitted: false,
      isRegisteredFarmer: false,
      message: 'NIK belum terdaftar di master data. Silakan lengkapi formulir pendaftaran anggota baru.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
