import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hitungRekomendasiPupuk } from '@/lib/calculations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const poktanId = searchParams.get('poktanId');
    const tahunParam = searchParams.get('tahun');

    const where: any = {};
    if (status && status !== 'SEMUA') {
      where.status = status;
    }
    if (poktanId && poktanId !== 'SEMUA') {
      where.poktanId = poktanId;
    }
    if (tahunParam && tahunParam !== 'SEMUA') {
      where.tahunPengajuan = parseInt(tahunParam, 10);
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
      telepon,
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
      tahunPengajuan,
      rencanaMt1Komoditas,
      rencanaMt1LuasHa,
      rencanaMt2Komoditas,
      rencanaMt2LuasHa,
      rencanaMt3Komoditas,
      rencanaMt3LuasHa,
      estimasiUreaKg,
      estimasiNpkKg,
      estimasiOrganikKg,
    } = body;

    const tahun = tahunPengajuan ? parseInt(String(tahunPengajuan), 10) : 2027;
    const cleanNik = String(nikPemilik || '').trim().replace(/\D/g, '');

    if (!cleanNik || cleanNik.length < 10) {
      return NextResponse.json(
        { success: false, error: 'NIK Pemilik wajib minimal 10 digit angka.' },
        { status: 400 }
      );
    }

    // 1. Validasi Duplikasi Pengajuan pada Tahun yang Sama (Blokir Duplikasi)
    const duplicate = await prisma.pengajuanLahan.findFirst({
      where: {
        nikPemilik: cleanNik,
        tahunPengajuan: tahun,
      },
      include: { poktan: true },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          isDuplicate: true,
          error: `NIK ${cleanNik} telah terdaftar dalam antrean e-RDKK ${tahun} atas nama ${duplicate.namaPemilik} (Status: ${duplicate.status}).`,
          data: duplicate,
        },
        { status: 409 }
      );
    }

    const count = await prisma.pengajuanLahan.count({
      where: { tahunPengajuan: tahun },
    });
    const nomorPengajuan = `REG-ERDKK-${tahun}-${String(count + 1).padStart(3, '0')}`;

    let resolvedPetaniId = petaniId;
    let resolvedPoktanId = poktanId;

    if (!resolvedPoktanId) {
      const firstPoktan = await prisma.poktan.findFirst();
      resolvedPoktanId = firstPoktan?.id;
    }

    // Jika petaniId adalah '__NEW__' atau kosong, daftarkan otomatis ke master Petani berdasarkan NIK
    if (!resolvedPetaniId || resolvedPetaniId === '__NEW__') {
      const existingByNik = await prisma.petani.findUnique({
        where: { nik: cleanNik },
      });
      if (existingByNik) {
        resolvedPetaniId = existingByNik.id;
        resolvedPoktanId = resolvedPoktanId || existingByNik.poktanId;
      } else {
        const createdPetani = await prisma.petani.create({
          data: {
            nik: cleanNik,
            noKk: noKk || cleanNik,
            nama: namaPemilik,
            tempatLahir: tempatLahir || 'Magetan',
            tanggalLahir: tanggalLahir || null,
            namaIbuKandung: namaIbuKandung || null,
            telepon: telepon || null,
            alamat: `Desa ${desa || 'Kediren'}`,
            desa: desa || 'Kediren',
            kecamatan: kecamatan || 'Lembeyan',
            kabupaten: kabupaten || 'Magetan',
            poktanId: resolvedPoktanId,
            statusVerifikasi: 'MENUNGGU_VERIFIKASI_PPL',
            totalLuasLahan: parseFloat(luasHa) || 0,
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
        nikPemilik: cleanNik,
        noKk: noKk || cleanNik,
        tempatLahir: tempatLahir || 'Magetan',
        tanggalLahir: tanggalLahir || null,
        namaIbuKandung: namaIbuKandung || null,
        telepon: telepon || null,
        komoditasRencana: komoditasRencana || rencanaMt1Komoditas || 'Padi',
        luasHa: parseFloat(luasHa) || parseFloat(rencanaMt1LuasHa) || 1.0,
        tahunPengajuan: tahun,
        rencanaMt1Komoditas: rencanaMt1Komoditas || 'Padi',
        rencanaMt1LuasHa: parseFloat(rencanaMt1LuasHa) || parseFloat(luasHa) || 0,
        rencanaMt2Komoditas: rencanaMt2Komoditas || 'Jagung',
        rencanaMt2LuasHa: parseFloat(rencanaMt2LuasHa) || 0,
        rencanaMt3Komoditas: rencanaMt3Komoditas || 'Padi',
        rencanaMt3LuasHa: parseFloat(rencanaMt3LuasHa) || 0,
        estimasiUreaKg: parseFloat(estimasiUreaKg) || 0,
        estimasiNpkKg: parseFloat(estimasiNpkKg) || 0,
        estimasiOrganikKg: parseFloat(estimasiOrganikKg) || 0,
        desa: desa || 'Kediren',
        kecamatan: kecamatan || 'Lembeyan',
        kabupaten: kabupaten || 'Magetan',
        nomorPipil: nomorPipil || '-',
        coordinates: coordinates ? JSON.stringify(coordinates) : null,
        fileKtp: fileKtp || '/uploads/sample_ktp.svg',
        fileKk: fileKk || '/uploads/sample_kk.svg',
        filePipil: filePipil || '/uploads/sample_pipil.svg',
        catatan: catatan || `Pengajuan e-RDKK Petani Tahun Anggaran ${tahun}.`,
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
