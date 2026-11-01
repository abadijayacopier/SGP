import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import NotaPrintClient from './NotaPrintClient';
import {
  getDefaultNipForRole,
  generateAutoSignatureSvg,
  generateOfficialStampSvg,
} from '@/lib/signature-utils';

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function CetakNotaPage({ params }: Props) {
  const { id } = await params;

  let penyaluran: any = null;
  let kiosUser: any = null;
  let poktanUser: any = null;
  let petaniUser: any = null;

  try {
    penyaluran = await prisma.penyaluranPupuk.findFirst({
      where: {
        OR: [
          { id },
          { nomorNota: id },
        ],
      },
      include: {
        petani: {
          include: {
            poktan: true,
            alokasiPupuk: {
              where: { status: 'AKTIF' },
            },
          },
        },
      },
    });

    if (penyaluran) {
      const userResults = await Promise.all([
        prisma.user.findFirst({
          where: { role: 'KIOS' },
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.user.findFirst({
          where: {
            role: 'POKTAN',
            OR: [
              { poktanId: penyaluran.petani?.poktanId || '' },
              { name: { contains: penyaluran.petani?.poktan?.ketua || 'Suparman' } },
            ],
          },
        }),
        prisma.user.findFirst({
          where: {
            OR: [
              { username: penyaluran.petani?.nik || '' },
              { role: 'PETANI', name: penyaluran.petani?.nama || '' },
            ],
          },
        }),
      ]);
      kiosUser = userResults[0];
      poktanUser = userResults[1];
      petaniUser = userResults[2];
    }
  } catch (err) {
    console.error('[CetakNotaPage] Database error:', err);
  }

  if (!penyaluran) {
    notFound();
  }

  const resolvedKiosName = kiosUser?.name || penyaluran.petugasKios;
  const resolvedPoktanKetua =
    poktanUser?.name || penyaluran.petani?.poktan?.ketua || 'H. Suparman';

  // Serialisasi data untuk Client Component (sinkron dengan profil, TTD, stempel & NIP terbaru)
  const serializedData = {
    ...penyaluran,
    petugasKios: resolvedKiosName,
    namaPengurusPoktan: penyaluran.petani?.poktan?.nama
      ? `${resolvedPoktanKetua} (Ketua ${penyaluran.petani.poktan.nama})`
      : penyaluran.namaPengurusPoktan,
    signatures: {
      petaniSig:
        (penyaluran as any).tandaTanganPetani ||
        petaniUser?.signatureUrl ||
        generateAutoSignatureSvg(penyaluran.petani?.nama || 'Petani'),
      petaniNip: petaniUser?.nip || `NIK: ${penyaluran.petani?.nik}`,
      poktanSig:
        poktanUser?.signatureUrl || generateAutoSignatureSvg(resolvedPoktanKetua),
      poktanStamp:
        poktanUser?.stampUrl !== undefined && poktanUser?.stampUrl !== null
          ? poktanUser.stampUrl
          : generateOfficialStampSvg('POKTAN', penyaluran.petani?.poktan?.nama),
      poktanNip: poktanUser?.nip || getDefaultNipForRole('POKTAN'),
      kiosSig:
        kiosUser?.signatureUrl || generateAutoSignatureSvg(resolvedKiosName),
      kiosStamp:
        kiosUser?.stampUrl !== undefined && kiosUser?.stampUrl !== null
          ? kiosUser.stampUrl
          : generateOfficialStampSvg('KIOS', penyaluran.namaKios),
      kiosNip: kiosUser?.nip || getDefaultNipForRole('KIOS'),
    },
    tanggalPenyaluran: penyaluran.tanggalPenyaluran.toISOString(),
    createdAt: penyaluran.createdAt.toISOString(),
    updatedAt: penyaluran.updatedAt.toISOString(),
  };

  return <NotaPrintClient data={serializedData as any} />;
}
