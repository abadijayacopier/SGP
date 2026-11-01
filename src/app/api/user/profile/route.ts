import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getDefaultNipForRole,
  generateAutoSignatureSvg,
  generateOfficialStampSvg,
} from '@/lib/signature-utils';

async function findUserWithFallback(username: string) {
  const clean = username.trim();
  let user = await prisma.user.findUnique({ where: { username: clean } });
  if (!user) {
    if (clean === 'admin' || clean === 'admin_supriyanto') {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: 'admin' },
            { username: 'admin_supriyanto' },
            { role: 'ADMIN_DINAS' },
          ],
        },
      });
    } else if (clean === 'kios_subur' || clean === 'kios_bumisubur') {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: 'kios_bumisubur' },
            { username: 'kios_subur' },
            { role: 'KIOS' },
          ],
        },
      });
    } else if (clean === 'ppl_sugeng' || clean === 'ppl_lembeyan' || clean === 'ppl_iissugiarti') {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: 'ppl_iissugiarti' },
            { username: 'ppl_sugeng' },
            { username: 'ppl_lembeyan' },
            { role: 'PPL' },
          ],
        },
      });
    } else if (clean === 'surveyor' || clean === 'surveyor_bpp') {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: 'surveyor_bpp' },
            { username: 'surveyor' },
            { role: 'SURVEYOR' },
          ],
        },
      });
    } else if (clean === 'poktan_suparman' || clean === 'poktan') {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: 'poktan_suparman' },
            { role: 'POKTAN' },
          ],
        },
      });
    }
  }
  return user;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username')?.trim();
    const id = searchParams.get('id')?.trim();

    if (!username && !id) {
      return NextResponse.json(
        { success: false, error: 'Parameter username atau id wajib disertakan' },
        { status: 400 }
      );
    }

    let user = null;
    if (id) {
      user = await prisma.user.findUnique({ where: { id } });
    } else if (username) {
      user = await findUserWithFallback(username);
    }

    if (!user) {
      // Jika login via NIK petani yang belum ada di tabel User, cari langsung di tabel Petani
      if (username) {
        const petani = await prisma.petani.findUnique({
          where: { nik: username },
          include: { poktan: true, lahan: true, alokasiPupuk: true },
        });

        if (petani) {
          return NextResponse.json({
            success: true,
            data: {
              id: petani.id,
              username: petani.nik,
              name: petani.nama,
              role: 'PETANI',
              phone: petani.telepon || null,
              email: null,
              wilayah: `${petani.desa}, Kec. ${petani.kecamatan}`,
              avatarUrl: null,
              nip: `NIK: ${petani.nik}`,
              signatureUrl: generateAutoSignatureSvg(petani.nama),
              stampUrl: generateOfficialStampSvg('PETANI', petani.poktan?.nama),
              petaniDetail: {
                nik: petani.nik,
                noKk: petani.noKk,
                alamat: petani.alamat,
                desa: petani.desa,
                kecamatan: petani.kecamatan,
                poktanNama: petani.poktan?.nama,
                totalLahan: petani.lahan?.length || 0,
                totalLuasHa: petani.totalLuasLahan || 0,
                kuotaUreaKg: petani.alokasiPupuk?.[0]?.jatahUreaKg || 0,
                kuotaNpkKg: petani.alokasiPupuk?.[0]?.jatahNpkKg || 0,
                kuotaOrganikKg: petani.alokasiPupuk?.[0]?.jatahOrganikKg || 0,
              },
            },
          });
        }
      }

      return NextResponse.json(
        { success: false, error: 'Pengguna tidak ditemukan dalam sistem' },
        { status: 404 }
      );
    }

    // Ambil data spesifik jabatan untuk melengkapi profil
    let roleSpecificData: any = {};

    if (user.role === 'PETANI') {
      const petani = await prisma.petani.findFirst({
        where: {
          OR: [{ nik: user.username }, { nama: { contains: user.name } }],
        },
        include: { poktan: true, lahan: true, alokasiPupuk: true },
      });
      if (petani) {
        roleSpecificData = {
          petaniId: petani.id,
          nik: petani.nik,
          noKk: petani.noKk,
          alamat: petani.alamat,
          desa: petani.desa,
          kecamatan: petani.kecamatan,
          poktanNama: petani.poktan?.nama,
          totalLahan: petani.lahan?.length || 0,
          totalLuasHa: petani.totalLuasLahan || 0,
          kuotaUreaKg: petani.alokasiPupuk?.[0]?.jatahUreaKg || 0,
          kuotaNpkKg: petani.alokasiPupuk?.[0]?.jatahNpkKg || 0,
          kuotaOrganikKg: petani.alokasiPupuk?.[0]?.jatahOrganikKg || 0,
        };
      }
    } else if (user.role === 'POKTAN') {
      let poktan = null;
      if (user.poktanId) {
        poktan = await prisma.poktan.findUnique({
          where: { id: user.poktanId },
          include: { _count: { select: { anggota: true, pengajuan: true } } },
        });
      } else {
        poktan = await prisma.poktan.findFirst({
          where: { ketua: { contains: user.name } },
          include: { _count: { select: { anggota: true, pengajuan: true } } },
        });
      }
      if (poktan) {
        roleSpecificData = {
          poktanId: poktan.id,
          namaPoktan: poktan.nama,
          desa: poktan.desa,
          kecamatan: poktan.kecamatan,
          jumlahAnggota: poktan._count.anggota,
          jumlahPengajuan: poktan._count.pengajuan,
        };
      }
    } else if (user.role === 'KIOS') {
      const activeKios = user.kiosName || 'UD. Tani Subur Barokah';
      const stokList = await prisma.stokKios.findMany({
        where: { namaKios: activeKios },
      });
      roleSpecificData = {
        namaKios: activeKios,
        kodeKios: 'KPL-LMB-008',
        alamatKios: 'Jl. Raya Lembeyan No. 45, Kecamatan Lembeyan',
        totalStokSisaKg: stokList.reduce((acc, s) => acc + s.stokSisaKg, 0),
        jenisPupukCount: stokList.length,
      };
    } else if (user.role === 'PPL') {
      roleSpecificData = {
        wilayahBpp: 'BPP Kecamatan Lembeyan',
        nipPenyuluh: '19850412 201101 1 008',
        kecamatan: 'Kecamatan Lembeyan',
        kabupaten: 'Magetan',
      };
    } else if (user.role === 'ADMIN_DINAS') {
      roleSpecificData = {
        instansi: 'Pemerintah Kecamatan Lembeyan',
        otoritas: 'Superadmin & Pejabat Verifikator SK e-RDKK',
        nip: '19760814 200212 1 002',
      };
    }

    const resolvedNip = user.nip || getDefaultNipForRole(user.role, user.username);
    const resolvedSignature =
      user.signatureUrl || generateAutoSignatureSvg(user.name);
    const resolvedStamp =
      user.stampUrl ||
      generateOfficialStampSvg(user.role, user.kiosName || user.wilayah || '');

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        phone: user.phone,
        email: user.email,
        wilayah: user.wilayah,
        kiosName: user.kiosName,
        poktanId: user.poktanId,
        avatarUrl: user.avatarUrl,
        nip: resolvedNip,
        signatureUrl: resolvedSignature,
        stampUrl: resolvedStamp,
        createdAt: user.createdAt,
        roleSpecificData,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      username,
      newUsername,
      name,
      phone,
      email,
      avatarUrl,
      wilayah,
      kiosName,
      nip,
      signatureUrl,
      stampUrl,
    } = body;

    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Username akun tidak ditemukan' },
        { status: 400 }
      );
    }

    let user = await findUserWithFallback(username);

    const oldName = user?.name;
    const oldKiosName = user?.kiosName;
    const cleanNewUsername = (newUsername || username).trim();

    if (user && cleanNewUsername && cleanNewUsername !== user.username) {
      const duplicate = await prisma.user.findUnique({
        where: { username: cleanNewUsername },
      });
      if (duplicate && duplicate.id !== user.id) {
        return NextResponse.json(
          {
            success: false,
            error: `Username "${cleanNewUsername}" sudah digunakan oleh akun lain!`,
          },
          { status: 400 }
        );
      }
    }

    if (!user) {
      // Jika akun Petani login lewat NIK yang belum tercatat di User, buatkan entri User-nya
      const petani = await prisma.petani.findUnique({ where: { nik: username } });
      if (petani) {
        user = await prisma.user.create({
          data: {
            username: cleanNewUsername || petani.nik,
            name: name || petani.nama,
            role: 'PETANI',
            phone: phone || petani.telepon,
            email: email || null,
            wilayah: wilayah || `${petani.desa}, Kec. ${petani.kecamatan}`,
            avatarUrl: avatarUrl || null,
            nip: nip || `NIK: ${petani.nik}`,
            signatureUrl: signatureUrl || generateAutoSignatureSvg(name || petani.nama),
            stampUrl: stampUrl || generateOfficialStampSvg('PETANI', petani.desa),
            poktanId: petani.poktanId,
          },
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Akun tidak ditemukan' },
          { status: 404 }
        );
      }
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username: cleanNewUsername || user.username,
          name: name ?? user.name,
          phone: phone !== undefined ? phone : user.phone,
          email: email !== undefined ? email : user.email,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : user.avatarUrl,
          wilayah: wilayah !== undefined ? wilayah : user.wilayah,
          kiosName: kiosName !== undefined ? (kiosName ? kiosName.trim() : null) : user.kiosName,
          nip: nip !== undefined ? nip : user.nip,
          signatureUrl: signatureUrl !== undefined ? signatureUrl : user.signatureUrl,
          stampUrl: stampUrl !== undefined ? stampUrl : user.stampUrl,
        },
      });
    }

    // =========================================================================
    // SINKRONISASI OTOMATIS NAMA, NIP, TTD & STEMPEL KE SELURUH SURAT & TABEL
    // =========================================================================
    const updatedName = user.name;
    if (updatedName) {
      if (user.role === 'PPL') {
        // Sinkronkan seluruh akun alias PPL di kecamatan yang sama & dokumen verifikasi e-RDKK
        await prisma.user.updateMany({
          where: { role: 'PPL' },
          data: {
            name: updatedName,
            ...(phone !== undefined ? { phone } : {}),
            ...(email !== undefined ? { email } : {}),
            ...(avatarUrl !== undefined ? { avatarUrl } : {}),
            ...(wilayah !== undefined ? { wilayah } : {}),
            ...(nip !== undefined ? { nip } : {}),
            ...(signatureUrl !== undefined ? { signatureUrl } : {}),
            ...(stampUrl !== undefined ? { stampUrl } : {}),
          },
        });
        await prisma.pengajuanLahan.updateMany({
          where: {
            OR: [
              { status: 'DIVERIFIKASI_PPL' },
              { diverifikasiOleh: { not: null } },
            ],
          },
          data: {
            diverifikasiOleh: `${updatedName} (PPL Kec. Lembeyan)`,
          },
        });
      } else if (user.role === 'ADMIN_DINAS') {
        await prisma.pengajuanLahan.updateMany({
          where: {
            OR: [
              { status: 'DISETUJUI_DINAS' },
              { disetujuiOleh: { not: null } },
            ],
          },
          data: {
            disetujuiOleh: `${updatedName} (Admin Kec. Lembeyan)`,
          },
        });
      } else if (user.role === 'POKTAN') {
        // Update nama Ketua Poktan di tabel Poktan & Nota Penyaluran
        if (user.poktanId) {
          await prisma.poktan.update({
            where: { id: user.poktanId },
            data: {
              ketua: updatedName,
              ...(phone ? { kontak: phone } : {}),
            },
          });
        } else if (oldName) {
          await prisma.poktan.updateMany({
            where: { ketua: { contains: oldName } },
            data: {
              ketua: updatedName,
              ...(phone ? { kontak: phone } : {}),
            },
          });
        }
        if (oldName) {
          const poktanRows = await prisma.poktan.findMany({
            where: { ketua: updatedName },
          });
          const labelPoktan = poktanRows[0]?.nama
            ? `${updatedName} (Ketua ${poktanRows[0].nama})`
            : updatedName;
          await prisma.penyaluranPupuk.updateMany({
            where: { namaPengurusPoktan: { contains: oldName } },
            data: { namaPengurusPoktan: labelPoktan },
          });
        }
      } else if (user.role === 'KIOS') {
        const newKiosName = user.kiosName || 'UD. Tani Subur Barokah';
        // Jika nama Kios / UD berubah, mutasikan ke semua data riwayat dan tabel gudang
        if (oldKiosName && newKiosName && oldKiosName !== newKiosName) {
          await prisma.stokKios.updateMany({
            where: { namaKios: oldKiosName },
            data: { namaKios: newKiosName },
          });
          await prisma.mutasiStokKios.updateMany({
            where: { namaKios: oldKiosName },
            data: { namaKios: newKiosName },
          });
          await prisma.penyaluranPupuk.updateMany({
            where: { namaKios: oldKiosName },
            data: { namaKios: newKiosName },
          });
        }
        // Sinkronkan nama petugas penanggung jawab ke nota & mutasi
        await prisma.penyaluranPupuk.updateMany({
          where: { namaKios: newKiosName },
          data: { petugasKios: updatedName },
        });
        await prisma.mutasiStokKios.updateMany({
          where: { namaKios: newKiosName },
          data: { petugas: updatedName },
        });
      } else if (user.role === 'PETANI') {
        const petaniRec = await prisma.petani.findFirst({
          where: {
            OR: [
              { nik: user.username },
              ...(oldName ? [{ nama: oldName }] : []),
            ],
          },
        });
        if (petaniRec) {
          await prisma.petani.update({
            where: { id: petaniRec.id },
            data: {
              nama: updatedName,
              ...(phone ? { telepon: phone } : {}),
            },
          });
          await prisma.pengajuanLahan.updateMany({
            where: { petaniId: petaniRec.id },
            data: { namaPemilik: updatedName },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profil dan tanda tangan dokumen resmi berhasil diperbarui serta disinkronkan!',
      data: user,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
