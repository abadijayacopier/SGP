import React from 'react';
import { prisma } from '@/lib/prisma';
import ErdkkPrintClient from './ErdkkPrintClient';
import { getDefaultNipForRole } from '@/lib/signature-utils';

export const dynamic = 'force-dynamic';

export default async function CetakErdkkPage() {
  let pengajuanList: any[] = [];
  let officialUsers: any[] = [];

  try {
    const results = await Promise.all([
      prisma.pengajuanLahan.findMany({
        include: {
          poktan: true,
          petani: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findMany({
        where: {
          role: { in: ['ADMIN_DINAS', 'PPL'] },
        },
      }),
    ]);
    pengajuanList = results[0];
    officialUsers = results[1];
  } catch (err) {
    console.error('[CetakErdkkPage] Database fetch error:', err);
  }

  const adminUser = officialUsers.find((u) => u.role === 'ADMIN_DINAS');
  const pplUser = officialUsers.find((u) => u.role === 'PPL');

  const adminPejabat = {
    nama: adminUser?.name || 'Supriyanto (Admin Kecamatan)',
    jabatan: 'Koordinator Pertanian / Admin Kecamatan Lembeyan',
    instansi: 'Pemerintah Kecamatan Lembeyan',
    nip: adminUser?.nip || getDefaultNipForRole('ADMIN_DINAS', adminUser?.username),
    signatureUrl: adminUser?.signatureUrl || null,
    stampUrl: adminUser?.stampUrl || null,
  };

  const pplPejabat = {
    nama: pplUser?.name || 'Iis Sugiarti, S.P',
    jabatan: 'Penyuluh Pertanian Lapangan (BPP)',
    instansi: 'BPP Kecamatan Lembeyan',
    nip: pplUser?.nip || getDefaultNipForRole('PPL', pplUser?.username),
    signatureUrl: pplUser?.signatureUrl || null,
    stampUrl: pplUser?.stampUrl || null,
  };

  return (
    <ErdkkPrintClient
      pengajuanList={JSON.parse(JSON.stringify(pengajuanList))}
      adminPejabat={adminPejabat}
      pplPejabat={pplPejabat}
    />
  );
}
