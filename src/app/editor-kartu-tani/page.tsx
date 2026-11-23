import { prisma } from '@/lib/prisma';
import EditorKartuTaniClient from './EditorKartuTaniClient';

export const metadata = {
  title: 'Editor Kartu Anggota Kelompok Tani | SGP Lembeyan',
  description: 'Editor dan cetak Kartu Anggota Kelompok Tani desain sawah terasering & petani caping (CR-80).',
};

export default async function EditorKartuTaniPage({
  searchParams,
}: {
  searchParams: Promise<{ petaniId?: string }>;
}) {
  const { petaniId } = await searchParams;

  let initialPetaniData: any = null;

  const [petani, poktanList] = await Promise.all([
    petaniId
      ? prisma.petani.findUnique({
          where: { id: petaniId },
          include: { poktan: true },
        })
      : prisma.petani.findFirst({
          include: { poktan: true },
          orderBy: { nama: 'asc' },
        }),
    prisma.poktan.findMany({
      orderBy: { nama: 'asc' },
    }),
  ]);

  if (petani) {
    const pAny = petani as any;
    initialPetaniData = {
      nama: pAny.nama,
      nomorAnggota: `KT-3509-${pAny.nik.slice(-4)}`,
      nik: pAny.nik,
      jabatan: 'Anggota Aktif',
      kelompokTani: pAny.poktan?.nama || 'POKTAN SRI MULYO',
      desaKecamatan: `Desa ${pAny.desa}, Kec. ${pAny.kecamatan || 'Lembeyan'}`,
      fotoUrl:
        pAny.fotoUrl ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(pAny.nama)}`,
      qrPayload: JSON.stringify({
        kta: `KT-3509-${pAny.nik.slice(-4)}`,
        nama: pAny.nama,
        poktan: pAny.poktan?.nama,
        desa: pAny.desa,
      }),
    };
  }

  const serializedPoktan = (poktanList as any[]).map((pok: any) => ({
    id: pok.id,
    nama: pok.nama,
    desa: pok.desa,
  }));

  return (
    <EditorKartuTaniClient
      initialData={initialPetaniData}
      poktanOptions={serializedPoktan}
    />
  );
}
