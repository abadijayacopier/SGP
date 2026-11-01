import * as XLSX from 'xlsx';

/**
 * Helper untuk mengunduh workbook XLSX ke file browser
 */
function downloadWorkbook(workbook: XLSX.WorkBook, filename: string) {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Ekspor Data Rekapitulasi Penyaluran Pupuk ke Excel
 */
export function exportPenyaluranPupukExcel(data: any[], filename = 'Rekap_Penyaluran_Pupuk.xlsx') {
  const rows = data.map((item, index) => ({
    'No': index + 1,
    'No Nota': item.nomorNota,
    'Tanggal': new Date(item.tanggalPenyaluran).toLocaleDateString('id-ID'),
    'Nama Petani': item.petani?.nama || '-',
    'NIK Petani': item.petani?.nik || '-',
    'Kelompok Tani (Poktan)': item.petani?.poktan?.nama || '-',
    'Desa': item.petani?.desa || '-',
    'Kecamatan': item.petani?.kecamatan || '-',
    'Urea (Kg)': item.jumlahUreaKg,
    'NPK Phonska (Kg)': item.jumlahNpkKg,
    'Organik (Kg)': item.jumlahOrganikKg,
    'Total Biaya (Rp)': item.totalBiayaRp,
    'Kios Penyalur': item.namaKios,
    'Verifikasi Poktan': item.namaPengurusPoktan,
    'Status': item.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Penyaluran Pupuk');
  downloadWorkbook(workbook, filename);
}

/**
 * Ekspor Data Master Lahan Pertanian ke Excel
 */
export function exportLahanExcel(data: any[], filename = 'Master_Data_Lahan_Pertanian.xlsx') {
  const rows = data.map((item, index) => ({
    'No': index + 1,
    'Kode Lahan': item.kodeLahan,
    'Nama Petak Lahan': item.namaLahan,
    'Pemilik / Penggarap': item.petani?.nama || '-',
    'NIK': item.petani?.nik || '-',
    'Poktan': item.petani?.poktan?.nama || '-',
    'Komoditas': item.komoditas,
    'Luas (Ha)': item.luasHa,
    'Luas (m²)': item.luasM2,
    'Status Kepemilikan': item.statusKepemilikan,
    'Irigasi': item.statusIrigasi,
    'No Pipil / SPPT': item.nomorPipil || '-',
    'Titik Koordinat Pusat': `${item.centerLat}, ${item.centerLng}`,
    'Status Verifikasi': item.statusVerifikasi,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Lahan');
  downloadWorkbook(workbook, filename);
}

/**
 * Ekspor Data e-RDKK & Kuota Petani ke Excel
 */
export function exportErdkkExcel(data: any[], filename = 'Alokasi_eRDKK_Pupuk_Subsidi.xlsx') {
  const rows = data.map((item, index) => ({
    'No': index + 1,
    'Tahun': item.tahun,
    'Musim Tanam': item.musimTanam,
    'Nama Petani': item.petani?.nama || '-',
    'NIK': item.petani?.nik || '-',
    'Kelompok Tani': item.petani?.poktan?.nama || '-',
    'Komoditas': item.komoditas,
    'Luas Tanam (Ha)': item.luasTanamHa,
    'Jatah Urea (Kg)': item.jatahUreaKg,
    'Sisa Urea (Kg)': item.sisaUreaKg,
    'Jatah NPK (Kg)': item.jatahNpkKg,
    'Sisa NPK (Kg)': item.sisaNpkKg,
    'Jatah Organik (Kg)': item.jatahOrganikKg,
    'Sisa Organik (Kg)': item.sisaOrganikKg,
    'Status': item.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Alokasi e-RDKK');
  downloadWorkbook(workbook, filename);
}

/**
 * Ekspor Rekapitulasi Stok Kios ke Excel
 */
export function exportStokKiosExcel(data: any[], filename = 'Rekap_Stok_Kios_Pupuk.xlsx') {
  const rows = data.map((item, index) => {
    const totalPasokan = item.stokAwalKg + item.stokMasukKg;
    const persen = totalPasokan > 0 ? Math.round((item.stokTersalurKg / totalPasokan) * 100) : 0;
    return {
      'No': index + 1,
      'Nama Kios': item.namaKios,
      'Jenis Pupuk': item.jenisPupuk,
      'Stok Awal (Kg)': item.stokAwalKg,
      'Pasokan Masuk / DO (Kg)': item.stokMasukKg,
      'Total Tersedia (Kg)': totalPasokan,
      'Tersalur ke Petani (Kg)': item.stokTersalurKg,
      'Sisa Stok Fisik (Kg)': item.stokSisaKg,
      'Persentase Tersalur (%)': `${persen}%`,
      'Terakhir Diperbarui': new Date(item.updatedAt).toLocaleString('id-ID'),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stok KPL');
  downloadWorkbook(workbook, filename);
}

/**
 * Ekspor Kartu Kendali & Riwayat Mutasi Stok Kios ke Excel
 */
export function exportMutasiStokExcel(data: any[], filename = 'Kartu_Kendali_Mutasi_Stok.xlsx') {
  const rows = data.map((item, index) => {
    let jenisMutasiLabel = item.tipeMutasi;
    if (item.tipeMutasi === 'MASUK_DISTRIBUTOR') jenisMutasiLabel = 'Pasokan Distributor (DO)';
    if (item.tipeMutasi === 'PENYALURAN_PETANI') jenisMutasiLabel = 'Penyaluran ke Petani';
    if (item.tipeMutasi === 'PENYESUAIAN_OPNAME') jenisMutasiLabel = 'Penyesuaian Stock Opname';

    return {
      'No': index + 1,
      'Tanggal': new Date(item.tanggal).toLocaleString('id-ID'),
      'Kios': item.namaKios,
      'Jenis Pupuk': item.jenisPupuk,
      'Tipe Mutasi': jenisMutasiLabel,
      'Jumlah (Kg)': item.tipeMutasi === 'PENYALURAN_PETANI' ? -item.jumlahKg : item.jumlahKg,
      'Stok Sebelum (Kg)': item.stokSebelumKg,
      'Stok Sesudah (Kg)': item.stokSesudahKg,
      'No. Referensi (DO / Nota)': item.nomorReferensi || '-',
      'Distributor / Supplier': item.namaDistributor || '-',
      'No. Polisi Armada': item.nomorPolisi || '-',
      'Supir': item.namaSupir || '-',
      'Petugas': item.petugas || '-',
      'Keterangan': item.keterangan || '-',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Kartu Mutasi');
  downloadWorkbook(workbook, filename);
}

/**
 * Ekspor Data e-RDKK Petani Format Standar Nasional Kementan RI
 * Kolom: NO, Nama Petani, KTP, Tempat Lahir, Tanggal Lahir, Nama Ibu Kandung, Alamat, luas(ha), koordinat
 */
export function exportKementanErdkkExcel(data: any[], filename = 'Format_Upload_eRDKK_Kementan.xlsx') {
  const rows = data.map((item, index) => {
    const lat = item.lahan?.[0]?.centerLat;
    const lng = item.lahan?.[0]?.centerLng;
    const koordinatStr =
      lat !== undefined && lng !== undefined
        ? `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
        : item.koordinat || '-';

    const totalLuas =
      item.totalLuasLahan > 0
        ? item.totalLuasLahan
        : item.lahan?.reduce((acc: number, l: any) => acc + (l.luasHa || 0), 0) || 0.5;

    const fullAlamat = item.alamat
      ? item.desa
        ? `${item.alamat}, Desa ${item.desa}, Kec. ${item.kecamatan || 'Lembeyan'}`
        : item.alamat
      : item.desa
      ? `Desa ${item.desa}, Kec. ${item.kecamatan || 'Lembeyan'}`
      : 'Kecamatan Lembeyan';

    // Pola Tanam / Komoditas per Musim Tanam (MT1, MT2, MT3)
    const komoditasStr =
      item.komoditas ||
      (item.alokasiPupuk && item.alokasiPupuk.length > 0
        ? item.alokasiPupuk.map((a: any) => `${a.musimTanam || 'MT'}: ${a.komoditas}`).join(', ')
        : item.lahan?.[0]?.komoditas
        ? `MT1 Walikan (${item.lahan[0].komoditas}), MT2 Kemarau (Jagung/Palawija), MT3 Rendeng (Padi)`
        : 'MT1 Walikan (Padi), MT2 Kemarau (Jagung/Palawija), MT3 Rendeng (Padi)');

    return {
      'NO': index + 1,
      'Nama Petani': item.nama || '-',
      'KTP': item.nik ? `'${item.nik}` : '-',
      'Tempat Lahir': item.tempatLahir || 'Magetan',
      'Tanggal Lahir': item.tanggalLahir || '1980-01-01',
      'Nama Ibu Kandung': item.namaIbuKandung || '-',
      'Alamat': fullAlamat,
      'luas(ha)': Number(Number(totalLuas).toFixed(2)),
      'koordinat': koordinatStr,
      'Komoditas': komoditasStr,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Format e-RDKK Kementan');
  downloadWorkbook(workbook, filename);
}

/**
 * Unduh Template Blanko Kosong / Contoh Pengisian Format Standar Nasional Kementan RI
 */
export function downloadTemplateKementanExcel(filename = 'Template_Format_eRDKK_Kementan.xlsx') {
  const sampleRows = [
    {
      'NO': 1,
      'Nama Petani': 'Sukirno',
      'KTP': "'3509012304750001",
      'Tempat Lahir': 'Magetan',
      'Tanggal Lahir': '1975-04-23',
      'Nama Ibu Kandung': 'Siti Maryam',
      'Alamat': 'Desa Kediren RT 02 / RW 01, Kec. Lembeyan',
      'luas(ha)': 1.97,
      'koordinat': '-7.712350, 111.345670',
      'Komoditas': 'MT1 Walikan (Padi), MT2 Kemarau (Jagung), MT3 Rendeng (Padi)',
    },
    {
      'NO': 2,
      'Nama Petani': 'Slamet Raharjo',
      'KTP': "'3509011905810003",
      'Tempat Lahir': 'Magetan',
      'Tanggal Lahir': '1981-05-19',
      'Nama Ibu Kandung': 'Sri Utami',
      'Alamat': 'Dusun Krajan, Desa Kediren, Kec. Lembeyan',
      'luas(ha)': 0.85,
      'koordinat': '-7.715420, 111.348910',
      'Komoditas': 'MT1 Walikan (Padi), MT2 Kemarau (Kedelai), MT3 Rendeng (Padi)',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template e-RDKK Kementan');
  downloadWorkbook(workbook, filename);
}

/**
 * Unduh Template Excel Alokasi Pupuk e-RDKK Poktan (Kolom: NO | NIK | Nama | Urea | NPK/Phonska | Organik)
 */
export function downloadTemplateAlokasiPoktanExcel(petaniList: any[] = [], filename = 'Template_Alokasi_Pupuk_eRDKK_Poktan.xlsx') {
  const rows = petaniList.length > 0
    ? petaniList.map((p, index) => ({
        'NO': index + 1,
        'NIK': p.nik ? `'${p.nik}` : '',
        'Nama': p.nama || '',
        'Urea': p.jatahUreaKg || 0,
        'NPK/Phonska': p.jatahNpkKg || 0,
        'Organik': p.jatahOrganikKg || 0,
      }))
    : [
        {
          'NO': 1,
          'NIK': "'3509012304750001",
          'Nama': 'Sukirno',
          'Urea': 250,
          'NPK/Phonska': 200,
          'Organik': 100,
        },
        {
          'NO': 2,
          'NIK': "'3509011905810003",
          'Nama': 'Slamet Raharjo',
          'Urea': 150,
          'NPK/Phonska': 120,
          'Organik': 60,
        },
      ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Alokasi Pupuk');
  downloadWorkbook(workbook, filename);
}

/**
 * Ekspor Rekap Alokasi Pupuk e-RDKK Poktan ke Excel
 */
export function exportAlokasiPoktanExcel(data: any[], filename = 'Rekap_Alokasi_Pupuk_Poktan.xlsx') {
  const rows = data.map((item, index) => ({
    'No': index + 1,
    'NIK': item.nik ? `'${item.nik}` : '-',
    'Nama Petani': item.nama,
    'Kelompok Tani': item.namaPoktan || '-',
    'Desa': item.desa || '-',
    'Luas Lahan (Ha)': item.luasHa,
    'Komoditas': item.komoditas || 'Padi',
    'Jatah Urea (Kg)': item.jatahUreaKg,
    'Sisa Urea (Kg)': item.sisaUreaKg,
    'Jatah NPK (Kg)': item.jatahNpkKg,
    'Sisa NPK (Kg)': item.sisaNpkKg,
    'Jatah Organik (Kg)': item.jatahOrganikKg,
    'Sisa Organik (Kg)': item.sisaOrganikKg,
    'Status': item.status || 'AKTIF',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Alokasi Poktan');
  downloadWorkbook(workbook, filename);
}

/**
 * Ekspor Rekap Distribusi Pupuk Kios ke Poktan
 */
export function exportDistribusiKiosExcel(data: any[], filename = 'Rekap_Distribusi_Kios_Ke_Poktan.xlsx') {
  const rows = data.map((item, index) => ({
    'No': index + 1,
    'No Surat Jalan': item.nomorSuratJalan,
    'Tanggal Kirim': new Date(item.tanggalKirim).toLocaleDateString('id-ID'),
    'Kios Pengirim': item.namaKios,
    'Poktan Penerima': item.namaPoktan,
    'Desa': item.desa,
    'Kloter': item.kloter,
    'Armada / Nopol': item.nomorPolisi,
    'Nama Sopir': item.namaSopir,
    'Urea (Sak)': item.jumlahUreaSak,
    'Urea (Kg)': item.jumlahUreaKg,
    'NPK (Sak)': item.jumlahNpkSak,
    'NPK (Kg)': item.jumlahNpkKg,
    'Organik (Sak)': item.jumlahOrganikSak,
    'Organik (Kg)': item.jumlahOrganikKg,
    'Status': item.status,
    'Tanggal Diterima': item.tanggalDiterima ? new Date(item.tanggalDiterima).toLocaleDateString('id-ID') : '-',
    'Penerima Poktan': item.namaPenerima || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Distribusi Kios-Poktan');
  downloadWorkbook(workbook, filename);
}

/**
 * Ekspor Dokumen SPJ Format F-6 Resmi Pupuk Indonesia (Laporan Penyaluran & Stok Pengecer)
 */
export function exportModelF6Excel(
  kiosInfo: {
    namaKios: string;
    kodeKios: string;
    pengelola: string;
    alamat: string;
    distributor: string;
    bulan: string;
    tahun: number | string;
  },
  poktanRows: any[],
  grandTotal: any,
  filename = 'Laporan_SPJ_Model_F6_Pengecer.xlsx'
) {
  const headerRows = [
    { 'A': 'LAPORAN REKAPITULASI PENYALURAN DAN STOK PUPUK BERSUBSIDI TINGKAT PENGECER' },
    { 'A': 'FORMAT RESMI MODEL F-6 (PUPUK INDONESIA HOLDING & KEMENTAN RI)' },
    { 'A': '' },
    { 'A': `Nama Kios / Pengecer: ${kiosInfo.namaKios}`, 'D': `Kode Pengecer: ${kiosInfo.kodeKios}` },
    { 'A': `Nama Penanggung Jawab: ${kiosInfo.pengelola}`, 'D': `Distributor Penyalur: ${kiosInfo.distributor}` },
    { 'A': `Alamat Kios: ${kiosInfo.alamat}`, 'D': `Periode Pelaporan: Bulan ${kiosInfo.bulan} ${kiosInfo.tahun}` },
    { 'A': '' },
  ];

  const tableData = poktanRows.map((p, idx) => ({
    'No': idx + 1,
    'Nama Kelompok Tani': p.namaPoktan,
    'Desa': p.desa,
    'Stok Awal Urea (Kg)': p.stokAwalUrea,
    'Stok Awal NPK (Kg)': p.stokAwalNpk,
    'Stok Awal Organik (Kg)': p.stokAwalOrganik,
    'Penerimaan DO Urea (Kg)': p.penerimaanUrea,
    'Penerimaan DO NPK (Kg)': p.penerimaanNpk,
    'Penerimaan DO Organik (Kg)': p.penerimaanOrganik,
    'Penyaluran Urea (Kg)': p.salurUrea,
    'Penyaluran NPK (Kg)': p.salurNpk,
    'Penyaluran Organik (Kg)': p.salurOrganik,
    'Sisa Stok Urea (Kg)': p.sisaUrea,
    'Sisa Stok NPK (Kg)': p.sisaNpk,
    'Sisa Stok Organik (Kg)': p.sisaOrganik,
    'Total Nilai HET (Rp)': p.totalNilaiHet,
  }));

  if (grandTotal) {
    tableData.push({
      'No': 'TOTAL' as any,
      'Nama Kelompok Tani': 'TOTAL KESELURUHAN',
      'Desa': '-',
      'Stok Awal Urea (Kg)': grandTotal.stokAwalUrea,
      'Stok Awal NPK (Kg)': grandTotal.stokAwalNpk,
      'Stok Awal Organik (Kg)': grandTotal.stokAwalOrganik,
      'Penerimaan DO Urea (Kg)': grandTotal.penerimaanUrea,
      'Penerimaan DO NPK (Kg)': grandTotal.penerimaanNpk,
      'Penerimaan DO Organik (Kg)': grandTotal.penerimaanOrganik,
      'Penyaluran Urea (Kg)': grandTotal.salurUrea,
      'Penyaluran NPK (Kg)': grandTotal.salurNpk,
      'Penyaluran Organik (Kg)': grandTotal.salurOrganik,
      'Sisa Stok Urea (Kg)': grandTotal.sisaUrea,
      'Sisa Stok NPK (Kg)': grandTotal.sisaNpk,
      'Sisa Stok Organik (Kg)': grandTotal.sisaOrganik,
      'Total Nilai HET (Rp)': grandTotal.totalNilaiHet,
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(tableData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Model F-6 Pengecer');
  downloadWorkbook(workbook, filename);
}


