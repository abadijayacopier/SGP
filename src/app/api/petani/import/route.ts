import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rows, defaultPoktanId } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Data impor kosong atau tidak ada baris yang valid.' },
        { status: 400 }
      );
    }

    const poktans = await prisma.poktan.findMany();
    const fallbackPoktan =
      poktans.find((p) => p.id === defaultPoktanId) || poktans[0];

    if (!fallbackPoktan) {
      return NextResponse.json(
        { success: false, error: 'Belum ada data Kelompok Tani (Poktan) di database.' },
        { status: 400 }
      );
    }

    let successCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];

      // Ambil NIK / KTP
      const rawKtp = r['KTP'] || r['ktp'] || r['NIK'] || r['nik'] || r['No KTP'] || '';
      const nik = String(rawKtp).replace(/['"\s-]/g, '').trim();

      // Ambil Nama Petani
      const nama = String(r['Nama Petani'] || r['nama petani'] || r['Nama'] || r['nama'] || '').trim();

      if (!nik || !nama) {
        continue;
      }

      // Validasi NIK minimal 10 digit angka
      if (!/^\d{10,18}$/.test(nik)) {
        errors.push(`Baris ${i + 1}: NIK "${nik}" tidak valid (harus 16 digit angka).`);
        continue;
      }

      const tempatLahir = String(r['Tempat Lahir'] || r['tempat lahir'] || 'Magetan').trim();
      const tanggalLahir = String(r['Tanggal Lahir'] || r['tanggal lahir'] || '1980-01-01').trim();
      const namaIbuKandung = String(r['Nama Ibu Kandung'] || r['nama ibu kandung'] || '-').trim();
      const alamat = String(r['Alamat'] || r['alamat'] || 'Kecamatan Lembeyan').trim();
      const komoditasRaw = String(r['Komoditas'] || r['komoditas'] || r['Pola Tanam'] || r['pola tanam'] || 'Padi').trim();
      const primaryKomoditas = komoditasRaw.includes('Jagung') && !komoditasRaw.includes('Padi')
        ? 'Jagung'
        : komoditasRaw.includes('Tebu')
        ? 'Tebu'
        : 'Padi';

      // Parse Luas (Ha)
      const rawLuas = r['luas(ha)'] || r['luas (ha)'] || r['Luas (Ha)'] || r['Luas'] || r['luas'] || '0.5';
      const luasHa = Math.max(
        0.01,
        parseFloat(String(rawLuas).replace(',', '.').replace(/[^\d.]/g, '')) || 0.5
      );

      // Parse Koordinat (misal: "-7.71234, 111.34567")
      const rawKoord = String(r['koordinat'] || r['Koordinat'] || r['Titik Koordinat'] || '').trim();
      let centerLat = -7.7153;
      let centerLng = 111.3485;
      let hasCustomCoord = false;

      if (rawKoord && rawKoord !== '-') {
        const parts = rawKoord.split(/[,;\s]+/).map((p) => parseFloat(p.trim())).filter((n) => !isNaN(n));
        if (parts.length >= 2) {
          centerLat = parts[0];
          centerLng = parts[1];
          hasCustomCoord = true;
        }
      }

      // Cek apakah Petani sudah ada di database
      let existing = await prisma.petani.findUnique({
        where: { nik },
        include: { lahan: true },
      });

      if (existing) {
        // Update data petani
        await prisma.petani.update({
          where: { id: existing.id },
          data: {
            nama,
            tempatLahir: tempatLahir || existing.tempatLahir,
            tanggalLahir: tanggalLahir || existing.tanggalLahir,
            namaIbuKandung: namaIbuKandung || existing.namaIbuKandung,
            alamat: alamat || existing.alamat,
            totalLuasLahan: luasHa,
          },
        });

        // Update atau buat lahan jika ada koordinat
        if (existing.lahan.length > 0) {
          await prisma.lahan.update({
            where: { id: existing.lahan[0].id },
            data: {
              luasHa,
              luasM2: luasHa * 10000,
              ...(hasCustomCoord ? { centerLat, centerLng } : {}),
            },
          });
        } else if (hasCustomCoord) {
          const kodeLahan = `LHN-KMT-${nik.slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
          const coords = JSON.stringify([
            [centerLat + 0.0005, centerLng - 0.0005],
            [centerLat + 0.0005, centerLng + 0.0005],
            [centerLat - 0.0005, centerLng + 0.0005],
            [centerLat - 0.0005, centerLng - 0.0005],
          ]);
          await prisma.lahan.create({
            data: {
              kodeLahan,
              namaLahan: `Blok Sawah ${nama}`,
              petaniId: existing.id,
              komoditas: primaryKomoditas,
              luasHa,
              luasM2: luasHa * 10000,
              kabupaten: 'Magetan',
              coordinates: coords,
              centerLat,
              centerLng,
            },
          });
        }

        updatedCount++;
      } else {
        // Buat Petani Baru
        const newPetani = await prisma.petani.create({
          data: {
            nik,
            nama,
            noKk: nik,
            tempatLahir,
            tanggalLahir,
            namaIbuKandung,
            alamat,
            desa: fallbackPoktan.desa || 'Kediren',
            kecamatan: 'Lembeyan',
            kabupaten: 'Magetan',
            poktanId: fallbackPoktan.id,
            totalLuasLahan: luasHa,
            statusVerifikasi: 'TERVERIFIKASI',
          },
        });

        // Buat Lahan untuk Petani Baru
        const kodeLahan = `LHN-KMT-${nik.slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
        const coords = JSON.stringify([
          [centerLat + 0.0005, centerLng - 0.0005],
          [centerLat + 0.0005, centerLng + 0.0005],
          [centerLat - 0.0005, centerLng + 0.0005],
          [centerLat - 0.0005, centerLng - 0.0005],
        ]);
        await prisma.lahan.create({
          data: {
            kodeLahan,
            namaLahan: `Blok Sawah ${nama}`,
            petaniId: newPetani.id,
            komoditas: primaryKomoditas,
            luasHa,
            luasM2: luasHa * 10000,
            kabupaten: 'Magetan',
            coordinates: coords,
            centerLat,
            centerLng,
          },
        });

        successCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Proses impor selesai: ${successCount} petani baru ditambahkan, ${updatedCount} data petani diperbarui.`,
      summary: {
        baru: successCount,
        diperbarui: updatedCount,
        errors,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
