import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const poktanId = searchParams.get('poktanId');
    const tahun = parseInt(searchParams.get('tahun') || '2026');
    const musimTanam = searchParams.get('musimTanam') || 'MT 1';

    // Ambil daftar petani berdasarkan Poktan
    const wherePetani: any = {};
    if (poktanId && poktanId !== 'SEMUA') {
      wherePetani.poktanId = poktanId;
    }

    const petaniList = await prisma.petani.findMany({
      where: wherePetani,
      include: {
        poktan: true,
        lahan: true,
        alokasiPupuk: {
          where: { tahun, musimTanam },
        },
      },
      orderBy: { nama: 'asc' },
    });

    const data = petaniList.map((petani, index) => {
      const alokasi = petani.alokasiPupuk[0];
      const totalLuas =
        petani.totalLuasLahan > 0
          ? petani.totalLuasLahan
          : petani.lahan.reduce((acc, l) => acc + (l.luasHa || 0), 0) || 0.5;

      return {
        no: index + 1,
        petaniId: petani.id,
        nik: petani.nik,
        nama: petani.nama,
        desa: petani.desa,
        poktanId: petani.poktanId,
        namaPoktan: petani.poktan?.nama || '-',
        luasHa: Number(totalLuas.toFixed(2)),
        komoditas: alokasi?.komoditas || (petani.lahan[0]?.komoditas || 'Padi'),
        alokasiId: alokasi?.id || null,
        jatahUreaKg: alokasi ? alokasi.jatahUreaKg : Math.round(totalLuas * 125),
        sisaUreaKg: alokasi ? alokasi.sisaUreaKg : Math.round(totalLuas * 125),
        jatahNpkKg: alokasi ? alokasi.jatahNpkKg : Math.round(totalLuas * 100),
        sisaNpkKg: alokasi ? alokasi.sisaNpkKg : Math.round(totalLuas * 100),
        jatahOrganikKg: alokasi ? alokasi.jatahOrganikKg : Math.round(totalLuas * 50),
        sisaOrganikKg: alokasi ? alokasi.sisaOrganikKg : Math.round(totalLuas * 50),
        status: alokasi?.status || 'AKTIF',
      };
    });

    const summary = {
      totalPetani: data.length,
      totalLuasHa: Number(data.reduce((acc, d) => acc + d.luasHa, 0).toFixed(2)),
      totalUreaKg: data.reduce((acc, d) => acc + d.jatahUreaKg, 0),
      totalNpkKg: data.reduce((acc, d) => acc + d.jatahNpkKg, 0),
      totalOrganikKg: data.reduce((acc, d) => acc + d.jatahOrganikKg, 0),
    };

    return NextResponse.json({ success: true, data, summary });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, tahun = 2026, musimTanam = 'MT 1' } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Daftar alokasi tidak boleh kosong' }, { status: 400 });
    }

    let updatedCount = 0;
    let createdCount = 0;

    for (const item of items) {
      const {
        petaniId,
        nik,
        komoditas = 'Padi',
        luasHa = 0.5,
        jatahUreaKg = 0,
        jatahNpkKg = 0,
        jatahOrganikKg = 0,
      } = item;

      // Cari petani berdasarkan ID atau NIK
      let targetPetaniId = petaniId;
      if (!targetPetaniId && nik) {
        const p = await prisma.petani.findUnique({ where: { nik } });
        if (p) targetPetaniId = p.id;
      }

      if (!targetPetaniId) continue;

      const existingAlokasi = await prisma.alokasiPupuk.findFirst({
        where: {
          petaniId: targetPetaniId,
          tahun: Number(tahun),
          musimTanam,
        },
      });

      if (existingAlokasi) {
        // Hitung selisih sisa agar tidak mereset kuota yang sudah terambil
        const terambilUrea = existingAlokasi.jatahUreaKg - existingAlokasi.sisaUreaKg;
        const terambilNpk = existingAlokasi.jatahNpkKg - existingAlokasi.sisaNpkKg;
        const terambilOrg = existingAlokasi.jatahOrganikKg - existingAlokasi.sisaOrganikKg;

        const newSisaUrea = Math.max(0, Number(jatahUreaKg) - Math.max(0, terambilUrea));
        const newSisaNpk = Math.max(0, Number(jatahNpkKg) - Math.max(0, terambilNpk));
        const newSisaOrg = Math.max(0, Number(jatahOrganikKg) - Math.max(0, terambilOrg));

        await prisma.alokasiPupuk.update({
          where: { id: existingAlokasi.id },
          data: {
            jatahUreaKg: Number(jatahUreaKg),
            sisaUreaKg: newSisaUrea,
            jatahNpkKg: Number(jatahNpkKg),
            sisaNpkKg: newSisaNpk,
            jatahOrganikKg: Number(jatahOrganikKg),
            sisaOrganikKg: newSisaOrg,
            komoditas,
            luasTanamHa: Number(luasHa),
          },
        });
        updatedCount++;
      } else {
        await prisma.alokasiPupuk.create({
          data: {
            petaniId: targetPetaniId,
            tahun: Number(tahun),
            musimTanam,
            komoditas,
            luasTanamHa: Number(luasHa),
            jatahUreaKg: Number(jatahUreaKg),
            sisaUreaKg: Number(jatahUreaKg),
            jatahNpkKg: Number(jatahNpkKg),
            sisaNpkKg: Number(jatahNpkKg),
            jatahOrganikKg: Number(jatahOrganikKg),
            sisaOrganikKg: Number(jatahOrganikKg),
            status: 'AKTIF',
          },
        });
        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sinkronisasi Alokasi e-RDKK Berhasil: ${updatedCount} diperbarui, ${createdCount} dibuat baru`,
      updatedCount,
      createdCount,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      petaniId,
      tahun = 2026,
      musimTanam = 'MT 1',
      komoditas = 'Padi',
      luasHa = 0.5,
      jatahUreaKg = 0,
      jatahNpkKg = 0,
      jatahOrganikKg = 0,
      resetSisa = false,
    } = body;

    let targetPetaniId = petaniId;
    let existingAlokasi = null;

    if (id) {
      existingAlokasi = await prisma.alokasiPupuk.findUnique({ where: { id } });
      if (existingAlokasi) {
        targetPetaniId = existingAlokasi.petaniId;
      }
    }

    if (!existingAlokasi && targetPetaniId) {
      existingAlokasi = await prisma.alokasiPupuk.findFirst({
        where: {
          petaniId: targetPetaniId,
          tahun: Number(tahun),
          musimTanam,
        },
      });
    }

    if (!targetPetaniId) {
      return NextResponse.json({ success: false, error: 'Data petaniId atau alokasiId wajib disertakan' }, { status: 400 });
    }

    if (existingAlokasi) {
      const terambilUrea = resetSisa ? 0 : Math.max(0, existingAlokasi.jatahUreaKg - existingAlokasi.sisaUreaKg);
      const terambilNpk = resetSisa ? 0 : Math.max(0, existingAlokasi.jatahNpkKg - existingAlokasi.sisaNpkKg);
      const terambilOrg = resetSisa ? 0 : Math.max(0, existingAlokasi.jatahOrganikKg - existingAlokasi.sisaOrganikKg);

      const updated = await prisma.alokasiPupuk.update({
        where: { id: existingAlokasi.id },
        data: {
          komoditas,
          luasTanamHa: Number(luasHa),
          jatahUreaKg: Number(jatahUreaKg),
          sisaUreaKg: Math.max(0, Number(jatahUreaKg) - terambilUrea),
          jatahNpkKg: Number(jatahNpkKg),
          sisaNpkKg: Math.max(0, Number(jatahNpkKg) - terambilNpk),
          jatahOrganikKg: Number(jatahOrganikKg),
          sisaOrganikKg: Math.max(0, Number(jatahOrganikKg) - terambilOrg),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Alokasi pupuk petani berhasil diperbarui!',
        data: updated,
      });
    } else {
      const created = await prisma.alokasiPupuk.create({
        data: {
          petaniId: targetPetaniId,
          tahun: Number(tahun),
          musimTanam,
          komoditas,
          luasTanamHa: Number(luasHa),
          jatahUreaKg: Number(jatahUreaKg),
          sisaUreaKg: Number(jatahUreaKg),
          jatahNpkKg: Number(jatahNpkKg),
          sisaNpkKg: Number(jatahNpkKg),
          jatahOrganikKg: Number(jatahOrganikKg),
          sisaOrganikKg: Number(jatahOrganikKg),
          status: 'AKTIF',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Alokasi pupuk petani baru berhasil ditambahkan!',
        data: created,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const petaniId = searchParams.get('petaniId');
    const tahun = parseInt(searchParams.get('tahun') || '2026');
    const musimTanam = searchParams.get('musimTanam') || 'MT 1';

    if (id) {
      await prisma.alokasiPupuk.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Alokasi pupuk berhasil dihapus!' });
    }

    if (petaniId) {
      const existing = await prisma.alokasiPupuk.findFirst({
        where: {
          petaniId,
          tahun,
          musimTanam,
        },
      });

      if (existing) {
        await prisma.alokasiPupuk.delete({ where: { id: existing.id } });
        return NextResponse.json({ success: true, message: 'Alokasi pupuk petani berhasil dihapus dari musim tanam ini!' });
      } else {
        return NextResponse.json({ success: false, error: 'Data alokasi belum terdaftar untuk dihapus' }, { status: 404 });
      }
    }

    return NextResponse.json({ success: false, error: 'ID atau petaniId harus disertakan' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
