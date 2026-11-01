import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getStokHargaPoktanRecord } from '@/lib/stok-harga-poktan';

const bukuKasFilePath = path.join(process.cwd(), 'src', 'data', 'buku-kas-poktan.json');
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

    const manualList = readJsonFile(bukuKasFilePath);
    const allTrxList = readJsonFile(trxFilePath);

    // Dapatkan data kesepakatan harga & margin poktan
    const { record } = getStokHargaPoktanRecord(poktanId, namaPoktan);
    const marginRule = record?.rincianKesepakatan || {
      urea: { kasPoktan: 1000, pengurusPoktan: 3000, sewaGudang: 2000, atk: 2000, transportasi: 5000 },
      npk: { kasPoktan: 4000, pengurusPoktan: 3000, sewaGudang: 2000, atk: 2000, transportasi: 5000 },
      organik: { kasPoktan: 1000, pengurusPoktan: 2000, sewaGudang: 1000, atk: 1000, transportasi: 4400 },
    };

    // Filter data per Poktan jika spesifik
    const cleanId = poktanId.toLowerCase().trim();
    const cleanNama = (namaPoktan || '').toLowerCase().replace(/poktan/gi, '').trim();

    const filteredTrx = allTrxList.filter((t: any) => {
      if (poktanId === 'SEMUA') return true;
      const tId = (t.poktanId || '').toLowerCase().trim();
      const tNama = (t.namaPoktan || '').toLowerCase().replace(/poktan/gi, '').trim();
      if (cleanId && tId === cleanId) return true;
      if (cleanNama && tNama && (tNama.includes(cleanNama) || cleanNama.includes(tNama))) return true;
      return false;
    });

    const filteredManual = manualList.filter((m: any) => {
      if (poktanId === 'SEMUA') return true;
      const mId = (m.poktanId || '').toLowerCase().trim();
      const mNama = (m.namaPoktan || '').toLowerCase().replace(/poktan/gi, '').trim();
      if (cleanId && mId === cleanId) return true;
      if (cleanNama && mNama && (mNama.includes(cleanNama) || cleanNama.includes(mNama))) return true;
      return false;
    });

    // 1. Konversi Transaksi Kasir menjadi Transaksi Buku Kas Otomatis
    let akumulasiSakUrea = 0;
    let akumulasiSakNpk = 0;
    let akumulasiSakOrganik = 0;

    let totalKasPoktanFromKasir = 0;
    let totalJasaPengurusFromKasir = 0;
    let totalSewaGudangFromKasir = 0;
    let totalAtkFromKasir = 0;
    let totalTransportFromKasir = 0;

    const autoKasirLedgerEntries = filteredTrx.map((trx: any) => {
      const uSak = trx.jumlahUreaSak || 0;
      const nSak = trx.jumlahNpkSak || 0;
      const oSak = trx.jumlahOrganikSak || 0;

      akumulasiSakUrea += uSak;
      akumulasiSakNpk += nSak;
      akumulasiSakOrganik += oSak;

      const kasUrea = uSak * (marginRule.urea?.kasPoktan || 1000);
      const kasNpk = nSak * (marginRule.npk?.kasPoktan || 4000);
      const kasOrg = oSak * (marginRule.organik?.kasPoktan || 1000);
      const subtotalKas = kasUrea + kasNpk + kasOrg;

      const jasaUrea = uSak * (marginRule.urea?.pengurusPoktan || 3000);
      const jasaNpk = nSak * (marginRule.npk?.pengurusPoktan || 3000);
      const jasaOrg = oSak * (marginRule.organik?.pengurusPoktan || 2000);
      const subtotalJasa = jasaUrea + jasaNpk + jasaOrg;

      const sewaUrea = uSak * (marginRule.urea?.sewaGudang || 2000);
      const sewaNpk = nSak * (marginRule.npk?.sewaGudang || 2000);
      const sewaOrg = oSak * (marginRule.organik?.sewaGudang || 1000);
      const subtotalSewa = sewaUrea + sewaNpk + sewaOrg;

      const atkUrea = uSak * (marginRule.urea?.atk || 2000);
      const atkNpk = nSak * (marginRule.npk?.atk || 2000);
      const atkOrg = oSak * (marginRule.organik?.atk || 1000);
      const subtotalAtk = atkUrea + atkNpk + atkOrg;

      const transUrea = uSak * (marginRule.urea?.transportasi || 5000);
      const transNpk = nSak * (marginRule.npk?.transportasi || 5000);
      const transOrg = oSak * (marginRule.organik?.transportasi || 4400);
      const subtotalTransport = transUrea + transNpk + transOrg;

      totalKasPoktanFromKasir += subtotalKas;
      totalJasaPengurusFromKasir += subtotalJasa;
      totalSewaGudangFromKasir += subtotalSewa;
      totalAtkFromKasir += subtotalAtk;
      totalTransportFromKasir += subtotalTransport;

      return {
        id: `KAS-AUTO-${trx.id}`,
        poktanId: trx.poktanId,
        namaPoktan: trx.namaPoktan,
        tanggal: trx.tanggal,
        jenis: 'PEMASUKAN',
        kategori: 'JASA_KASIR_PUPUK',
        kategoriLabel: 'Margin Kas Poktan & Jasa Tebus Pupuk',
        nominal: subtotalKas, // Kas bersih yang masuk ke rekening Poktan
        nominalJasaPengurus: subtotalJasa,
        nominalSewaGudang: subtotalSewa,
        nominalAtk: subtotalAtk,
        nominalTransport: subtotalTransport,
        totalMarginKeseluruhan: subtotalKas + subtotalJasa + subtotalSewa + subtotalAtk + subtotalTransport,
        keterangan: `Penebusan pupuk e-RDKK oleh ${trx.namaPetani} (${uSak} Sak Urea, ${nSak} Sak NPK, ${oSak} Sak Organik). Nota: ${trx.nomorNota}`,
        penerimaAtauPenyetor: trx.namaPetani,
        refTrxId: trx.id,
        nomorNota: trx.nomorNota,
        isOtomatisKasir: true,
      };
    });

    // 2. Gabungkan seluruh jurnal Buku Kas (Manual + Otomatis Kasir)
    const combinedLedger = [...filteredManual, ...autoKasirLedgerEntries];
    combinedLedger.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

    // 3. Kalkulasi Ringkasan Saldo
    let totalPemasukan = 0;
    let totalPengeluaran = 0;

    for (const item of combinedLedger) {
      if (item.jenis === 'PEMASUKAN') {
        totalPemasukan += item.nominal;
      } else if (item.jenis === 'PENGELUARAN') {
        totalPengeluaran += item.nominal;
      }
    }

    const saldoKasSaatIni = totalPemasukan - totalPengeluaran;

    return NextResponse.json({
      success: true,
      data: {
        ledger: combinedLedger,
        summary: {
          saldoKasSaatIni,
          totalPemasukan,
          totalPengeluaran,
          totalKasPoktanFromKasir,
          totalJasaPengurusFromKasir,
          totalSewaGudangFromKasir,
          totalAtkFromKasir,
          totalTransportFromKasir,
          akumulasiSakTebus: {
            urea: Math.round(akumulasiSakUrea * 10) / 10,
            npk: Math.round(akumulasiSakNpk * 10) / 10,
            organik: Math.round(akumulasiSakOrganik * 10) / 10,
            total: Math.round((akumulasiSakUrea + akumulasiSakNpk + akumulasiSakOrganik) * 10) / 10,
          },
          totalTransaksiKasir: filteredTrx.length,
          namaPoktanAktif: record?.namaPoktan || 'Poktan Terpilih',
          marginRule,
        },
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
      poktanId,
      namaPoktan,
      jenis,
      kategori,
      kategoriLabel,
      nominal,
      keterangan,
      penerimaAtauPenyetor,
      tanggal,
    } = body;

    if (!nominal || Number(nominal) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Nominal transaksi kas wajib diisi lebih dari Rp 0' },
        { status: 400 }
      );
    }

    const manualList = readJsonFile(bukuKasFilePath);
    const id = `KAS-MAN-2026-${String(manualList.length + 1).padStart(3, '0')}`;

    const newEntry = {
      id,
      poktanId: poktanId || 'poktan-default',
      namaPoktan: namaPoktan || 'Poktan Desa',
      tanggal: tanggal ? new Date(tanggal).toISOString() : new Date().toISOString(),
      jenis: jenis === 'PENGELUARAN' ? 'PENGELUARAN' : 'PEMASUKAN',
      kategori: kategori || 'LAIN_LAIN',
      kategoriLabel: kategoriLabel || (jenis === 'PENGELUARAN' ? 'Pengeluaran Kas Poktan' : 'Pemasukan Kas Poktan'),
      nominal: Math.abs(Number(nominal)),
      keterangan: keterangan || '',
      penerimaAtauPenyetor: penerimaAtauPenyetor || 'Bendahara Poktan',
      buktiUrl: null,
      isOtomatisKasir: false,
    };

    manualList.unshift(newEntry);
    writeJsonFile(bukuKasFilePath, manualList);

    return NextResponse.json({
      success: true,
      message: 'Catatan buku kas Poktan berhasil disimpan.',
      data: newEntry,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID transaksi wajib disertakan' }, { status: 400 });
    }

    if (id.startsWith('KAS-AUTO-')) {
      return NextResponse.json(
        { success: false, error: 'Transaksi otomatis kasir tidak dapat dihapus dari Buku Kas. Hapus melalui menu Kasir Poktan.' },
        { status: 400 }
      );
    }

    let manualList = readJsonFile(bukuKasFilePath);
    const beforeCount = manualList.length;
    manualList = manualList.filter((m: any) => m.id !== id);

    if (manualList.length === beforeCount) {
      return NextResponse.json({ success: false, error: 'Catatan tidak ditemukan' }, { status: 404 });
    }

    writeJsonFile(bukuKasFilePath, manualList);
    return NextResponse.json({ success: true, message: 'Catatan kas berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
