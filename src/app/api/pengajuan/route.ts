import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hitungRekomendasiPupuk } from '@/lib/calculations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const poktanId = searchParams.get('poktanId');

    const where: any = {};
    if (status && status !== 'SEMUA') {
      where.status = status;
    }
    if (poktanId && poktanId !== 'SEMUA') {
      where.poktanId = poktanId;
    }

    const pengajuanList = await prisma.pengajuanLahan.findMany({
      where,
      include: {
        petani: true,
        poktan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedList = pengajuanList.map((item) => ({
      ...item,
      tempatLahir: item.tempatLahir || item.petani?.tempatLahir || 'Magetan',
      tanggalLahir: item.tanggalLahir || item.petani?.tanggalLahir || '1975-04-23',
      namaIbuKandung: item.namaIbuKandung || item.petani?.namaIbuKandung || 'Hj. Sumirah',
      kabupaten: item.kabupaten || item.petani?.kabupaten || 'Magetan',
    }));

    return NextResponse.json({ success: true, data: enrichedList });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      petaniId,
      poktanId,
      namaPemilik,
      nikPemilik,
      noKk,
      tempatLahir,
      tanggalLahir,
      namaIbuKandung,
      komoditasRencana,
      luasHa,
      desa,
      kecamatan,
      kabupaten,
      nomorPipil,
      coordinates,
      fileKtp,
      fileKk,
      filePipil,
      catatan,
    } = body;

    const count = await prisma.pengajuanLahan.count();
    const nomorPengajuan = `REG-ERDKK-2026-${String(count + 1).padStart(3, '0')}`;

    let resolvedPetaniId = petaniId;
    let resolvedPoktanId = poktanId;

    if (!resolvedPoktanId) {
      const firstPoktan = await prisma.poktan.findFirst();
      resolvedPoktanId = firstPoktan?.id;
    }

    // Jika petaniId adalah '__NEW__' atau kosong, daftarkan otomatis ke master Petani berdasarkan NIK
    if (!resolvedPetaniId || resolvedPetaniId === '__NEW__') {
      const existingByNik = await prisma.petani.findUnique({
        where: { nik: nikPemilik },
      });
      if (existingByNik) {
        resolvedPetaniId = existingByNik.id;
        resolvedPoktanId = resolvedPoktanId || existingByNik.poktanId;
      } else {
        const createdPetani = await prisma.petani.create({
          data: {
            nik: nikPemilik,
            noKk: noKk || nikPemilik,
            nama: namaPemilik,
            tempatLahir: tempatLahir || 'Magetan',
            tanggalLahir: tanggalLahir || null,
            namaIbuKandung: namaIbuKandung || null,
            alamat: `Desa ${desa || 'Kediren'}`,
            desa: desa || 'Kediren',
            kecamatan: kecamatan || 'Lembeyan',
            kabupaten: kabupaten || 'Magetan',
            poktanId: resolvedPoktanId,
            statusVerifikasi: 'MENUNGGU_VERIFIKASI_PPL',
            totalLuasLahan: 0,
          },
        });
        resolvedPetaniId = createdPetani.id;
      }
    }

    const newPengajuan = await prisma.pengajuanLahan.create({
      data: {
        nomorPengajuan,
        petaniId: resolvedPetaniId,
        poktanId: resolvedPoktanId,
        namaPemilik,
        nikPemilik,
        noKk,
        tempatLahir: tempatLahir || 'Magetan',
        tanggalLahir: tanggalLahir || null,
        namaIbuKandung: namaIbuKandung || null,
        komoditasRencana,
        luasHa: parseFloat(luasHa) || 1.0,
        desa,
        kecamatan,
        kabupaten: kabupaten || 'Magetan',
        nomorPipil,
        coordinates: coordinates ? JSON.stringify(coordinates) : null,
        fileKtp: fileKtp || '/uploads/sample_ktp.svg',
        fileKk: fileKk || '/uploads/sample_kk.svg',
        filePipil: filePipil || '/uploads/sample_pipil.svg',
        catatan: catatan || 'Pengajuan baru e-RDKK dan pemetaan petak lahan.',
        status: 'DIAJUKAN_POKTAN',
      },
      include: {
        petani: true,
        poktan: true,
      },
    });

    // Sinkronkan juga data TTL, Ibu Kandung & Kabupaten ke master Petani terkait
    if (petaniId) {
      await prisma.petani
        .update({
          where: { id: petaniId },
          data: {
            ...(tempatLahir ? { tempatLahir } : {}),
            ...(tanggalLahir ? { tanggalLahir } : {}),
            ...(namaIbuKandung ? { namaIbuKandung } : {}),
            ...(kabupaten ? { kabupaten } : {}),
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({ success: true, data: newPengajuan }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, verifierName, approverName, notes } = body;

    const existing = await prisma.pengajuanLahan.findUnique({
      where: { id },
      include: { petani: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Data pengajuan tidak ditemukan' }, { status: 404 });
    }

    const updateData: any = { status };
    if (status === 'DIVERIFIKASI_PPL') {
      updateData.diverifikasiOleh = verifierName || 'Iis Sugiarti, S.P (PPL Kec. Lembeyan)';
      updateData.tanggalVerifikasi = new Date();
      updateData.disetujuiOleh = null;
      updateData.tanggalPersetujuan = null;
    } else if (status === 'DIAJUKAN_POKTAN') {
      updateData.diverifikasiOleh = null;
      updateData.tanggalVerifikasi = null;
      updateData.disetujuiOleh = null;
      updateData.tanggalPersetujuan = null;
    } else if (status === 'DISETUJUI_DINAS') {
      updateData.disetujuiOleh = approverName || 'Ir. Bambang Hermanto, M.Si (Admin Kec. Lembeyan)';
      updateData.tanggalPersetujuan = new Date();

      // Buat alokasi kuota e-RDKK otomatis jika belum ada untuk musim ini
      const pupuk = hitungRekomendasiPupuk(existing.komoditasRencana, existing.luasHa);
      await prisma.alokasiPupuk.create({
        data: {
          petaniId: existing.petaniId,
          tahun: 2026,
          musimTanam: 'MT 1 (Rendeng)',
          komoditas: existing.komoditasRencana,
          luasTanamHa: existing.luasHa,
          jatahUreaKg: pupuk.ureaKg,
          sisaUreaKg: pupuk.ureaKg,
          jatahNpkKg: pupuk.npkKg,
          sisaNpkKg: pupuk.npkKg,
          jatahOrganikKg: pupuk.organikKg,
          sisaOrganikKg: pupuk.organikKg,
          status: 'AKTIF',
        },
      });

      // Buat petak Lahan GIS otomatis dengan poligon unik di Kecamatan Lembeyan jika belum terdaftar
      const existingPlot = await prisma.lahan.findFirst({
        where: {
          petaniId: existing.petaniId,
          nomorPipil: existing.nomorPipil,
        },
      });
      if (!existingPlot) {
        const countLahan = await prisma.lahan.count();
        let nextLahanNum = countLahan + 1;
        let kodeLahan = `LHN-2026-${String(nextLahanNum).padStart(3, '0')}`;
        while (await prisma.lahan.findUnique({ where: { kodeLahan } })) {
          nextLahanNum++;
          kodeLahan = `LHN-2026-${String(nextLahanNum).padStart(3, '0')}`;
        }
        let polyCoords: [number, number][] = [];
        try {
          if (existing.coordinates) {
            polyCoords = JSON.parse(existing.coordinates);
          }
        } catch {
          polyCoords = [];
        }
        if (polyCoords.length < 3) {
          // Bangkitkan poligon segi-5 unik di sekitar Desa Kecamatan Lembeyan sesuai luasHa
          const baseLat = -7.7675 - (countLahan % 7) * 0.0022;
          const baseLng = 111.421 + ((countLahan * 3) % 7) * 0.0021;
          const sideDeg = Math.sqrt(Math.max(0.2, existing.luasHa) * 10000) / 111000;
          polyCoords = [
            [Number(baseLat.toFixed(5)), Number(baseLng.toFixed(5))],
            [Number((baseLat + sideDeg * 0.15).toFixed(5)), Number((baseLng + sideDeg * 0.95).toFixed(5))],
            [Number((baseLat - sideDeg * 0.55).toFixed(5)), Number((baseLng + sideDeg * 1.15).toFixed(5))],
            [Number((baseLat - sideDeg * 1.05).toFixed(5)), Number((baseLng + sideDeg * 0.65).toFixed(5))],
            [Number((baseLat - sideDeg * 0.85).toFixed(5)), Number((baseLng - sideDeg * 0.1).toFixed(5))],
          ];
        }
        const centerLat =
          Math.round((polyCoords.reduce((s, c) => s + c[0], 0) / polyCoords.length) * 100000) / 100000;
        const centerLng =
          Math.round((polyCoords.reduce((s, c) => s + c[1], 0) / polyCoords.length) * 100000) / 100000;

        try {
          await prisma.lahan.create({
            data: {
              kodeLahan,
              namaLahan: `Petak Sawah ${existing.komoditasRencana} Desa ${existing.desa} (${existing.namaPemilik})`,
              petaniId: existing.petaniId,
              komoditas: existing.komoditasRencana,
              luasHa: existing.luasHa,
              luasM2: Math.round(existing.luasHa * 10000),
              kabupaten: existing.kabupaten || 'Magetan',
              statusKepemilikan: 'Milik Sendiri',
              statusIrigasi: 'Irigasi Teknis',
              nomorPipil: existing.nomorPipil,
              batasUtara: `Saluran Irigasi Desa ${existing.desa}`,
              batasSelatan: `Jalan Usaha Tani Desa ${existing.desa}`,
              batasTimur: 'Petak Sawah Anggota Poktan',
              batasBarat: 'Saluran Tersier Lembeyan',
              coordinates: JSON.stringify(polyCoords),
              centerLat,
              centerLng,
              statusVerifikasi: 'TERVERIFIKASI',
            },
          });
        } catch (err: any) {
          if (err?.code === 'P2002' || String(err?.message).includes('kodeLahan')) {
            kodeLahan = `LHN-2026-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
            await prisma.lahan.create({
              data: {
                kodeLahan,
                namaLahan: `Petak Sawah ${existing.komoditasRencana} Desa ${existing.desa} (${existing.namaPemilik})`,
                petaniId: existing.petaniId,
                komoditas: existing.komoditasRencana,
                luasHa: existing.luasHa,
                luasM2: Math.round(existing.luasHa * 10000),
                kabupaten: existing.kabupaten || 'Magetan',
                statusKepemilikan: 'Milik Sendiri',
                statusIrigasi: 'Irigasi Teknis',
                nomorPipil: existing.nomorPipil,
                batasUtara: `Saluran Irigasi Desa ${existing.desa}`,
                batasSelatan: `Jalan Usaha Tani Desa ${existing.desa}`,
                batasTimur: 'Petak Sawah Anggota Poktan',
                batasBarat: 'Saluran Tersier Lembeyan',
                coordinates: JSON.stringify(polyCoords),
                centerLat,
                centerLng,
                statusVerifikasi: 'TERVERIFIKASI',
              },
            });
          } else {
            throw err;
          }
        }
      }
    }

    if (status === 'DITOLAK') {
      updateData.status = 'DITOLAK';
      updateData.catatan = notes || 'Pengajuan ditolak setelah verifikasi data fisik & administrasi.';
    }

    if (notes) {
      updateData.catatan = notes;
    }

    const updated = await prisma.pengajuanLahan.update({
      where: { id },
      data: updateData,
      include: { petani: true, poktan: true },
    });

    return NextResponse.json({ success: true, data: updated, message: 'Status pengajuan berhasil diperbarui!' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID pengajuan wajib disertakan' }, { status: 400 });
    }

    const existing = await prisma.pengajuanLahan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Data pengajuan tidak ditemukan' }, { status: 404 });
    }

    await prisma.pengajuanLahan.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Pengajuan ${existing.nomorPengajuan} berhasil dihapus!`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
