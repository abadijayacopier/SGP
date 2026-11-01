import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const petaniId = searchParams.get('petaniId');

    const where: any = {};
    if (petaniId) {
      where.petaniId = petaniId;
    }

    const penyaluranList = await prisma.penyaluranPupuk.findMany({
      where,
      include: {
        petani: {
          include: {
            poktan: true,
          },
        },
      },
      orderBy: { tanggalPenyaluran: 'desc' },
    });

    return NextResponse.json({ success: true, data: penyaluranList });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      petaniId,
      namaKios,
      petugasKios,
      namaPengurusPoktan,
      jumlahUreaKg,
      jumlahNpkKg,
      jumlahOrganikKg,
      totalBiayaRp,
      fotoKtp,
      fotoDiri,
      tandaTanganPetani,
      catatan,
    } = body;

    const ureaAmbil = parseFloat(jumlahUreaKg) || 0;
    const npkAmbil = parseFloat(jumlahNpkKg) || 0;
    const organikAmbil = parseFloat(jumlahOrganikKg) || 0;

    if (ureaAmbil === 0 && npkAmbil === 0 && organikAmbil === 0) {
      return NextResponse.json(
        { success: false, error: 'Jumlah pupuk yang ditebus tidak boleh kosong atau nol' },
        { status: 400 }
      );
    }

    if (!fotoKtp || !fotoDiri) {
      return NextResponse.json(
        { success: false, error: 'Wajib menyertakan foto KTP asli dan foto diri penerima saat serah terima pupuk' },
        { status: 400 }
      );
    }

    // Ambil kuota aktif petani
    const alokasi = await prisma.alokasiPupuk.findFirst({
      where: {
        petaniId,
        status: 'AKTIF',
      },
    });

    if (!alokasi) {
      return NextResponse.json(
        { success: false, error: 'Petani tidak memiliki data alokasi e-RDKK yang aktif untuk musim tanam ini' },
        { status: 400 }
      );
    }

    // Validasi sisa kuota
    if (ureaAmbil > alokasi.sisaUreaKg) {
      return NextResponse.json(
        { success: false, error: `Jumlah Urea (${ureaAmbil} Kg) melebihi sisa kuota (${alokasi.sisaUreaKg} Kg)` },
        { status: 400 }
      );
    }
    if (npkAmbil > alokasi.sisaNpkKg) {
      return NextResponse.json(
        { success: false, error: `Jumlah NPK (${npkAmbil} Kg) melebihi sisa kuota (${alokasi.sisaNpkKg} Kg)` },
        { status: 400 }
      );
    }
    if (organikAmbil > alokasi.sisaOrganikKg) {
      return NextResponse.json(
        { success: false, error: `Jumlah Organik (${organikAmbil} Kg) melebihi sisa kuota (${alokasi.sisaOrganikKg} Kg)` },
        { status: 400 }
      );
    }

    const count = await prisma.penyaluranPupuk.count();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const nomorNota = `NOTA-DIST-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    // Jalankan transaksi database (catat penyaluran & potong kuota & potong stok kios)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Kurangi kuota petani
      await tx.alokasiPupuk.update({
        where: { id: alokasi.id },
        data: {
          sisaUreaKg: alokasi.sisaUreaKg - ureaAmbil,
          sisaNpkKg: alokasi.sisaNpkKg - npkAmbil,
          sisaOrganikKg: alokasi.sisaOrganikKg - organikAmbil,
        },
      });

      // 2. Buat rekam penyaluran dengan foto verifikasi
      const computedTotalBiaya = (ureaAmbil * 2250) + (npkAmbil * 2300) + (organikAmbil * 800);
      const finalTotalBiaya = computedTotalBiaya > 0 ? computedTotalBiaya : (parseFloat(totalBiayaRp) || 0);

      const transaksi = await tx.penyaluranPupuk.create({
        data: {
          nomorNota,
          petaniId,
          namaKios: namaKios || 'UD. Tani Subur Barokah',
          petugasKios: petugasKios || 'Petugas Kios',
          namaPengurusPoktan: namaPengurusPoktan || 'Pengurus Poktan Terverifikasi',
          tanggalPenyaluran: new Date(),
          jumlahUreaKg: ureaAmbil,
          jumlahNpkKg: npkAmbil,
          jumlahOrganikKg: organikAmbil,
          totalBiayaRp: finalTotalBiaya,
          fotoKtp,
          fotoDiri,
          tandaTanganPetani: tandaTanganPetani || null,
          catatan: catatan || 'Penebusan pupuk bersubsidi resmi dengan verifikasi identitas fisik.',
          status: 'SELESAI',
        },
        include: {
          petani: {
            include: { poktan: true },
          },
        },
      });

      // 3. Potong stok fisik Kios dan catat Mutasi Pengeluaran (Penyaluran Petani)
      const targetKiosName = namaKios || 'UD. Tani Subur Barokah';
      const itemsToDeduct = [
        { type: 'Urea', qty: ureaAmbil },
        { type: 'NPK', qty: npkAmbil },
        { type: 'Organik', qty: organikAmbil },
      ];

      for (const item of itemsToDeduct) {
        if (item.qty > 0) {
          const stokItem = await tx.stokKios.findFirst({
            where: {
              namaKios: targetKiosName,
              jenisPupuk: { contains: item.type },
            },
          });

          if (stokItem) {
            const stokSebelum = stokItem.stokSisaKg;
            const stokSesudah = Math.max(0, stokSebelum - item.qty);

            await tx.stokKios.update({
              where: { id: stokItem.id },
              data: {
                stokTersalurKg: stokItem.stokTersalurKg + item.qty,
                stokSisaKg: stokSesudah,
              },
            });

            await tx.mutasiStokKios.create({
              data: {
                namaKios: targetKiosName,
                jenisPupuk: stokItem.jenisPupuk,
                tipeMutasi: 'PENYALURAN_PETANI',
                jumlahKg: item.qty,
                stokSebelumKg: stokSebelum,
                stokSesudahKg: stokSesudah,
                nomorReferensi: nomorNota,
                petugas: petugasKios || 'Petugas Kios',
                keterangan: `Penyaluran resmi kepada ${transaksi.petani?.nama || 'Petani'} (NIK: ${transaksi.petani?.nik || '-'})`,
                tanggal: new Date(),
              },
            });
          }
        }
      }

      return transaksi;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
      return NextResponse.json({ success: false, error: 'ID penyaluran wajib disertakan' }, { status: 400 });
    }

    const item = await prisma.penyaluranPupuk.findUnique({
      where: { id },
      include: { petani: true },
    });

    if (!item) {
      return NextResponse.json({ success: false, error: 'Data penyaluran tidak ditemukan' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Rollback kuota petani
      const alokasi = await tx.alokasiPupuk.findFirst({
        where: { petaniId: item.petaniId, status: 'AKTIF' },
      });

      if (alokasi) {
        await tx.alokasiPupuk.update({
          where: { id: alokasi.id },
          data: {
            sisaUreaKg: Math.min(alokasi.jatahUreaKg, alokasi.sisaUreaKg + (item.jumlahUreaKg || 0)),
            sisaNpkKg: Math.min(alokasi.jatahNpkKg, alokasi.sisaNpkKg + (item.jumlahNpkKg || 0)),
            sisaOrganikKg: Math.min(alokasi.jatahOrganikKg, alokasi.sisaOrganikKg + (item.jumlahOrganikKg || 0)),
          },
        });
      }

      // 2. Rollback stok fisik kios
      const itemsToRestore = [
        { type: 'Urea', qty: item.jumlahUreaKg || 0 },
        { type: 'NPK', qty: item.jumlahNpkKg || 0 },
        { type: 'Organik', qty: item.jumlahOrganikKg || 0 },
      ];

      for (const it of itemsToRestore) {
        if (it.qty > 0) {
          const stokItem = await tx.stokKios.findFirst({
            where: {
              namaKios: item.namaKios,
              jenisPupuk: { contains: it.type },
            },
          });

          if (stokItem) {
            const stokSebelum = stokItem.stokSisaKg;
            const stokSesudah = stokSebelum + it.qty;

            await tx.stokKios.update({
              where: { id: stokItem.id },
              data: {
                stokTersalurKg: Math.max(0, stokItem.stokTersalurKg - it.qty),
                stokSisaKg: stokSesudah,
              },
            });

            await tx.mutasiStokKios.create({
              data: {
                namaKios: item.namaKios,
                jenisPupuk: stokItem.jenisPupuk,
                tipeMutasi: 'BATAL_PENYALURAN',
                jumlahKg: it.qty,
                stokSebelumKg: stokSebelum,
                stokSesudahKg: stokSesudah,
                nomorReferensi: item.nomorNota,
                petugas: 'Petugas Kios (Pembatalan)',
                keterangan: `Pembatalan penyaluran nota ${item.nomorNota}: kuota & stok dikembalikan`,
                tanggal: new Date(),
              },
            });
          }
        }
      }

      // 3. Hapus record penyaluran
      await tx.penyaluranPupuk.delete({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      message: `Penyaluran ${item.nomorNota} berhasil dibatalkan. Kuota petani & stok kios telah dikembalikan!`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
