import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const [petani, poktan, lahan, alokasi, penyaluran, pengajuan, users] = await Promise.all([
      prisma.petani.findMany(),
      prisma.poktan.findMany(),
      prisma.lahan.findMany(),
      prisma.alokasiPupuk.findMany(),
      prisma.penyaluranPupuk.findMany(),
      prisma.pengajuanLahan.findMany(),
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          phone: true,
          email: true,
          wilayah: true,
          kiosName: true,
          nip: true,
          createdAt: true,
        },
      }),
    ]);

    // Data json settings & mutasi
    let settings = {};
    const settingsPath = path.join(process.cwd(), 'src', 'data', 'pengaturan-sistem.json');
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      } catch {}
    }

    const backupPayload = {
      backupDate: new Date().toISOString(),
      instansi: 'Pemerintah Kecamatan Lembeyan - BPP Kecamatan Lembeyan',
      version: '2.0.0',
      totalRecords: {
        petani: petani.length,
        poktan: poktan.length,
        lahan: lahan.length,
        alokasi: alokasi.length,
        penyaluran: penyaluran.length,
        pengajuan: pengajuan.length,
        users: users.length,
      },
      data: {
        petani,
        poktan,
        lahan,
        alokasi,
        penyaluran,
        pengajuan,
        users,
        settings,
      },
    };

    const fileName = `backup_pertanian_lembeyan_${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(backupPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
