import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getStokHargaPoktanRecord, recordMutasiKasir } from '@/lib/stok-harga-poktan';
import { generateAutoSignatureSvg } from '@/lib/signature-utils';

const trxFilePath = path.join(process.cwd(), 'src', 'data', 'transaksi-kasir-poktan.json');

function readJsonFile(p: string) {
  try {
    if (!fs.existsSync(p)) return [];
    const content = fs.readFileSync(p, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

function writeJsonFile(p: string, data: any[]) {
  try {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing json file:', e);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const poktanId = searchParams.get('poktanId') || 'SEMUA';
    const namaPoktan = searchParams.get('namaPoktan') || undefined;

    let trxList = readJsonFile(trxFilePath);

    if (poktanId && poktanId !== 'SEMUA') {
      const cleanId = poktanId.toLowerCase().trim();
      const cleanNama = (namaPoktan || '').toLowerCase().replace(/poktan/gi, '').trim();

      trxList = trxList.filter((t: any) => {
        const tId = (t.poktanId || '').toLowerCase().trim();
        const tNama = (t.namaPoktan || '').toLowerCase().replace(/poktan/gi, '').trim();
        if (cleanId && tId === cleanId) return true;
        if (cleanNama && tNama && (tNama.includes(cleanNama) || cleanNama.includes(tNama))) return true;
        return false;
      });
    }

    trxList.sort((a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

    // Ambil Stok & Harga Pupuk terintegrasi dari modul Stok & Harga Poktan
    const { record, calculatedStok } = getStokHargaPoktanRecord(poktanId, namaPoktan);

    return NextResponse.json({
      success: true,
      data: trxList,
      stokPoktan: calculatedStok,
      hargaPupuk: record.hargaPupuk,
      rincianKesepakatan: record.rincianKesepakatan,
      namaPoktanAktif: record.namaPoktan,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      petaniId,
      poktanId,
      namaPoktan,
      desa,
      namaPetani,
      nik,
      jumlahUreaKg,
      jumlahNpkKg,
      jumlahOrganikKg,
      totalBayar,
      metodePembayaran = 'TUNAI',
      jumlahUangDiterima,
      kembalian,
      namaKasir,
      catatan,
      tandaTanganPetani,
    } = body;

    const ureaAmbil = parseFloat(jumlahUreaKg) || 0;
    const npkAmbil = parseFloat(jumlahNpkKg) || 0;
    const organikAmbil = parseFloat(jumlahOrganikKg) || 0;

    if (ureaAmbil === 0 && npkAmbil === 0 && organikAmbil === 0) {
      return NextResponse.json(
        { success: false, error: 'Pilih minimal satu jenis pupuk yang ditebus' },
        { status: 400 }
      );
    }

    // 1. Ambil Stok Fisik Gudang & Harga Aktif Poktan
    const { record, calculatedStok } = getStokHargaPoktanRecord(poktanId || 'SEMUA', namaPoktan);

    // Validasi Ketersediaan Stok Fisik di Gudang Poktan
    if (ureaAmbil > calculatedStok.urea.sisaKg) {
      return NextResponse.json(
        {
          success: false,
          error: `Stok fisik Urea di Gudang Poktan tidak mencukupi! Tersisa ${calculatedStok.urea.sisaKg} Kg (${calculatedStok.urea.sisaSakBulat} Sak), tebus diminta ${ureaAmbil} Kg.`,
        },
        { status: 400 }
      );
    }

    if (npkAmbil > calculatedStok.npk.sisaKg) {
      return NextResponse.json(
        {
          success: false,
          error: `Stok fisik NPK di Gudang Poktan tidak mencukupi! Tersisa ${calculatedStok.npk.sisaKg} Kg (${calculatedStok.npk.sisaSakBulat} Sak), tebus diminta ${npkAmbil} Kg.`,
        },
        { status: 400 }
      );
    }

    if (organikAmbil > calculatedStok.organik.sisaKg) {
      return NextResponse.json(
        {
          success: false,
          error: `Stok fisik Pupuk Organik di Gudang Poktan tidak mencukupi! Tersisa ${calculatedStok.organik.sisaKg} Kg (${calculatedStok.organik.sisaSakBulat} Sak), tebus diminta ${organikAmbil} Kg.`,
        },
        { status: 400 }
      );
    }

    // 2. Ambil dan validasi Alokasi Pupuk petani di Prisma (e-RDKK)
    const alokasi = await prisma.alokasiPupuk.findFirst({
      where: { petaniId, status: 'AKTIF' },
    });

    if (alokasi) {
      if (ureaAmbil > alokasi.sisaUreaKg) {
        return NextResponse.json(
          { success: false, error: `Jumlah Urea (${ureaAmbil} Kg) melebihi sisa kuota e-RDKK petani (${alokasi.sisaUreaKg} Kg)` },
          { status: 400 }
        );
      }
      if (npkAmbil > alokasi.sisaNpkKg) {
        return NextResponse.json(
          { success: false, error: `Jumlah NPK (${npkAmbil} Kg) melebihi sisa kuota e-RDKK petani (${alokasi.sisaNpkKg} Kg)` },
          { status: 400 }
        );
      }
      if (organikAmbil > alokasi.sisaOrganikKg) {
        return NextResponse.json(
          { success: false, error: `Jumlah Organik (${organikAmbil} Kg) melebihi sisa kuota e-RDKK petani (${alokasi.sisaOrganikKg} Kg)` },
          { status: 400 }
        );
      }

      // Potong sisa kuota petani di Prisma
      await prisma.alokasiPupuk.update({
        where: { id: alokasi.id },
        data: {
          sisaUreaKg: Math.max(0, alokasi.sisaUreaKg - ureaAmbil),
          sisaNpkKg: Math.max(0, alokasi.sisaNpkKg - npkAmbil),
          sisaOrganikKg: Math.max(0, alokasi.sisaOrganikKg - organikAmbil),
        },
      });
    }

    // 3. Gunakan Harga Aktif Pupuk Poktan
    const hargaUrea = record.hargaPupuk?.ureaPerKg ?? 2250;
    const hargaNpk = record.hargaPupuk?.npkPerKg ?? 2300;
    const hargaOrg = record.hargaPupuk?.organikPerKg ?? 800;

    const subtotalUrea = Math.round(ureaAmbil * hargaUrea);
    const subtotalNpk = Math.round(npkAmbil * hargaNpk);
    const subtotalOrganik = Math.round(organikAmbil * hargaOrg);
    const calculatedTotal = subtotalUrea + subtotalNpk + subtotalOrganik;
    const finalTotalBayar = totalBayar ? Number(totalBayar) : calculatedTotal;

    // 4. Simpan Transaksi Kasir Poktan
    const trxList = readJsonFile(trxFilePath);
    const nomorNota = `NT-POK/2026/${String(trxList.length + 1).padStart(3, '0')}`;
    const id = `TRX-POK-2026-${String(trxList.length + 1).padStart(3, '0')}`;

    const newTrx = {
      id,
      nomorNota,
      poktanId: poktanId || record.poktanId,
      namaPoktan: namaPoktan || record.namaPoktan || 'Poktan Desa',
      desa: desa || record.desa || 'Kediren',
      petaniId,
      nik,
      namaPetani,
      tanggal: new Date().toISOString(),
      jumlahUreaSak: Math.round((ureaAmbil / 50) * 10) / 10,
      jumlahUreaKg: ureaAmbil,
      jumlahNpkSak: Math.round((npkAmbil / 50) * 10) / 10,
      jumlahNpkKg: npkAmbil,
      jumlahOrganikSak: Math.round((organikAmbil / 40) * 10) / 10, // 1 Sak Organik = 40 Kg
      jumlahOrganikKg: organikAmbil,
      hargaUreaPerKg: hargaUrea,
      hargaNpkPerKg: hargaNpk,
      hargaOrganikPerKg: hargaOrg,
      subtotalUrea,
      subtotalNpk,
      subtotalOrganik,
      totalBayar: finalTotalBayar,
      metodePembayaran,
      jumlahUangDiterima: Number(jumlahUangDiterima) || finalTotalBayar,
      kembalian: Number(kembalian) || 0,
      namaKasir: namaKasir || 'Pengurus Poktan',
      tandaTanganPetani: tandaTanganPetani || generateAutoSignatureSvg(namaPetani),
      catatan: catatan || 'Penebusan pupuk di kasir Poktan selesai.',
      status: 'SELESAI',
    };

    trxList.unshift(newTrx);
    writeJsonFile(trxFilePath, trxList);

    // 5. Catat Mutasi Pengurangan Stok di Buku Mutasi Poktan
    recordMutasiKasir(newTrx.poktanId, newTrx.namaPoktan, {
      id: `MUT-TEBUS-${Date.now()}`,
      tanggal: new Date().toISOString(),
      tipe: 'TEBUS_KASIR',
      nomorNota,
      keterangan: `Penebusan Kasir oleh petani ${namaPetani} (NIK: ${nik}): Urea ${ureaAmbil} Kg, NPK ${npkAmbil} Kg, Organik ${organikAmbil} Kg`,
      ureaKg: -ureaAmbil,
      npkKg: -npkAmbil,
      organikKg: -organikAmbil,
      petugas: namaKasir || 'Kasir Poktan',
    });

    // 6. Catat juga di tabel PenyaluranPupuk database Prisma untuk audit & sinkronisasi dinas
    try {
      await prisma.penyaluranPupuk.create({
        data: {
          nomorNota: `POK-${nomorNota}`,
          petaniId,
          namaKios: `Kasir Poktan ${newTrx.namaPoktan}`,
          petugasKios: namaKasir || 'Kasir Poktan',
          namaPengurusPoktan: namaKasir || 'Ketua Poktan',
          jumlahUreaKg: ureaAmbil,
          jumlahNpkKg: npkAmbil,
          jumlahOrganikKg: organikAmbil,
          totalBiayaRp: newTrx.totalBayar,
          fotoKtp: '/avatar-default.png',
          fotoDiri: '/avatar-default.png',
          tandaTanganPetani: newTrx.tandaTanganPetani || null,
          catatan: `Penebusan via Kasir Poktan (${nomorNota})`,
          status: 'SELESAI',
        },
      });
    } catch (e) {
      console.warn('Gagal sinkron ke PenyaluranPupuk prisma (bisa karena duplikat nota):', e);
    }

    return NextResponse.json({
      success: true,
      data: newTrx,
      message: 'Transaksi Kasir Poktan Berhasil Disimpan, Stok Gudang Terpotong, & Kuota e-RDKK Berkurang!',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
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
      return NextResponse.json({ success: false, error: 'ID transaksi kasir wajib disertakan' }, { status: 400 });
    }

    const trxList = readJsonFile(trxFilePath);
    const index = trxList.findIndex((t: any) => t.id === id || t.nomorNota === id);

    if (index === -1) {
      return NextResponse.json({ success: false, error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    const targetTrx = trxList[index];

    // 1. Rollback Kuota Petani di Prisma
    if (targetTrx.petaniId) {
      const alokasi = await prisma.alokasiPupuk.findFirst({
        where: { petaniId: targetTrx.petaniId, status: 'AKTIF' },
      });
      if (alokasi) {
        await prisma.alokasiPupuk.update({
          where: { id: alokasi.id },
          data: {
            sisaUreaKg: Math.min(alokasi.jatahUreaKg, alokasi.sisaUreaKg + (Number(targetTrx.jumlahUreaKg) || 0)),
            sisaNpkKg: Math.min(alokasi.jatahNpkKg, alokasi.sisaNpkKg + (Number(targetTrx.jumlahNpkKg) || 0)),
            sisaOrganikKg: Math.min(alokasi.jatahOrganikKg, alokasi.sisaOrganikKg + (Number(targetTrx.jumlahOrganikKg) || 0)),
          },
        });
      }
    }

    // 2. Kembalikan Stok Fisik Gudang Poktan lewat Mutasi Pembatalan
    recordMutasiKasir(targetTrx.poktanId, targetTrx.namaPoktan, {
      id: `MUT-BATAL-${Date.now()}`,
      tanggal: new Date().toISOString(),
      tipe: 'BATAL_TEBUS',
      nomorNota: targetTrx.nomorNota,
      keterangan: `Pembatalan Transaksi Kasir ${targetTrx.nomorNota} (${targetTrx.namaPetani}): Stok dikembalikan`,
      ureaKg: Number(targetTrx.jumlahUreaKg) || 0,
      npkKg: Number(targetTrx.jumlahNpkKg) || 0,
      organikKg: Number(targetTrx.jumlahOrganikKg) || 0,
      petugas: 'Kasir Poktan (Pembatalan)',
    });

    // 3. Hapus rekam penyaluran di prisma jika ada
    try {
      await prisma.penyaluranPupuk.deleteMany({
        where: {
          OR: [
            { nomorNota: `POK-${targetTrx.nomorNota}` },
            { nomorNota: targetTrx.nomorNota },
          ],
        },
      });
    } catch (e) {
      // Abaikan jika tidak ditemukan
    }

    // 4. Hapus transaksi dari JSON
    trxList.splice(index, 1);
    writeJsonFile(trxFilePath, trxList);

    return NextResponse.json({
      success: true,
      message: `Transaksi ${targetTrx.nomorNota} berhasil dibatalkan. Kuota petani & stok gudang telah dikembalikan!`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
