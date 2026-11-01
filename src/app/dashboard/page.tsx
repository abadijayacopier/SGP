import React from 'react';
import { prisma } from '@/lib/prisma';
import RoleDashboardClient from '@/components/dashboard/RoleDashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let totalPetani = 0;
  let totalPoktan = 0;
  let totalLahanCount = 0;
  let allLahan: any[] = [];
  let allAlokasi: any[] = [];
  let recentPenyaluran: any[] = [];
  let pengajuanList: any[] = [];
  let petaniSample: any[] = [];
  let stokKiosList: any[] = [];

  try {
    const results = await Promise.all([
      prisma.petani.count(),
      prisma.poktan.count(),
      prisma.lahan.count(),
      prisma.lahan.findMany(),
      prisma.alokasiPupuk.findMany(),
      prisma.penyaluranPupuk.findMany({
        include: {
          petani: { include: { poktan: true } },
        },
        orderBy: { tanggalPenyaluran: 'desc' },
        take: 5,
      }),
      prisma.pengajuanLahan.findMany({
        include: {
          poktan: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.petani.findMany({
        include: {
          poktan: true,
          lahan: true,
          alokasiPupuk: true,
        },
      }),
      prisma.stokKios.findMany(),
    ]);

    totalPetani = results[0];
    totalPoktan = results[1];
    totalLahanCount = results[2];
    allLahan = results[3];
    allAlokasi = results[4];
    recentPenyaluran = results[5];
    pengajuanList = results[6];
    petaniSample = results[7];
    stokKiosList = results[8];
  } catch (dbError) {
    console.error('[Dashboard Server Error] Database query failed:', dbError);
  }

  const totalLuasHa = allLahan.reduce((sum, l) => sum + l.luasHa, 0);

  const totalJatahUrea = allAlokasi.reduce((sum, a) => sum + a.jatahUreaKg, 0);
  const totalSisaUrea = allAlokasi.reduce((sum, a) => sum + a.sisaUreaKg, 0);
  const totalTersalurUrea = totalJatahUrea - totalSisaUrea;

  const totalJatahNpk = allAlokasi.reduce((sum, a) => sum + a.jatahNpkKg, 0);
  const totalSisaNpk = allAlokasi.reduce((sum, a) => sum + a.sisaNpkKg, 0);
  const totalTersalurNpk = totalJatahNpk - totalSisaNpk;

  const persentaseUrea =
    totalJatahUrea > 0 ? Math.round((totalTersalurUrea / totalJatahUrea) * 100) : 0;
  const persentaseNpk =
    totalJatahNpk > 0 ? Math.round((totalTersalurNpk / totalJatahNpk) * 100) : 0;

  const pendingPplCount = pengajuanList.filter((p) => p.status === 'DIAJUKAN_POKTAN').length;
  const pendingDinasCount = pengajuanList.filter((p) => p.status === 'DIVERIFIKASI_PPL').length;

  return (
    <RoleDashboardClient
      stats={{
        totalPetani,
        totalPoktan,
        totalLahanCount,
        totalLuasHa,
        totalJatahUrea,
        totalTersalurUrea,
        persentaseUrea,
        totalJatahNpk,
        totalTersalurNpk,
        persentaseNpk,
        pendingPplCount,
        pendingDinasCount,
      }}
      recentPenyaluran={JSON.parse(JSON.stringify(recentPenyaluran))}
      pengajuanList={JSON.parse(JSON.stringify(pengajuanList))}
      petaniSample={JSON.parse(JSON.stringify(petaniSample))}
      stokKiosList={JSON.parse(JSON.stringify(stokKiosList))}
    />
  );
}
