import React from 'react';
import { prisma } from '@/lib/prisma';
import ErdkkPrintClient from './ErdkkPrintClient';
import { getDefaultNipForRole } from '@/lib/signature-utils';

export const dynamic = 'force-dynamic';

export default async function CetakErdkkPage() {
  const [pengajuanList, officialUsers] = await Promise.all([
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

  const adminUser = officialUsers.find((u) => u.role === 'ADMIN_DINAS');
  const pplUser = officialUsers.find((u) => u.role === 'PPL');

  const adminPejabat = {
    nama: adminUser?.name || 'Ir. Bambang Hermanto, M.Si',
    jabatan: 'Koordinator Pertanian Kecamatan Lembeyan',
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
