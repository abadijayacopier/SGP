import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const poktanId = searchParams.get('poktanId');
    const petaniId = searchParams.get('petaniId') || searchParams.get('id');
    const search = searchParams.get('search');

    const where: any = {};
    if (petaniId) {
      where.id = petaniId;
    }
    if (poktanId && poktanId !== 'SEMUA') {
      where.poktanId = poktanId;
    }
    if (search) {
      where.OR = [
        { nama: { contains: search } },
        { nik: { contains: search } },
      ];
    }

    const petaniList = await prisma.petani.findMany({
      where,
      include: {
        poktan: true,
        lahan: true,
        alokasiPupuk: true,
        penyaluranPupuk: {
          orderBy: { tanggalPenyaluran: 'desc' },
          take: 5,
        },
      },
      orderBy: { nama: 'asc' },
    });

    // Sinkronisasi otomatis luas lahan terakumulasi dari blok lahan fisik atau kuota alokasi e-RDKK
    const enrichedList = petaniList.map((p) => {
      let luas = Number(p.totalLuasLahan) || 0;
      if (p.lahan && p.lahan.length > 0) {
        const sumLahan = p.lahan.reduce((sum, l) => sum + (Number(l.luasHa) || 0), 0);
        if (sumLahan > 0) luas = sumLahan;
      }
      if (luas === 0 && p.alokasiPupuk && p.alokasiPupuk.length > 0) {
        luas = Number(p.alokasiPupuk[0].luasTanamHa) || 0;
      }
      return {
        ...p,
        totalLuasLahan: luas,
      };
    });

    return NextResponse.json({ success: true, data: enrichedList });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      nik,
      nama,
      noKk,
      tempatLahir,
      tanggalLahir,
      namaIbuKandung,
      telepon,
      alamat,
      desa,
      kecamatan,
      kabupaten,
      poktanId,
    } = body;

    if (!nik || !nama || !poktanId) {
      return NextResponse.json(
        { success: false, error: 'NIK, Nama, dan Kelompok Tani wajib diisi' },
        { status: 400 }
      );
    }

    const newPetani = await prisma.petani.create({
      data: {
        nik,
        nama,
        noKk: noKk || nik,
        tempatLahir: tempatLahir || 'Magetan',
        tanggalLahir: tanggalLahir || null,
        namaIbuKandung: namaIbuKandung || null,
        telepon: telepon || null,
        alamat: alamat || 'Lembeyan',
        desa: desa || 'Kediren',
        kecamatan: kecamatan || 'Lembeyan',
        kabupaten: kabupaten || 'Magetan',
        poktanId,
        statusVerifikasi: 'TERVERIFIKASI',
        totalLuasLahan: 0,
      },
      include: {
        poktan: true,
      },
    });

    return NextResponse.json({ success: true, data: newPetani }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      nik,
      nama,
      noKk,
      tempatLahir,
      tanggalLahir,
      namaIbuKandung,
      telepon,
      alamat,
      desa,
      kecamatan,
      kabupaten,
      poktanId,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID Petani wajib disertakan' }, { status: 400 });
    }

    const updated = await prisma.petani.update({
      where: { id },
      data: {
        nik,
        nama,
        noKk,
        tempatLahir: tempatLahir !== undefined ? tempatLahir : undefined,
        tanggalLahir: tanggalLahir !== undefined ? tanggalLahir : undefined,
        namaIbuKandung: namaIbuKandung !== undefined ? namaIbuKandung : undefined,
        telepon: telepon || null,
        alamat,
        desa,
        kecamatan: kecamatan || 'Lembeyan',
        kabupaten: kabupaten || 'Magetan',
        poktanId,
      },
      include: {
        poktan: true,
        lahan: true,
        alokasiPupuk: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID Petani wajib disertakan' }, { status: 400 });
    }

    // Hapus relasi anak terlebih dahulu agar tidak melanggar foreign key constraint
    await prisma.penyaluranPupuk.deleteMany({ where: { petaniId: id } });
    await prisma.alokasiPupuk.deleteMany({ where: { petaniId: id } });
    await prisma.pengajuanLahan.deleteMany({ where: { petaniId: id } });
    await prisma.lahan.deleteMany({ where: { petaniId: id } });
    await prisma.petani.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
