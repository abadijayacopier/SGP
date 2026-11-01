import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [pengajuanList, penyaluranList, stokList, mutasiList] = await Promise.all([
      prisma.pengajuanLahan.findMany({
        include: { poktan: true },
        orderBy: { updatedAt: 'desc' },
        take: 15,
      }),
      prisma.penyaluranPupuk.findMany({
        include: { petani: true },
        orderBy: { tanggalPenyaluran: 'desc' },
        take: 10,
      }),
      prisma.stokKios.findMany(),
      prisma.mutasiStokKios.findMany({
        orderBy: { tanggal: 'desc' },
        take: 5,
      }),
    ]);

    const menungguPplCount = pengajuanList.filter((p) => p.status === 'DIAJUKAN_POKTAN').length;
    const menungguDinasCount = pengajuanList.filter((p) => p.status === 'DIVERIFIKASI_PPL').length;
    const disetujuiCount = pengajuanList.filter((p) => p.status === 'DISETUJUI_DINAS').length;

    const alerts: Array<{
      id: string;
      title: string;
      message: string;
      severity: 'warning' | 'info' | 'success';
      href: string;
      targetRole: string[];
    }> = [];

    if (menungguPplCount > 0) {
      alerts.push({
        id: 'alert-ppl',
        title: `${menungguPplCount} Berkas Usulan Menunggu Verifikasi PPL`,
        message: 'Terdapat usulan lahan & e-RDKK dari Poktan yang perlu diperiksa kelengkapan SPPT/KTP dan titik koordinatnya.',
        severity: 'warning',
        href: '/pengajuan',
        targetRole: ['PPL', 'ADMIN_DINAS', 'POKTAN'],
      });
    }

    if (menungguDinasCount > 0) {
      alerts.push({
        id: 'alert-dinas',
        title: `${menungguDinasCount} Usulan Siap Disahkan SK Kuota Kecamatan`,
        message: 'Berkas telah lolos verifikasi lapangan BPP dan menunggu otorisasi Koordinator Kecamatan Lembeyan.',
        severity: 'info',
        href: '/pengajuan',
        targetRole: ['ADMIN_DINAS', 'PPL', 'POKTAN'],
      });
    }

    for (const s of stokList) {
      if (s.stokSisaKg < 500) {
        alerts.push({
          id: `alert-stok-${s.id}`,
          title: `Peringatan Stok ${s.jenisPupuk} (${s.namaKios})`,
          message: `Sisa stok ${s.jenisPupuk} tinggal ${s.stokSisaKg} Kg, mendekati batas minimum penyaluran.`,
          severity: 'warning',
          href: '/kios',
          targetRole: ['KIOS', 'ADMIN_DINAS'],
        });
      }
    }

    alerts.push({
      id: 'alert-sk-ready',
      title: `${disetujuiCount} Kuota Petani Aktif di Lampiran SK e-RDKK`,
      message: 'Dokumen SK & Lampiran Resmi e-RDKK Kecamatan Lembeyan siap dicetak atau diekspor ke format CSV Kementan.',
      severity: 'success',
      href: '/cetak-erdkk',
      targetRole: ['ADMIN_DINAS', 'PPL', 'POKTAN', 'KIOS', 'PETANI'],
    });

    // Susun Log Audit Aktivitas (Audit Trail Inspektorat)
    const auditLogs: Array<{
      id: string;
      timestamp: string;
      actor: string;
      action: string;
      detail: string;
      category: 'ERDKK' | 'PENYALURAN' | 'STOK_KIOS';
      href: string;
    }> = [];

    for (const p of pengajuanList.slice(0, 6)) {
      if (p.status === 'DISETUJUI_DINAS') {
        auditLogs.push({
          id: `audit-p-${p.id}`,
          timestamp: p.tanggalPersetujuan
            ? new Date(p.tanggalPersetujuan).toISOString()
            : new Date(p.updatedAt).toISOString(),
          actor: p.disetujuiOleh || 'Admin Kecamatan Lembeyan',
          action: 'Mengesahkan SK Kuota e-RDKK',
          detail: `${p.namaPemilik} (NIK: ${p.nikPemilik}) • ${p.luasHa} Ha (${p.komoditasRencana}) Desa ${p.desa}`,
          category: 'ERDKK',
          href: '/pengajuan',
        });
      } else if (p.status === 'DIVERIFIKASI_PPL') {
        auditLogs.push({
          id: `audit-p-${p.id}`,
          timestamp: p.tanggalVerifikasi
            ? new Date(p.tanggalVerifikasi).toISOString()
            : new Date(p.updatedAt).toISOString(),
          actor: p.diverifikasiOleh || 'Iis Sugiarti, S.P (PPL BPP)',
          action: 'Memverifikasi Lapangan & Poligon Sawah',
          detail: `${p.namaPemilik} • ${p.luasHa} Ha (${p.komoditasRencana}) Desa ${p.desa}`,
          category: 'ERDKK',
          href: '/pengajuan',
        });
      } else {
        auditLogs.push({
          id: `audit-p-${p.id}`,
          timestamp: new Date(p.createdAt).toISOString(),
          actor: p.poktan?.nama || 'Pengurus Poktan',
          action: 'Mengajukan Usulan Lahan e-RDKK Baru',
          detail: `${p.namaPemilik} (TTL: ${p.tempatLahir || 'Magetan'}, Ibu: ${p.namaIbuKandung || '-'})`,
          category: 'ERDKK',
          href: '/pengajuan',
        });
      }
    }

    for (const t of penyaluranList.slice(0, 5)) {
      auditLogs.push({
        id: `audit-t-${t.id}`,
        timestamp: new Date(t.tanggalPenyaluran).toISOString(),
        actor: `${t.petugasKios} (${t.namaKios})`,
        action: `Penebusan Pupuk Bersubsidi (${t.nomorNota})`,
        detail: `${t.petani?.nama || 'Petani'} • Urea ${t.jumlahUreaKg}Kg, NPK ${t.jumlahNpkKg}Kg, Org ${t.jumlahOrganikKg}Kg`,
        category: 'PENYALURAN',
        href: `/cetak-nota/${t.id}`,
      });
    }

    for (const m of mutasiList.slice(0, 3)) {
      auditLogs.push({
        id: `audit-m-${m.id}`,
        timestamp: new Date(m.tanggal).toISOString(),
        actor: m.petugas || 'Petugas Gudang KPL',
        action: `Mutasi Stok ${m.jenisPupuk} (${m.tipeMutasi})`,
        detail: `${m.namaKios} • ${m.jumlahKg} Kg (${m.nomorReferensi || '-'})`,
        category: 'STOK_KIOS',
        href: '/kios',
      });
    }

    auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      counts: {
        menungguPplCount,
        menungguDinasCount,
        disetujuiCount,
        totalUnread: menungguPplCount + menungguDinasCount,
      },
      alerts,
      auditLogs: auditLogs.slice(0, 10),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat notifikasi' },
      { status: 500 }
    );
  }
}
