import { NextResponse } from 'next/server';
import {
  getStokHargaPoktanRecord,
  writeJsonFile,
  stokHargaFilePath,
  defaultRincianKesepakatan,
} from '@/lib/stok-harga-poktan';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const poktanId = searchParams.get('poktanId') || 'SEMUA';
    const namaPoktan = searchParams.get('namaPoktan') || undefined;

    const { record, calculatedStok } = getStokHargaPoktanRecord(poktanId, namaPoktan);

    return NextResponse.json({
      success: true,
      data: {
        poktanId: record.poktanId,
        namaPoktan: record.namaPoktan,
        desa: record.desa || 'Kediren',
        hargaPupuk: record.hargaPupuk,
        rincianKesepakatan: record.rincianKesepakatan || defaultRincianKesepakatan,
        penyesuaianAwal: record.penyesuaianAwal,
        stokGudang: calculatedStok,
        mutasi: record.mutasi || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action,
      poktanId,
      namaPoktan,
      desa,
      hargaPupuk,
      rincianKesepakatan,
      applyToAllPoktan,
      penyesuaianStok,
      catatan,
      petugas,
    } = body;

    if (!poktanId) {
      return NextResponse.json({ success: false, error: 'ID Kelompok Tani wajib diisi' }, { status: 400 });
    }

    const { record, allRecords } = getStokHargaPoktanRecord(poktanId, namaPoktan);
    if (namaPoktan && (!record.namaPoktan || record.namaPoktan === 'Kelompok Tani')) {
      record.namaPoktan = namaPoktan;
    }
    if (desa && !record.desa) {
      record.desa = desa;
    }

    // Aksi 1: Update Rincian Kesepakatan Harga Pupuk se-Kecamatan / Poktan
    if (action === 'UPDATE_KESEPAKATAN_HARGA') {
      const r = rincianKesepakatan || defaultRincianKesepakatan;

      // Hitung total Urea
      const ureaHet = parseFloat(r.urea?.hetPerSak) || 0;
      const ureaTrans = parseFloat(r.urea?.transportasi) || 0;
      const ureaGudang = parseFloat(r.urea?.sewaGudang) || 0;
      const ureaAtk = parseFloat(r.urea?.atk) || 0;
      const ureaKas = parseFloat(r.urea?.kasPoktan) || 0;
      const ureaDana = parseFloat(r.urea?.penyandangDana) || 0;
      const ureaPengurus = parseFloat(r.urea?.pengurusPoktan) || 0;
      const totalUreaSak = ureaHet + ureaTrans + ureaGudang + ureaAtk + ureaKas + ureaDana + ureaPengurus;
      const hargaUreaKg = Math.round(totalUreaSak / 50);

      // Hitung total NPK
      const npkHet = parseFloat(r.npk?.hetPerSak) || 0;
      const npkTrans = parseFloat(r.npk?.transportasi) || 0;
      const npkGudang = parseFloat(r.npk?.sewaGudang) || 0;
      const npkAtk = parseFloat(r.npk?.atk) || 0;
      const npkKas = parseFloat(r.npk?.kasPoktan) || 0;
      const npkDana = parseFloat(r.npk?.penyandangDana) || 0;
      const npkPengurus = parseFloat(r.npk?.pengurusPoktan) || 0;
      const totalNpkSak = npkHet + npkTrans + npkGudang + npkAtk + npkKas + npkDana + npkPengurus;
      const hargaNpkKg = Math.round(totalNpkSak / 50);

      // Hitung total Organik (1 Sak = 40 Kg)
      const orgHet = parseFloat(r.organik?.hetPerSak) || 0;
      const orgTrans = parseFloat(r.organik?.transportasi) || 0;
      const orgGudang = parseFloat(r.organik?.sewaGudang) || 0;
      const orgAtk = parseFloat(r.organik?.atk) || 0;
      const orgKas = parseFloat(r.organik?.kasPoktan) || 0;
      const orgDana = parseFloat(r.organik?.penyandangDana) || 0;
      const orgPengurus = parseFloat(r.organik?.pengurusPoktan) || 0;
      const totalOrgSak = orgHet + orgTrans + orgGudang + orgAtk + orgKas + orgDana + orgPengurus;
      const hargaOrgKg = Math.round(totalOrgSak / 40);

      const calculatedRincian = {
        tahunAnggaran: r.tahunAnggaran || 2026,
        nomorBeritaAcara: r.nomorBeritaAcara || `01/BA-POKTAN/LMB/${r.tahunAnggaran || 2026}`,
        tanggalMusyawarah: r.tanggalMusyawarah || new Date().toISOString().split('T')[0],
        lokasiMusyawarah: r.lokasiMusyawarah || 'Balai Pertemuan Poktan / Gudang Poktan',
        catatanKesepakatan: r.catatanKesepakatan || catatan || 'Hasil musyawarah kesepakatan harga pupuk bersubsidi se-Kecamatan Lembeyan',
        pihakMengetahui: {
          ketuaPoktan: r.pihakMengetahui?.ketuaPoktan || 'Ketua Poktan',
          bendaharaPoktan: r.pihakMengetahui?.bendaharaPoktan || 'Bendahara Poktan',
          penyuluhPpl: r.pihakMengetahui?.penyuluhPpl || 'PPL Wilayah Lembeyan',
          kepalaDesa: r.pihakMengetahui?.kepalaDesa || 'Kepala Desa',
          perwakilanPetani: r.pihakMengetahui?.perwakilanPetani || 'Perwakilan Petani',
        },
        urea: {
          hetPerSak: ureaHet,
          transportasi: ureaTrans,
          sewaGudang: ureaGudang,
          atk: ureaAtk,
          kasPoktan: ureaKas,
          penyandangDana: ureaDana,
          pengurusPoktan: ureaPengurus,
          totalPerSak: totalUreaSak,
          hargaPerKg: hargaUreaKg,
        },
        npk: {
          hetPerSak: npkHet,
          transportasi: npkTrans,
          sewaGudang: npkGudang,
          atk: npkAtk,
          kasPoktan: npkKas,
          penyandangDana: npkDana,
          pengurusPoktan: npkPengurus,
          totalPerSak: totalNpkSak,
          hargaPerKg: hargaNpkKg,
        },
        organik: {
          hetPerSak: orgHet,
          transportasi: orgTrans,
          sewaGudang: orgGudang,
          atk: orgAtk,
          kasPoktan: orgKas,
          penyandangDana: orgDana,
          pengurusPoktan: orgPengurus,
          totalPerSak: totalOrgSak,
          hargaPerKg: hargaOrgKg,
        },
        updatedAt: new Date().toISOString(),
        updatedBy: petugas || 'Musyawarah Poktan',
      };

      const updatedHargaPupuk = {
        ureaPerKg: hargaUreaKg,
        ureaPerSak: totalUreaSak,
        npkPerKg: hargaNpkKg,
        npkPerSak: totalNpkSak,
        organikPerKg: hargaOrgKg,
        organikPerSak: totalOrgSak,
        catatan: `Sesuai Berita Acara Kesepakatan No. ${calculatedRincian.nomorBeritaAcara}`,
        updatedAt: new Date().toISOString(),
        updatedBy: petugas || 'Musyawarah Poktan',
      };

      // Terapkan ke target Poktan atau seluruh Poktan jika applyToAllPoktan
      const targets = applyToAllPoktan ? allRecords : [record];
      targets.forEach((targetRec: any) => {
        targetRec.rincianKesepakatan = JSON.parse(JSON.stringify(calculatedRincian));
        targetRec.hargaPupuk = { ...updatedHargaPupuk };

        if (!targetRec.mutasi) targetRec.mutasi = [];
        targetRec.mutasi.unshift({
          id: `MUT-BA-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          tanggal: new Date().toISOString(),
          tipe: 'KESEPAKATAN_HARGA',
          keterangan: `Penetapan Berita Acara Kesepakatan Harga Jual Pupuk TA ${calculatedRincian.tahunAnggaran}: Urea Rp ${totalUreaSak.toLocaleString('id-ID')}/sak, NPK Rp ${totalNpkSak.toLocaleString('id-ID')}/sak, Organik Rp ${totalOrgSak.toLocaleString('id-ID')}/sak (${calculatedRincian.nomorBeritaAcara})`,
          petugas: petugas || 'Pengurus Poktan',
        });
      });

      writeJsonFile(stokHargaFilePath, allRecords);

      const { calculatedStok } = getStokHargaPoktanRecord(poktanId, namaPoktan);

      return NextResponse.json({
        success: true,
        message: applyToAllPoktan
          ? 'Berita Acara Kesepakatan Harga Pupuk berhasil ditetapkan & diterapkan ke SELURUH Poktan se-Kecamatan!'
          : `Berita Acara Kesepakatan Harga Pupuk berhasil ditetapkan untuk ${record.namaPoktan}!`,
        rincianKesepakatan: record.rincianKesepakatan,
        hargaPupuk: record.hargaPupuk,
        stokGudang: calculatedStok,
      });
    }

    // Aksi 2: Update Harga Sederhana (legacy fallback)
    if (action === 'UPDATE_HARGA') {
      const ureaVal = parseFloat(hargaPupuk?.ureaPerKg);
      const npkVal = parseFloat(hargaPupuk?.npkPerKg);
      const orgVal = parseFloat(hargaPupuk?.organikPerKg);

      const ureaKg = !isNaN(ureaVal) ? Math.max(0, ureaVal) : 2250;
      const npkKg = !isNaN(npkVal) ? Math.max(0, npkVal) : 2300;
      const organikKg = !isNaN(orgVal) ? Math.max(0, orgVal) : 800;

      record.hargaPupuk = {
        ureaPerKg: ureaKg,
        ureaPerSak: Math.round(ureaKg * 50),
        npkPerKg: npkKg,
        npkPerSak: Math.round(npkKg * 50),
        organikPerKg: organikKg,
        organikPerSak: Math.round(organikKg * 40), // 1 Sak Organik = 40 Kg
        catatan: catatan || 'Harga tebus pupuk Poktan disesuaikan',
        updatedAt: new Date().toISOString(),
        updatedBy: petugas || 'Pengurus Poktan',
      };

      if (!record.mutasi) record.mutasi = [];
      record.mutasi.unshift({
        id: `MUT-PRC-${Date.now()}`,
        tanggal: new Date().toISOString(),
        tipe: 'PERUBAHAN_HARGA',
        keterangan: `Penetapan harga tebus: Urea Rp ${ureaKg.toLocaleString('id-ID')}/Kg, NPK Rp ${npkKg.toLocaleString('id-ID')}/Kg, Organik Rp ${organikKg.toLocaleString('id-ID')}/Kg (${catatan || 'Musyawarah Poktan'})`,
        petugas: petugas || 'Pengurus Poktan',
      });

      writeJsonFile(stokHargaFilePath, allRecords);

      const { calculatedStok } = getStokHargaPoktanRecord(poktanId, namaPoktan);

      return NextResponse.json({
        success: true,
        message: 'Harga pupuk Poktan berhasil diperbarui & langsung aktif di Kasir Poktan!',
        hargaPupuk: record.hargaPupuk,
        stokGudang: calculatedStok,
      });
    }

    // Aksi 3: Penyesuaian Stok Gudang Fisik (Opname)
    if (action === 'PENYESUAIAN_STOK') {
      const addUreaKg = parseFloat(penyesuaianStok?.ureaKg) || 0;
      const addNpkKg = parseFloat(penyesuaianStok?.npkKg) || 0;
      const addOrgKg = parseFloat(penyesuaianStok?.organikKg) || 0;
      const tipeOpname = penyesuaianStok?.tipe || 'TAMBAH_STOK_MASUK'; // 'TAMBAH_STOK_MASUK' | 'KOREKSI_OPNAME'

      if (!record.penyesuaianAwal) {
        record.penyesuaianAwal = { ureaKg: 0, npkKg: 0, organikKg: 0 };
      }

      if (tipeOpname === 'TAMBAH_STOK_MASUK') {
        record.penyesuaianAwal.ureaKg = (Number(record.penyesuaianAwal.ureaKg) || 0) + addUreaKg;
        record.penyesuaianAwal.npkKg = (Number(record.penyesuaianAwal.npkKg) || 0) + addNpkKg;
        record.penyesuaianAwal.organikKg = (Number(record.penyesuaianAwal.organikKg) || 0) + addOrgKg;
      } else {
        // Set langsung stok awal / koreksi fisik
        record.penyesuaianAwal.ureaKg = Math.max(0, addUreaKg);
        record.penyesuaianAwal.npkKg = Math.max(0, addNpkKg);
        record.penyesuaianAwal.organikKg = Math.max(0, addOrgKg);
      }
      record.penyesuaianAwal.catatan = catatan || 'Penyesuaian stok opname gudang Poktan';
      record.penyesuaianAwal.updatedAt = new Date().toISOString();

      if (!record.mutasi) record.mutasi = [];
      record.mutasi.unshift({
        id: `MUT-STK-${Date.now()}`,
        tanggal: new Date().toISOString(),
        tipe: tipeOpname === 'TAMBAH_STOK_MASUK' ? 'TAMBAH_STOK' : 'OPNAME_FISIK',
        keterangan: catatan || `Penyesuaian stok fisik gudang Poktan (${tipeOpname === 'TAMBAH_STOK_MASUK' ? 'Tambah Stok' : 'Opname Riil'}: Urea ${addUreaKg} Kg, NPK ${addNpkKg} Kg, Organik ${addOrgKg} Kg)`,
        ureaKg: addUreaKg,
        npkKg: addNpkKg,
        organikKg: addOrgKg,
        petugas: petugas || 'Pengurus Poktan',
      });

      writeJsonFile(stokHargaFilePath, allRecords);

      const { calculatedStok } = getStokHargaPoktanRecord(poktanId, namaPoktan);

      return NextResponse.json({
        success: true,
        message: 'Stok gudang Poktan berhasil disesuaikan & tersinkronisasi realtime ke Kasir Poktan!',
        stokGudang: calculatedStok,
        penyesuaianAwal: record.penyesuaianAwal,
      });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak dikenali' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
