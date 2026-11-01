import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const templateData = [
      {
        'NIK': '3520011205800001',
        'Nama Petani': 'Sugeng Waluyo',
        'Nomor KK': '3520011205800001',
        'Nama Poktan': 'Poktan Sri Mulyo',
        'Desa': 'Kediren',
        'Komoditas': 'Padi',
        'Luas Lahan (Ha)': 0.85,
        'Alokasi Urea (Kg)': 225,
        'Alokasi NPK (Kg)': 180,
        'Alokasi Organik (Kg)': 100,
        'Nomor HP / WhatsApp': '081234567891',
      },
      {
        'NIK': '3520011408750002',
        'Nama Petani': 'Parto Suwito',
        'Nomor KK': '3520011408750002',
        'Nama Poktan': 'Poktan Tani Makmur I',
        'Desa': 'Kediren',
        'Komoditas': 'Padi',
        'Luas Lahan (Ha)': 1.20,
        'Alokasi Urea (Kg)': 300,
        'Alokasi NPK (Kg)': 250,
        'Alokasi Organik (Kg)': 150,
        'Nomor HP / WhatsApp': '081398765432',
      },
      {
        'NIK': '3520012002820003',
        'Nama Petani': 'Kusnan Hadi',
        'Nomor KK': '3520012002820003',
        'Nama Poktan': 'Poktan Karya Bersama',
        'Desa': 'Tapen',
        'Komoditas': 'Jagung',
        'Luas Lahan (Ha)': 0.60,
        'Alokasi Urea (Kg)': 150,
        'Alokasi NPK (Kg)': 120,
        'Alokasi Organik (Kg)': 50,
        'Nomor HP / WhatsApp': '082155667788',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 22 },
      { wch: 20 },
      { wch: 24 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 22 },
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const tahun = parseInt((formData.get('tahun') as string) || '2026');
    const musimTanam = (formData.get('musimTanam') as string) || 'MT 1';
    const poktanId = formData.get('poktanId') as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'File Excel tidak ditemukan' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

    if (rawRows.length === 0) {
      return NextResponse.json({ success: false, error: 'File Excel kosong atau tidak memiliki baris data' }, { status: 400 });
    }

    let successCount = 0;
    let notFoundCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

      // Helper untuk mencari value kolom tanpa case-sensitive
      const getVal = (possibleKeys: string[]) => {
        for (const k of Object.keys(row)) {
          const cleanK = k.trim().toLowerCase();
          for (const target of possibleKeys) {
            if (cleanK.includes(target.toLowerCase())) {
              return row[k];
            }
          }
        }
        return '';
      };

      const nik = String(getVal(['nik', 'ktp', 'nomor ktp'])).trim();
      const nama = String(getVal(['nama', 'petani', 'nama petani'])).trim();
      const ureaStr = String(getVal(['urea'])).trim();
      const npkStr = String(getVal(['npk', 'phonska', 'npk/phonska'])).trim();
      const organikStr = String(getVal(['organik', 'petroganik'])).trim();

      if (!nik && !nama) continue;

      const jatahUrea = parseFloat(ureaStr.replace(/[^0-9.]/g, '')) || 0;
      const jatahNpk = parseFloat(npkStr.replace(/[^0-9.]/g, '')) || 0;
      const jatahOrganik = parseFloat(organikStr.replace(/[^0-9.]/g, '')) || 0;

      // Cari petani di database berdasarkan NIK atau Nama
      let petani = null;
      if (nik) {
        petani = await prisma.petani.findUnique({
          where: { nik },
          include: { lahan: true },
        });
      }
      if (!petani && nama) {
        petani = await prisma.petani.findFirst({
          where: {
            nama: { contains: nama },
            ...(poktanId && poktanId !== 'SEMUA' ? { poktanId } : {}),
          },
          include: { lahan: true },
        });
      }

      if (!petani) {
        if (nik && nik.length >= 15 && nama) {
          // Auto-registrasi petani baru dari file Excel e-Alokasi
          const defaultPoktan = poktanId && poktanId !== 'SEMUA' ? poktanId : (await prisma.poktan.findFirst())?.id || 'poktan-default';
          const desaRow = String(getVal(['desa', 'kelurahan'])).trim() || 'Kediren';
          const noKkRow = String(getVal(['kk', 'nomor kk'])).trim().replace(/\D/g, '') || nik;
          const telpRow = String(getVal(['telepon', 'hp', 'wa'])).trim() || null;
          petani = await prisma.petani.create({
            data: {
              nik,
              nama,
              noKk: noKkRow,
              alamat: `Desa ${desaRow}, Kec. Lembeyan`,
              desa: desaRow,
              kecamatan: 'Lembeyan',
              kabupaten: 'Magetan',
              poktanId: defaultPoktan,
              totalLuasLahan: 0.5,
              telepon: telpRow,
            },
            include: { lahan: true },
          });
        } else {
          notFoundCount++;
          errors.push(`Baris ${i + 2}: Petani NIK "${nik || '-'}" / Nama "${nama || '-'}" data tidak lengkap untuk didaftarkan`);
          continue;
        }
      }

      const totalLuas =
        petani.totalLuasLahan > 0
          ? petani.totalLuasLahan
          : petani.lahan.reduce((acc, l) => acc + (l.luasHa || 0), 0) || 0.5;

      // Cek apakah alokasi sudah ada untuk tahun & musim tanam ini
      const existing = await prisma.alokasiPupuk.findFirst({
        where: {
          petaniId: petani.id,
          tahun,
          musimTanam,
        },
      });

      if (existing) {
        const terambilUrea = existing.jatahUreaKg - existing.sisaUreaKg;
        const terambilNpk = existing.jatahNpkKg - existing.sisaNpkKg;
        const terambilOrg = existing.jatahOrganikKg - existing.sisaOrganikKg;

        await prisma.alokasiPupuk.update({
          where: { id: existing.id },
          data: {
            jatahUreaKg: jatahUrea,
            sisaUreaKg: Math.max(0, jatahUrea - Math.max(0, terambilUrea)),
            jatahNpkKg: jatahNpk,
            sisaNpkKg: Math.max(0, jatahNpk - Math.max(0, terambilNpk)),
            jatahOrganikKg: jatahOrganik,
            sisaOrganikKg: Math.max(0, jatahOrganik - Math.max(0, terambilOrg)),
            luasTanamHa: totalLuas,
          },
        });
      } else {
        await prisma.alokasiPupuk.create({
          data: {
            petaniId: petani.id,
            tahun,
            musimTanam,
            komoditas: petani.lahan[0]?.komoditas || 'Padi',
            luasTanamHa: totalLuas,
            jatahUreaKg: jatahUrea,
            sisaUreaKg: jatahUrea,
            jatahNpkKg: jatahNpk,
            sisaNpkKg: jatahNpk,
            jatahOrganikKg: jatahOrganik,
            sisaOrganikKg: jatahOrganik,
            status: 'AKTIF',
          },
        });
      }

      successCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Impor Berhasil: ${successCount} data alokasi pupuk petani disinkronkan otomatis!`,
      successCount,
      notFoundCount,
      errors: errors.slice(0, 5),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
