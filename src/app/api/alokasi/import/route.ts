import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';

// 1. Download Template Resmi e-Alokasi Kementan
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isTemplate = searchParams.get('template') === 'true';

    if (isTemplate) {
      const templateData = [
        {
          'NIK (16 Digit)': '3520011205800001',
          'Nama Petani': 'Sugeng Waluyo',
          'Nomor KK': '3520011205800001',
          'Nama Poktan': 'Poktan Sri Mulyo',
          'Desa': 'Kediren',
          'Kecamatan': 'Lembeyan',
          'Komoditas': 'Padi',
          'Luas Lahan (Ha)': 0.85,
          'Alokasi Urea (Kg)': 225,
          'Alokasi NPK (Kg)': 180,
          'Alokasi Organik (Kg)': 100,
          'Nomor HP / WhatsApp': '081234567891',
        },
        {
          'NIK (16 Digit)': '3520011408750002',
          'Nama Petani': 'Parto Suwito',
          'Nomor KK': '3520011408750002',
          'Nama Poktan': 'Poktan Tani Makmur I',
          'Desa': 'Kediren',
          'Kecamatan': 'Lembeyan',
          'Komoditas': 'Padi',
          'Luas Lahan (Ha)': 1.20,
          'Alokasi Urea (Kg)': 300,
          'Alokasi NPK (Kg)': 250,
          'Alokasi Organik (Kg)': 150,
          'Nomor HP / WhatsApp': '081398765432',
        },
        {
          'NIK (16 Digit)': '3520012002820003',
          'Nama Petani': 'Kusnan Hadi',
          'Nomor KK': '3520012002820003',
          'Nama Poktan': 'Poktan Karya Bersama',
          'Desa': 'Tapen',
          'Kecamatan': 'Lembeyan',
          'Komoditas': 'Jagung',
          'Luas Lahan (Ha)': 0.60,
          'Alokasi Urea (Kg)': 150,
          'Alokasi NPK (Kg)': 120,
          'Alokasi Organik (Kg)': 50,
          'Nomor HP / WhatsApp': '082155667788',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);

      // Set lebar kolom otomatis agar rapi saat dibuka di Excel
      worksheet['!cols'] = [
        { wch: 22 }, // NIK
        { wch: 22 }, // Nama
        { wch: 22 }, // KK
        { wch: 24 }, // Poktan
        { wch: 16 }, // Desa
        { wch: 16 }, // Kecamatan
        { wch: 14 }, // Komoditas
        { wch: 16 }, // Luas Ha
        { wch: 18 }, // Urea
        { wch: 18 }, // NPK
        { wch: 20 }, // Organik
        { wch: 22 }, // WhatsApp
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Format_eAlokasi_Lembeyan');

      const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="Template_eAlokasi_Lembeyan_Kementan_2026.xlsx"',
        },
      });
    }

    // Default info status
    const totalPetani = await prisma.petani.count();
    const totalAlokasi = await prisma.alokasiPupuk.count();

    return NextResponse.json({
      success: true,
      info: 'Endpoint Impor Massal Format Baku e-Alokasi Kementan',
      stats: { totalPetani, totalAlokasi },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. Eksekusi Upload & Batch Upsert e-Alokasi
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let rows: any[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'File Excel / CSV tidak ditemukan pada request.' },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      const body = await request.json();
      rows = Array.isArray(body.rows) ? body.rows : [];
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Data tabel kosong atau tidak dapat dibaca dari file.' },
        { status: 400 }
      );
    }

    // Ambil seluruh Poktan untuk pencocokan ID
    const allPoktan = await prisma.poktan.findMany();
    const poktanMap = new Map<string, string>();
    allPoktan.forEach((pk) => {
      poktanMap.set(pk.nama.toLowerCase().trim(), pk.id);
    });

    const results = {
      totalInput: rows.length,
      sukses: 0,
      gagal: 0,
      errors: [] as string[],
      importedFarmers: [] as string[],
    };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const barisKe = i + 2; // Hitungan nomor baris Excel (header = 1)

      // Ambil NIK dari berbagai variasi nama kolom
      const rawNik = String(
        r['NIK (16 Digit)'] || r['NIK'] || r['nik'] || r['No KTP'] || ''
      ).trim().replace(/\D/g, '');

      const nama = String(r['Nama Petani'] || r['Nama'] || r['nama'] || '').trim();
      const namaPoktanRaw = String(r['Nama Poktan'] || r['Poktan'] || r['poktan'] || '').trim();
      const desa = String(r['Desa'] || r['desa'] || 'Kediren').trim();
      const noKk = String(r['Nomor KK'] || r['noKk'] || rawNik).trim().replace(/\D/g, '') || rawNik;
      const komoditas = String(r['Komoditas'] || r['komoditas'] || 'Padi').trim();
      const luasHa = Math.max(0.01, parseFloat(r['Luas Lahan (Ha)'] || r['Luas'] || '0.5') || 0.5);
      const ureaKg = Math.max(0, parseFloat(r['Alokasi Urea (Kg)'] || r['Urea'] || '0') || 0);
      const npkKg = Math.max(0, parseFloat(r['Alokasi NPK (Kg)'] || r['NPK'] || '0') || 0);
      const orgKg = Math.max(0, parseFloat(r['Alokasi Organik (Kg)'] || r['Organik'] || '0') || 0);
      const telepon = String(r['Nomor HP / WhatsApp'] || r['Telepon'] || r['WA'] || '').trim();

      // Validasi Wajib
      if (!rawNik || rawNik.length < 15) {
        results.gagal++;
        results.errors.push(`Baris ${barisKe}: NIK "${rawNik}" tidak valid (wajib 16 digit angka).`);
        continue;
      }

      if (!nama) {
        results.gagal++;
        results.errors.push(`Baris ${barisKe}: Nama Petani wajib diisi.`);
        continue;
      }

      // Cari atau buat Poktan jika belum ada
      let targetPoktanId = poktanMap.get(namaPoktanRaw.toLowerCase());
      if (!targetPoktanId && allPoktan.length > 0) {
        if (namaPoktanRaw) {
          const newPoktan = await prisma.poktan.create({
            data: {
              nama: namaPoktanRaw,
              ketua: `Ketua ${namaPoktanRaw}`,
              desa,
              kecamatan: 'Lembeyan',
              kabupaten: 'Magetan',
            },
          });
          targetPoktanId = newPoktan.id;
          poktanMap.set(namaPoktanRaw.toLowerCase(), newPoktan.id);
        } else {
          targetPoktanId = allPoktan[0].id;
        }
      }

      try {
        // Upsert Petani
        const existingPetani = await prisma.petani.findUnique({
          where: { nik: rawNik },
        });

        let petaniId = '';
        if (existingPetani) {
          petaniId = existingPetani.id;
          await prisma.petani.update({
            where: { id: petaniId },
            data: {
              nama,
              desa,
              totalLuasLahan: Math.max(existingPetani.totalLuasLahan, luasHa),
              telepon: telepon || existingPetani.telepon,
            },
          });
        } else {
          const newPetani = await prisma.petani.create({
            data: {
              nik: rawNik,
              nama,
              noKk,
              alamat: `Desa ${desa}, Kec. Lembeyan`,
              desa,
              kecamatan: 'Lembeyan',
              kabupaten: 'Magetan',
              poktanId: targetPoktanId || allPoktan[0]?.id || 'poktan-default',
              totalLuasLahan: luasHa,
              telepon: telepon || null,
            },
          });
          petaniId = newPetani.id;
        }

        // Upsert AlokasiPupuk Tahun 2026 MT 1
        const existingAlokasi = await prisma.alokasiPupuk.findFirst({
          where: { petaniId, tahun: 2026, musimTanam: 'MT 1' },
        });

        if (existingAlokasi) {
          await prisma.alokasiPupuk.update({
            where: { id: existingAlokasi.id },
            data: {
              komoditas,
              luasTanamHa: luasHa,
              jatahUreaKg: ureaKg,
              sisaUreaKg: ureaKg,
              jatahNpkKg: npkKg,
              sisaNpkKg: npkKg,
              jatahOrganikKg: orgKg,
              sisaOrganikKg: orgKg,
            },
          });
        } else {
          await prisma.alokasiPupuk.create({
            data: {
              petaniId,
              tahun: 2026,
              musimTanam: 'MT 1',
              komoditas,
              luasTanamHa: luasHa,
              jatahUreaKg: ureaKg,
              sisaUreaKg: ureaKg,
              jatahNpkKg: npkKg,
              sisaNpkKg: npkKg,
              jatahOrganikKg: orgKg,
              sisaOrganikKg: orgKg,
              status: 'AKTIF',
            },
          });
        }

        results.sukses++;
        results.importedFarmers.push(`${nama} (${rawNik})`);
      } catch (err: any) {
        results.gagal++;
        results.errors.push(`Baris ${barisKe} (${nama}): ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Impor massal selesai! Berhasil: ${results.sukses} data petani & kuota e-RDKK, Gagal: ${results.gagal} baris.`,
      summary: results,
    });
  } catch (err: any) {
    console.error('Error batch import e-alokasi:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
