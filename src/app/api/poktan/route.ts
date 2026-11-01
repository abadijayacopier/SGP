import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const poktanList = await prisma.poktan.findMany({
      include: {
        anggota: {
          include: {
            lahan: true,
            alokasiPupuk: true,
          },
        },
        pengajuan: true,
      },
      orderBy: { nama: 'asc' },
    });

    return NextResponse.json(
      { success: true, data: poktanList },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nama, ketua, kontak, desa, kecamatan, kabupaten } = body;

    if (!nama || !ketua || !desa || !kecamatan) {
      return NextResponse.json(
        { success: false, error: 'Nama Poktan, Ketua, Desa, dan Kecamatan wajib diisi' },
        { status: 400 }
      );
    }

    const created = await prisma.poktan.create({
      data: {
        nama: String(nama).trim(),
        ketua: String(ketua).trim(),
        kontak: kontak ? String(kontak).trim() : '',
        desa: String(desa).trim(),
        kecamatan: String(kecamatan).trim(),
        kabupaten: kabupaten ? String(kabupaten).trim() : 'Magetan',
        jumlahAnggota: 0,
      },
    });

    return NextResponse.json(
      { success: true, data: created },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, nama, ketua, kontak, desa, kecamatan, kabupaten } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID Poktan wajib disertakan' }, { status: 400 });
    }

    const existing = await prisma.poktan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Kelompok Tani tidak ditemukan' }, { status: 404 });
    }

    const updated = await prisma.poktan.update({
      where: { id },
      data: {
        nama: nama !== undefined ? String(nama).trim() : existing.nama,
        ketua: ketua !== undefined ? String(ketua).trim() : existing.ketua,
        kontak: kontak !== undefined ? String(kontak).trim() : existing.kontak,
        desa: desa !== undefined ? String(desa).trim() : existing.desa,
        kecamatan: kecamatan !== undefined ? String(kecamatan).trim() : existing.kecamatan,
        kabupaten: kabupaten !== undefined ? String(kabupaten).trim() : existing.kabupaten,
      },
      include: {
        anggota: {
          include: {
            lahan: true,
            alokasiPupuk: true,
          },
        },
        pengajuan: true,
      },
    });

    return NextResponse.json(
      { success: true, data: updated },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID Poktan wajib disertakan' }, { status: 400 });
    }

    const existing = await prisma.poktan.findUnique({
      where: { id },
      include: {
        anggota: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ success: true, message: 'Poktan sudah terhapus' });
    }

    if (existing.anggota && existing.anggota.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Kelompok Tani "${existing.nama}" tidak dapat dihapus karena masih memiliki ${existing.anggota.length} anggota petani terdaftar. Silakan pindahkan anggota ke Poktan lain atau hapus data petani terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    // Bersihkan relasi pengajuan bila ada
    await prisma.pengajuanLahan.deleteMany({ where: { poktanId: id } });

    // Hapus tautan poktanId pada user pengurus (jika ada) agar tidak menjadi foreign key orphan
    await prisma.user.updateMany({
      where: { poktanId: id },
      data: { poktanId: null },
    });

    await prisma.poktan.delete({ where: { id } });

    return NextResponse.json(
      { success: true },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
