import React from 'react';
import { prisma } from '@/lib/prisma';
import PengajuanErdkk2027Client from './PengajuanErdkk2027Client';

export const metadata = {
  title: 'Formulir Pengajuan e-RDKK Petani 2027 | SGP Kecamatan Lembeyan',
  description:
    'Layanan mandiri pengajuan alokasi pupuk bersubsidi (e-RDKK) Tahun Anggaran 2027 untuk petani se-Kecamatan Lembeyan, Kabupaten Magetan. Cukup verifikasi NIK tanpa perlu login.',
};

export default async function PengajuanErdkk2027Page() {
  const poktanList = await prisma.poktan.findMany({
    orderBy: [{ desa: 'asc' }, { nama: 'asc' }],
    select: {
      id: true,
      nama: true,
      desa: true,
      kecamatan: true,
      ketua: true,
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <PengajuanErdkk2027Client poktanList={poktanList} />
    </div>
  );
}
