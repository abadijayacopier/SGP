import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const penyaluran = await prisma.penyaluranPupuk.findMany({
      include: {
        petani: {
          include: { poktan: true },
        },
      },
      orderBy: { tanggalPenyaluran: 'desc' },
    });

    const rows = penyaluran.map((p) => ({
      nomorNota: p.nomorNota,
      tanggal: p.tanggalPenyaluran.toISOString(),
      namaPetani: p.petani.nama,
      nik: p.petani.nik,
      poktan: p.petani.poktan.nama,
      desa: p.petani.desa,
      kecamatan: p.petani.kecamatan,
      ureaKg: p.jumlahUreaKg,
      npkKg: p.jumlahNpkKg,
      organikKg: p.jumlahOrganikKg,
      totalBiayaRp: p.totalBiayaRp,
      kios: p.namaKios,
      pengurusPoktan: p.namaPengurusPoktan,
      status: p.status,
    }));

    return NextResponse.json({
      success: true,
      lastSync: new Date().toISOString(),
      rowCount: rows.length,
      data: rows,
      sheetsScriptTemplate: `function syncSistemPertanian() {
  var url = "${process.env.APP_URL || 'http://localhost:3000'}/api/sinkronisasi";
  var res = UrlFetchApp.fetch(url);
  var json = JSON.parse(res.getContentText());
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.clear();
  sheet.appendRow(["No Nota", "Tanggal", "Nama Petani", "NIK", "Poktan", "Desa", "Kecamatan", "Urea (Kg)", "NPK (Kg)", "Organik (Kg)", "Total Biaya", "Kios", "Validasi Poktan", "Status"]);
  json.data.forEach(function(row) {
    sheet.appendRow([row.nomorNota, row.tanggal, row.namaPetani, "'" + row.nik, row.poktan, row.desa, row.kecamatan, row.ureaKg, row.npkKg, row.organikKg, row.totalBiayaRp, row.kios, row.pengurusPoktan, row.status]);
  });
}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { webhookUrl } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: 'URL Google Apps Script Webhook harus diisi' },
        { status: 400 }
      );
    }

    const penyaluran = await prisma.penyaluranPupuk.findMany({
      include: {
        petani: { include: { poktan: true } },
      },
      orderBy: { tanggalPenyaluran: 'desc' },
    });

    const payload = penyaluran.map((p) => ({
      nomorNota: p.nomorNota,
      tanggal: p.tanggalPenyaluran.toISOString(),
      namaPetani: p.petani.nama,
      nik: p.petani.nik,
      poktan: p.petani.poktan.nama,
      desa: p.petani.desa,
      kecamatan: p.petani.kecamatan,
      ureaKg: p.jumlahUreaKg,
      npkKg: p.jumlahNpkKg,
      organikKg: p.jumlahOrganikKg,
      totalBiayaRp: p.totalBiayaRp,
      kios: p.namaKios,
      pengurusPoktan: p.namaPengurusPoktan,
      status: p.status,
    }));

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      });
      return NextResponse.json({
        success: true,
        message: 'Sinkronisasi ke Google Sheets Webhook berhasil dikirim!',
        status: response.status,
      });
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        error: `Gagal menghubungi Webhook: ${err.message}. Pastikan URL Webhook dapat diakses.`,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
