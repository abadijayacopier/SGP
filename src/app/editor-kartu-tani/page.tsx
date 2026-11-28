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

  const [petaniList, poktanList] = await Promise.all([
    prisma.petani.findMany({
      include: { poktan: true },
      orderBy: { nama: 'asc' },
    }),
    prisma.poktan.findMany({
      orderBy: { nama: 'asc' },
    }),
  ]);

  const selectedPetani = (petaniId
    ? petaniList.find((p) => p.id === petaniId) || petaniList[0]
    : petaniList[0]) as any;

  const serializedPetaniList = petaniList.map((p: any) => ({
    id: p.id,
    nik: p.nik,
    nama: p.nama,
    nomorKta: p.nomorKta || `KT-3509-${p.nik.slice(-4)}`,
    jabatan: p.jabatan || 'Anggota Aktif',
    kelompokTani: p.poktan?.nama || 'POKTAN',
    poktanId: p.poktanId,
    desaKecamatan: `Desa ${p.desa}, Kec. ${p.kecamatan || 'Lembeyan'}`,
    fotoUrl:
      p.fotoUrl && !p.fotoUrl.includes('dicebear')
        ? p.fotoUrl
        : '/images/default-avatar.png',
  }));

  const initialPetaniData = selectedPetani
    ? {
        id: selectedPetani.id,
        nama: selectedPetani.nama,
        nomorAnggota: selectedPetani.nomorKta || `KT-3509-${selectedPetani.nik.slice(-4)}`,
        nik: selectedPetani.nik,
        jabatan: selectedPetani.jabatan || 'Anggota Aktif',
        kelompokTani: selectedPetani.poktan?.nama || 'POKTAN SRI MULYO',
        poktanId: selectedPetani.poktanId,
        desaKecamatan: `Desa ${selectedPetani.desa}, Kec. ${selectedPetani.kecamatan || 'Lembeyan'}`,
        fotoUrl:
          selectedPetani.fotoUrl && !selectedPetani.fotoUrl.includes('dicebear')
            ? selectedPetani.fotoUrl
            : '/images/default-avatar.png',
        qrPayload: `/verifikasi?q=KARTUTANI:${selectedPetani.nik}`,
      }
    : null;

  const serializedPoktan = (poktanList as any[]).map((pok: any) => ({
    id: pok.id,
    nama: pok.nama,
    desa: pok.desa,
  }));

  return (
    <EditorKartuTaniClient
      initialData={initialPetaniData || undefined}
      petaniOptions={serializedPetaniList}
      poktanOptions={serializedPoktan}
    />
  );
}
