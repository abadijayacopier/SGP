import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  generateAutoSignatureSvg,
  generateOfficialStampSvg,
} from '@/lib/signature-utils';

export async function GET() {
  try {
    // 1. Ambil seluruh user dengan role KIOS
    const kiosUsers = await prisma.user.findMany({
      where: { role: 'KIOS' },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Ambil seluruh nama kios unik dari tabel StokKios
    const allStok = await prisma.stokKios.findMany();
    const distinctKiosNames = Array.from(new Set(allStok.map((s) => s.namaKios)));

    // Gabungkan list Kios
    const kiosListMap: Record<string, any> = {};

    // Masukkan dari StokKios
    distinctKiosNames.forEach((namaKios) => {
      const relatedStok = allStok.filter((s) => s.namaKios === namaKios);
      const totalSisaKg = relatedStok.reduce((acc, s) => acc + s.stokSisaKg, 0);
      kiosListMap[namaKios] = {
        id: relatedStok[0]?.id || namaKios,
        namaKios,
        kodeKios: 'KPL-LMB-008',
        pengelola: 'Petugas Kios',
        username: 'kios_bumisubur',
        phone: '082155667788',
        email: null,
        wilayah: 'Kecamatan Lembeyan',
        totalSisaKg,
        stokItems: relatedStok,
      };
    });

    // Perkaya atau tambahkan dari User role KIOS
    kiosUsers.forEach((u) => {
      const kName = u.kiosName || 'UD. Tani Subur Barokah';
      const existing = kiosListMap[kName];
      const relatedStok = allStok.filter((s) => s.namaKios === kName);
      const totalSisaKg = relatedStok.reduce((acc, s) => acc + s.stokSisaKg, 0);

      kiosListMap[kName] = {
        id: u.id,
        namaKios: kName,
        kodeKios: u.nip || existing?.kodeKios || 'KPL-LMB-008',
        pengelola: u.name,
        username: u.username,
        phone: u.phone || existing?.phone || null,
        email: u.email || existing?.email || null,
        wilayah: u.wilayah || existing?.wilayah || 'Kecamatan Lembeyan',
        totalSisaKg,
        stokItems: relatedStok,
      };
    });

    const result = Object.values(kiosListMap);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      namaKios,
      kodeKios,
      pengelola,
      username,
      password,
      wilayah,
      phone,
      email,
      stokAwalUreaKg,
      stokAwalNpkKg,
      stokAwalOrganikKg,
    } = body;

    if (!namaKios || !namaKios.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama Usaha Dagang (UD) / Kios KPL wajib diisi!' },
        { status: 400 }
      );
    }

    if (!pengelola || !pengelola.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama Penanggung Jawab / Pengelola Kios wajib diisi!' },
        { status: 400 }
      );
    }

    if (!username || !username.trim()) {
      return NextResponse.json(
        { success: false, error: 'Username login akun Kios wajib diisi!' },
        { status: 400 }
      );
    }

    const cleanNamaKios = namaKios.trim();
    const cleanPengelola = pengelola.trim();
    const cleanUsername = username.trim();
    const cleanKodeKios = (kodeKios && kodeKios.trim()) || `KPL-LMB-${Math.floor(100 + Math.random() * 900)}`;

    // Cek duplikasi username
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: `Username "${cleanUsername}" sudah digunakan oleh akun lain!` },
        { status: 400 }
      );
    }

    // Cek duplikasi nama kios pada stok
    const existingStok = await prisma.stokKios.findFirst({
      where: { namaKios: cleanNamaKios },
    });
    if (existingStok) {
      return NextResponse.json(
        { success: false, error: `Kios dengan nama "${cleanNamaKios}" sudah terdaftar di sistem!` },
        { status: 400 }
      );
    }

    const urea = Math.max(0, parseFloat(stokAwalUreaKg) || 15000);
    const npk = Math.max(0, parseFloat(stokAwalNpkKg) || 10000);
    const organik = Math.max(0, parseFloat(stokAwalOrganikKg) || 5000);

    const transactionResult = await prisma.$transaction(async (tx) => {
      // 1. Buat User Kios
      const newUser = await tx.user.create({
        data: {
          username: cleanUsername,
          name: cleanPengelola,
          role: 'KIOS',
          kiosName: cleanNamaKios,
          nip: cleanKodeKios,
          phone: phone || null,
          email: email || null,
          wilayah: wilayah || 'Kecamatan Lembeyan',
          password: password && password.trim() ? password.trim() : '123456',
          signatureUrl: generateAutoSignatureSvg(cleanPengelola),
          stampUrl: generateOfficialStampSvg('KIOS', cleanNamaKios),
        },
      });

      // 2. Buat Stok Awal Kios untuk 3 Jenis Pupuk
      const stokUrea = await tx.stokKios.create({
        data: {
          namaKios: cleanNamaKios,
          jenisPupuk: 'Urea Bersubsidi (Pupuk Indonesia)',
          stokAwalKg: urea,
          stokMasukKg: 0,
          stokTersalurKg: 0,
          stokSisaKg: urea,
        },
      });

      const stokNpk = await tx.stokKios.create({
        data: {
          namaKios: cleanNamaKios,
          jenisPupuk: 'NPK Phonska Bersubsidi',
          stokAwalKg: npk,
          stokMasukKg: 0,
          stokTersalurKg: 0,
          stokSisaKg: npk,
        },
      });

      const stokOrganik = await tx.stokKios.create({
        data: {
          namaKios: cleanNamaKios,
          jenisPupuk: 'Pupuk Organik Petroganik',
          stokAwalKg: organik,
          stokMasukKg: 0,
          stokTersalurKg: 0,
          stokSisaKg: organik,
        },
      });

      // 3. Catat Riwayat Mutasi Saldo Awal Musim Tanam
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const refPrefix = `SALDO-AWAL-${dateStr}`;

      await tx.mutasiStokKios.createMany({
        data: [
          {
            namaKios: cleanNamaKios,
            jenisPupuk: 'Urea Bersubsidi (Pupuk Indonesia)',
            tipeMutasi: 'PENYESUAIAN_OPNAME',
            jumlahKg: urea,
            stokSebelumKg: 0,
            stokSesudahKg: urea,
            nomorReferensi: `${refPrefix}-UREA`,
            petugas: cleanPengelola,
            keterangan: 'Pencatatan saldo awal alokasi pupuk Urea MT-1 Kios KPL Baru',
            tanggal: new Date(),
          },
          {
            namaKios: cleanNamaKios,
            jenisPupuk: 'NPK Phonska Bersubsidi',
            tipeMutasi: 'PENYESUAIAN_OPNAME',
            jumlahKg: npk,
            stokSebelumKg: 0,
            stokSesudahKg: npk,
            nomorReferensi: `${refPrefix}-NPK`,
            petugas: cleanPengelola,
            keterangan: 'Pencatatan saldo awal alokasi pupuk NPK Phonska MT-1 Kios KPL Baru',
            tanggal: new Date(),
          },
          {
            namaKios: cleanNamaKios,
            jenisPupuk: 'Pupuk Organik Petroganik',
            tipeMutasi: 'PENYESUAIAN_OPNAME',
            jumlahKg: organik,
            stokSebelumKg: 0,
            stokSesudahKg: organik,
            nomorReferensi: `${refPrefix}-ORG`,
            petugas: cleanPengelola,
            keterangan: 'Pencatatan saldo awal alokasi pupuk Organik MT-1 Kios KPL Baru',
            tanggal: new Date(),
          },
        ],
      });

      return {
        user: newUser,
        stok: [stokUrea, stokNpk, stokOrganik],
      };
    });

    return NextResponse.json({
      success: true,
      message: `Kios KPL "${cleanNamaKios}" berhasil didaftarkan bersama akun login "${cleanUsername}" dan saldo stok awal!`,
      data: transactionResult,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
