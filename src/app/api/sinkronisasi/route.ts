import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const syncType = searchParams.get('type') || 'erdkk'; // 'erdkk' | 'penyaluran' | 'all'

    // 1. Data e-RDKK Standar Kementan (10+ Kolom)
    const petaniList = await prisma.petani.findMany({
      include: {
        poktan: true,
        alokasiPupuk: true,
        lahan: true,
      },
      orderBy: { nama: 'asc' },
    });

    const erdkkRows = petaniList.map((p, idx) => {
      const alokasi = p.alokasiPupuk?.[0];
      const komoditas = alokasi?.komoditas || p.lahan?.[0]?.komoditas || 'Padi';
      const jatahUrea = p.alokasiPupuk?.reduce((s, a) => s + (a.jatahUreaKg || 0), 0) || 0;
      const jatahNpk = p.alokasiPupuk?.reduce((s, a) => s + (a.jatahNpkKg || 0), 0) || 0;
      const jatahOrganik = p.alokasiPupuk?.reduce((s, a) => s + (a.jatahOrganikKg || 0), 0) || 0;

      return {
        no: idx + 1,
        nik: p.nik,
        namaPetani: p.nama,
        namaIbuKandung: p.namaIbuKandung || '-',
        tempatLahir: p.tempatLahir || 'Magetan',
        tanggalLahir: p.tanggalLahir || '-',
        poktan: p.poktan?.nama || '-',
        desa: p.desa || 'Kediren',
        kecamatan: p.kecamatan || 'Lembeyan',
        luasLahanHa: Number(p.totalLuasLahan || 0).toFixed(2),
        komoditas,
        ureaKg: jatahUrea,
        npkKg: jatahNpk,
        organikKg: jatahOrganik,
        statusErdkk: p.alokasiPupuk?.length > 0 ? 'TERVERIFIKASI_KEMENTAN' : 'PENDATAAN_AWAL',
      };
    });

    // 2. Data Penyaluran Pupuk Bersubsidi
    const penyaluranList = await prisma.penyaluranPupuk.findMany({
      include: {
        petani: {
          include: { poktan: true },
        },
      },
      orderBy: { tanggalPenyaluran: 'desc' },
    });

    const penyaluranRows = penyaluranList.map((p, idx) => ({
      no: idx + 1,
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

    const baseUrl = process.env.APP_URL || 'http://localhost:3000';

    const scriptTemplateErdkk = `/**
 * SINKRONISASI OTOMATIS: DAFTAR e-RDKK PETANI (STANDAR KEMENTAN 10+ KOLOM)
 * BPP KECAMATAN LEMBEYAN, KABUPATEN MAGETAN
 * 
 * Petunjuk:
 * 1. Buka Google Sheets Anda -> Klik menu 'Extensions' -> 'Apps Script'.
 * 2. Hapus seluruh isi script yang ada, lalu Paste kode di bawah ini.
 * 3. Klik tombol 'Save' (ikon disket), lalu klik 'Run' pada fungsi 'syncErdkkKementan'.
 * 4. (Opsional) Pasang Trigger Jam (ikon jam di bilah kiri) untuk update berkala otomatis (misal: setiap 1 jam).
 */
function syncErdkkKementan() {
  var endpoint = "${baseUrl}/api/sinkronisasi?type=erdkk";
  var response = UrlFetchApp.fetch(endpoint, { muteHttpExceptions: true });
  var json = JSON.parse(response.getContentText());

  if (!json.success || !json.erdkkData) {
    Logger.log("Gagal sinkronisasi: " + (json.error || "Data tidak ditemukan"));
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("e-RDKK_Kementan");
  if (!sheet) {
    sheet = ss.insertSheet("e-RDKK_Kementan");
  }

  sheet.clear();

  // Header Standar Kementan
  var headers = [
    "No", "NIK Petani", "Nama Lengkap Petani", "Nama Ibu Kandung", 
    "Tempat Lahir", "Tanggal Lahir", "Kelompok Tani (Poktan)", 
    "Desa / Kelurahan", "Kecamatan", "Luas Lahan (Ha)", 
    "Komoditas", "Urea (Kg)", "NPK Phonska (Kg)", "Organik (Kg)", "Status e-RDKK"
  ];
  sheet.appendRow(headers);

  // Format Header Baris 1
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#059669");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");

  // Isi Data Petani
  json.erdkkData.forEach(function(row) {
    sheet.appendRow([
      row.no,
      "'" + row.nik, // Tanda kutip tunggal agar NIK 16 digit tidak terpotong menjadi notasi ilmiah
      row.namaPetani,
      row.namaIbuKandung,
      row.tempatLahir,
      row.tanggalLahir,
      row.poktan,
      row.desa,
      row.kecamatan,
      parseFloat(row.luasLahanHa),
      row.komoditas,
      row.ureaKg,
      row.npkKg,
      row.organikKg,
      row.statusErdkk
    ]);
  });

  sheet.autoResizeColumns(1, headers.length);
  Logger.log("Berhasil memperbarui " + json.erdkkData.length + " data e-RDKK Petani!");
}`;

    const scriptTemplatePenyaluran = `/**
 * SINKRONISASI OTOMATIS: REKAPITULASI PENYALURAN & TRANSAKSI PENEBUSAN PUPUK
 * BPP KECAMATAN LEMBEYAN, KABUPATEN MAGETAN
 */
function syncPenyaluranPupuk() {
  var endpoint = "${baseUrl}/api/sinkronisasi?type=penyaluran";
  var response = UrlFetchApp.fetch(endpoint, { muteHttpExceptions: true });
  var json = JSON.parse(response.getContentText());

  if (!json.success || !json.penyaluranData) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Penyaluran_Pupuk");
  if (!sheet) {
    sheet = ss.insertSheet("Penyaluran_Pupuk");
  }

  sheet.clear();
  var headers = [
    "No", "No. Nota Kasir", "Tanggal Penyaluran", "Nama Petani", 
    "NIK", "Poktan", "Desa", "Kecamatan", "Urea (Kg)", "NPK (Kg)", 
    "Organik (Kg)", "Total Biaya (Rp)", "Kios Resmi (KPL)", "Pengurus Poktan", "Status"
  ];
  sheet.appendRow(headers);

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#1e293b");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");

  json.penyaluranData.forEach(function(row) {
    sheet.appendRow([
      row.no,
      row.nomorNota,
      row.tanggal,
      row.namaPetani,
      "'" + row.nik,
      row.poktan,
      row.desa,
      row.kecamatan,
      row.ureaKg,
      row.npkKg,
      row.organikKg,
      row.totalBiayaRp,
      row.kios,
      row.pengurusPoktan,
      row.status
    ]);
  });

  sheet.autoResizeColumns(1, headers.length);
}`;

    const scriptTemplateReceiver = `/**
 * PENERIMA WEBHOOK REAL-TIME (doPost Web App)
 * Cukup 1 file Google Spreadsheet. Script ini otomatis membuat sheet baru di dalamnya:
 * - Tab Sheet 1: 'e-RDKK_Kementan' (15 Kolom Standar Kementan RI)
 * - Tab Sheet 2: 'Penyaluran_Pupuk' (15 Kolom Riwayat Transaksi Penebusan Kios)
 */
function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var isPenyaluran = contents.type === 'penyaluran';
    var sheetName = isPenyaluran ? 'Penyaluran_Pupuk' : 'e-RDKK_Kementan';
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    // Jika tab sheet belum ada, otomatis dibuatkan tab sheet baru
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Bersihkan sheet untuk memperbarui data terkini
    sheet.clear();
    
    if (isPenyaluran) {
      var headers = [
        "No", "No. Nota", "Tanggal Penyaluran", "Nama Petani", "NIK", 
        "Poktan", "Desa", "Kecamatan", "Urea (Kg)", "NPK (Kg)", "Organik (Kg)", 
        "Total Biaya (Rp)", "Kios Penyalur", "Pengurus Poktan", "Status"
      ];
      sheet.appendRow(headers);
      
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#1e293b");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      
      if (contents.data && Array.isArray(contents.data)) {
        contents.data.forEach(function(row) {
          sheet.appendRow([
            row.no,
            row.nomorNota,
            row.tanggal,
            row.namaPetani,
            "'" + row.nik,
            row.poktan,
            row.desa,
            row.kecamatan,
            row.ureaKg,
            row.npkKg,
            row.organikKg,
            row.totalBiayaRp,
            row.kios,
            row.pengurusPoktan,
            row.status
          ]);
        });
      }
      sheet.autoResizeColumns(1, headers.length);
    } else {
      var headers = [
        "No", "NIK Petani", "Nama Lengkap Petani", "Nama Ibu Kandung", 
        "Tempat Lahir", "Tanggal Lahir", "Kelompok Tani (Poktan)", "Desa", "Kecamatan", 
        "Luas Lahan (Ha)", "Komoditas", "Urea (Kg)", "NPK (Kg)", "Organik (Kg)", "Status e-RDKK"
      ];
      sheet.appendRow(headers);
      
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#1b4332");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      
      if (contents.data && Array.isArray(contents.data)) {
        contents.data.forEach(function(row) {
          sheet.appendRow([
            row.no,
            "'" + row.nik,
            row.namaPetani,
            row.namaIbuKandung,
            row.tempatLahir,
            row.tanggalLahir,
            row.poktan,
            row.desa,
            row.kecamatan,
            row.luasLahanHa,
            row.komoditas,
            row.ureaKg,
            row.npkKg,
            row.organikKg,
            row.statusErdkk
          ]);
        });
      }
      sheet.autoResizeColumns(1, headers.length);
    }
    
    sheet.setFrozenRows(1);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      sheetName: sheetName,
      count: contents.data ? contents.data.length : 0 
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

    return NextResponse.json({
      success: true,
      lastSync: new Date().toISOString(),
      syncType,
      erdkkCount: erdkkRows.length,
      penyaluranCount: penyaluranRows.length,
      erdkkData: erdkkRows,
      penyaluranData: penyaluranRows,
      scripts: {
        erdkk: scriptTemplateErdkk,
        penyaluran: scriptTemplatePenyaluran,
        receiver: scriptTemplateReceiver,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { webhookUrl, type = 'erdkk' } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: 'URL Google Apps Script Webhook harus diisi' },
        { status: 400 }
      );
    }

    let payload: any[] = [];

    if (type === 'erdkk') {
      const petaniList = await prisma.petani.findMany({
        include: {
          poktan: true,
          alokasiPupuk: true,
          lahan: true,
        },
        orderBy: { nama: 'asc' },
      });

      payload = petaniList.map((p, idx) => ({
        no: idx + 1,
        nik: p.nik,
        namaPetani: p.nama,
        namaIbuKandung: p.namaIbuKandung || '-',
        tempatLahir: p.tempatLahir || 'Magetan',
        tanggalLahir: p.tanggalLahir || '-',
        poktan: p.poktan?.nama || '-',
        desa: p.desa || 'Kediren',
        kecamatan: p.kecamatan || 'Lembeyan',
        luasLahanHa: Number(p.totalLuasLahan || 0).toFixed(2),
        komoditas: p.alokasiPupuk?.[0]?.komoditas || p.lahan?.[0]?.komoditas || 'Padi',
        ureaKg: p.alokasiPupuk?.reduce((s, a) => s + (a.jatahUreaKg || 0), 0) || 0,
        npkKg: p.alokasiPupuk?.reduce((s, a) => s + (a.jatahNpkKg || 0), 0) || 0,
        organikKg: p.alokasiPupuk?.reduce((s, a) => s + (a.jatahOrganikKg || 0), 0) || 0,
        statusErdkk: p.alokasiPupuk?.length > 0 ? 'TERVERIFIKASI_KEMENTAN' : 'PENDATAAN_AWAL',
      }));
    } else {
      const penyaluran = await prisma.penyaluranPupuk.findMany({
        include: {
          petani: { include: { poktan: true } },
        },
        orderBy: { tanggalPenyaluran: 'desc' },
      });

      payload = penyaluran.map((p, idx) => ({
        no: idx + 1,
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
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data: payload }),
      });
      return NextResponse.json({
        success: true,
        count: payload.length,
        type,
        message: `Sinkronisasi data ${type === 'erdkk' ? 'Daftar e-RDKK Petani (Standar Kementan)' : 'Penyaluran Pupuk'} berhasil dikirim ke Google Sheets! (${payload.length} data)`,
        status: response.status,
      });
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        error: `Gagal menghubungi Webhook: ${err.message}. Pastikan URL Webhook Web App Google Apps Script telah disetel ke akses 'Anyone'.`,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
