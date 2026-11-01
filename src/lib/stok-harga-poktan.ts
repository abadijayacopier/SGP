import fs from 'fs';
import path from 'path';

export const stokHargaFilePath = path.join(process.cwd(), 'src', 'data', 'stok-harga-poktan.json');
export const distFilePath = path.join(process.cwd(), 'src', 'data', 'distribusi-kios.json');
export const trxFilePath = path.join(process.cwd(), 'src', 'data', 'transaksi-kasir-poktan.json');

export function readJsonFile(p: string) {
  try {
    if (!fs.existsSync(p)) return [];
    const content = fs.readFileSync(p, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

export function writeJsonFile(p: string, data: any[]) {
  try {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing json file:', e);
  }
}

export const defaultRincianKesepakatan = {
  tahunAnggaran: 2026,
  nomorBeritaAcara: '01/BA-POKTAN/LMB/2026',
  tanggalMusyawarah: '2026-01-15',
  lokasiMusyawarah: 'Balai Pertemuan / Gudang Poktan',
  catatanKesepakatan: 'Berdasarkan hasil musyawarah kesepakatan harga pupuk bersubsidi se-Kecamatan Lembeyan Tahun Anggaran 2026.',
  pihakMengetahui: {
    ketuaPoktan: 'Samsi',
    bendaharaPoktan: 'Kasdi Mulyono',
    penyuluhPpl: 'Ir. Hendro Supriyanto',
    kepalaDesa: 'Drs. H. Dwi Santoso',
    perwakilanPetani: 'Parno',
  },
  urea: {
    hetPerSak: 90000,
    transportasi: 5000,
    sewaGudang: 2000,
    atk: 2000,
    kasPoktan: 1000,
    penyandangDana: 2000,
    pengurusPoktan: 3000,
    totalPerSak: 105000,
    hargaPerKg: 2100, // 105.000 / 50
  },
  npk: {
    hetPerSak: 92000,
    transportasi: 5000,
    sewaGudang: 2000,
    atk: 2000,
    kasPoktan: 4000,
    penyandangDana: 2000,
    pengurusPoktan: 3000,
    totalPerSak: 110000,
    hargaPerKg: 2200, // 110.000 / 50
  },
  organik: {
    hetPerSak: 25600,
    transportasi: 4400,
    sewaGudang: 1000,
    atk: 1000,
    kasPoktan: 1000,
    penyandangDana: 0,
    pengurusPoktan: 2000,
    totalPerSak: 35000,
    hargaPerKg: 875, // 35.000 / 40
  },
};

export function getStokHargaPoktanRecord(poktanId: string, namaPoktan?: string) {
  let allRecords = readJsonFile(stokHargaFilePath);
  const distList = readJsonFile(distFilePath);
  const trxList = readJsonFile(trxFilePath);

  const cleanNama = (namaPoktan || '').toLowerCase().replace(/poktan/gi, '').trim();
  const cleanId = (poktanId || '').toLowerCase().trim();

  let record = allRecords.find((r: any) => {
    if (cleanId && cleanId !== 'semua' && r.poktanId && r.poktanId.toLowerCase() === cleanId) return true;
    if (cleanNama && r.namaPoktan) {
      const rNama = r.namaPoktan.toLowerCase().replace(/poktan/gi, '').trim();
      if (rNama === cleanNama || rNama.includes(cleanNama) || cleanNama.includes(rNama)) return true;
    }
    return false;
  });

  if (!record && cleanId === 'semua' && allRecords.length > 0) {
    record = allRecords[0];
  }

  if (!record) {
    // Buat data default jika belum ada
    record = {
      poktanId: poktanId && poktanId !== 'SEMUA' ? poktanId : 'cmvtt5k360000t00ggcpkjze6',
      namaPoktan: namaPoktan || (poktanId === 'SEMUA' ? 'Poktan Sri Mulyo' : 'Kelompok Tani'),
      desa: 'Kediren',
      hargaPupuk: {
        ureaPerKg: defaultRincianKesepakatan.urea.hargaPerKg,
        ureaPerSak: defaultRincianKesepakatan.urea.totalPerSak,
        npkPerKg: defaultRincianKesepakatan.npk.hargaPerKg,
        npkPerSak: defaultRincianKesepakatan.npk.totalPerSak,
        organikPerKg: defaultRincianKesepakatan.organik.hargaPerKg,
        organikPerSak: defaultRincianKesepakatan.organik.totalPerSak,
        catatan: defaultRincianKesepakatan.catatanKesepakatan,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Sistem',
      },
      rincianKesepakatan: defaultRincianKesepakatan,
      penyesuaianAwal: {
        ureaKg: 0,
        npkKg: 0,
        organikKg: 0,
        catatan: 'Stok awal sistem',
        updatedAt: new Date().toISOString(),
      },
      mutasi: [
        {
          id: `MUT-INIT-${Date.now()}`,
          tanggal: new Date().toISOString(),
          tipe: 'INISIALISASI',
          keterangan: 'Sistem pencatatan stok dan harga poktan diaktifkan',
          petugas: 'Sistem',
        },
      ],
    };
    allRecords.push(record);
    writeJsonFile(stokHargaFilePath, allRecords);
  }

  // Pastikan rincianKesepakatan selalu ada
  if (!record.rincianKesepakatan) {
    record.rincianKesepakatan = JSON.parse(JSON.stringify(defaultRincianKesepakatan));
    record.rincianKesepakatan.pihakMengetahui.ketuaPoktan = record.namaPoktan?.includes('Sri Mulyo') ? 'Samsi' : 'Ketua Poktan';
    writeJsonFile(stokHargaFilePath, allRecords);
  }

  // Identifikasi target untuk matching distribusi kios & transaksi kasir
  const isAll = cleanId === 'semua';
  const targetNama = (record.namaPoktan || '').toLowerCase().replace(/poktan/gi, '').trim();
  const targetId = (record.poktanId || '').toLowerCase().trim();

  // Hitung total penerimaan dari distribusi kios yang DITERIMA
  const relevantDist = distList.filter((d: any) => {
    if (d.status !== 'DITERIMA') return false;
    if (isAll) return true;
    const dNama = (d.namaPoktan || '').toLowerCase().replace(/poktan/gi, '').trim();
    const dId = (d.poktanId || '').toLowerCase().trim();
    if (targetId && dId === targetId) return true;
    if (targetNama && dNama && (dNama.includes(targetNama) || targetNama.includes(dNama))) return true;
    return false;
  });

  // Hitung total penebusan kasir yang SELESAI
  const relevantTrx = trxList.filter((t: any) => {
    if (t.status !== 'SELESAI') return false;
    if (isAll) return true;
    const tNama = (t.namaPoktan || '').toLowerCase().replace(/poktan/gi, '').trim();
    const tId = (t.poktanId || '').toLowerCase().trim();
    if (targetId && tId === targetId) return true;
    if (targetNama && tNama && (tNama.includes(targetNama) || targetNama.includes(tNama))) return true;
    return false;
  });

  const distUreaKg = relevantDist.reduce((acc: number, d: any) => acc + (Number(d.jumlahUreaKg) || 0), 0);
  const distNpkKg = relevantDist.reduce((acc: number, d: any) => acc + (Number(d.jumlahNpkKg) || 0), 0);
  const distOrgKg = relevantDist.reduce((acc: number, d: any) => acc + (Number(d.jumlahOrganikKg) || 0), 0);

  const tebusUreaKg = relevantTrx.reduce((acc: number, t: any) => acc + (Number(t.jumlahUreaKg) || 0), 0);
  const tebusNpkKg = relevantTrx.reduce((acc: number, t: any) => acc + (Number(t.jumlahNpkKg) || 0), 0);
  const tebusOrgKg = relevantTrx.reduce((acc: number, t: any) => acc + (Number(t.jumlahOrganikKg) || 0), 0);

  // Sisa stok riil = Penyesuaian Awal + Distribusi Kios Diterima - Tebus Kasir Selesai
  const adjUrea = Number(record.penyesuaianAwal?.ureaKg) || 0;
  const adjNpk = Number(record.penyesuaianAwal?.npkKg) || 0;
  const adjOrg = Number(record.penyesuaianAwal?.organikKg) || 0;

  const totalStokMasukUrea = adjUrea + distUreaKg;
  const totalStokMasukNpk = adjNpk + distNpkKg;
  const totalStokMasukOrg = adjOrg + distOrgKg;

  const sisaUreaKg = Math.max(0, totalStokMasukUrea - tebusUreaKg);
  const sisaNpkKg = Math.max(0, totalStokMasukNpk - tebusNpkKg);
  const sisaOrgKg = Math.max(0, totalStokMasukOrg - tebusOrgKg);

  const calculatedStok = {
    urea: {
      stokAwalKg: adjUrea,
      masukKiosKg: distUreaKg,
      totalMasukKg: totalStokMasukUrea,
      tertebusKg: tebusUreaKg,
      sisaKg: sisaUreaKg,
      sisaSak: Number((sisaUreaKg / 50).toFixed(1)),
      sisaSakBulat: Math.floor(sisaUreaKg / 50),
    },
    npk: {
      stokAwalKg: adjNpk,
      masukKiosKg: distNpkKg,
      totalMasukKg: totalStokMasukNpk,
      tertebusKg: tebusNpkKg,
      sisaKg: sisaNpkKg,
      sisaSak: Number((sisaNpkKg / 50).toFixed(1)),
      sisaSakBulat: Math.floor(sisaNpkKg / 50),
    },
    organik: {
      stokAwalKg: adjOrg,
      masukKiosKg: distOrgKg,
      totalMasukKg: totalStokMasukOrg,
      tertebusKg: tebusOrgKg,
      sisaKg: sisaOrgKg,
      sisaSak: Number((sisaOrgKg / 40).toFixed(1)),
      sisaSakBulat: Math.floor(sisaOrgKg / 40),
    },
  };

  return { record, calculatedStok, allRecords };
}

export function recordMutasiKasir(poktanId: string, namaPoktan: string, mutasiItem: any) {
  const { record, allRecords } = getStokHargaPoktanRecord(poktanId, namaPoktan);
  if (!record.mutasi) record.mutasi = [];
  record.mutasi.unshift(mutasiItem);
  writeJsonFile(stokHargaFilePath, allRecords);
}
