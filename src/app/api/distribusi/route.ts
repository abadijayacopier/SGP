import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

const filePath = path.join(process.cwd(), 'src', 'data', 'distribusi-kios.json');

function readDistribusiData() {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading distribusi-kios.json:', err);
    return [];
  }
}

function writeDistribusiData(data: any[]) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing distribusi-kios.json:', err);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const namaKios = searchParams.get('namaKios');
    const poktanId = searchParams.get('poktanId');
    const status = searchParams.get('status');

    let list = readDistribusiData();

    if (namaKios && namaKios !== 'SEMUA') {
      list = list.filter((item: any) => item.namaKios?.toLowerCase() === namaKios.toLowerCase());
    }

    if (poktanId && poktanId !== 'SEMUA') {
      list = list.filter(
        (item: any) =>
          item.poktanId === poktanId ||
          item.namaPoktan?.toLowerCase() === poktanId.toLowerCase()
      );
    }

    if (status && status !== 'SEMUA') {
      list = list.filter((item: any) => item.status === status);
    }

    // Urutkan dari pengiriman terbaru
    list.sort(
      (a: any, b: any) =>
        new Date(b.tanggalKirim || b.createdAt).getTime() -
        new Date(a.tanggalKirim || a.createdAt).getTime()
    );

    // Rekapitulasi
    const summary = {
      totalPengiriman: list.length,
      totalUreaKg: list.reduce((acc: number, item: any) => acc + (Number(item.jumlahUreaKg) || 0), 0),
      totalNpkKg: list.reduce((acc: number, item: any) => acc + (Number(item.jumlahNpkKg) || 0), 0),
      totalOrganikKg: list.reduce((acc: number, item: any) => acc + (Number(item.jumlahOrganikKg) || 0), 0),
      totalUreaSak: list.reduce((acc: number, item: any) => acc + (Number(item.jumlahUreaSak) || 0), 0),
      totalNpkSak: list.reduce((acc: number, item: any) => acc + (Number(item.jumlahNpkSak) || 0), 0),
      totalOrganikSak: list.reduce((acc: number, item: any) => acc + (Number(item.jumlahOrganikSak) || 0), 0),
      totalDiterimaKg: list
        .filter((i: any) => i.status === 'DITERIMA')
        .reduce(
          (acc: number, item: any) =>
            acc +
            (Number(item.jumlahUreaKg) || 0) +
            (Number(item.jumlahNpkKg) || 0) +
            (Number(item.jumlahOrganikKg) || 0),
          0
        ),
      totalDalamPerjalananKg: list
        .filter((i: any) => i.status === 'DIKIRIM')
        .reduce(
          (acc: number, item: any) =>
            acc +
            (Number(item.jumlahUreaKg) || 0) +
            (Number(item.jumlahNpkKg) || 0) +
            (Number(item.jumlahOrganikKg) || 0),
          0
        ),
    };

    return NextResponse.json({ success: true, data: list, summary });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const list = readDistribusiData();

    const targetKios = body.namaKios?.trim() || 'BUMI SUBUR';
    const poktanId = body.poktanId;
    const namaPoktan = body.namaPoktan?.trim();

    if (!poktanId || !namaPoktan) {
      return NextResponse.json(
        { success: false, error: 'Kelompok Tani penerima wajib dipilih!' },
        { status: 400 }
      );
    }

    if (!body.namaSopir?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama sopir / pengemudi wajib diisi!' },
        { status: 400 }
      );
    }

    if (!body.nomorPolisi?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nomor polisi (plat) armada wajib diisi!' },
        { status: 400 }
      );
    }

    const ureaSak = Math.max(0, parseInt(body.jumlahUreaSak) || 0);
    const npkSak = Math.max(0, parseInt(body.jumlahNpkSak) || 0);
    const orgSak = Math.max(0, parseInt(body.jumlahOrganikSak) || 0);

    const ureaKg = ureaSak * 50;
    const npkKg = npkSak * 50;
    const orgKg = orgSak * 40;

    if (ureaSak + npkSak + orgSak <= 0) {
      return NextResponse.json(
        { success: false, error: 'Jumlah muatan pupuk minimal 1 sak!' },
        { status: 400 }
      );
    }

    // 1. Validasi ketersediaan stok fisik riil di gudang Kios (Prisma)
    const currentStoks = await prisma.stokKios.findMany({
      where: { namaKios: targetKios },
    });

    const stokUrea = currentStoks.find((s) => s.jenisPupuk.toLowerCase().includes('urea'));
    const stokNpk = currentStoks.find((s) => s.jenisPupuk.toLowerCase().includes('npk'));
    const stokOrg = currentStoks.find((s) => s.jenisPupuk.toLowerCase().includes('organik'));

    if (ureaKg > 0) {
      const sisa = stokUrea ? stokUrea.stokSisaKg : 0;
      if (sisa < ureaKg) {
        return NextResponse.json(
          {
            success: false,
            error: `Stok Urea di gudang "${targetKios}" tidak mencukupi! Tersedia ${sisa.toLocaleString('id-ID')} Kg (${Math.floor(sisa / 50)} Sak), permintaan ${ureaKg.toLocaleString('id-ID')} Kg (${ureaSak} Sak).`,
          },
          { status: 400 }
        );
      }
    }

    if (npkKg > 0) {
      const sisa = stokNpk ? stokNpk.stokSisaKg : 0;
      if (sisa < npkKg) {
        return NextResponse.json(
          {
            success: false,
            error: `Stok NPK Phonska di gudang "${targetKios}" tidak mencukupi! Tersedia ${sisa.toLocaleString('id-ID')} Kg (${Math.floor(sisa / 50)} Sak), permintaan ${npkKg.toLocaleString('id-ID')} Kg (${npkSak} Sak).`,
          },
          { status: 400 }
        );
      }
    }

    if (orgKg > 0) {
      const sisa = stokOrg ? stokOrg.stokSisaKg : 0;
      if (sisa < orgKg) {
        return NextResponse.json(
          {
            success: false,
            error: `Stok Organik Petroganik di gudang "${targetKios}" tidak mencukupi! Tersedia ${sisa.toLocaleString('id-ID')} Kg (${Math.floor(sisa / 40)} Sak), permintaan ${orgKg.toLocaleString('id-ID')} Kg (${orgSak} Sak).`,
          },
          { status: 400 }
        );
      }
    }

    // 2. Generate Nomor Surat Jalan & ID
    const countTotal = list.length + 1;
    const id = `DIST-2026-${String(countTotal).padStart(3, '0')}`;
    const nomorSuratJalan =
      body.nomorSuratJalan || `SJ/KPL-LMB/2026/${String(countTotal).padStart(3, '0')}`;

    const tglKirim = body.tanggalKirim ? new Date(body.tanggalKirim) : new Date();

    // 3. Eksekusi Pemotongan Stok Kios & Pembuatan Mutasi Stok Kios di Database
    await prisma.$transaction(async (tx) => {
      const items = [
        { type: 'urea', sak: ureaSak, kg: ureaKg, stokItem: stokUrea },
        { type: 'npk', sak: npkSak, kg: npkKg, stokItem: stokNpk },
        { type: 'organik', sak: orgSak, kg: orgKg, stokItem: stokOrg },
      ];

      for (const it of items) {
        if (it.kg > 0 && it.stokItem) {
          const stokSebelum = it.stokItem.stokSisaKg;
          const stokSesudah = Math.max(0, stokSebelum - it.kg);

          await tx.stokKios.update({
            where: { id: it.stokItem.id },
            data: {
              stokTersalurKg: it.stokItem.stokTersalurKg + it.kg,
              stokSisaKg: stokSesudah,
            },
          });

          await tx.mutasiStokKios.create({
            data: {
              namaKios: targetKios,
              jenisPupuk: it.stokItem.jenisPupuk,
              tipeMutasi: 'DISTRIBUSI_POKTAN',
              jumlahKg: it.kg,
              stokSebelumKg: stokSebelum,
              stokSesudahKg: stokSesudah,
              nomorReferensi: nomorSuratJalan,
              namaDistributor: namaPoktan,
              nomorPolisi: body.nomorPolisi.toUpperCase(),
              namaSupir: body.namaSopir,
              petugas: body.petugas || 'Petugas KPL',
              keterangan: `Pengiriman Surat Jalan ke ${namaPoktan} (${body.kloter || 'Kloter 1'}) - ${it.sak} Sak`,
              tanggal: tglKirim,
            },
          });
        }
      }
    });

    // 4. Catat ke file distribusi
    const newRecord = {
      id,
      nomorSuratJalan,
      namaKios: targetKios,
      kodeKios: body.kodeKios || 'KPL-LMB-008',
      poktanId: body.poktanId,
      namaPoktan: body.namaPoktan,
      desa: body.desa || 'Kediren',
      kloter: body.kloter || `Kloter ${countTotal}`,
      tanggalKirim: tglKirim.toISOString(),
      namaSopir: body.namaSopir,
      nomorPolisi: body.nomorPolisi.toUpperCase(),
      jumlahUreaSak: ureaSak,
      jumlahUreaKg: ureaKg,
      jumlahNpkSak: npkSak,
      jumlahNpkKg: npkKg,
      jumlahOrganikSak: orgSak,
      jumlahOrganikKg: orgKg,
      status: body.status || 'DIKIRIM',
      tanggalDiterima: body.status === 'DITERIMA' ? new Date().toISOString() : null,
      namaPenerima: body.namaPenerima || 'Ketua Poktan',
      jabatanPenerima: body.jabatanPenerima || 'Ketua Kelompok Tani',
      catatan: body.catatan || '',
      createdAt: new Date().toISOString(),
    };

    list.unshift(newRecord);
    writeDistribusiData(list);

    return NextResponse.json({
      success: true,
      data: newRecord,
      message: `Surat Jalan Pengiriman ${nomorSuratJalan} berhasil diterbitkan dan stok gudang terpotong!`,
    });
  } catch (err: any) {
    console.error('Error POST /api/distribusi:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      action,
      namaPenerima,
      catatan,
      status,
      namaSopir,
      nomorPolisi,
      kloter,
      tanggalKirim,
      jumlahUreaSak,
      jumlahNpkSak,
      jumlahOrganikSak,
      poktanId,
      namaPoktan,
      desa,
    } = body;

    const list = readDistribusiData();
    const index = list.findIndex((item: any) => item.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Data distribusi tidak ditemukan' },
        { status: 404 }
      );
    }

    const currentItem = list[index];

    // Mode A: Update Data Pengiriman / Surat Jalan & Selisih Stok
    if (action === 'UPDATE_PENGIRIMAN' || namaSopir || nomorPolisi || jumlahUreaSak !== undefined) {
      const oldUreaKg = Number(currentItem.jumlahUreaKg) || 0;
      const oldNpkKg = Number(currentItem.jumlahNpkKg) || 0;
      const oldOrgKg = Number(currentItem.jumlahOrganikKg) || 0;

      const newUreaSak = jumlahUreaSak !== undefined ? Math.max(0, parseInt(jumlahUreaSak) || 0) : currentItem.jumlahUreaSak;
      const newNpkSak = jumlahNpkSak !== undefined ? Math.max(0, parseInt(jumlahNpkSak) || 0) : currentItem.jumlahNpkSak;
      const newOrgSak = jumlahOrganikSak !== undefined ? Math.max(0, parseInt(jumlahOrganikSak) || 0) : currentItem.jumlahOrganikSak;

      const newUreaKg = newUreaSak * 50;
      const newNpkKg = newNpkSak * 50;
      const newOrgKg = newOrgSak * 40;

      const deltaUreaKg = newUreaKg - oldUreaKg;
      const deltaNpkKg = newNpkKg - oldNpkKg;
      const deltaOrgKg = newOrgKg - oldOrgKg;

      // Update stok Kios jika kuantitas berubah
      if (deltaUreaKg !== 0 || deltaNpkKg !== 0 || deltaOrgKg !== 0) {
        await prisma.$transaction(async (tx) => {
          const updates = [
            { type: 'urea', delta: deltaUreaKg, newKg: newUreaKg, newSak: newUreaSak },
            { type: 'npk', delta: deltaNpkKg, newKg: newNpkKg, newSak: newNpkSak },
            { type: 'organik', delta: deltaOrgKg, newKg: newOrgKg, newSak: newOrgSak },
          ];

          for (const u of updates) {
            if (u.delta !== 0) {
              const stok = await tx.stokKios.findFirst({
                where: {
                  namaKios: currentItem.namaKios,
                  jenisPupuk: { contains: u.type === 'urea' ? 'Urea' : u.type === 'npk' ? 'NPK' : 'Organik' },
                },
              });

              if (stok) {
                const stokBaru = Math.max(0, stok.stokSisaKg - u.delta);
                const tersalurBaru = Math.max(0, stok.stokTersalurKg + u.delta);

                await tx.stokKios.update({
                  where: { id: stok.id },
                  data: {
                    stokTersalurKg: tersalurBaru,
                    stokSisaKg: stokBaru,
                  },
                });

                // Update mutasi terkait nomorReferensi surat jalan
                await tx.mutasiStokKios.updateMany({
                  where: {
                    namaKios: currentItem.namaKios,
                    nomorReferensi: currentItem.nomorSuratJalan,
                    jenisPupuk: stok.jenisPupuk,
                  },
                  data: {
                    jumlahKg: u.newKg,
                    stokSesudahKg: stokBaru,
                  },
                });
              }
            }
          }
        });
      }

      if (namaSopir) currentItem.namaSopir = namaSopir;
      if (nomorPolisi) currentItem.nomorPolisi = nomorPolisi.toUpperCase();
      if (kloter) currentItem.kloter = kloter;
      if (tanggalKirim) currentItem.tanggalKirim = tanggalKirim;
      if (poktanId) currentItem.poktanId = poktanId;
      if (namaPoktan) currentItem.namaPoktan = namaPoktan;
      if (desa) currentItem.desa = desa;
      if (catatan !== undefined) currentItem.catatan = catatan;

      currentItem.jumlahUreaSak = newUreaSak;
      currentItem.jumlahUreaKg = newUreaKg;
      currentItem.jumlahNpkSak = newNpkSak;
      currentItem.jumlahNpkKg = newNpkKg;
      currentItem.jumlahOrganikSak = newOrgSak;
      currentItem.jumlahOrganikKg = newOrgKg;

      writeDistribusiData(list);
      return NextResponse.json({
        success: true,
        data: currentItem,
        message: 'Data surat jalan pengiriman dan stok gudang berhasil diperbarui!',
      });
    }

    // Mode B: Konfirmasi Tiba / Terima Pupuk di Poktan
    currentItem.status = status || 'DITERIMA';
    currentItem.tanggalDiterima = new Date().toISOString();
    if (namaPenerima) currentItem.namaPenerima = namaPenerima;
    if (catatan) currentItem.catatan = catatan;

    writeDistribusiData(list);

    return NextResponse.json({
      success: true,
      data: currentItem,
      message: 'Surat Tanda Terima Berhasil Disahkan & Pupuk Resmi Diterima Poktan',
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
      return NextResponse.json(
        { success: false, error: 'ID distribusi wajib disertakan' },
        { status: 400 }
      );
    }

    const list = readDistribusiData();
    const index = list.findIndex((item: any) => item.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Data distribusi tidak ditemukan' },
        { status: 404 }
      );
    }

    const removed = list.splice(index, 1)[0];

    // Kembalikan stok fisik ke gudang Kios & hapus catatan mutasinya
    try {
      await prisma.$transaction(async (tx) => {
        const items = [
          { type: 'urea', kg: Number(removed.jumlahUreaKg) || 0 },
          { type: 'npk', kg: Number(removed.jumlahNpkKg) || 0 },
          { type: 'organik', kg: Number(removed.jumlahOrganikKg) || 0 },
        ];

        for (const it of items) {
          if (it.kg > 0) {
            const stok = await tx.stokKios.findFirst({
              where: {
                namaKios: removed.namaKios,
                jenisPupuk: { contains: it.type === 'urea' ? 'Urea' : it.type === 'npk' ? 'NPK' : 'Organik' },
              },
            });

            if (stok) {
              await tx.stokKios.update({
                where: { id: stok.id },
                data: {
                  stokTersalurKg: Math.max(0, stok.stokTersalurKg - it.kg),
                  stokSisaKg: stok.stokSisaKg + it.kg,
                },
              });
            }
          }
        }

        // Hapus mutasi pengeluaran terkait
        await tx.mutasiStokKios.deleteMany({
          where: {
            namaKios: removed.namaKios,
            nomorReferensi: removed.nomorSuratJalan,
          },
        });
      });
    } catch (dbErr) {
      console.error('Error restoring stock on DELETE:', dbErr);
    }

    writeDistribusiData(list);

    return NextResponse.json({
      success: true,
      message: `Surat jalan ${removed.nomorSuratJalan} berhasil dihapus & stok dikembalikan ke gudang!`,
      data: removed,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
