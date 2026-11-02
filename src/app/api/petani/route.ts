import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    return NextResponse.json(
      { success: true, data: enrichedList },
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

    const cleanNik = String(nik).trim().replace(/\D/g, '');
    const cleanNoKk = noKk ? String(noKk).trim().replace(/\D/g, '') : cleanNik;

    if (!cleanNik || cleanNik.length < 10) {
      return NextResponse.json(
        { success: false, error: 'NIK tidak valid (minimal 10 digit angka)' },
        { status: 400 }
      );
    }

    // Cek apakah NIK sudah terdaftar sebelumnya untuk mencegah crash constraint P2002
    const existingPetani = await prisma.petani.findUnique({
      where: { nik: cleanNik },
      include: {
        poktan: true,
        lahan: true,
      },
    });

    if (existingPetani) {
      // Petani sudah ada di database, kembalikan data petani yang sudah terdaftar
      const sumLahan = existingPetani.lahan?.reduce((sum, l) => sum + (Number(l.luasHa) || 0), 0) || 0;
      return NextResponse.json(
        {
          success: true,
          data: {
            ...existingPetani,
            totalLuasLahan: sumLahan > 0 ? sumLahan : Number(existingPetani.totalLuasLahan) || 0,
          },
          alreadyExisted: true,
          message: `Petani dengan NIK ${cleanNik} sudah terdaftar atas nama ${existingPetani.nama}. Data otomatis dipilih.`,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    const newPetani = await prisma.petani.create({
      data: {
        nik: cleanNik,
        nama: String(nama).trim(),
        noKk: cleanNoKk,
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
        lahan: true,
      },
    });

    return NextResponse.json(
      { success: true, data: newPetani },
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

    const cleanNik = nik ? String(nik).trim().replace(/\D/g, '') : undefined;
    const cleanNoKk = noKk ? String(noKk).trim().replace(/\D/g, '') : cleanNik;

    // 1. Cari petani berdasarkan id
    let targetPetani = id ? await prisma.petani.findUnique({ where: { id } }) : null;

    // 2. Jika ID tidak ditemukan (misal ID lama / session sebelumnya), cari berdasarkan NIK
    if (!targetPetani && cleanNik) {
      targetPetani = await prisma.petani.findUnique({ where: { nik: cleanNik } });
    }

    let updated;
    if (targetPetani) {
      updated = await prisma.petani.update({
        where: { id: targetPetani.id },
        data: {
          nik: cleanNik || targetPetani.nik,
          nama: nama ? String(nama).trim() : targetPetani.nama,
          noKk: cleanNoKk || targetPetani.noKk,
          tempatLahir: tempatLahir !== undefined ? tempatLahir : undefined,
          tanggalLahir: tanggalLahir !== undefined ? tanggalLahir : undefined,
          namaIbuKandung: namaIbuKandung !== undefined ? namaIbuKandung : undefined,
          telepon: telepon !== undefined ? (telepon || null) : undefined,
          alamat: alamat !== undefined ? alamat : targetPetani.alamat,
          desa: desa !== undefined ? desa : targetPetani.desa,
          kecamatan: kecamatan || targetPetani.kecamatan || 'Lembeyan',
          kabupaten: kabupaten || targetPetani.kabupaten || 'Magetan',
          poktanId: poktanId || targetPetani.poktanId,
        },
        include: {
          poktan: true,
          lahan: true,
          alokasiPupuk: true,
        },
      });
    } else {
      // 3. Jika benar-benar belum ada di database, buat baru agar data pengguna aman
      if (!cleanNik || !nama || !poktanId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Data petani tidak ditemukan untuk diperbarui. Pastikan NIK, Nama, dan Kelompok Tani terisi.',
          },
          { status: 404 }
        );
      }
      updated = await prisma.petani.create({
        data: {
          nik: cleanNik,
          nama: String(nama).trim(),
          noKk: cleanNoKk || cleanNik,
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
          lahan: true,
          alokasiPupuk: true,
        },
      });
    }

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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID Petani wajib disertakan' }, { status: 400 });
    }

    // Cek keberadaan petani terlebih dahulu
    const target = await prisma.petani.findUnique({ where: { id } });
    if (!target) {
      // Jika data sudah tidak ada di database, kembalikan status sukses agar UI sinkron
      return NextResponse.json({ success: true, message: 'Petani sudah terhapus di database' });
    }

    // Hapus relasi anak terlebih dahulu agar tidak melanggar foreign key constraint
    await prisma.penyaluranPupuk.deleteMany({ where: { petaniId: id } });
    await prisma.alokasiPupuk.deleteMany({ where: { petaniId: id } });
    await prisma.pengajuanLahan.deleteMany({ where: { petaniId: id } });
    await prisma.lahan.deleteMany({ where: { petaniId: id } });
    await prisma.petani.delete({ where: { id } });

    // Rekalkulasi jumlah anggota pada Poktan agar kartu Poktan selalu akurat
    if (target.poktanId) {
      try {
        const remainingCount = await prisma.petani.count({ where: { poktanId: target.poktanId } });
        await prisma.poktan.update({
          where: { id: target.poktanId },
          data: { jumlahAnggota: remainingCount },
        });
      } catch (err) {}
    }

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
