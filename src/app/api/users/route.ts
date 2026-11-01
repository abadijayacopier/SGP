import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getDefaultNipForRole,
  generateAutoSignatureSvg,
  generateOfficialStampSvg,
} from '@/lib/signature-utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');

    const whereClause: any = {};
    if (role && role !== 'SEMUA') {
      whereClause.role = role;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    const enrichedUsers = users.map((u) => ({
      ...u,
      nip: u.nip || getDefaultNipForRole(u.role, u.username),
      signatureUrl: u.signatureUrl || generateAutoSignatureSvg(u.name),
      stampUrl: u.stampUrl || generateOfficialStampSvg(u.role, u.kiosName || u.wilayah || ''),
    }));

    return NextResponse.json({ success: true, data: enrichedUsers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, name, role, phone, email, wilayah, kiosName, poktanId } = body;

    if (!username || !name || !role) {
      return NextResponse.json(
        { success: false, error: 'Username, Nama Lengkap, dan Peran (Role) wajib diisi!' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Username "${username}" sudah digunakan oleh akun lain.` },
        { status: 400 }
      );
    }

    const created = await prisma.user.create({
      data: {
        username: username.trim(),
        name: name.trim(),
        role,
        phone: phone || null,
        email: email || null,
        wilayah: wilayah || 'Kecamatan Lembeyan',
        kiosName: kiosName || null,
        poktanId: poktanId || null,
      },
    });

    // Inisialisasi stok pupuk jika membuat akun Kios baru dan stok belum ada
    if (role === 'KIOS' && kiosName) {
      const cleanKName = kiosName.trim();
      const existingStok = await prisma.stokKios.findFirst({
        where: { namaKios: cleanKName },
      });
      if (!existingStok) {
        await prisma.stokKios.createMany({
          data: [
            {
              namaKios: cleanKName,
              jenisPupuk: 'Urea Bersubsidi (Pupuk Indonesia)',
              stokAwalKg: 15000,
              stokMasukKg: 0,
              stokTersalurKg: 0,
              stokSisaKg: 15000,
            },
            {
              namaKios: cleanKName,
              jenisPupuk: 'NPK Phonska Bersubsidi',
              stokAwalKg: 10000,
              stokMasukKg: 0,
              stokTersalurKg: 0,
              stokSisaKg: 10000,
            },
            {
              namaKios: cleanKName,
              jenisPupuk: 'Pupuk Organik Petroganik',
              stokAwalKg: 5000,
              stokMasukKg: 0,
              stokTersalurKg: 0,
              stokSisaKg: 5000,
            },
          ],
        });
      }
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, username, name, role, phone, email, wilayah, kiosName, poktanId } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID User wajib disertakan' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    const oldName = existingUser?.name;
    const cleanUsername = username ? username.trim() : existingUser?.username;

    if (cleanUsername && existingUser && cleanUsername !== existingUser.username) {
      const duplicate = await prisma.user.findUnique({ where: { username: cleanUsername } });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { success: false, error: `Username "${cleanUsername}" sudah digunakan oleh akun lain!` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(cleanUsername ? { username: cleanUsername } : {}),
        name,
        role,
        phone: phone || null,
        email: email || null,
        wilayah: wilayah || null,
        kiosName: kiosName || null,
        poktanId: poktanId || null,
      },
    });

    // Sinkronkan nama baru ke dokumen verifikasi / poktan / kios / petani terkait
    if (name) {
      if (updated.role === 'PPL') {
        await prisma.user.updateMany({
          where: { role: 'PPL' },
          data: { name },
        });
        await prisma.pengajuanLahan.updateMany({
          where: {
            OR: [{ status: 'DIVERIFIKASI_PPL' }, { diverifikasiOleh: { not: null } }],
          },
          data: { diverifikasiOleh: `${name} (PPL Kec. Lembeyan)` },
        });
      } else if (updated.role === 'ADMIN_DINAS') {
        await prisma.pengajuanLahan.updateMany({
          where: {
            OR: [{ status: 'DISETUJUI_DINAS' }, { disetujuiOleh: { not: null } }],
          },
          data: { disetujuiOleh: `${name} (Admin Kec. Lembeyan)` },
        });
      } else if (updated.role === 'POKTAN' && oldName) {
        await prisma.poktan.updateMany({
          where: { ketua: { contains: oldName } },
          data: { ketua: name },
        });
      } else if (updated.role === 'KIOS') {
        const oldKiosName = existingUser?.kiosName;
        const newKiosName = updated.kiosName || 'UD. Tani Subur Barokah';
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
        await prisma.penyaluranPupuk.updateMany({
          where: { namaKios: newKiosName },
          data: { petugasKios: name },
        });
        await prisma.mutasiStokKios.updateMany({
          where: { namaKios: newKiosName },
          data: { petugas: name },
        });
      } else if (updated.role === 'PETANI' && oldName) {
        await prisma.petani.updateMany({
          where: { OR: [{ nik: updated.username }, { nama: oldName }] },
          data: { nama: name },
        });
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID User tidak ditemukan' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    if (target.username === 'admin') {
      return NextResponse.json(
        { success: false, error: 'Akun Administrator Utama (admin) tidak dapat dihapus!' },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Akun pengguna berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
