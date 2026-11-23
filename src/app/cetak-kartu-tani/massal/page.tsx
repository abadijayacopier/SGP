import { prisma } from '@/lib/prisma';
import { CetakMassalClient } from './CetakMassalClient';

export const metadata = {
  title: 'Cetak Massal Kartu Tani (10 Kartu per A4) | SGP Lembeyan',
  description: 'Pusat cetak massal Kartu Tani digital format standar CR-80 (86 x 54 mm) pas 10 kartu per lembar A4 dengan bleed mesin plong.',
};

export default async function CetakMassalKartuPage() {
  const [petaniList, poktanList] = await Promise.all([
    prisma.petani.findMany({
      include: {
        poktan: true,
        lahan: {
          select: {
            id: true,
            kodeLahan: true,
            luasHa: true,
            komoditas: true,
          },
        },
      },
      orderBy: [{ desa: 'asc' }, { nama: 'asc' }],
    }),
    prisma.poktan.findMany({
      orderBy: { nama: 'asc' },
    }),
  ]);

  const serializedPetani = (petaniList as any[]).map((p: any) => ({
    id: p.id,
    nik: p.nik,
    nama: p.nama,
    desa: p.desa,
    kecamatan: p.kecamatan || 'Lembeyan',
    kabupaten: p.kabupaten || 'Magetan',
    totalLuasLahan: Number(p.totalLuasLahan || 0),
    fotoUrl: p.fotoUrl || null,
    poktanNama: p.poktan?.nama || 'Non-Poktan',
    poktanId: p.poktanId,
    lahanCount: p.lahan.length,
  }));

  const serializedPoktan = (poktanList as any[]).map((pok: any) => ({
    id: pok.id,
    nama: pok.nama,
    desa: pok.desa,
  }));

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:py-0 print:bg-white text-slate-800">
      <CetakMassalClient petaniList={serializedPetani} poktanList={serializedPoktan} />
    </div>
  );
}
