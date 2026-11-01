import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePolygonArea, hitungRekomendasiPupuk } from '@/lib/calculations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const komoditas = searchParams.get('komoditas');
    const poktanId = searchParams.get('poktanId');
    const petaniId = searchParams.get('petaniId');
    const status = searchParams.get('status');

    const where: any = {};
    if (komoditas && komoditas !== 'SEMUA') {
      where.komoditas = { contains: komoditas };
    }
    if (poktanId && poktanId !== 'SEMUA') {
      where.petani = { poktanId };
    }
    if (petaniId && petaniId !== 'SEMUA') {
      where.petaniId = petaniId;
    }
    if (status && status !== 'SEMUA') {
      where.statusVerifikasi = status;
    }

    const lahanList = await prisma.lahan.findMany({
      where,
      include: {
        petani: {
          include: {
            poktan: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: lahanList });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      namaLahan,
      petaniId,
      komoditas,
      kabupaten,
      coordinates, // array of [lat, lng]
      statusKepemilikan,
      statusIrigasi,
      nomorPipil,
      batasUtara,
      batasSelatan,
      batasTimur,
      batasBarat,
    } = body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Koordinat poligon minimal harus memiliki 3 titik' },
        { status: 400 }
      );
    }

    // Hitung luas otomatis
    const { luasM2, luasHa } = calculatePolygonArea(coordinates);

    // Cek potensi tumpang tindih spasial dengan seluruh lahan terdaftar
    const existingLahanList = await prisma.lahan.findMany({
      select: {
        id: true,
        kodeLahan: true,
        namaLahan: true,
        komoditas: true,
        coordinates: true,
        petani: { select: { nama: true } },
      },
    });

    const { checkPolygonOverlap } = await import('@/lib/calculations');
    const overlapResult = checkPolygonOverlap(coordinates, existingLahanList as any);

    if (overlapResult.hasOverlap && !body.forceOverride) {
      const firstPlot = overlapResult.overlappingPlots[0];
      return NextResponse.json(
        {
          success: false,
          error: `Peringatan Tumpang Tindih Spasial: Poligon bertabrakan dengan petak ${firstPlot.namaLahan} (${firstPlot.kodeLahan}) milik ${firstPlot.namaPetani}. (${firstPlot.intersectionType})`,
          isOverlapConflict: true,
          overlapDetails: overlapResult.overlappingPlots,
        },
        { status: 409 }
      );
    }

    // Hitung titik tengah poligon
    const centerLat = coordinates.reduce((sum, c) => sum + c[0], 0) / coordinates.length;
    const centerLng = coordinates.reduce((sum, c) => sum + c[1], 0) / coordinates.length;

    // Pastikan validitas petaniId (termasuk pendaftaran petani baru dari peta mobile / desktop / offline)
    let finalPetaniId = petaniId;
    const petaniNameInput = (body.petaniNama || body.petaniManual || '').trim();

    // Jika petaniId kosong, 'new', 'offline-petani', atau ada input manual nama petani
    if (!finalPetaniId || finalPetaniId === 'offline-petani' || finalPetaniId === 'new') {
      let existingPetani = null;
      if (petaniNameInput) {
        existingPetani = await prisma.petani.findFirst({
          where: {
            nama: { equals: petaniNameInput },
          },
        });
      }

      if (!existingPetani) {
        // Ambil poktan target atau fallback ke poktan pertama di database
        let targetPoktan = null;
        if (body.poktanId) {
          targetPoktan = await prisma.poktan.findUnique({ where: { id: body.poktanId } });
        }
        if (!targetPoktan) {
          targetPoktan = await prisma.poktan.findFirst();
        }

        // Generate NIK 16 digit valid anti-bentrok
        let generatedNik = body.petaniNik;
        if (!generatedNik) {
          do {
            generatedNik =
              '352001' +
              Date.now().toString().slice(-6) +
              Math.floor(1000 + Math.random() * 9000).toString();
          } while (await prisma.petani.findUnique({ where: { nik: generatedNik } }));
        }

        existingPetani = await prisma.petani.create({
          data: {
            nik: generatedNik,
            nama: petaniNameInput || 'Petani BPP Lembeyan',
            noKk: generatedNik,
            alamat: body.alamat || 'Kecamatan Lembeyan',
            desa: body.desa || targetPoktan?.desa || 'Kediren',
            kecamatan: 'Lembeyan',
            kabupaten: 'Magetan',
            poktanId: targetPoktan?.id || 'poktan-default',
            statusVerifikasi: 'TERVERIFIKASI',
          },
        });
      }
      finalPetaniId = existingPetani.id;
    }

    // Generate kodeLahan anti-bentrok (collision-proof)
    const existingLahanCodes = await prisma.lahan.findMany({
      where: { kodeLahan: { startsWith: 'LHN-2026-' } },
      select: { kodeLahan: true },
    });
    let maxNumber = 0;
    for (const item of existingLahanCodes) {
      const match = item.kodeLahan.match(/LHN-2026-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    let nextNum = Math.max(maxNumber + 1, existingLahanCodes.length + 1);
    let kodeLahan = `LHN-2026-${String(nextNum).padStart(3, '0')}`;
    while (await prisma.lahan.findUnique({ where: { kodeLahan } })) {
      nextNum++;
      kodeLahan = `LHN-2026-${String(nextNum).padStart(3, '0')}`;
    }

    let newLahan = null;
    let attempts = 0;
    while (!newLahan && attempts < 5) {
      attempts++;
      try {
        if (attempts > 1) {
          nextNum++;
          kodeLahan = `LHN-2026-${String(nextNum).padStart(3, '0')}-${Math.floor(100 + Math.random() * 900)}`;
        }
        newLahan = await prisma.lahan.create({
          data: {
            kodeLahan,
            namaLahan,
            petaniId: finalPetaniId,
            komoditas,
            luasHa,
            luasM2,
            kabupaten: kabupaten || 'Magetan',
            statusKepemilikan: statusKepemilikan || 'Milik Sendiri',
            statusIrigasi: statusIrigasi || 'Irigasi Teknis',
            nomorPipil: nomorPipil || null,
            batasUtara: batasUtara || null,
            batasSelatan: batasSelatan || null,
            batasTimur: batasTimur || null,
            batasBarat: batasBarat || null,
            coordinates: JSON.stringify(coordinates),
            centerLat,
            centerLng,
            fotoLahan: body.fotoLahan || null,
            statusVerifikasi: 'TERVERIFIKASI',
          },
          include: {
            petani: {
              include: { poktan: true },
            },
          },
        });
      } catch (createErr: any) {
        if ((createErr?.code === 'P2002' || String(createErr?.message).includes('kodeLahan')) && attempts < 5) {
          continue;
        }
        throw createErr;
      }
    }

    // 1. Akumulasi total luas lahan di profil petani
    const allPetaniLahan = await prisma.lahan.findMany({
      where: { petaniId: finalPetaniId },
    });
    const totalLuas = allPetaniLahan.reduce((sum, l) => sum + l.luasHa, 0);
    await prisma.petani.update({
      where: { id: finalPetaniId },
      data: { totalLuasLahan: Math.round(totalLuas * 100) / 100 },
    });

    // 2. Akumulasi kuota pupuk subsidi aktif petani otomatis sesuai penambahan lahan baru
    const activeAlokasi = await prisma.alokasiPupuk.findFirst({
      where: { petaniId: finalPetaniId, status: 'AKTIF' },
    });
    if (activeAlokasi) {
      const tambahan = hitungRekomendasiPupuk(komoditas, luasHa);
      await prisma.alokasiPupuk.update({
        where: { id: activeAlokasi.id },
        data: {
          luasTanamHa: Math.round((activeAlokasi.luasTanamHa + luasHa) * 100) / 100,
          jatahUreaKg: activeAlokasi.jatahUreaKg + tambahan.ureaKg,
          sisaUreaKg: activeAlokasi.sisaUreaKg + tambahan.ureaKg,
          jatahNpkKg: activeAlokasi.jatahNpkKg + tambahan.npkKg,
          sisaNpkKg: activeAlokasi.sisaNpkKg + tambahan.npkKg,
          jatahOrganikKg: activeAlokasi.jatahOrganikKg + tambahan.organikKg,
          sisaOrganikKg: activeAlokasi.sisaOrganikKg + tambahan.organikKg,
        },
      });
    }

    return NextResponse.json({ success: true, data: newLahan }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID Petak Lahan wajib disertakan' }, { status: 400 });
    }

    const existing = await prisma.lahan.findUnique({
      where: { id },
      include: { petani: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Petak lahan tidak ditemukan' }, { status: 404 });
    }

    const {
      namaLahan,
      petaniId,
      komoditas,
      kabupaten,
      statusKepemilikan,
      statusIrigasi,
      nomorPipil,
      batasUtara,
      batasSelatan,
      batasTimur,
      batasBarat,
      fotoLahan,
    } = body;

    const oldPetaniId = existing.petaniId;
    const targetPetaniId = petaniId && petaniId !== oldPetaniId ? petaniId : oldPetaniId;

    const updateData: any = {};
    if (namaLahan !== undefined && typeof namaLahan === 'string' && namaLahan.trim()) {
      updateData.namaLahan = namaLahan.trim();
    }
    if (petaniId !== undefined && petaniId) {
      updateData.petaniId = targetPetaniId;
    }
    if (komoditas !== undefined && komoditas) {
      updateData.komoditas = komoditas;
    }
    if (kabupaten !== undefined) {
      updateData.kabupaten = kabupaten;
    }
    if (statusKepemilikan !== undefined) {
      updateData.statusKepemilikan = statusKepemilikan;
    }
    if (statusIrigasi !== undefined) {
      updateData.statusIrigasi = statusIrigasi;
    }
    if (nomorPipil !== undefined) {
      updateData.nomorPipil = nomorPipil ? String(nomorPipil).trim() : null;
    }
    if (batasUtara !== undefined) {
      updateData.batasUtara = batasUtara ? String(batasUtara).trim() : null;
    }
    if (batasSelatan !== undefined) {
      updateData.batasSelatan = batasSelatan ? String(batasSelatan).trim() : null;
    }
    if (batasTimur !== undefined) {
      updateData.batasTimur = batasTimur ? String(batasTimur).trim() : null;
    }
    if (batasBarat !== undefined) {
      updateData.batasBarat = batasBarat ? String(batasBarat).trim() : null;
    }
    if (fotoLahan !== undefined) {
      updateData.fotoLahan = fotoLahan;
    }

    const updatedLahan = await prisma.lahan.update({
      where: { id },
      data: updateData,
      include: {
        petani: {
          include: { poktan: true },
        },
      },
    });

    // Jika pemilik petani dialihkan, rekalkulasi total luas lahan untuk petani lama dan baru
    if (targetPetaniId !== oldPetaniId) {
      // 1. Rekalkulasi petani lama
      const oldRemaining = await prisma.lahan.findMany({ where: { petaniId: oldPetaniId } });
      const oldTotalLuas = oldRemaining.reduce((sum, l) => sum + l.luasHa, 0);
      await prisma.petani.update({
        where: { id: oldPetaniId },
        data: { totalLuasLahan: Math.round(oldTotalLuas * 100) / 100 },
      });

      // 2. Rekalkulasi petani baru
      const newAllLahan = await prisma.lahan.findMany({ where: { petaniId: targetPetaniId } });
      const newTotalLuas = newAllLahan.reduce((sum, l) => sum + l.luasHa, 0);
      await prisma.petani.update({
        where: { id: targetPetaniId },
        data: { totalLuasLahan: Math.round(newTotalLuas * 100) / 100 },
      });
    }

    return NextResponse.json({ success: true, data: updatedLahan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID Lahan wajib disertakan' }, { status: 400 });
    }

    const existing = await prisma.lahan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Petak lahan tidak ditemukan' }, { status: 404 });
    }

    await prisma.lahan.delete({ where: { id } });

    // Rekalkulasi total luas lahan petani
    const remainingLahan = await prisma.lahan.findMany({
      where: { petaniId: existing.petaniId },
    });
    const totalLuas = remainingLahan.reduce((sum, l) => sum + l.luasHa, 0);
    await prisma.petani.update({
      where: { id: existing.petaniId },
      data: { totalLuasLahan: Math.round(totalLuas * 100) / 100 },
    });

    // Sesuaikan kuota pupuk aktif petani
    const activeAlokasi = await prisma.alokasiPupuk.findFirst({
      where: { petaniId: existing.petaniId, status: 'AKTIF' },
    });
    if (activeAlokasi) {
      const pengurangan = hitungRekomendasiPupuk(existing.komoditas, existing.luasHa);
      await prisma.alokasiPupuk.update({
        where: { id: activeAlokasi.id },
        data: {
          luasTanamHa: Math.max(0, Math.round((activeAlokasi.luasTanamHa - existing.luasHa) * 100) / 100),
          jatahUreaKg: Math.max(0, activeAlokasi.jatahUreaKg - pengurangan.ureaKg),
          sisaUreaKg: Math.max(0, activeAlokasi.sisaUreaKg - pengurangan.ureaKg),
          jatahNpkKg: Math.max(0, activeAlokasi.jatahNpkKg - pengurangan.npkKg),
          sisaNpkKg: Math.max(0, activeAlokasi.sisaNpkKg - pengurangan.npkKg),
          jatahOrganikKg: Math.max(0, activeAlokasi.jatahOrganikKg - pengurangan.organikKg),
          sisaOrganikKg: Math.max(0, activeAlokasi.sisaOrganikKg - pengurangan.organikKg),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
