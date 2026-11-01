import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Mulai Seeding Data Sistem Pertanian ---');

  await prisma.mutasiStokKios.deleteMany();
  await prisma.penyaluranPupuk.deleteMany();
  await prisma.alokasiPupuk.deleteMany();
  await prisma.pengajuanLahan.deleteMany();
  await prisma.lahan.deleteMany();
  await prisma.petani.deleteMany();
  await prisma.poktan.deleteMany();
  await prisma.stokKios.deleteMany();
  await prisma.user.deleteMany();

  // 1. Data User / Demo Roles dengan Nama & NIP Resmi Tersimpan di Database
  await prisma.user.createMany({
    data: [
      {
        username: 'admin',
        name: 'Supriyanto (Admin Kecamatan)',
        role: 'ADMIN_DINAS',
        nip: 'NIP. 19760814 200212 1 002',
        phone: '081234567890',
        email: 'admin@pertanian.lembeyan.go.id',
        wilayah: 'Pemerintah Kecamatan Lembeyan',
      },
      {
        username: 'ppl_iissugiarti',
        name: 'Iis Sugiarti, S.P',
        role: 'PPL',
        nip: 'NIP. 19850412 201101 2 008',
        phone: '081398765432',
        email: 'iis.ppl@pertanian.lembeyan.go.id',
        wilayah: 'BPP Kecamatan Lembeyan',
      },
      {
        username: 'poktan_suparman',
        name: 'H. Suparman',
        role: 'POKTAN',
        nip: 'Reg. Poktan: 521/014/LMB/2026',
        phone: '085233445566',
        email: 'poktan.tanimakmur@gmail.com',
        wilayah: 'Desa Kediren, Kec. Lembeyan',
      },
      {
        username: 'kios_subur',
        name: 'Hj. Siti Romlah',
        role: 'KIOS',
        nip: 'Reg. KPL: KPL-LMB-008/2026',
        phone: '082155667788',
        email: 'kios.tanisubur@gmail.com',
        kiosName: 'UD. Tani Subur Barokah',
        wilayah: 'Kecamatan Lembeyan',
      },
      {
        username: 'petani_sukirno',
        name: 'Sukirno',
        role: 'PETANI',
        nip: 'NIK: 3509012304750001',
        phone: '087811223344',
        wilayah: 'Desa Kediren, Kec. Lembeyan',
      },
    ],
  });

  // 2. Data Kelompok Tani (Poktan)
  const poktan1 = await prisma.poktan.create({
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

  const poktan2 = await prisma.poktan.create({
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

  const poktan3 = await prisma.poktan.create({
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

  // 3. Data Petani
  const petani1 = await prisma.petani.create({
    data: {
      nik: '3509012304750001',
      nama: 'Sukirno',
      noKk: '3509012001050012',
      telepon: '087811223344',
      alamat: 'Dusun Krajan RT 02 / RW 04',
      desa: 'Kediren',
      kecamatan: 'Lembeyan',
      poktanId: poktan1.id,
      statusVerifikasi: 'TERVERIFIKASI',
      totalLuasLahan: 2.30,
    },
  });

  const petani2 = await prisma.petani.create({
    data: {
      nik: '3509011208720002',
      nama: 'Kasdi Mulyono',
      noKk: '3509011002040025',
      telepon: '081234445555',
      alamat: 'Dusun Kediren RT 01 / RW 02',
      desa: 'Kediren',
      kecamatan: 'Lembeyan',
      poktanId: poktan1.id,
      statusVerifikasi: 'TERVERIFIKASI',
      totalLuasLahan: 1.20,
    },
  });

  const petani3 = await prisma.petani.create({
    data: {
      nik: '3509011905810003',
      nama: 'Slamet Raharjo',
      noKk: '3509011803090038',
      telepon: '085677889911',
      alamat: 'Dusun Tunggur Selatan RT 03 / RW 01',
      desa: 'Tunggur',
      kecamatan: 'Lembeyan',
      poktanId: poktan2.id,
      statusVerifikasi: 'TERVERIFIKASI',
      totalLuasLahan: 1.10,
    },
  });

  const petani4 = await prisma.petani.create({
    data: {
      nik: '3509010411690004',
      nama: 'Marzuki Al-Bantani',
      noKk: '3509010101030044',
      telepon: '082344556677',
      alamat: 'Dusun Tapen RT 04 / RW 03',
      desa: 'Tapen',
      kecamatan: 'Lembeyan',
      poktanId: poktan3.id,
      statusVerifikasi: 'TERVERIFIKASI',
      totalLuasLahan: 2.50,
    },
  });

  // 4. Data Lahan & Poligon Spasial Unik di Kecamatan Lembeyan, Kabupaten Magetan (Lat ~ -7.768, Lng ~ 111.422)
  await prisma.lahan.create({
    data: {
      kodeLahan: 'LHN-2026-001',
      namaLahan: 'Petak Sawah Irigasi Blok Krajan Barat (Desa Kediren)',
      petaniId: petani1.id,
      komoditas: 'Padi',
      luasHa: 1.97,
      luasM2: 19660,
      kabupaten: 'Magetan',
      statusKepemilikan: 'Milik Sendiri',
      statusIrigasi: 'Irigasi Teknis',
      nomorPipil: 'SPPT-35.20.040.005-0129-A',
      batasUtara: 'Saluran Irigasi Sekunder Kediren',
      batasSelatan: 'Sawah Bpk. Kasdi Mulyono',
      batasTimur: 'Jalan Usaha Tani Desa Kediren',
      batasBarat: 'Kali Gandong Lembeyan',
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
  });

  await prisma.lahan.create({
    data: {
      kodeLahan: 'LHN-2026-002',
      namaLahan: 'Tegalan Jagung Blok Sawah Lor (Desa Kediren)',
      petaniId: petani1.id,
      komoditas: 'Jagung',
      luasHa: 1.71,
      luasM2: 17056,
      kabupaten: 'Magetan',
      statusKepemilikan: 'Sewa',
      statusIrigasi: 'Tadah Hujan',
      nomorPipil: 'SPPT-35.20.040.005-0130-B',
      batasUtara: 'Tanah Kas Desa Kediren',
      batasSelatan: 'Jalan Dusun Krajan Timur',
      batasTimur: 'Lahan Bpk. H. Suparman',
      batasBarat: 'Saluran Tersier Kediren',
      coordinates: JSON.stringify([
        [-7.76860, 111.42350],
        [-7.76860, 111.42445],
        [-7.76915, 111.42445],
        [-7.76915, 111.42495],
        [-7.76975, 111.42495],
        [-7.76975, 111.42350],
      ]),
      centerLat: -7.76917,
      centerLng: 111.42430,
      statusVerifikasi: 'TERVERIFIKASI',
    },
  });

  await prisma.lahan.create({
    data: {
      kodeLahan: 'LHN-2026-003',
      namaLahan: 'Petak Sawah Subur Blok Bengkok Selatan (Desa Kediren)',
      petaniId: petani2.id,
      komoditas: 'Padi',
      luasHa: 1.97,
      luasM2: 19684,
      kabupaten: 'Magetan',
      statusKepemilikan: 'Milik Sendiri',
      statusIrigasi: 'Irigasi Teknis',
      nomorPipil: 'SPPT-35.20.040.005-0188-C',
      batasUtara: 'Sawah Bpk. Sukirno',
      batasSelatan: 'Saluran Pembuang Lembeyan',
      batasTimur: 'Jalan Usaha Tani Makmur',
      batasBarat: 'Sawah Bpk. Poniran',
      coordinates: JSON.stringify([
        [-7.76810, 111.42110],
        [-7.76825, 111.42195],
        [-7.76940, 111.42220],
        [-7.76985, 111.42160],
        [-7.76955, 111.42095],
      ]),
      centerLat: -7.76903,
      centerLng: 111.42156,
      statusVerifikasi: 'TERVERIFIKASI',
    },
  });

  await prisma.lahan.create({
    data: {
      kodeLahan: 'LHN-2026-004',
      namaLahan: 'Lahan Kedelai Hamparan Tunggur Rejo (Desa Tunggur)',
      petaniId: petani3.id,
      komoditas: 'Kedelai',
      luasHa: 1.98,
      luasM2: 19795,
      kabupaten: 'Magetan',
      statusKepemilikan: 'Milik Sendiri',
      statusIrigasi: 'Tadah Hujan',
      nomorPipil: 'SPPT-35.20.040.008-0244-D',
      batasUtara: 'Jalan Poros Desa Tunggur - Lembeyan',
      batasSelatan: 'Kebun Jati Rakyat',
      batasTimur: 'Sungai Kecil Tunggur',
      batasBarat: 'Lahan Bpk. Joko Susilo',
      coordinates: JSON.stringify([
        [-7.75420, 111.41750],
        [-7.75405, 111.41840],
        [-7.75455, 111.41895],
        [-7.75525, 111.41870],
        [-7.75540, 111.41785],
        [-7.75480, 111.41725],
      ]),
      centerLat: -7.75471,
      centerLng: 111.41811,
      statusVerifikasi: 'TERVERIFIKASI',
    },
  });

  await prisma.lahan.create({
    data: {
      kodeLahan: 'LHN-2026-005',
      namaLahan: 'Kebun Tebu Rakyat Hamparan Tapen Makmur (Desa Tapen)',
      petaniId: petani4.id,
      komoditas: 'Tebu',
      luasHa: 4.70,
      luasM2: 46982,
      kabupaten: 'Magetan',
      statusKepemilikan: 'Bagi Hasil',
      statusIrigasi: 'Tadah Hujan',
      nomorPipil: 'SPPT-35.20.040.003-0311-E',
      batasUtara: 'Jalan Raya Tapen - Lembeyan Wetan',
      batasSelatan: 'Hutan Rakyat Tapen',
      batasTimur: 'Kemitraan PG Redjosarie Magetan',
      batasBarat: 'Saluran Irigasi Primer Tapen',
      coordinates: JSON.stringify([
        [-7.78010, 111.43040],
        [-7.77995, 111.43185],
        [-7.78045, 111.43260],
        [-7.78140, 111.43245],
        [-7.78195, 111.43170],
        [-7.78180, 111.43055],
        [-7.78095, 111.43010],
      ]),
      centerLat: -7.78094,
      centerLng: 111.43138,
      statusVerifikasi: 'TERVERIFIKASI',
    },
  });

  // 5. Data Alokasi Pupuk Bersubsidi (e-RDKK)
  // Perhitungan standar per Hektar Padi: Urea 250kg, NPK 150kg, Organik 100kg
  await prisma.alokasiPupuk.create({
    data: {
      petaniId: petani1.id,
      tahun: 2026,
      musimTanam: 'MT 1 (Rendeng)',
      komoditas: 'Padi & Jagung',
      luasTanamHa: 2.30,
      jatahUreaKg: 500,
      sisaUreaKg: 350, // sudah ditebus 150 kg
      jatahNpkKg: 300,
      sisaNpkKg: 200, // sudah ditebus 100 kg
      jatahOrganikKg: 200,
      sisaOrganikKg: 200,
      status: 'AKTIF',
    },
  });

  await prisma.alokasiPupuk.create({
    data: {
      petaniId: petani2.id,
      tahun: 2026,
      musimTanam: 'MT 1 (Rendeng)',
      komoditas: 'Padi',
      luasTanamHa: 1.20,
      jatahUreaKg: 300,
      sisaUreaKg: 300,
      jatahNpkKg: 180,
      sisaNpkKg: 180,
      jatahOrganikKg: 100,
      sisaOrganikKg: 100,
      status: 'AKTIF',
    },
  });

  await prisma.alokasiPupuk.create({
    data: {
      petaniId: petani3.id,
      tahun: 2026,
      musimTanam: 'MT 1 (Rendeng)',
      komoditas: 'Kedelai',
      luasTanamHa: 1.10,
      jatahUreaKg: 100,
      sisaUreaKg: 100,
      jatahNpkKg: 150,
      sisaNpkKg: 150,
      jatahOrganikKg: 100,
      sisaOrganikKg: 100,
      status: 'AKTIF',
    },
  });

  await prisma.alokasiPupuk.create({
    data: {
      petaniId: petani4.id,
      tahun: 2026,
      musimTanam: 'MT 1 (Rendeng)',
      komoditas: 'Tebu',
      luasTanamHa: 2.50,
      jatahUreaKg: 400,
      sisaUreaKg: 400,
      jatahNpkKg: 300,
      sisaNpkKg: 300,
      jatahOrganikKg: 200,
      sisaOrganikKg: 200,
      status: 'AKTIF',
    },
  });

  // 6. Data Pengajuan Lahan Baru & e-RDKK (Dengan berkas KTP, KK, Pipil)
  await prisma.pengajuanLahan.create({
    data: {
      nomorPengajuan: 'REG-ERDKK-2026-001',
      petaniId: petani1.id,
      poktanId: poktan1.id,
      namaPemilik: 'Sukirno',
      nikPemilik: '3509012304750001',
      noKk: '3509012001050012',
      komoditasRencana: 'Padi Ciherang',
      luasHa: 0.75,
      desa: 'Kediren',
      kecamatan: 'Lembeyan',
      nomorPipil: 'SPPT-PBB-2026-09881',
      coordinates: JSON.stringify([
        [-8.3570, 113.6040],
        [-8.3568, 113.6060],
        [-8.3582, 113.6058],
        [-8.3584, 113.6039],
      ]),
      fileKtp: '/uploads/sample_ktp.svg',
      fileKk: '/uploads/sample_kk.svg',
      filePipil: '/uploads/sample_pipil.svg',
      catatan: 'Pengajuan perluasan petak lahan sewa untuk MT 2 musim kemarau I.',
      status: 'DIAJUKAN_POKTAN',
    },
  });

  await prisma.pengajuanLahan.create({
    data: {
      nomorPengajuan: 'REG-ERDKK-2026-002',
      petaniId: petani2.id,
      poktanId: poktan1.id,
      namaPemilik: 'Kasdi Mulyono',
      nikPemilik: '3509011208720002',
      noKk: '3509011002040025',
      komoditasRencana: 'Jagung Hibrida Bisi-18',
      luasHa: 0.60,
      desa: 'Kediren',
      kecamatan: 'Lembeyan',
      nomorPipil: 'SPPT-PBB-2026-07712',
      coordinates: JSON.stringify([
        [-8.3565, 113.6035],
        [-8.3563, 113.6052],
        [-8.3578, 113.6050],
        [-8.3580, 113.6033],
      ]),
      fileKtp: '/uploads/sample_ktp.svg',
      fileKk: '/uploads/sample_kk.svg',
      filePipil: '/uploads/sample_pipil.svg',
      catatan: 'Sudah ditinjau di lapangan oleh PPL, batas patok jelas.',
      status: 'DIVERIFIKASI_PPL',
      diverifikasiOleh: 'Sugeng Waluyo, S.P (PPL Kec. Lembeyan)',
      tanggalVerifikasi: new Date('2026-04-10'),
    },
  });

  await prisma.pengajuanLahan.create({
    data: {
      nomorPengajuan: 'REG-ERDKK-2026-003',
      petaniId: petani3.id,
      poktanId: poktan2.id,
      namaPemilik: 'Slamet Raharjo',
      nikPemilik: '3509011905810003',
      noKk: '3509011803090038',
      komoditasRencana: 'Kedelai Anjasmoro',
      luasHa: 1.10,
      desa: 'Tunggur',
      kecamatan: 'Lembeyan',
      nomorPipil: 'PBB-3509-00244-D',
      fileKtp: '/uploads/sample_ktp.svg',
      fileKk: '/uploads/sample_kk.svg',
      filePipil: '/uploads/sample_pipil.svg',
      catatan: 'Dokumen lengkap dan absah, kuota subsidi e-RDKK disetujui dinas.',
      status: 'DISETUJUI_DINAS',
      diverifikasiOleh: 'Sugeng Waluyo, S.P (PPL Kec. Lembeyan)',
      disetujuiOleh: 'Ir. Bambang Hermanto, M.Si (Admin Kec. Lembeyan)',
      tanggalVerifikasi: new Date('2026-03-20'),
      tanggalPersetujuan: new Date('2026-03-25'),
    },
  });

  // 7. Data Penyaluran Pupuk dengan Bukti Foto KTP & Foto Diri
  await prisma.penyaluranPupuk.create({
    data: {
      nomorNota: 'NOTA-DIST-20260401-001',
      petaniId: petani1.id,
      namaKios: 'UD. Tani Subur Barokah',
      petugasKios: 'Hj. Siti Romlah',
      namaPengurusPoktan: 'H. Suparman (Ketua Poktan Tani Makmur I)',
      tanggalPenyaluran: new Date('2026-04-05T09:30:00Z'),
      jumlahUreaKg: 150,
      jumlahNpkKg: 100,
      jumlahOrganikKg: 0,
      totalBiayaRp: 520000, // Misal HET Urea Rp2.250/kg, NPK Rp2.300/kg (subsidi)
      fotoKtp: '/uploads/sample_ktp.svg',
      fotoDiri: '/uploads/sample_petani_face.svg',
      catatan: 'Penebusan tahap I MT 1. Identitas KTP asli dan fisik petani telah diverifikasi.',
      status: 'SELESAI',
    },
  });

  // 8. Stok Kios Pupuk
  await prisma.stokKios.createMany({
    data: [
      {
        namaKios: 'UD. Tani Subur Barokah',
        jenisPupuk: 'Urea Bersubsidi (Pupuk Indonesia)',
        stokAwalKg: 20000,
        stokMasukKg: 5000,
        stokTersalurKg: 7850,
        stokSisaKg: 17150,
      },
      {
        namaKios: 'UD. Tani Subur Barokah',
        jenisPupuk: 'NPK Phonska Bersubsidi',
        stokAwalKg: 15000,
        stokMasukKg: 4000,
        stokTersalurKg: 6200,
        stokSisaKg: 12800,
      },
      {
        namaKios: 'UD. Tani Subur Barokah',
        jenisPupuk: 'Pupuk Organik Petroganik',
        stokAwalKg: 8000,
        stokMasukKg: 2000,
        stokTersalurKg: 2500,
        stokSisaKg: 7500,
      },
    ],
  });

  // 9. Mutasi Stok Kios Awal (DO Distributor & Penyaluran)
  await prisma.mutasiStokKios.createMany({
    data: [
      {
        namaKios: 'UD. Tani Subur Barokah',
        jenisPupuk: 'Urea Bersubsidi (Pupuk Indonesia)',
        tipeMutasi: 'MASUK_DISTRIBUTOR',
        jumlahKg: 5000,
        stokSebelumKg: 12150,
        stokSesudahKg: 17150,
        nomorReferensi: 'DO-PIN-2026-0041',
        namaDistributor: 'PT Pupuk Indonesia Niaga - Lini III',
        nomorPolisi: 'P 8923 UJ',
        namaSupir: 'Supriyadi',
        petugas: 'Hj. Siti Romlah',
        keterangan: 'Penerimaan alokasi tambahan distributor resmi sesuai surat jalan No. 041/SJL/2026',
        tanggal: new Date('2026-04-02T10:00:00Z'),
      },
      {
        namaKios: 'UD. Tani Subur Barokah',
        jenisPupuk: 'NPK Phonska Bersubsidi',
        tipeMutasi: 'MASUK_DISTRIBUTOR',
        jumlahKg: 4000,
        stokSebelumKg: 8800,
        stokSesudahKg: 12800,
        nomorReferensi: 'DO-PIN-2026-0042',
        namaDistributor: 'PT Pupuk Indonesia Niaga - Lini III',
        nomorPolisi: 'P 8412 UK',
        namaSupir: 'Hendra Setiawan',
        petugas: 'Hj. Siti Romlah',
        keterangan: 'Drop alokasi NPK Phonska masa tanam rendeng BPP Ambulu',
        tanggal: new Date('2026-04-03T14:15:00Z'),
      },
      {
        namaKios: 'UD. Tani Subur Barokah',
        jenisPupuk: 'Pupuk Organik Petroganik',
        tipeMutasi: 'MASUK_DISTRIBUTOR',
        jumlahKg: 2000,
        stokSebelumKg: 5500,
        stokSesudahKg: 7500,
        nomorReferensi: 'DO-PG-2026-0018',
        namaDistributor: 'CV Agro Makmur Sejahtera',
        nomorPolisi: 'P 9104 UN',
        namaSupir: 'Budi Santoso',
        petugas: 'Hj. Siti Romlah',
        keterangan: 'Pasokan organik granul subsidi 40 sak @ 50 Kg',
        tanggal: new Date('2026-04-04T08:30:00Z'),
      },
      {
        namaKios: 'UD. Tani Subur Barokah',
        jenisPupuk: 'Urea Bersubsidi (Pupuk Indonesia)',
        tipeMutasi: 'PENYALURAN_PETANI',
        jumlahKg: 150,
        stokSebelumKg: 17300,
        stokSesudahKg: 17150,
        nomorReferensi: 'NOTA-DIST-20260401-001',
        petugas: 'Hj. Siti Romlah',
        keterangan: 'Penebusan petani Sukirno (Poktan Tani Makmur I) diverifikasi KTP',
        tanggal: new Date('2026-04-05T09:30:00Z'),
      },
      {
        namaKios: 'UD. Tani Subur Barokah',
        jenisPupuk: 'NPK Phonska Bersubsidi',
        tipeMutasi: 'PENYALURAN_PETANI',
        jumlahKg: 100,
        stokSebelumKg: 12900,
        stokSesudahKg: 12800,
        nomorReferensi: 'NOTA-DIST-20260401-001',
        petugas: 'Hj. Siti Romlah',
        keterangan: 'Penebusan petani Sukirno (Poktan Tani Makmur I) diverifikasi KTP',
        tanggal: new Date('2026-04-05T09:30:00Z'),
      },
    ],
  });

  console.log('✅ Seeding data berhasil diselesaikan dengan sukses!');
}

main()
  .catch((e) => {
    console.error('Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
