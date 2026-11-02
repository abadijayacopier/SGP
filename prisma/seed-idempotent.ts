import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Sinkronisasi Data Master & Petani Idempoten ---');

  // 1. Pastikan Poktan standar tersedia
  let poktan1 = await prisma.poktan.findFirst({ where: { nama: 'Poktan Tani Makmur I' } });
  if (!poktan1) {
    poktan1 = await prisma.poktan.create({
      data: {
        nama: 'Poktan Tani Makmur I',
        ketua: 'H. Suparman',
        kontak: '085233445566',
        desa: 'Kediren',
        kecamatan: 'Lembeyan',
        kabupaten: 'Magetan',
        jumlahAnggota: 28,
      },
    });
  }

  let poktan2 = await prisma.poktan.findFirst({ where: { nama: 'Poktan Sumber Rejeki II' } });
  if (!poktan2) {
    poktan2 = await prisma.poktan.create({
      data: {
        nama: 'Poktan Sumber Rejeki II',
        ketua: 'Drs. Suwandi',
        kontak: '081377889900',
        desa: 'Tunggur',
        kecamatan: 'Lembeyan',
        kabupaten: 'Magetan',
        jumlahAnggota: 35,
      },
    });
  }

  let poktan3 = await prisma.poktan.findFirst({ where: { nama: 'Poktan Karya Bersama' } });
  if (!poktan3) {
    poktan3 = await prisma.poktan.create({
      data: {
        nama: 'Poktan Karya Bersama',
        ketua: 'Mohammad Toha',
        kontak: '081299887766',
        desa: 'Tapen',
        kecamatan: 'Lembeyan',
        kabupaten: 'Magetan',
        jumlahAnggota: 22,
      },
    });
  }

  // 2. Upsert Petani Inti tanpa merusak data Supriyanto yang sudah ada
  const petaniDataList = [
    {
      nik: '3509012304750001',
      nama: 'Sukirno',
      noKk: '3509012001050012',
      telepon: '087811223344',
      alamat: 'Dusun Krajan RT 02 / RW 04',
      desa: 'Kediren',
      kecamatan: 'Lembeyan',
      poktanId: poktan1.id,
      statusVerifikasi: 'TERVERIFIKASI',
      totalLuasLahan: 4.75,
    },
    {
      nik: '3509011208720002',
      nama: 'Kasdi Mulyono',
      noKk: '3509011002040025',
      telepon: '081234445555',
      alamat: 'Dusun Kediren RT 01 / RW 02',
      desa: 'Kediren',
      kecamatan: 'Lembeyan',
      poktanId: poktan1.id,
      statusVerifikasi: 'TERVERIFIKASI',
      totalLuasLahan: 2.57,
    },
    {
      nik: '3509011905810003',
      nama: 'Slamet Raharjo',
      noKk: '3509011803090038',
      telepon: '085677889911',
      alamat: 'Dusun Tunggur Selatan RT 03 / RW 01',
      desa: 'Tunggur',
      kecamatan: 'Lembeyan',
      poktanId: poktan2.id,
      statusVerifikasi: 'TERVERIFIKASI',
      totalLuasLahan: 1.98,
    },
    {
      nik: '3509010411690004',
      nama: 'Marzuki Al-Bantani',
      noKk: '3509010101030044',
      telepon: '082344556677',
      alamat: 'Dusun Tapen RT 04 / RW 03',
      desa: 'Tapen',
      kecamatan: 'Lembeyan',
      poktanId: poktan3.id,
      statusVerifikasi: 'TERVERIFIKASI',
      totalLuasLahan: 4.70,
    },
  ];

  for (const p of petaniDataList) {
    const existing = await prisma.petani.findUnique({ where: { nik: p.nik } });
    if (!existing) {
      await prisma.petani.create({ data: p });
    }
  }

  // 3. Tambahkan Lahan Bawaan untuk para petani
  const sukirno = await prisma.petani.findUnique({ where: { nik: '3509012304750001' } });
  const kasdi = await prisma.petani.findUnique({ where: { nik: '3509011208720002' } });
  const slamet = await prisma.petani.findUnique({ where: { nik: '3509011905810003' } });
  const marzuki = await prisma.petani.findUnique({ where: { nik: '3509010411690004' } });

  const lahanSeeds = [
    {
      kodeLahan: 'LHN-2026-002',
      namaLahan: 'Petak Sawah Blok Krajan Barat (Desa Kediren)',
      petaniId: sukirno?.id,
      komoditas: 'Padi',
      luasHa: 1.97,
      luasM2: 19660,
      kabupaten: 'Magetan',
      statusKepemilikan: 'Milik Sendiri',
      statusIrigasi: 'Irigasi Teknis',
      nomorPipil: 'SPPT-35.20.040.005-0129-A',
      coordinates: JSON.stringify([
        [-7.76685, 111.42020],
        [-7.76670, 111.42155],
        [-7.76735, 111.42185],
        [-7.76790, 111.42120],
        [-7.76775, 111.42005],
      ]),
      centerLat: -7.76731,
      centerLng: 111.42097,
      statusVerifikasi: 'TERVERIFIKASI',
    },
    {
      kodeLahan: 'LHN-2026-003',
      namaLahan: 'Tegalan Jagung Blok Sawah Lor (Desa Kediren)',
      petaniId: sukirno?.id,
      komoditas: 'Jagung',
      luasHa: 1.71,
      luasM2: 17056,
      kabupaten: 'Magetan',
      statusKepemilikan: 'Sewa',
      statusIrigasi: 'Tadah Hujan',
      nomorPipil: 'SPPT-35.20.040.005-0130-B',
      coordinates: JSON.stringify([
        [-7.76860, 111.42350],
        [-7.76860, 111.42445],
        [-7.76915, 111.42445],
        [-7.76915, 111.42495],
        [-7.76975, 111.42495],
        [-7.76975, 111.42350],
      ]),
      centerLat: -7.76917,
      centerLng: 111.42415,
      statusVerifikasi: 'TERVERIFIKASI',
    },
    {
      kodeLahan: 'LHN-2026-004',
      namaLahan: 'Hamparan Sawah Padi Blok Kediren Kidul',
      petaniId: kasdi?.id,
      komoditas: 'Padi',
      luasHa: 1.45,
      luasM2: 14500,
      kabupaten: 'Magetan',
      statusKepemilikan: 'Milik Sendiri',
      statusIrigasi: 'Irigasi Teknis',
      nomorPipil: 'SPPT-35.20.040.005-0131-C',
      coordinates: JSON.stringify([
        [-7.76450, 111.41800],
        [-7.76450, 111.41950],
        [-7.76550, 111.41950],
        [-7.76550, 111.41800],
      ]),
      centerLat: -7.76500,
      centerLng: 111.41875,
      statusVerifikasi: 'TERVERIFIKASI',
    },
    {
      kodeLahan: 'LHN-2026-005',
      namaLahan: 'Lahan Kedelai Blok Tunggur Kulon',
      petaniId: slamet?.id,
      komoditas: 'Kedelai',
      luasHa: 1.98,
      luasM2: 19800,
      kabupaten: 'Magetan',
      statusKepemilikan: 'Milik Sendiri',
      statusIrigasi: 'Irigasi Teknis',
      nomorPipil: 'SPPT-35.20.040.005-0132-D',
      coordinates: JSON.stringify([
        [-7.77100, 111.41500],
        [-7.77100, 111.41650],
        [-7.77200, 111.41650],
        [-7.77200, 111.41500],
      ]),
      centerLat: -7.77150,
      centerLng: 111.41575,
      statusVerifikasi: 'TERVERIFIKASI',
    },
    {
      kodeLahan: 'LHN-2026-006',
      namaLahan: 'Kebun Tebu Blok Tapen Wetan',
      petaniId: marzuki?.id,
      komoditas: 'Tebu',
      luasHa: 4.70,
      luasM2: 47000,
      kabupaten: 'Magetan',
      statusKepemilikan: 'Milik Sendiri',
      statusIrigasi: 'Tadah Hujan',
      nomorPipil: 'SPPT-35.20.040.005-0133-E',
      coordinates: JSON.stringify([
        [-7.76200, 111.42500],
        [-7.76200, 111.42800],
        [-7.76400, 111.42800],
        [-7.76400, 111.42500],
      ]),
      centerLat: -7.76300,
      centerLng: 111.42650,
      statusVerifikasi: 'TERVERIFIKASI',
    },
  ];

  for (const l of lahanSeeds) {
    if (!l.petaniId) continue;
    const existing = await prisma.lahan.findFirst({
      where: {
        OR: [{ kodeLahan: l.kodeLahan }, { namaLahan: l.namaLahan }],
      },
    });
    if (!existing) {
      await prisma.lahan.create({
        data: {
          ...l,
          petaniId: l.petaniId as string,
        },
      });
    }
  }

  // 4. Sample Pengajuan e-RDKK untuk Verifikasi & Otorisasi Dinas
  const pengajuanCount = await prisma.pengajuanLahan.count();
  if (pengajuanCount === 0 && kasdi && slamet) {
    await prisma.pengajuanLahan.create({
      data: {
        nomorPengajuan: 'PGA-2026-001',
        petaniId: kasdi.id,
        poktanId: poktan1.id,
        namaPemilik: kasdi.nama,
        nikPemilik: kasdi.nik,
        noKk: kasdi.noKk,
        komoditasRencana: 'Padi',
        luasHa: 1.45,
        desa: kasdi.desa,
        kecamatan: kasdi.kecamatan,
        kabupaten: 'Magetan',
        nomorPipil: 'SPPT-35.20.040.005-0131-C',
        fileKtp: '/uploads/sample_ktp.svg',
        fileKk: '/uploads/sample_kk.svg',
        filePipil: '/uploads/sample_pipil.svg',
        status: 'VERIFIKASI_PPL',
        diverifikasiOleh: 'Iis Sugiarti, S.P',
        tanggalVerifikasi: new Date(),
        catatan: 'Verifikasi lapangan telah selesai, patok batas sawah sesuai SPPT.',
      },
    });

    await prisma.pengajuanLahan.create({
      data: {
        nomorPengajuan: 'PGA-2026-002',
        petaniId: slamet.id,
        poktanId: poktan2.id,
        namaPemilik: slamet.nama,
        nikPemilik: slamet.nik,
        noKk: slamet.noKk,
        komoditasRencana: 'Kedelai',
        luasHa: 1.98,
        desa: slamet.desa,
        kecamatan: slamet.kecamatan,
        kabupaten: 'Magetan',
        nomorPipil: 'SPPT-35.20.040.005-0132-D',
        fileKtp: '/uploads/sample_ktp.svg',
        fileKk: '/uploads/sample_kk.svg',
        filePipil: '/uploads/sample_pipil.svg',
        status: 'DIAJUKAN',
        catatan: 'Pengajuan usulan kuota baru MT-1 dari Poktan Sumber Rejeki II.',
      },
    });
  }

  // 5. Perbarui jumlahAnggota pada setiap Poktan secara akurat
  const allPoktans = await prisma.poktan.findMany();
  for (const pok of allPoktans) {
    const memberCount = await prisma.petani.count({ where: { poktanId: pok.id } });
    await prisma.poktan.update({
      where: { id: pok.id },
      data: { jumlahAnggota: memberCount },
    });
  }

  console.log('--- Sinkronisasi Idempoten Selesai! ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
